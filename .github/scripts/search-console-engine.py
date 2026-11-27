"""Submit the verified production sitemap and report Google's indexed URL status."""
import concurrent.futures
import csv
import json
import os
import time
from collections import Counter
from pathlib import Path
from urllib.parse import quote, urlsplit
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
import xml.etree.ElementTree as ET

ORIGIN = "https://creaid-media.de"
SITEMAP = ORIGIN + "/sitemap.xml"
API = "https://www.googleapis.com/webmasters/v3"
OUT = Path("seo-report")
OUT.mkdir(exist_ok=True)

def request(url, method="GET", payload=None, authenticated=True):
    headers = {"User-Agent": "CreAid-SEO-Engine/1.0", "Accept": "application/json" if authenticated else "*/*"}
    if authenticated:
        headers["Authorization"] = "Bearer " + os.environ["GSC_ACCESS_TOKEN"]
    data = None if payload is None else json.dumps(payload).encode()
    if data is not None:
        headers["Content-Type"] = "application/json"
    for attempt in range(4):
        try:
            with urlopen(Request(url, data=data, headers=headers, method=method), timeout=40) as response:
                body = response.read(5_000_001)
                if len(body) > 5_000_000:
                    raise RuntimeError("Response exceeds safety limit")
                if not authenticated and urlsplit(response.geturl()).netloc != "creaid-media.de":
                    raise RuntimeError("Unexpected public response host")
                return (body, response.headers) if not authenticated else (json.loads(body) if body else {})
        except HTTPError as error:
            if error.code not in (429, 500, 502, 503, 504) or attempt == 3:
                detail = error.read(4000).decode(errors="replace")
                raise RuntimeError(f"HTTP {error.code}: {detail}") from None
        except (TimeoutError, URLError):
            if attempt == 3:
                raise
        time.sleep(2 ** (attempt + 1))

def inspect(url, property_url):
    record = {"url": url}
    try:
        result = request("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", "POST",
                         {"inspectionUrl": url, "siteUrl": property_url, "languageCode": "de-DE"})
        status = result["inspectionResult"]["indexStatusResult"]
        record.update({key: status.get(key, "") for key in (
            "verdict", "coverageState", "indexingState", "robotsTxtState", "pageFetchState",
            "lastCrawlTime", "googleCanonical", "userCanonical")})
        record["status"] = "indexed" if status.get("verdict") == "PASS" else "review"
    except Exception as error:
        record.update(status="error", error=str(error)[:1000])
    return record

def main():
    homepage, headers = request(ORIGIN + "/", authenticated=False)
    if "noindex" in headers.get("X-Robots-Tag", "").lower() or b'name="robots" content="index,follow"' not in homepage:
        raise RuntimeError("Production indexability not confirmed; no sitemap submission")
    raw, headers = request(SITEMAP, authenticated=False)
    root = ET.fromstring(raw)
    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    urls = [row.text.strip() for row in root.findall("s:url/s:loc", ns) if row.text]
    if not urls or len(urls) != len(set(urls)) or len(urls) > 500:
        raise RuntimeError("Invalid sitemap URL count or duplicates")
    if any(urlsplit(u).scheme != "https" or urlsplit(u).netloc != "creaid-media.de" for u in urls):
        raise RuntimeError("Unexpected sitemap URL host")
    sites = request(API + "/sites").get("siteEntry", [])
    permitted = {s["siteUrl"] for s in sites if s.get("permissionLevel") in ("siteOwner", "siteFullUser")}
    property_url = next((p for p in ("sc-domain:creaid-media.de", ORIGIN + "/") if p in permitted), None)
    if not property_url:
        raise RuntimeError("Search Console property missing or insufficient permission; verify service account access")
    print("Authorized property:", property_url, flush=True)
    if os.environ.get("SUBMIT_SITEMAP", "true") == "true":
        request(API + "/sites/" + quote(property_url, safe="") + "/sitemaps/" + quote(SITEMAP, safe=""), "PUT")
        print("Sitemap submission accepted", flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        results = list(pool.map(lambda u: inspect(u, property_url), urls))
    counts = Counter(r["status"] for r in results)
    fields = ["url", "status", "verdict", "coverageState", "indexingState", "robotsTxtState",
              "pageFetchState", "lastCrawlTime", "googleCanonical", "userCanonical", "error"]
    (OUT / "index-status.json").write_text(json.dumps({"property": property_url, "sitemap": SITEMAP,
        "checked": len(urls), "counts": dict(counts), "urls": results}, indent=2, ensure_ascii=False))
    for filename, rows in (("index-status.csv", results), ("review-queue.csv", [r for r in results if r["status"] != "indexed"])):
        with (OUT / filename).open("w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=fields)
            writer.writeheader()
            writer.writerows(rows)
    summary = ("## CreAid Search Console Engine\n\n"
               f"- Sitemap URLs: {len(urls)}\n- Indexed (Google verdict PASS): {counts['indexed']}\n"
               f"- Review needed: {counts['review']}\n- Inspection errors: {counts['error']}\n\n"
               "Inspection reports Google's known indexed version, not a live URL test or indexing request.\n")
    print(summary, flush=True)
    with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as f:
        f.write(summary)
    if counts["error"]:
        raise RuntimeError("One or more inspections failed; see report artifact")

if __name__ == "__main__":
    main()

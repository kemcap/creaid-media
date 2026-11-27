"""Read-only Search Console query/page report; overlap signals, not proof of cannibalization."""
import csv
import json
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path
from urllib.parse import quote, urlsplit
ROOT=Path(__file__).resolve().parents[2]
PAGE_SIZE=5000
MAX_PAGES=10

def collect(request,api,property_url,start,end):
    endpoint=api+"/sites/"+quote(property_url,safe="")+"/searchAnalytics/query"
    rows=[]
    for i in range(MAX_PAGES):
        response=request(endpoint,"POST",{
            "startDate":start.isoformat(),"endDate":end.isoformat(),
            "dimensions":["query","page"],"type":"web","dataState":"final",
            "dimensionFilterGroups":[{"filters":[{"dimension":"country","operator":"equals","expression":"deu"}]}],
            "rowLimit":PAGE_SIZE,"startRow":i*PAGE_SIZE})
        batch=response.get("rows",[])
        for item in batch:
            keys=item.get("keys",[])
            if len(keys)!=2: continue
            query,page=keys
            rows.append({"query":query,"page":page,"clicks":item.get("clicks",0),"impressions":item.get("impressions",0),"ctr":item.get("ctr",0),"position":item.get("position")})
        if len(batch)<PAGE_SIZE: return rows,False
    return rows,True

def analyze(rows,assignments,routes):
    by_query=defaultdict(dict)
    targets={x["keyword"].casefold().strip():x["target"] for x in assignments if x["target"]}
    canonical=set("https://creaid-media.de"+p for p in routes.values())
    for x in rows:
        q=" ".join(x["query"].casefold().split())
        if x["page"] not in canonical: continue
        # Google returns unique query/page pairs. Repeated rows are not double-counted.
        by_query[q][x["page"]]=x
    flags=[]
    for q,by_page in by_query.items():
        group=sorted(by_page.values(),key=lambda x:x["impressions"],reverse=True)
        total=sum(x["impressions"] for x in group)
        intended="https://creaid-media.de"+targets[q] if q in targets else None
        qualifying=[x for x in group if x["impressions"]>=10 and total and x["impressions"]/total>=.2]
        if total>=30 and len(qualifying)>=2:
            flags.append({"query":q,"type":"overlap_review","target":intended,"totalImpressions":total,"pages":group})
        elif intended and total>=10 and group and group[0]["page"]!=intended:
            flags.append({"query":q,"type":"owner_mismatch_review","target":intended,"totalImpressions":total,"pages":group})
    return sorted(flags,key=lambda x:x["totalImpressions"],reverse=True)

def performance_report(request,api,property_url,out):
    assignments=json.loads((ROOT/"docs/seo/phase-3/keyword-assignments.json").read_text())
    routes=json.loads((ROOT/"src/_data/routes.json").read_text())
    end=date.today()-timedelta(days=3)
    summary=[]
    for days in (28,90):
        start=end-timedelta(days=days-1)
        rows,truncated=collect(request,api,property_url,start,end)
        flags=analyze(rows,assignments,routes)
        fields=["query","page","clicks","impressions","ctr","position"]
        with (out/f"query-page-{days}d-de.csv").open("w",newline="",encoding="utf-8-sig") as f:
            writer=csv.DictWriter(f,fieldnames=fields);writer.writeheader()
            for row in rows:
                # Prevent spreadsheet formula injection from user-generated search queries.
                safe=dict(row)
                if safe["query"].lstrip().startswith(("=","+","-","@")): safe["query"]="'"+safe["query"]
                writer.writerow(safe)
        (out/f"query-overlap-{days}d-de.json").write_text(json.dumps({
            "start":start.isoformat(),"end":end.isoformat(),"country":"DE","searchType":"web","truncated":truncated,
            "note":"Overlap or owner mismatch is a review signal, not proof of cannibalization. Search Console can omit anonymized and lower-volume data; no rows is not proof of zero searches.",
            "review":flags},ensure_ascii=False,indent=2),encoding="utf-8")
        summary.append({"days":days,"start":start.isoformat(),"end":end.isoformat(),"queryPageRows":len(rows),"reviewSignals":len(flags),"overlapSignals":sum(x["type"]=="overlap_review" for x in flags),"ownerMismatchSignals":sum(x["type"]=="owner_mismatch_review" for x in flags),"truncated":truncated})
    (out/"performance-summary.json").write_text(json.dumps(summary,indent=2),encoding="utf-8")
    return summary

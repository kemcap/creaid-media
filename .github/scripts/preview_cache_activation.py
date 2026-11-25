"""Toggle cache on an already deployed, byte-matching IONOS preview only.
No remote file deletion except temporary upload files. No regular deployment.
"""
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import stat
import uuid
from urllib.request import Request, build_opener, HTTPRedirectHandler

HOST = "https://vorschau.creaid-media.de"
MAX_FILE = 64 * 1024 * 1024

def require(ok, message):
    if not ok:
        raise RuntimeError(message)

def safe_path(value):
    require(isinstance(value, str) and re.fullmatch(r"[A-Za-z0-9_./-]+", value), "Invalid relative path.")
    p = PurePosixPath(value)
    require(not p.is_absolute() and all(x not in ("", ".", "..") for x in value.split("/")), "Unsafe relative path.")
    return value

def parents(sftp, target):
    parent = PurePosixPath(target).parent
    while str(parent) != ".":
        require(stat.S_ISDIR(sftp.lstat(str(parent)).st_mode), "Unexpected remote directory.")
        parent = parent.parent

def remote_bytes(sftp, target, missing=False):
    parents(sftp, target)
    try:
        attrs = sftp.lstat(target)
    except FileNotFoundError:
        if missing:
            return None
        raise
    require(stat.S_ISREG(attrs.st_mode) and attrs.st_size <= MAX_FILE, "Unsafe remote file: " + target)
    with sftp.open(target, "rb") as f:
        data = f.read(MAX_FILE + 1)
    require(len(data) == attrs.st_size, "Remote file changed during read: " + target)
    return data

def put_atomic(sftp, target, data, existing):
    parents(sftp, target)
    temp = str(PurePosixPath(target).parent / (".creaid-upload-" + uuid.uuid4().hex))
    try:
        with sftp.open(temp, "wx") as f:
            f.write(data)
        require(remote_bytes(sftp, temp) == data, "Temporary upload verification failed.")
        if existing:
            sftp.posix_rename(temp, target)
        else:
            sftp.rename(temp, target)
        require(remote_bytes(sftp, target) == data, "Remote content verification failed.")
    finally:
        try:
            sftp.remove(temp)
        except OSError:
            pass

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None

def verify_public(mode, homepage, asset):
    opener = build_opener(NoRedirect)
    def get(path):
        with opener.open(Request(HOST + path, headers={"Accept-Encoding": "identity", "User-Agent": "CreAid-Preview-Cache-Check/1.0"}), timeout=30) as response:
            require(response.status == 200, "Unexpected HTTPS status.")
            body = response.read(MAX_FILE + 1)
            require(len(body) <= MAX_FILE, "HTTPS body too large.")
            require("noindex" in response.headers.get("X-Robots-Tag", "").lower(), "Missing noindex.")
            return body, response.headers.get("Cache-Control", "").lower()
    body, cache = get("/")
    require(body == homepage, "Preview homepage differs from expected bytes.")
    require("no-store" in cache, "HTML must remain no-store.")
    if asset:
        url, expected = asset
        body, cache = get(url)
        require(body == expected, "Fingerprint bytes differ over HTTPS.")
        if mode == "enabled":
            require("private" in cache and "max-age=3600" in cache and "immutable" in cache and "no-store" not in cache, "Preview asset caching not active.")
        else:
            require("no-store" in cache, "Preview asset caching not disabled.")

def toggle(sftp, mode, baseline=Path("dist"), package=Path("preview-cache-package"),
           manifest_file=Path("ionos-deploy-manifest.json"), verify=verify_public):
    require(mode in ("enabled", "disabled"), "Invalid cache mode.")
    site = package / "site"
    report = json.loads((package / "report.json").read_text())
    pages = json.loads(manifest_file.read_text())["pages"]
    require(len(pages) == len(set(pages)) and "index.html" in pages, "Invalid page manifest.")
    paths = [safe_path(p) for p in pages]
    require(all(re.fullmatch(r"[a-z0-9-]+\.html", p) for p in paths), "Invalid HTML manifest.")
    original_rules = (baseline / ".htaccess").read_bytes()
    cached_rules = (site / ".htaccess").read_bytes()
    current_rules = remote_bytes(sftp, ".htaccess")
    require(current_rules in (original_rules, cached_rules), "Remote routing or access rules differ; no files changed.")
    current_enabled = current_rules == cached_rules
    current = site if current_enabled else baseline
    target = site if mode == "enabled" else baseline
    # All existing public pages must match exactly the currently selected variant.
    # A stale main build or unpublished changes abort the operation before writing.
    replacements = []
    for path in paths:
        old = (current / path).read_bytes()
        require(remote_bytes(sftp, path) == old, "Remote page differs; no files changed: " + path)
        new = (target / path).read_bytes()
        if new != old:
            replacements.append((path, old, new))
    new_assets = []
    sample = None
    for row in report["manifest"]:
        original = safe_path(row["original"].removeprefix("/"))
        hashed = safe_path(row["fingerprinted"].removeprefix("/"))
        require(original.startswith("assets/") and hashed.startswith("assets/"), "Non-asset manifest path.")
        data = (baseline / original).read_bytes()
        require(hashlib.sha256(data).hexdigest() == row["sha256"] and row["sha256"] in hashed, "Fingerprint mismatch.")
        require((site / hashed).read_bytes() == data, "Staged asset mismatch.")
        require(remote_bytes(sftp, original) == data, "Remote asset differs; no files changed: " + original)
        existing = remote_bytes(sftp, hashed, missing=True)
        require(existing is None or existing == data, "Existing fingerprint differs; no files changed.")
        if current_enabled:
            require(existing is not None, "Missing active fingerprint.")
        if mode == "enabled" and existing is None:
            new_assets.append((hashed, data))
        if sample is None and (mode == "enabled" or existing is not None):
            sample = ("/" + hashed, data)
    next_rules = cached_rules if mode == "enabled" else original_rules
    if next_rules != current_rules:
        replacements.append((".htaccess", current_rules, next_rules))
    changed = []
    try:
        # Upload new immutable URLs first; never delete or overwrite them.
        for path, data in new_assets:
            put_atomic(sftp, path, data, False)
        # Existing unversioned assets never change. HTML and policy switch last.
        for path, old, new in replacements:
            require(remote_bytes(sftp, path) == old, "Concurrent remote change; aborting.")
            changed.append((path, old, new))
            put_atomic(sftp, path, new, True)
        verify(mode, (target / "index.html").read_bytes(), sample)
    except Exception:
        failures = []
        for path, old, new in reversed(changed):
            try:
                existing = remote_bytes(sftp, path)
                require(existing in (old, new), "Concurrent update; refusing overwrite.")
                if existing != old:
                    put_atomic(sftp, path, old, True)
            except Exception:
                failures.append(path)
        if failures:
            raise RuntimeError("Preview cache operation failed; manual rollback needed for: " + ", ".join(failures)) from None
        raise
    print(json.dumps({"mode": mode, "verifiedPages": len(paths), "newFingerprints": len(new_assets),
                      "updatedFiles": len(replacements), "httpsVerified": True,
                      "oldFingerprintsRetained": True, "productionDomainChanged": False}))

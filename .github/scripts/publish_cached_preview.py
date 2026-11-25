"""Incremental cached preview deployment. Called only after the existing IONOS ownership checks."""
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import stat
import tempfile
from preview_cache_activation import require, safe_path, remote_bytes, put_atomic, verify_public, MAX_FILE

FINGERPRINT = re.compile(r"\.sha256-([0-9a-f]{64})\.(?:css|js|mjs|webp|avif|png|jpg|jpeg|gif|svg|woff2|woff|ico)$")

def optional_bytes(sftp, path):
    try:
        return remote_bytes(sftp, path, missing=True)
    except FileNotFoundError:
        return None

def checked_rules(data):
    require(data.startswith(b"# Generated from scripts/routes.mjs; preview only\n") and
            b'Header always set X-Robots-Tag "noindex, nofollow, noarchive"' in data and
            b'RewriteRule ^\\.creaid- [F,END]' in data and
            not re.search(rb"(?im)^\s*(?:AuthType|AuthUserFile|AuthBasicProvider|Require\s+(?:valid-user|user|group))\b", data),
            "Unknown or authenticated preview configuration; no changes.")

def publish_cached(sftp, site=Path("preview-cache-package/site"),
                   manifest_file=Path("ionos-deploy-manifest.json"), verify=verify_public):
    pages = json.loads(manifest_file.read_text())["pages"]
    require(len(pages) == len(set(pages)) and "index.html" in pages and
            all(re.fullmatch(r"[a-z0-9-]+\.html", p) for p in pages), "Invalid page manifest.")
    files = []
    for local in (site / "assets").rglob("*"):
        require(not local.is_symlink(), "Symlink in local assets.")
        if local.is_dir():
            continue
        require(local.is_file(), "Unexpected local asset.")
        files.append(safe_path(local.relative_to(site).as_posix()))
    paths = sorted(files, key=lambda p: (not bool(FINGERPRINT.search(p)), p)) + ["robots.txt"] + sorted(set(pages)-{"index.html"}) + ["index.html", ".htaccess"]
    checked_rules((site / ".htaccess").read_bytes())
    current_rules = optional_bytes(sftp, ".htaccess")
    if current_rules is not None:
        checked_rules(current_rules)
    changes = []
    retained = 0
    sample = None
    created_dirs = set()
    def ensure_dir(path):
        if str(path) == "." or str(path) in created_dirs:
            return
        ensure_dir(path.parent)
        try:
            attrs = sftp.lstat(str(path))
        except FileNotFoundError:
            sftp.mkdir(str(path))
            attrs = sftp.lstat(str(path))
        require(stat.S_ISDIR(attrs.st_mode), "Unsafe remote directory.")
        created_dirs.add(str(path))
    with tempfile.TemporaryDirectory(prefix="creaid-preview-rollback-") as tmp:
        backup = Path(tmp)
        # Read and compare every target before touching public files. Old immutable
        # URLs outside the new manifest remain available to clients with older HTML.
        for index, path in enumerate(paths):
            local = site / path
            require(local.is_file() and not local.is_symlink() and local.stat().st_size <= MAX_FILE, "Unsafe local target: " + path)
            data = local.read_bytes()
            fp = FINGERPRINT.search(path)
            if fp:
                require(hashlib.sha256(data).hexdigest() == fp.group(1), "Invalid candidate fingerprint.")
                if sample is None:
                    sample = ("/" + path, data)
            old = optional_bytes(sftp, path)
            if old == data:
                retained += 1
                continue
            require(not fp or old is None, "Existing fingerprint differs; refusing overwrite: " + path)
            saved = backup / str(index)
            if old is not None:
                saved.write_bytes(old)
            changes.append((path, saved if old is not None else None, bool(fp)))
        require(sample is not None, "No versioned assets to verify.")
        changed = []
        try:
            for path, saved, immutable in changes:
                old = saved.read_bytes() if saved else None
                require(optional_bytes(sftp, path) == old, "Concurrent preview update: " + path)
                ensure_dir(PurePosixPath(path).parent)
                changed.append((path, saved, immutable))
                put_atomic(sftp, path, (site / path).read_bytes(), saved is not None)
            verify("enabled", (site / "index.html").read_bytes(), sample)
        except Exception:
            failures = []
            for path, saved, immutable in reversed(changed):
                if immutable:
                    continue # valid, newly published hashes remain available
                try:
                    old = saved.read_bytes() if saved else None
                    now = optional_bytes(sftp, path)
                    new = (site / path).read_bytes()
                    require(now in (old, new), "Concurrent update; refusing rollback.")
                    if now != old:
                        if old is None:
                            sftp.remove(path)
                        else:
                            put_atomic(sftp, path, old, True)
                except Exception:
                    failures.append(path)
            if failures:
                raise RuntimeError("Preview deployment failed; manual recovery required: " + ", ".join(failures)) from None
            raise
        summary = {"mode": "auto", "verifiedPages": len(pages), "unchangedFiles": retained,
                   "uploadedFiles": len(changes), "newFingerprints": sum(x[2] for x in changes),
                   "httpsVerified": True, "oldFingerprintsRetained": True, "productionDomainChanged": False}
        print(json.dumps(summary))
        return summary

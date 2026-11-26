"""Upload only the verified preview build to the dedicated IONOS SFTP account."""
import base64
import hashlib
import json
import os
from pathlib import Path
import posixpath
import stat
import uuid
import paramiko

EXPECTED_USER = "acc1853677531"
OWNER_FILE = ".creaid-deploy-owner"
OWNER = b"kemcap/creaid-media:creaid-v11:preview:v1\n"
FINGERPRINTS = {
    "SHA256:J4oM+B2g7zZWAI3DolXR1e4vdIMrGO301kEN14/slsQ",
    "SHA256:psLDE8kfhoS9GWrc/GTrdlPvyKPcWcGZv2JxOCvwF3w",
    "SHA256:1gx2w8Rtv3wCgi7Jh8myf/KVd72cRQbow03UP8P095Q",
}
ASSET_SUFFIXES = {".css", ".js", ".webp", ".avif", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".ico", ".woff", ".woff2", ".ttf", ".otf", ".txt", ".mp4", ".webm", ".pdf"}
# Only this reviewed, non-indexable design demo may be deployed as HTML under assets.
PREVIEW_HTML_ASSETS = frozenset({"assets/demos/cookie-consent-v4.html"})
def allowed_asset(relative):
    path = Path(relative)
    return path.suffix.lower() in ASSET_SUFFIXES or path.as_posix() in PREVIEW_HTML_ASSETS

class PinnedIONOSKey(paramiko.MissingHostKeyPolicy):
    def missing_host_key(self, client, hostname, key):
        digest = "SHA256:" + base64.b64encode(hashlib.sha256(key.asbytes()).digest()).decode().rstrip("=")
        if digest not in FINGERPRINTS:
            raise RuntimeError("Unrecognized IONOS server key; connection refused.")

def require(condition, message):
    if not condition:
        raise RuntimeError(message)

def enter_preview(sftp):
    # Account may see the entire webspace. Never write in the login root.
    target = "/creaid-v11"
    require(stat.S_ISDIR(sftp.lstat(target).st_mode), "Preview path missing or not a real directory.")
    sftp.chdir(target)
    require(sftp.normalize(".") == sftp.normalize(target), "Unexpected preview directory.")
    require(stat.S_ISREG(sftp.lstat(OWNER_FILE).st_mode), "Existing preview ownership marker required.")
    with sftp.open(OWNER_FILE, "rb") as f:
        require(f.read(len(OWNER)+1) == OWNER, "Wrong preview ownership marker.")
    require(not any(n in sftp.listdir(".") for n in ("wp-admin", "wp-content", "wp-includes", "wp-config.php")), "WordPress detected.")

def release_files(dist, manifest):
    pages = [dist / name for name in manifest["pages"]]
    require(len(pages) == len(set(pages)) and dist / "index.html" in pages, "Invalid manifest.")
    assets = []
    for path in (dist / "assets").rglob("*"):
        require(not path.is_symlink(), "Symlink in local assets.")
        if path.is_dir():
            continue
        require(path.is_file() and allowed_asset(path.relative_to(dist)), "Unexpected asset type: " + path.name)
        assets.append(path)
    files = [dist / ".htaccess", dist / "robots.txt"] + sorted(assets) + sorted(p for p in pages if p.name != "index.html") + [dist / "index.html"]
    for path in files:
        require(path.is_file() and not path.is_symlink() and path.is_relative_to(dist), "Missing or unsafe local file.")
    return files

def main():
    host = os.environ["SFTP_HOST"].strip()
    user = os.environ["SFTP_USERNAME"]
    password = os.environ["SFTP_PASSWORD"]
    require(user == EXPECTED_USER, "SFTP username differs from the dedicated account confirmed in IONOS.")
    require(os.environ["SFTP_PORT"] == "22" and host.endswith(".webspace-data.io"), "Unexpected IONOS host or port.")
    require(bool(password), "Missing SFTP password.")
    cache_mode = os.environ.get("CREAID_PREVIEW_CACHE_MODE", "normal")
    require(cache_mode in ("normal", "enabled", "disabled"), "Invalid preview cache mode.")
    manifest = json.loads(Path("ionos-deploy-manifest.json").read_text())
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(PinnedIONOSKey())
    try:
        client.connect(host, port=22, username=user, password=password, look_for_keys=False, allow_agent=False, timeout=20, banner_timeout=20, auth_timeout=20)
        with client.open_sftp() as sftp:
            sftp.get_channel().settimeout(120)
            enter_preview(sftp)
            initial = {a.filename: a for a in sftp.listdir_attr(".") if a.filename not in (".", "..")}
            require(not any(n in initial for n in ("wp-admin", "wp-content", "wp-includes", "wp-config.php")), "WordPress directory detected; no upload performed.")
            if OWNER_FILE in initial:
                require(stat.S_ISREG(initial[OWNER_FILE].st_mode), "Invalid deployment marker.")
                with sftp.open(OWNER_FILE, "rb") as f:
                    require(f.read(len(OWNER)+1) == OWNER, "Deployment marker does not match.")
            else:
                require(cache_mode == "normal", "Cache activation requires an existing dedicated deployment marker.")
                require(not initial, "First upload requires an empty dedicated directory. No existing files changed.")
                with sftp.open(OWNER_FILE, "wx") as f:
                    f.write(OWNER)
            print("Dedicated preview directory verified.")
            if cache_mode != "normal":
                from preview_cache_activation import toggle
                toggle(sftp, cache_mode)
                return
            from importlib.util import spec_from_file_location, module_from_spec
            spec = spec_from_file_location("incremental", Path(__file__).with_name("incremental-ionos.py"))
            incremental = module_from_spec(spec)
            spec.loader.exec_module(incremental)
            rules = incremental.read(sftp, ".htaccess", 1024 * 1024)
            dist = Path("preview-cache-package/site") if incremental.cache_enabled(rules) else Path("dist")
            files = release_files(dist, manifest)
            incremental.deploy(sftp, files, dist, manifest, os.environ.get("CREAID_INCREMENTAL_MODE", "apply"))
    finally:
        client.close()
if __name__ == "__main__":
    main()

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
ASSET_SUFFIXES = {".css", ".js", ".mjs", ".webp", ".avif", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".ico", ".woff", ".woff2", ".ttf", ".otf", ".txt", ".mp4", ".webm", ".pdf"}
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

def main():
    host = os.environ["SFTP_HOST"].strip()
    user = os.environ["SFTP_USERNAME"]
    password = os.environ["SFTP_PASSWORD"]
    require(user == EXPECTED_USER, "SFTP username differs from the dedicated account confirmed in IONOS.")
    require(os.environ["SFTP_PORT"] == "22" and host.endswith(".webspace-data.io"), "Unexpected IONOS host or port.")
    require(bool(password), "Missing SFTP password.")
    cache_mode = os.environ.get("CREAID_PREVIEW_CACHE_MODE", "normal")
    require(cache_mode in ("auto", "normal", "enabled", "disabled"), "Invalid preview cache mode.")
    dist = Path("dist")
    manifest = json.loads(Path("ionos-deploy-manifest.json").read_text())
    pages = [dist / name for name in manifest["pages"]]
    require(len(pages) == len(set(pages)) and dist / "index.html" in pages, "Invalid manifest.")
    assets = []
    for path in (dist / "assets").rglob("*"):
        require(not path.is_symlink(), "Symlink in local assets.")
        if path.is_dir():
            continue
        require(path.is_file() and path.suffix.lower() in ASSET_SUFFIXES, "Unexpected asset type: " + path.name)
        assets.append(path)
    files = [dist / ".htaccess", dist / "robots.txt"] + sorted(assets) + sorted(p for p in pages if p.name != "index.html") + [dist / "index.html"]
    for path in files:
        require(path.is_file() and not path.is_symlink() and path.is_relative_to(dist), "Missing or unsafe local file.")
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
                require(cache_mode in ("normal", "auto"), "Cache activation requires an existing dedicated deployment marker.")
                require(not initial, "First upload requires an empty dedicated directory. No existing files changed.")
                with sftp.open(OWNER_FILE, "wx") as f:
                    f.write(OWNER)
            print("Dedicated preview directory verified.")
            if cache_mode == "auto":
                from publish_cached_preview import publish_cached
                publish_cached(sftp)
                return
            if cache_mode != "normal":
                from preview_cache_activation import toggle
                toggle(sftp, cache_mode)
                return
            checked_dirs = {"."}
            def ensure_dir(path):
                if path in checked_dirs:
                    return
                ensure_dir(posixpath.dirname(path) or ".")
                try:
                    attrs = sftp.lstat(path)
                except FileNotFoundError:
                    sftp.mkdir(path)
                    attrs = sftp.lstat(path)
                require(stat.S_ISDIR(attrs.st_mode), "Remote directory is not a real directory.")
                checked_dirs.add(path)
            uploaded = 0
            for path in files:
                target = path.relative_to(dist).as_posix()
                ensure_dir(posixpath.dirname(target) or ".")
                exists = False
                try:
                    attrs = sftp.lstat(target)
                    exists = True
                    require(stat.S_ISREG(attrs.st_mode), "Unsafe existing remote target.")
                except FileNotFoundError:
                    pass
                temp = posixpath.join(posixpath.dirname(target), ".creaid-upload-" + uuid.uuid4().hex)
                try:
                    sftp.put(str(path), temp, confirm=True)
                    if exists:
                        # Never delete an old file to replace it. Fail safely if atomic overwrite is unavailable.
                        sftp.posix_rename(temp, target)
                    else:
                        sftp.rename(temp, target)
                    require(sftp.lstat(target).st_size == path.stat().st_size, "Remote size verification failed.")
                    uploaded += 1
                except Exception:
                    try:
                        sftp.remove(temp)
                    except OSError:
                        pass
                    raise
            print(f"Uploaded and size-verified {uploaded} files, including {len(pages)} pages. No unrelated files deleted. Preview remains noindex.")
    finally:
        client.close()
if __name__ == "__main__":
    main()

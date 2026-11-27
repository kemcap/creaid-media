"""Update the private contact core for the existing IONOS preview."""

import hashlib
import importlib.util
import json
import os
from pathlib import Path
import stat

import paramiko

spec = importlib.util.spec_from_file_location(
    "turnstile_install", Path(__file__).with_name("activate-contact-turnstile.py")
)
existing = importlib.util.module_from_spec(spec)
spec.loader.exec_module(existing)
require = existing.require
uploader = existing.u

# Core published by the successful Turnstile activation run for bd6d9305.
BASELINE_SHA256 = "a7b288ea60b38a43656ce24319a7f2fdec18345419dc2c653c83a13d9de16108"


def update(sftp, candidate):
    uploader.enter_preview(sftp)
    require(stat.S_ISDIR(sftp.lstat(existing.PRIVATE).st_mode), "Private directory is unsafe.")
    deny, _ = existing.read(sftp, existing.PRIVATE + "/.htaccess")
    require(deny.strip() == b"Require all denied", "Unexpected private directory rules.")
    path = existing.PRIVATE + "/core.php"
    before, mode = existing.read(sftp, path)
    require(
        before == candidate or hashlib.sha256(before).hexdigest() == BASELINE_SHA256,
        "The current private PHP version differs from the verified baseline.",
    )
    try:
        if before != candidate:
            existing.put(sftp, path, candidate, mode)
        require(existing.read(sftp, path) == (candidate, mode), "Private PHP verification failed.")
        # The empty request has no Origin and fails before SMTP or CRM can run.
        code, headers, body = existing.http(
            existing.SITE + "/api/contact.php",
            b"{}",
            {"Content-Type": "application/json", "Accept": "application/json"},
        )
        require(
            code == 403 and json.loads(body) == {"ok": False, "status": "origin"}
            and "no-store" in headers.get("Cache-Control", ""),
            "The live endpoint did not confirm the expected rejection.",
        )
    except Exception:
        current, _ = existing.read(sftp, path)
        require(current in (before, candidate), "Concurrent private PHP change. Inspect before rollback.")
        if current != before:
            existing.put(sftp, path, before, mode)
        raise
    print("Updated and verified the private IONOS preview contact core. No email or CRM record created.")


def main():
    host = os.environ["SFTP_HOST"].strip()
    user = os.environ["SFTP_USERNAME"]
    password = os.environ["SFTP_PASSWORD"]
    require(
        user == uploader.EXPECTED_USER and host.endswith(".webspace-data.io")
        and os.environ["SFTP_PORT"] == "22" and bool(password),
        "Unexpected IONOS preview connection.",
    )
    candidate = Path("backend/contact/core.php").read_bytes()
    with paramiko.SSHClient() as client:
        client.set_missing_host_key_policy(uploader.PinnedIONOSKey())
        client.connect(host, port=22, username=user, password=password, look_for_keys=False,
                       allow_agent=False, timeout=20, banner_timeout=20, auth_timeout=20)
        with client.open_sftp() as sftp:
            sftp.get_channel().settimeout(60)
            update(sftp, candidate)


if __name__ == "__main__":
    main()

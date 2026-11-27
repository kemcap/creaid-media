"""Explicit production contact migration. No secrets printed; no valid submission."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import stat
import sys

import paramiko

spec = importlib.util.spec_from_file_location(
    "activation", Path(__file__).with_name("activate-contact-turnstile.py")
)
a = importlib.util.module_from_spec(spec)
spec.loader.exec_module(a)
require = a.require
SITE = "https://creaid-media.de"
PRIVATE = a.PRIVATE
PREVIEW = "https://vorschau.creaid-media.de"
CORE_BLOB = "0050c06c15b1d806d25507e5b32912b5955e287e"
PREVIEW_CORE_HASH = "a7b288ea60b38a43656ce24319a7f2fdec18345419dc2c653c83a13d9de16108"

def git_blob(data):
    return hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()

def migrate_config(old):
    # Fail closed on an unfamiliar format. Do not alter SMTP, CRM, keys or recipient.
    require(re.search(rb"'enabled'\s*=>\s*true\b", old), "Contact is disabled.")
    require(re.search(rb"'turnstile_required'\s*=>\s*true\b", old), "Spam protection is not enabled.")
    require(re.search(rb"'turnstile_hostname'\s*=>\s*'vorschau\.creaid-media\.de'\s*,", old),
            "Unexpected existing Turnstile host.")
    pattern = rb"'allowed_origins'\s*=>\s*\[([^\]]*)\]\s*,"
    matches = list(re.finditer(pattern, old))
    require(len(matches) == 1, "Unexpected origin configuration.")
    values = matches[0].group(1)
    require(re.fullmatch(rb"\s*'https://vorschau\.creaid-media\.de'\s*(?:,\s*'https://creaid-media\.de'\s*)?,?\s*", values),
            "Origin list differs from reviewed baseline.")
    new = re.sub(pattern, b"'allowed_origins' => ['https://vorschau.creaid-media.de', 'https://creaid-media.de'],", old)
    hosts = b"'turnstile_hostnames' => ['vorschau.creaid-media.de', 'creaid-media.de'],"
    if b"'turnstile_hostnames'" in new:
        require(new.count(b"'turnstile_hostnames'") == 1 and hosts in new, "Unexpected Turnstile host list.")
    else:
        require(new.rstrip().endswith(b"];"), "Unknown config ending.")
        new = new.rstrip()[:-2] + b"    " + hosts + b"\n];\n"
    return new

def probe():
    code, headers, body = a.http(SITE + "/api/contact.php")
    require(code == 405 and json.loads(body) == {"ok": False, "status": "method"}
            and "no-store" in headers.get("Cache-Control", ""), "Production API GET probe failed.")

def update(sftp):
    a.u.enter_preview(sftp)
    require(stat.S_ISDIR(sftp.lstat(PRIVATE).st_mode), "Unsafe private directory.")
    deny, _ = a.read(sftp, PRIVATE + "/.htaccess")
    require(deny.strip() == b"Require all denied", "Unexpected private directory protection.")
    code, _, _ = a.http(SITE + "/creaid-contact-private/zugriffstest.txt")
    require(code in (403, 404), "Private directory accessible on production.")
    probe()
    config_path, core_path = PRIVATE + "/config.php", PRIVATE + "/core.php"
    old_config, config_mode = a.read(sftp, config_path)
    old_core, core_mode = a.read(sftp, core_path)
    require(config_mode == 0o600, "Unexpected private config permissions.")
    new_config = migrate_config(old_config)
    new_core = Path("backend/contact/core.php").read_bytes()
    require(old_core == new_core or git_blob(old_core) == CORE_BLOB
            or hashlib.sha256(old_core).hexdigest() == PREVIEW_CORE_HASH,
            "Private core differs from reviewed baseline.")
    applied = []
    try:
        for path, before, after, mode in ((core_path, old_core, new_core, core_mode),
                                          (config_path, old_config, new_config, config_mode)):
            if before != after:
                a.put(sftp, path, after, mode)
                applied.append((path, before, after, mode))
            require(a.read(sftp, path) == (after, mode), "Private file verification failed.")
        probe()
        # Invalid empty fields cannot reach the mailer even if CAPTCHA is misconfigured.
        code, headers, body = a.http(SITE + "/api/contact.php", b"{}", {
            "Origin": SITE, "Content-Type": "application/json", "Accept": "application/json"})
        # An empty JSON object is rejected before any delivery.
        require(code in (400, 422) and json.loads(body).get("status") in ("invalid_json", "invalid_fields")
                and "no-store" in headers.get("Cache-Control", ""), "Production origin validation failed.")
    except Exception:
        for path, before, after, mode in reversed(applied):
            require(a.read(sftp, path) == (after, mode), "Concurrent private change; manual review needed.")
            a.put(sftp, path, before, mode)
        raise
    print("Production contact origin and private core verified. No email or CRM submission.")

def self_test():
    sample = b"<?php return [\n 'enabled' => true,\n 'turnstile_required' => true,\n 'allowed_origins' => ['https://vorschau.creaid-media.de'],\n 'turnstile_hostname' => 'vorschau.creaid-media.de',\n 'smtp_password' => 'test-only',\n];\n"
    migrated = migrate_config(sample)
    assert b"'smtp_password' => 'test-only'" in migrated
    assert b"'https://creaid-media.de'" in migrated
    assert migrate_config(migrated) == migrated
    try:
        migrate_config(sample.replace(b"'turnstile_required' => true", b"'turnstile_required' => false"))
    except RuntimeError:
        pass
    else:
        raise AssertionError("Unprotected migration was accepted")
    print("Configuration migration tests passed.")

def main():
    host = os.environ["SFTP_HOST"].strip()
    user = os.environ["SFTP_USERNAME"]
    require(user == a.u.EXPECTED_USER and host.endswith(".webspace-data.io")
            and os.environ["SFTP_PORT"] == "22" and bool(os.environ["SFTP_PASSWORD"]),
            "Unexpected IONOS connection.")
    with paramiko.SSHClient() as client:
        client.set_missing_host_key_policy(a.u.PinnedIONOSKey())
        client.connect(host, port=22, username=user, password=os.environ["SFTP_PASSWORD"],
                       look_for_keys=False, allow_agent=False, timeout=20, banner_timeout=20, auth_timeout=20)
        with client.open_sftp() as sftp:
            sftp.get_channel().settimeout(60)
            update(sftp)

if __name__ == "__main__":
    try:
        if "--self-test" in sys.argv:
            self_test()
        else:
            main()
    except Exception as exc:
        print("Production contact migration stopped: " + (str(exc) if isinstance(exc, RuntimeError) else type(exc).__name__))
        raise SystemExit(1)

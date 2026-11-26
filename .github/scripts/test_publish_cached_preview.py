import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from test_preview_cache_activation import LocalSFTP
from publish_cached_preview import publish_cached

RULES = b'# Generated from scripts/routes.mjs; preview only\nRewriteRule ^\\.creaid- [F,END]\nHeader always set X-Robots-Tag "noindex, nofollow, noarchive"\n'
class FakeSFTP(LocalSFTP):
    def mkdir(self, name):
        (self.root / name).mkdir()

class PublishTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.site = self.root / "site"
        self.remote = self.root / "remote"
        self.remote.mkdir()
        self.site.mkdir()
        (self.site / "assets").mkdir()
        self.manifest = self.root / "manifest.json"
        self.manifest.write_text(json.dumps({"pages": ["index.html"]}))
        self.sftp = FakeSFTP(self.remote)
    def build(self, data, text="hello"):
        for f in (self.site / "assets").iterdir():
            f.unlink()
        digest = hashlib.sha256(data).hexdigest()
        hashed = "assets/app.sha256-" + digest + ".css"
        (self.site / hashed).write_bytes(data)
        (self.site / "assets/app.css").write_bytes(data)
        (self.site / "index.html").write_text('<link href="/'+hashed+'">'+text)
        (self.site / ".htaccess").write_bytes(RULES)
        (self.site / "robots.txt").write_text("User-agent: *\nDisallow: /\n")
        return hashed
    def publish(self, verify=lambda *args: None):
        return publish_cached(self.sftp, self.site, self.manifest, verify)
    def test_initial_and_incremental_updates(self):
        old = self.build(b"body{color:red}")
        self.assertEqual(self.publish()["newFingerprints"], 1)
        result = self.publish()
        self.assertEqual(result["uploadedFiles"], 0)
        self.build(b"body{color:red}", "changed text")
        self.assertEqual(self.publish()["uploadedFiles"], 1)
        new = self.build(b"body{color:blue}")
        result = self.publish()
        self.assertEqual(result["newFingerprints"], 1)
        self.assertTrue((self.remote / old).exists())
        self.assertTrue((self.remote / new).exists())
        self.assertEqual((self.remote / "index.html").read_bytes(), (self.site / "index.html").read_bytes())
    def test_rollback_after_http_failure(self):
        old = self.build(b"body{color:red}")
        self.publish()
        html = (self.remote / "index.html").read_bytes()
        new = self.build(b"body{color:blue}")
        def failure(*args):
            raise RuntimeError("HTTPS failure")
        with self.assertRaisesRegex(RuntimeError, "HTTPS failure"):
            self.publish(failure)
        self.assertEqual((self.remote / "index.html").read_bytes(), html)
        self.assertEqual((self.remote / "assets/app.css").read_bytes(), b"body{color:red}")
        self.assertTrue((self.remote / old).exists())
        self.assertTrue((self.remote / new).exists())
    def test_corrupt_existing_fingerprint_aborts(self):
        name = self.build(b"body{color:red}")
        self.publish()
        (self.remote / name).write_bytes(b"tampered")
        with self.assertRaisesRegex(RuntimeError, "Existing fingerprint differs"):
            self.publish()
        self.assertEqual((self.remote / name).read_bytes(), b"tampered")
    def test_unknown_config_aborts(self):
        self.build(b"body{color:red}")
        (self.remote / ".htaccess").write_bytes(b"AuthType Basic")
        with self.assertRaisesRegex(RuntimeError, "Unknown or authenticated"):
            self.publish()
        self.assertFalse((self.remote / "index.html").exists())
    def test_symlink_aborts(self):
        self.build(b"body{color:red}")
        outside = self.root / "outside"
        outside.mkdir()
        (self.remote / "assets").symlink_to(outside, target_is_directory=True)
        with self.assertRaises(RuntimeError):
            self.publish()
        self.assertEqual(list(outside.iterdir()), [])
if __name__ == "__main__":
    unittest.main()

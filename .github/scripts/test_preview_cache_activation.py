import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from preview_cache_activation import toggle

class LocalSFTP:
    def __init__(self, root):
        self.root = root
    def lstat(self, name):
        return (self.root / name).lstat()
    def open(self, name, mode):
        return (self.root / name).open("xb" if mode == "wx" else mode)
    def posix_rename(self, old, new):
        (self.root / old).replace(self.root / new)
    def rename(self, old, new):
        if (self.root / new).exists():
            raise FileExistsError(new)
        (self.root / old).rename(self.root / new)
    def remove(self, name):
        (self.root / name).unlink()

class CacheToggleTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        self.baseline = root / "dist"
        self.package = root / "package"
        self.remote = root / "remote"
        self.site = self.package / "site"
        self.manifest = root / "manifest.json"
        data = b"body{color:red}"
        digest = hashlib.sha256(data).hexdigest()
        self.hashed = "assets/app.sha256-" + digest + ".css"
        self.original = b'<link href="/assets/app.css">'
        self.optimized = self.original.replace(b"assets/app.css", self.hashed.encode())
        for folder in (self.baseline, self.site, self.remote):
            (folder / "assets").mkdir(parents=True)
            (folder / "assets/app.css").write_bytes(data)
            (folder / ".htaccess").write_bytes(b"baseline")
            (folder / "index.html").write_bytes(self.original)
        (self.site / ".htaccess").write_bytes(b"cache")
        (self.site / "index.html").write_bytes(self.optimized)
        (self.site / self.hashed).write_bytes(data)
        self.manifest.write_text(json.dumps({"pages": ["index.html"]}))
        (self.package / "report.json").write_text(json.dumps({"manifest": [
            {"original": "/assets/app.css", "fingerprinted": "/" + self.hashed, "sha256": digest}
        ]}))
        self.sftp = LocalSFTP(self.remote)

    def run_toggle(self, mode, verify=lambda *args: None):
        toggle(self.sftp, mode, self.baseline, self.package, self.manifest, verify)

    def test_enable_disable(self):
        seen = []
        self.run_toggle("enabled", lambda *args: seen.append(args))
        self.assertEqual((self.remote / "index.html").read_bytes(), self.optimized)
        self.assertEqual((self.remote / ".htaccess").read_bytes(), b"cache")
        self.assertTrue((self.remote / self.hashed).exists())
        self.assertEqual(seen[0][0], "enabled")
        self.run_toggle("disabled")
        self.assertEqual((self.remote / "index.html").read_bytes(), self.original)
        self.assertEqual((self.remote / ".htaccess").read_bytes(), b"baseline")
        self.assertTrue((self.remote / self.hashed).exists())

    def test_mismatch_stops_before_upload(self):
        (self.remote / "index.html").write_bytes(b"different deployment")
        with self.assertRaisesRegex(RuntimeError, "Remote page differs"):
            self.run_toggle("enabled")
        self.assertFalse((self.remote / self.hashed).exists())
        self.assertEqual((self.remote / "index.html").read_bytes(), b"different deployment")

    def test_failed_https_rolls_back(self):
        def bad(*args):
            raise RuntimeError("simulated HTTPS check failed")
        with self.assertRaisesRegex(RuntimeError, "simulated HTTPS"):
            self.run_toggle("enabled", bad)
        self.assertEqual((self.remote / "index.html").read_bytes(), self.original)
        self.assertEqual((self.remote / ".htaccess").read_bytes(), b"baseline")
        self.assertTrue((self.remote / self.hashed).exists())

    def test_existing_fingerprint_never_overwritten(self):
        (self.remote / self.hashed).write_bytes(b"tampered")
        with self.assertRaisesRegex(RuntimeError, "Existing fingerprint differs"):
            self.run_toggle("enabled")
        self.assertEqual((self.remote / self.hashed).read_bytes(), b"tampered")
        self.assertEqual((self.remote / "index.html").read_bytes(), self.original)

if __name__ == "__main__":
    unittest.main()

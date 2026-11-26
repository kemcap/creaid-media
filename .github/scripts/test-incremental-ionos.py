import importlib.util,unittest
from pathlib import Path
from types import SimpleNamespace
spec=importlib.util.spec_from_file_location('incremental',Path(__file__).with_name('incremental-ionos.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Tests(unittest.TestCase):
    def test_hash_and_state(self):
        attrs=SimpleNamespace(st_size=5,st_mtime=12)
        digest=m.sha(b'hello')
        row={**m.fingerprint(attrs),'sha256':digest}
        self.assertTrue(m.state_matches(row,attrs,digest))
        self.assertFalse(m.state_matches(row,attrs,m.sha(b'other')))
        self.assertFalse(m.state_matches(row,SimpleNamespace(st_size=5,st_mtime=13),digest))
        self.assertFalse(m.state_matches({},attrs,digest))
    def test_scope(self):
        for p in ('index.html','assets/blog/example.webp','robots.txt','kontakt.html'):self.assertEqual(m.safe_path(p),p)
        for p in ('../wp-config.php','/assets/a.js','assets/../../config.php','assets/.hidden','api/contact.php','config.php'):
            with self.assertRaises(RuntimeError):m.safe_path(p)
    def test_public_url(self):
        self.assertEqual(m.public_path('kontakt.html',{'kontakt.html':'/kontakt'}),'/kontakt')
        self.assertEqual(m.public_path('assets/a b.webp',{}),'/assets/a%20b.webp')
if __name__=='__main__':unittest.main()

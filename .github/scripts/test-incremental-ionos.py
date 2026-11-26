import importlib.util,unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import patch
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
    def test_cache_policy(self):
        self.assertFalse(m.cache_enabled(b'# stock preview'))
        self.assertTrue(m.cache_enabled(b'\n'.join(m.CACHE_MARKERS)))
        with self.assertRaisesRegex(RuntimeError,'Incomplete'):
            m.cache_enabled(m.CACHE_MARKERS[0])
    def test_verify_cache_headers(self):
        with TemporaryDirectory() as temp:
            asset=Path(temp)/'styles.css'
            data=b'.example { color: black; }'
            asset.write_bytes(data)
            files={'assets/styles.sha256-'+m.sha(data)+'.css':asset}
            cache_headers={'X-Robots-Tag':'noindex','Cache-Control':'private, max-age=3600, immutable'}
            html=(200,{'Cache-Control':'no-store'},b'')
            with patch.object(m,'get',side_effect=[(200,cache_headers,data),html]):
                m.verify_cache_policy(files)
            with patch.object(m,'get',return_value=(200,{**cache_headers,'Cache-Control':'public, max-age=3600, immutable'},data)):
                with self.assertRaisesRegex(RuntimeError,'private cache'):
                    m.verify_cache_policy(files)
            with patch.object(m,'get',side_effect=[(200,cache_headers,data),(200,cache_headers,b'')]):
                with self.assertRaisesRegex(RuntimeError,'HTML lost no-store'):
                    m.verify_cache_policy(files)
if __name__=='__main__':unittest.main()

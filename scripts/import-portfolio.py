"""Create local responsive WebP copies; fail closed on changed or unexpected originals."""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlparse
from io import BytesIO
import hashlib, json
from PIL import Image, ImageOps
data=json.loads(Path('src/_data/portfolio.json').read_text())
assert len(data['items'])==16
out=Path('public/assets/portfolio')
out.mkdir(parents=True,exist_ok=True)
total=0
for item in data['items']:
    source=item['source']
    p=urlparse(source)
    assert p.scheme=='https' and p.hostname=='creaid-media.de' and p.path.startswith('/wp-content/uploads/')
    with urlopen(Request(source,headers={'User-Agent':'CreAid-Media portfolio migration','Accept-Encoding':'identity'}),timeout=30) as response:
        assert urlparse(response.geturl()).hostname=='creaid-media.de'
        blob=response.read(5*1024*1024+1)
    assert len(blob)<=5*1024*1024
    digest=hashlib.sha256(blob).hexdigest()
    if digest!=item['sha256']:
        raise ValueError('Original differs from verified backup: '+item['id']+' '+digest)
    with Image.open(BytesIO(blob)) as src:
        assert src.size==(item['width'],item['height'])
        image=ImageOps.exif_transpose(src).convert('RGB')
        for key,max_width,quality in [('small',640,83),('large',1600,88)]:
            target=Path('public'+item[key])
            assert target.parent==out
            result=image.copy()
            if result.width>max_width:
                result.resize((max_width,round(result.height*max_width/result.width)),Image.Resampling.LANCZOS).save(target,'WEBP',quality=quality,method=6)
            else:
                result.save(target,'WEBP',quality=quality,method=6)
            total+=target.stat().st_size
    print(item['id'], 'verified', flush=True)
print('32 local WebP files:',total,'bytes')

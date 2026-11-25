import io,hashlib,urllib.request
from pathlib import Path
from PIL import Image,ImageOps
url='https://creaid-media.de/wp-content/uploads/2024/10/Creative-Media-Nurse.jpg'
req=urllib.request.Request(url,headers={'User-Agent':'CreAid-Media original media migration'})
with urllib.request.urlopen(req,timeout=30) as r: data=r.read(5_000_000)
assert hashlib.sha256(data).hexdigest()=='6ce1373c7937c5d1911e51530b7d9028363535d590fede0de10743eff80f9993','Original image checksum mismatch'
im=ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert('RGB')
assert im.size==(1500,1500)
folder=Path('public/assets/portfolio')
for width in (600,1200):
    img=im.copy()
    img.thumbnail((width,width),Image.Resampling.LANCZOS)
    path=folder/f'creative-media-nurse-{width}.webp'
    img.save(path,'WEBP',quality=84,method=6)
    print('ORIGINAL_HERO',path,img.size,path.stat().st_size)
page=Path('src/pages/index.njk')
s=page.read_text()
assert 'editorial-ratgeber-1200.webp' in s
s=s.replace('editorial-ratgeber-1200.webp','creative-media-nurse-1200.webp',2).replace('editorial-ratgeber-600.webp','creative-media-nurse-600.webp',1)
s=s.replace('alt="Aufgeschlagenes Ratgebermagazin mit redaktionell gestalteten Doppelseiten" width="1200" height="900"','alt="Lächelnde Frau im weißen Kittel mit pinken Farbspuren am Computer" width="1200" height="1200"')
s=s.replace('<span>01 / EDITORIAL &amp; PRINT</span><span>Aus unserem bisherigen Portfolio</span>','<span>CREAID-MEDIA / ERSTE HILFE FÜR IHRE MARKE</span><span>Illustratives Markenmotiv</span>')
page.write_text(s)
css=Path('public/assets/home-editorial.css')
s=css.read_text().replace('.cm-home-editorial .cm-home-hero-image img{aspect-ratio:4/3;object-fit:cover}', '.cm-home-editorial .cm-home-hero-image img{aspect-ratio:1/1;object-fit:contain}')
css.write_text(s)

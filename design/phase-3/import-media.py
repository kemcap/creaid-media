import hashlib, io, json, pathlib, shutil, urllib.request
from PIL import Image, ImageOps
root=pathlib.Path('.')
draft=root/'design/phase-3'
media=root/'public/assets/portfolio'
media.mkdir(parents=True,exist_ok=True)
dimensions={}
for item in json.loads((draft/'media-manifest.json').read_text()):
    url='https://creaid-media.de/wp-content/uploads/'+item['path']
    req=urllib.request.Request(url,headers={'User-Agent':'CreAid-Media portfolio migration'})
    with urllib.request.urlopen(req,timeout=30) as response:
        data=response.read(10_000_000)
    if hashlib.sha256(data).hexdigest()!=item['sha256']:
        raise RuntimeError('Original archive checksum mismatch: '+item['path'])
    im=ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert('RGB')
    for width in (600,1200):
        img=im.copy()
        img.thumbnail((width,10000),Image.Resampling.LANCZOS)
        img.save(media/(item['slug']+'-'+str(width)+'.webp'),'WEBP',quality=84,method=6)
        if width==1200: dimensions[item['slug']]=img.size
    print('VERIFIED ORIGINAL',item['path'],dimensions[item['slug']])
# Replace template image dimensions with actual local encoded dimensions.
template=(draft/'index.njk').read_text()
import re
for slug,(w,h) in dimensions.items():
    template=re.sub(r'(<img src="/assets/portfolio/'+re.escape(slug)+r'-1200\.webp"[^>]*?)width="[^"]+" height="[^"]+"',lambda m:m.group(1)+f'width="{w}" height="{h}"',template,count=1)
(root/'src/pages/index.njk').write_text(template)
shutil.copyfile(draft/'home-editorial.css',root/'public/assets/home-editorial.css')
meta_path=root/'src/_data/pages.json'
meta=json.loads(meta_path.read_text())
meta['index']['extraHead']=meta['index']['extraHead'].replace('<script defer="" src="/assets/home-motion-v5.js"></script>','')+'\n<link rel="stylesheet" href="/assets/home-editorial.css">'
meta_path.write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
plan_path=root/'src/_data/headingPlan.json'
plan=json.loads(plan_path.read_text())
plan['index']['h2']=['Leistungen unserer Werbeagentur','Arbeitsproben und Portfolio','Unsere Arbeitsweise','Webdesign und digitale Lösungen für Branchen','Ratgeber aus dem Journal','Häufige Fragen zur Werbeagentur','Beratung für Ihr nächstes Projekt']
plan_path.write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n')
check=root/'scripts/check-hero-experience.mjs'
s=check.read_text()
old='assert.ok(index.includes(\'class="motion-track track-statement-contact"\'),\'Mask scroll scene must stay intact\');'
assert old in s
s=s.replace(old,'assert.ok(index.includes(\'class="cm-home-editorial"\')&&!index.includes(\'track-statement-contact\'),\'Homepage must use natural editorial flow\');')
check.write_text(s)

#!/usr/bin/env python3
"""Inspect every route's rendered OnPage metadata and the 36 Phase-4 pages.
Reads generated HTML or HTTPS; no form submissions or external writes."""
import argparse,json,re,gzip,zlib
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request,urlopen

ROOT=Path(__file__).resolve().parent.parent
ORIGIN="https://creaid-media.de"
routes=json.loads((ROOT/"src/_data/routes.json").read_text())
metadata=json.loads((ROOT/"src/_data/pages.json").read_text())
owners=json.loads((ROOT/"docs/seo/phase-3/page-ownership.json").read_text())
scope={x["pageKey"] for x in owners if x["role"] in ("service","navigation")}
services={x["pageKey"] for x in owners if x["role"]=="service"}
unconfirmed={"server-wartung","cloud-hosting-3","cs-cart-lizenz-reseller","cs-cart-konfiguration-einrichtung","store-builder-standardlizenzen"}
class Page(HTMLParser):
    def __init__(self,html):
        super().__init__(convert_charrefs=True)
        self.titles=[]; self.title=False; self.metas={};self.canonicals=[];self.schemas=[];self.ld=False;self.buf=[]
        self.main=0;self.heading=None;self.headings=[];self.text=[];self.skip=0
        self.feed(html);self.close()
    def handle_starttag(self,t,attrs):
        a=dict(attrs)
        if t=="title":self.title=True;self.buf=[]
        if t=="meta":
            key=a.get("name") or a.get("property")
            if key:self.metas.setdefault(key,[]).append(a.get("content",""))
        if t=="link" and "canonical" in a.get("rel","").split():self.canonicals.append(a.get("href"))
        if t=="main":self.main+=1
        if t=="script" and a.get("type")=="application/ld+json":self.ld=True;self.buf=[]
        if t in ("script","style"):self.skip+=1
        if self.main and re.fullmatch(r"h[1-6]",t):self.heading=[t,[]]
    def handle_endtag(self,t):
        if t=="title" and self.title:self.titles.append("".join(self.buf));self.title=False
        if t=="script" and self.ld:
            self.schemas.append(json.loads("".join(self.buf)));self.ld=False
        if t in ("script","style"):self.skip=max(0,self.skip-1)
        if t=="main":self.main=max(0,self.main-1)
        if self.heading and t==self.heading[0]:
            self.headings.append([t," ".join("".join(self.heading[1]).split())]);self.heading=None
    def handle_data(self,data):
        if self.title or self.ld:self.buf.append(data)
        if self.main and not self.skip:
            self.text.append(data)
            if self.heading:self.heading[1].append(data)
def load(key,live,dist):
    if not live:return (dist/(key+".html")).read_text(encoding="utf-8")
    url=ORIGIN+routes[key]
    with urlopen(Request(url,headers={"User-Agent":"CreAid-OnPage-QA/4.0","Accept-Encoding":"gzip, deflate"}),timeout=30) as r:
        assert r.geturl()==url and r.status==200,(url,r.geturl(),r.status)
        b=r.read();enc=r.headers.get("Content-Encoding","").lower()
        if enc=="gzip":b=gzip.decompress(b)
        elif enc=="deflate":
            try:b=zlib.decompress(b)
            except zlib.error:b=zlib.decompress(b,-zlib.MAX_WBITS)
        return b.decode("utf-8")
def main():
    ap=argparse.ArgumentParser();ap.add_argument("--live",action="store_true");ap.add_argument("--dist",type=Path,default=ROOT/"dist");ap.add_argument("--output",type=Path,required=True);ap.add_argument("--baseline",action="store_true");a=ap.parse_args()
    keys=list(routes)
    rows=[];errors=[]
    def check(k):
        m=metadata[k];p=Page(load(k,a.live,a.dist));e=[]
        title=m["title"];desc=m["description"];canonical=ORIGIN+routes[k]
        if not a.baseline:
            for actual,expected,label in ((p.titles,[title],"title"),(p.metas.get("description"),[desc],"description"),(p.canonicals,[canonical],"canonical"),(p.metas.get("og:title"),[title],"og:title"),(p.metas.get("og:description"),[desc],"og:description"),(p.metas.get("og:url"),[canonical],"og:url")):
                if actual!=expected:e.append(label)
        if not p.titles or not p.metas.get("description"):e.append("missing metadata")
        h1=[h for t,h in p.headings if t=="h1"]
        if len(h1)!=1:e.append("H1 count")
        visible=" ".join(p.text)
        words=len(re.findall(r"[^\W\d_]+(?:[-’'][^\W\d_]+)*",visible,re.UNICODE))
        if not a.baseline and k in scope:
            if not (0<len(title)<=70 and 100<=len(desc)<=160):e.append("editorial snippet bounds")
            expected=json.loads(m["structuredData"]) if m.get("structuredData") else None
            if expected is None or expected not in p.schemas:e.append("schema not rendered")
            if expected and k in services:
                if k in unconfirmed:
                    if expected.get("@type")!="WebPage":e.append("unconfirmed service schema")
                elif expected.get("@type")!="Service" or expected.get("provider",{}).get("@id")!=ORIGIN+"/#organization":e.append("service provider identity")
                if expected.get("description")!=desc or expected.get("url")!=canonical:e.append("schema metadata mismatch")
            if k in services and "Wir klären anhand des konkreten Vorhabens, welche Umsetzung sinnvoll und machbar ist." in visible:e.append("generic legacy paragraph")
            if k in services and "Beschreiben Sie Ihre Ausgangslage, verwendete Systeme, Ziel, vorhandene Zugänge" in visible:e.append("generic legacy briefing")
        return {"pageKey":k,"url":routes[k],"scope":k in scope,"service":k in services,"title":p.titles[0] if p.titles else None,"description":p.metas.get("description",[None])[0],"h1":h1,"headings":p.headings,"mainWords":words,"schemaTypes":[s.get("@type") for s in p.schemas],"errors":e}
    with ThreadPoolExecutor(max_workers=4) as ex:rows=list(ex.map(check,keys))
    for x in rows:
        for e in x["errors"]:errors.append([x["pageKey"],e])
    for field in ("title","description"):
        counts=Counter(x[field] for x in rows)
        if any(n>1 for n in counts.values()):errors.append(["duplicate "+field,[k for k,n in counts.items() if n>1]])
    result={"pages":len(rows),"scopePages":sum(x["scope"] for x in rows),"servicePages":sum(x["service"] for x in rows),"serviceMainWords":sum(x["mainWords"] for x in rows if x["service"]),"schemaTypes":dict(Counter(t for x in rows for t in x["schemaTypes"])),"errors":errors,"rows":rows}
    a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({k:v for k,v in result.items() if k!="rows"},ensure_ascii=False,indent=2))
    if errors:raise SystemExit(1)
if __name__=="__main__":main()

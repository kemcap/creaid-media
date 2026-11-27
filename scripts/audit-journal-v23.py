#!/usr/bin/env python3
"""Phase-5 inventory of all rendered journal articles/archives. Does not grant publication."""
import argparse,json,re,html,hashlib
from collections import Counter
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,urljoin,unquote
ROOT=Path(__file__).resolve().parent.parent
ORIGIN="https://creaid-media.de"
def read(path):return json.loads((ROOT/path).read_text(encoding="utf-8"))
idx=read("src/_data/postsIndex.json")
pages=read("src/_data/pages.json")
drafts=read("src/_data/wordpressPreviewDrafts.json")
imports=read("src/_data/wordpressPreviewArticles.json")
owners=read("docs/seo/phase-3/page-ownership.json")
routes=read("src/_data/routes.json")
by_url={v:k for k,v in routes.items()}
owner={x["pageKey"]:x for x in owners}
void=set("area base br col embed hr img input link meta param source track wbr".split())
class Audit(HTMLParser):
    def __init__(self,raw,url):
        super().__init__(convert_charrefs=True)
        self.stack=[]; self.url=url;self.hero=[];self.images=[];self.mainimages=[]
        self.words=[];self.headings=[];self.links=[];self.cards=[];self.eids=[];self.candidates=set()
        self.meta=[];self.title=[];self.schemas=[];self.schema=None;self.draftLabel=False;self.feed(raw);self.close()
    def scoped(self,cls):return any(cls in a.get("class","").split() for _,a in self.stack)
    def tag(self,t):return any(x==t for x,_ in self.stack)
    def handle_starttag(self,t,attrs):
        a=dict(attrs)
        if t not in void:self.stack.append((t,a))
        classes=set(a.get("class","").split())
        main=self.tag("main")
        body=self.scoped("j-prose")
        hero=self.scoped("j-article-cover")
        if t=="img" and main:
            row={k:a.get(k) for k in ("src","alt","width","height","loading","fetchpriority")}
            self.mainimages.append(row)
            if hero:self.hero.append(row)
            elif body and not self.scoped("j-card"):self.images.append(row)
        if main and t=="a" and a.get("href"):
            href=a["href"];u=urlsplit(urljoin(ORIGIN+self.url,href))
            if u.scheme in ("http","https"):
                item={"href":href,"internal":u.netloc in ("creaid-media.de","www.creaid-media.de"),"path":u.path,"fragment":u.fragment,"inArticleBody":body,"inCard":self.scoped("j-card")}
                self.links.append(item)
                if item["inCard"]:self.cards.append(item["path"])
        if main and re.fullmatch(r"h[1-3]",t):self.headings.append({"level":int(t[1]),"id":a.get("id"),"text":""})
        if body:
            eid=a.get("data-editorial","")
            if re.fullmatch(r"E(?:0[1-9]|1[0-9]|20)",eid):self.eids.append(eid)
            self.candidates.update(c for c in classes if re.match(r"^(?:ed-|creaid-editorial-v21-|j-(?:callout|faq|comparison|table|check|steps)|audit-|article-)",c))
        if t=="script" and a.get("type")=="application/ld+json":self.schema=[]
    def handle_startendtag(self,t,attrs):
        self.handle_starttag(t,attrs)
        if t not in void:self.handle_endtag(t)
    def handle_endtag(self,t):
        if t=="script" and self.schema is not None:
            self.schemas.append(json.loads("".join(self.schema)));self.schema=None
        for i in range(len(self.stack)-1,-1,-1):
            if self.stack[i][0]==t:
                del self.stack[i:];break
    def handle_data(self,data):
        if self.schema is not None:self.schema.append(data)
        if self.tag("title"):self.title.append(data)
        if not self.tag("main"):return
        if self.scoped("j-article-kicker") and "WORDPRESS-ENTWURF" in data:self.draftLabel=True
        if self.scoped("j-prose") and not any(self.tag(t) for t in ("script","style","nav")) and not self.scoped("j-article-actions"):self.words.append(data)
        if self.scoped("j-article-meta") or self.scoped("j-editorial-meta"):self.meta.append(data)
        if self.headings and any(self.tag(t) for t in ("h1","h2","h3")):self.headings[-1]["text"]+=data
def normalize_image(src):
    u=urlsplit(urljoin(ORIGIN,src or ""))
    return u.path if u.netloc==urlsplit(ORIGIN).netloc else src
def image_exists(src,dist):
    path=normalize_image(src)
    return bool(path and path.startswith("/assets/") and (dist/unquote(path.lstrip("/"))).is_file())
def inventory(dist):
    articles=[];archives=[];errors=[]
    for x in idx:
        k=x["slug"];p=pages[k];url=routes[k];f=dist/p["url"];a=Audit(f.read_text(encoding="utf-8"),url)
        hero={normalize_image(i["src"]) for i in a.hero if i["src"]}
        inner={normalize_image(i["src"]) for i in a.images if i["src"]}-hero
        # Content thumbnails, icons and repeat motifs must be excluded in visual review.
        unique={i for i in inner if i and not re.search(r"/(?:logo|icon)[-_.]",i,re.I)}
        eids=sorted(set(a.eids)-{"E14","E15"})
        metadata=" ".join(" ".join(a.meta).split())
        focus=owner[k]
        words=len(re.findall(r"[^\W\d_]+(?:[-’'][^\W\d_]+)*"," ".join(a.words),re.UNICODE))
        findings=[]
        if len(hero)!=1:findings.append("Titelbild-Anzahl manuell prüfen")
        if len(unique)<3:findings.append("Inhaltsbilder unter Soll")
        if len(eids)<3:findings.append("Premium-Elemente einzeln bewerten: E-ID allein kein Qualitätsnachweis")
        if not re.search(r"Themen\s*:",metadata,re.I):findings.append("Themenzeile fehlt")
        if not re.search(r"Lesezeit",metadata,re.I):findings.append("Lesezeit fehlt")
        if not 140<=len(p["description"])<=155:findings.append("Description außerhalb V2.3-Richtwert")
        if len(p["title"])>70:findings.append("Langer SEO-Titel")
        if k in drafts:findings.append("WordPress-Entwurfsquelle: Freigabe OFFEN")
        if not any(s.get("@type")=="BlogPosting" for s in a.schemas):findings.append("BlogPosting-Schema offen; Status und Autor/Daten prüfen")
        if p["shareImage"]!=ORIGIN+x["image"]:findings.append("ShareImage-Abgleich offen")
        if any(not i["alt"] for i in a.hero):findings.append("Titelbild-Alttext im tatsächlichen HTML prüfen")
        missing=[i["src"] for i in a.hero+a.images if not image_exists(i["src"],dist)]
        if missing:findings.append("Lokale Bilddatei fehlt oder Fremdquelle")
        if len([h for h in a.headings if h["level"]==1])!=1:errors.append([k,"H1 count"])
        target_links=sorted({l["path"] for l in a.links if l["internal"] and l["path"] in by_url and l["path"]!=url and l["inArticleBody"]})
        all_context=sorted({l["path"] for l in a.links if l["internal"] and l["path"]==focus.get("commercialParent")})
        articles.append({"key":k,"url":url,"source":"draft-source" if k in drafts else "published-import" if k in imports else "existing-standalone","draftLabelRendered":a.draftLabel,"focusKeyword":focus.get("focusKeyword"),"commercialParent":focus.get("commercialParent"),"hasCommercialParentLink":bool(all_context),"title":p["title"],"description":p["description"],"wordEstimate":words,"metaLine":metadata,"headings":a.headings,"hero":a.hero,"contentImages":a.images,"uniqueContentImagePaths":sorted(unique),"minimumImageDeficit":max(0,3-len(unique)),"imageCountIsUpperBound":True,"imageQuality":"OFFEN","imageRights":"OFFEN","candidateEIds":eids,"candidateLegacyClasses":sorted(a.candidates),"editorialQuality":"OFFEN","visualQuality":"OFFEN","internalBodyDestinations":target_links,"externalBodyDestinations":sorted({l["href"] for l in a.links if not l["internal"] and l["inArticleBody"]}),"schemaTypes":[s.get("@type") for s in a.schemas],"missingOrExternalImages":missing,"findings":findings,"status":"OFFEN","release":"not authorized by this audit"})
    for o in owners:
        if o["role"]!="archive":continue
        k=o["pageKey"];p=pages[k];a=Audit((dist/p["url"]).read_text(encoding="utf-8"),routes[k]);cards=list(dict.fromkeys(a.cards))
        if not cards:errors.append([k,"No rendered article cards"])
        archives.append({"key":k,"url":routes[k],"title":p["title"],"description":p["description"],"cards":cards,"cardCount":len(cards),"draftCards":[c for c in cards if by_url.get(c) in drafts],"unknownCards":[c for c in cards if by_url.get(c) not in {x["slug"] for x in idx}],"headings":a.headings,"schemaTypes":[s.get("@type") for s in a.schemas],"visualQuality":"OFFEN","status":"OFFEN"})
    overlaps=[]
    for i,a in enumerate(archives):
        for b in archives[i+1:]:
            s,t=set(a["cards"]),set(b["cards"]);ratio=len(s&t)/len(s|t) if s|t else 0
            if ratio>=.6:overlaps.append({"first":a["url"],"second":b["url"],"jaccard":round(ratio,3),"commonCards":len(s&t)})
    summary={"articles":len(articles),"archives":len(archives),"draftSources":sum(x["source"]=="draft-source" for x in articles),"draftLabelRendered":sum(x["draftLabelRendered"] for x in articles),"minimumContentImageDeficit":sum(x["minimumImageDeficit"] for x in articles),"articlesBelowImageMinimum":sum(x["minimumImageDeficit"]>0 for x in articles),"articlesWithEmptyHeroAlt":sum(any(not i["alt"] for i in x["hero"]) for x in articles),"articlesWithMissingOrExternalImages":sum(bool(x["missingOrExternalImages"]) for x in articles),"articlesWithLessThan3ExplicitEIds":sum(len(x["candidateEIds"])<3 for x in articles),"archivesOverlapPairs":len(overlaps),"archiveCardCounts":{x["url"]:x["cardCount"] for x in archives},"allVisualQualityGates":"OFFEN","allImageQualityGates":"OFFEN","technicalErrors":errors}
    assert len(articles)==62 and len(archives)==20 and summary["draftSources"]==19
    return {"method":"Rendered HTML inventory, image path counts are optimistic upper bounds, NOT visual or semantic quality acceptance","summary":summary,"articles":articles,"archives":archives,"overlaps":overlaps}
if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("--dist",type=Path,default=ROOT/"dist");p.add_argument("--output",type=Path,required=True);a=p.parse_args()
    report=inventory(a.dist);a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(report["summary"],ensure_ascii=False,indent=2))
    if report["summary"]["technicalErrors"]:raise SystemExit(1)

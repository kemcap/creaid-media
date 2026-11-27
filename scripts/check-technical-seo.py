#!/usr/bin/env python3
"""Read-only crawl of generated or production canonical pages; no third-party requests or POST."""
import argparse, json, re, gzip, zlib, sys
from collections import Counter, defaultdict, deque
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, unquote
from urllib.request import Request, urlopen
from urllib.error import HTTPError

ORIGIN = 'https://creaid-media.de'
ROOT = Path(__file__).resolve().parent.parent
ROUTES = json.loads((ROOT/'src/_data/routes.json').read_text())
FILES = {v:k+'.html' for k,v in ROUTES.items()}
ALIASES = {}
for key,path in ROUTES.items():
    ALIASES['/'+key+'.html'] = path
    if '/'+key != path: ALIASES['/'+key] = path
    if path != '/': ALIASES[path+'/'] = path
ALIASES.update(json.loads((ROOT/'src/_data/aliases.json').read_text()))
INDEXABLE = set(urlsplit(x).path for x in re.findall(r'<loc>([^<]+)</loc>',(ROOT/'docs/sitemap-kandidat-nach-freigabe.xml').read_text()))
INDEXABLE.update(p['url'] for p in json.loads((ROOT/'src/_data/postsIndex.json').read_text()))
class Page(HTMLParser):
    def __init__(self,html):
        super().__init__(convert_charrefs=True)
        self.anchors=[]; self.ids=[]; self.headings=[]; self.canonicals=[]; self.meta={}; self.main=0; self.main_count=0; self.lang=None
        self.feed(html); self.close()
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a: self.ids.append(a['id'])
        if tag=='html': self.lang=a.get('lang')
        if tag=='main': self.main+=1; self.main_count+=1
        if tag=='a' and a.get('href') is not None: self.anchors.append((a['href'],bool(self.main)))
        if re.fullmatch(r'h[1-6]',tag): self.headings.append((int(tag[1]),bool(self.main)))
        if tag=='link' and 'canonical' in a.get('rel','').split(): self.canonicals.append(a.get('href'))
        if tag=='meta' and a.get('name'): self.meta.setdefault(a['name'].lower(),[]).append(a.get('content',''))
    def handle_endtag(self,tag):
        if tag=='main': self.main=max(0,self.main-1)

def read_live(path):
    request=Request(ORIGIN+path, headers={'User-Agent':'CreAid-SEO-QA/2.0','Accept-Encoding':'gzip, deflate'})
    with urlopen(request,timeout=25) as response:
        raw=response.read()
        enc=response.headers.get('Content-Encoding','').lower()
        if enc=='gzip': raw=gzip.decompress(raw)
        elif enc=='deflate':
            try: raw=zlib.decompress(raw)
            except zlib.error: raw=zlib.decompress(raw,-zlib.MAX_WBITS)
        if response.geturl()!=ORIGIN+path: raise ValueError('Canonical request redirected: '+response.geturl())
        return raw.decode('utf-8'),dict(response.headers.items())

def depth(graph):
    d={'/':0}; q=deque(['/'])
    while q:
        p=q.popleft()
        for target in sorted(graph[p]):
            if target not in d: d[target]=d[p]+1;q.append(target)
    return d

def analyze(pages,strict,headers):
    errors=[]; warnings=[]; alias_refs=Counter(); mixed=Counter(); query_refs=Counter(); graph=defaultdict(set); main_graph=defaultdict(set); incoming=defaultdict(set); contextual=defaultdict(set); refs=0
    for path,page in pages.items():
        if page.canonicals!=[ORIGIN+path]: errors.append([path,'canonical',page.canonicals])
        if page.lang!='de': errors.append([path,'lang',page.lang])
        if page.main_count!=1: warnings.append([path,'main count',page.main_count])
        if sum(h==1 for h,m in page.headings)!=1: errors.append([path,'H1 count'])
        if len(set(page.ids))!=len(page.ids): errors.append([path,'duplicate IDs'])
        if len(page.meta.get('robots',[]))!=1: errors.append([path,'robots count'])
        if headers:
            robots=' '.join(page.meta.get('robots',[]))
            if ('noindex' in robots) == (path in INDEXABLE): errors.append([path,'indexing policy',robots])
            if path in INDEXABLE and 'noindex' in headers[path].get('x-robots-tag','').lower(): errors.append([path,'header noindex'])
        for href,in_main in page.anchors:
            href=href.strip()
            if not href or href=='#': continue
            try: u=urlsplit(urljoin(ORIGIN+path,href))
            except ValueError: errors.append([path,'invalid URL',href]);continue
            if u.scheme not in ('http','https') or u.hostname not in ('creaid-media.de','www.creaid-media.de'): continue
            target=ALIASES.get(u.path,u.path)
            if target not in FILES:
                if u.path.startswith('/assets/') or u.path in ('/robots.txt','/sitemap.xml'):continue
                errors.append([path,'unknown internal target',href]);continue
            refs+=1
            if u.path!=target: alias_refs[(path,u.path,target)]+=1
            if u.scheme!='https' or u.hostname!='creaid-media.de': mixed[(path,href)]+=1
            if u.query: query_refs[(target,u.query)]+=1
            if u.fragment and unquote(u.fragment) not in pages[target].ids: errors.append([path,'missing fragment',href])
            if path!=target:
                graph[path].add(target);incoming[target].add(path)
                if in_main: main_graph[path].add(target);contextual[target].add(path)
    d=depth(graph); md=depth(main_graph)
    orphan=sorted(INDEXABLE-d.keys())
    deep=sorted(p for p in INDEXABLE if d.get(p,999)>3)
    if strict:
        if alias_refs: errors.append(['noncanonical anchor references',sum(alias_refs.values())])
        if mixed: errors.append(['noncanonical host/scheme references',sum(mixed.values())])
        if orphan: errors.append(['unreachable indexable pages',orphan])
        if deep: errors.append(['indexable depth >3',deep])
    return {
        'pages':len(pages),'indexable':len(INDEXABLE),'internalAnchorReferences':refs,
        'aliasReferences':sum(alias_refs.values()),'aliasDetails':[list(k)+[v] for k,v in alias_refs.items()],
        'noncanonicalHostReferences':sum(mixed.values()),'noncanonicalHostDetails':[list(k)+[v] for k,v in mixed.items()],
        'contactQueryVariants':sum(1 for target,query in query_refs if target=='/kontakt'),
        'depthDistribution':dict(Counter(str(d.get(p,'unreachable')) for p in INDEXABLE)),
        'indexableOrphans':orphan,'indexableOver3Clicks':deep,
        'contextualEdges':sum(map(len,main_graph.values())),
        'pageDetails':[{'url':p,'indexable':p in INDEXABLE,'clickDepth':d.get(p),'mainOnlyDepth':md.get(p),'incomingPages':len(incoming[p]),'contextualIncomingPages':len(contextual[p]),'outgoingPages':len(graph[p]),'contextualOutgoingPages':len(main_graph[p])} for p in sorted(pages)],
        'errors':errors,'warnings':warnings,
        'liveHeaderSamples':{p:headers[p] for p in ['/', '/webdesign','/creaid-blog','/kontakt'] if p in headers}
    }

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--dist',type=Path,default=ROOT/'dist');parser.add_argument('--live',action='store_true');parser.add_argument('--baseline',action='store_true');parser.add_argument('--output',type=Path,required=True);args=parser.parse_args()
    pages={};headers={}
    if args.live:
        with ThreadPoolExecutor(max_workers=4) as ex:
            for p,(html,h) in zip(FILES,ex.map(read_live,FILES)):
                pages[p]=Page(html);headers[p]={k.lower():v for k,v in h.items() if k.lower() in ('cache-control','content-encoding','content-type','x-robots-tag','vary','x-content-type-options','referrer-policy')}
    else:
        for p,f in FILES.items():pages[p]=Page((args.dist/f).read_text(encoding='utf-8'))
    report=analyze(pages,not args.baseline,headers)
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k not in ('pageDetails','aliasDetails','noncanonicalHostDetails','warnings','liveHeaderSamples')},ensure_ascii=False,indent=2))
    return 1 if report['errors'] else 0
if __name__=='__main__': sys.exit(main())

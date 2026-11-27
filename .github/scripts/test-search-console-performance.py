import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from search_console_performance import analyze,collect
from datetime import date
routes={"a":"/a","b":"/b"}
assignments=[{"keyword":"test","target":"/a"},{"keyword":"wrong","target":"/a"}]
rows=[{"query":"Test","page":"https://creaid-media.de/a","impressions":60},{"query":"test","page":"https://creaid-media.de/b","impressions":40},{"query":"wrong","page":"https://creaid-media.de/b","impressions":12},{"query":"tiny","page":"https://creaid-media.de/a","impressions":3},{"query":"tiny","page":"https://creaid-media.de/b","impressions":4}]
flags=analyze(rows,assignments,routes)
assert [(f["query"],f["type"]) for f in flags]==[("test","overlap_review"),("wrong","owner_mismatch_review")]
calls=[]
def request(url,method,payload):
    calls.append((url,method,payload))
    return {"rows":[{"keys":["example","https://creaid-media.de/a"],"clicks":2,"impressions":10,"ctr":.2,"position":3}]}
data,truncated=collect(request,"https://www.googleapis.com/webmasters/v3","https://creaid-media.de/",date(2026,10,1),date(2026,10,28))
assert len(data)==1 and not truncated and data[0]["clicks"]==2
assert calls[0][1]=="POST" and calls[0][2]["dimensions"]==["query","page"] and calls[0][2]["dimensionFilterGroups"][0]["filters"][0]["expression"]=="deu"
print("PASS: GSC query/page report, overlap thresholds, owner mismatch, country filter and read-only API request fixture.")

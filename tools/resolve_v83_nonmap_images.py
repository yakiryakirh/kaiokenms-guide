from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import csv, json, time, urllib.request

ROOT=Path('source/WEB')
OUT=Path('resolved-nonmaps')
UA={'User-Agent':'KaiokenMS-v83-image-audit/1.0'}
TABS={'Hair':'item','Face':'item','Consume':'item','Etc':'item','Mob':'mob','Npc':'npc'}

def targets():
    out=[]
    for tab,kind in TABS.items():
        p=ROOT/tab/'data.json'
        if not p.exists(): continue
        for row in json.loads(p.read_text(encoding='utf-8')):
            if row.get('preview'): continue
            try: eid=int(row['id'])
            except Exception: continue
            out.append((kind,eid,tab,row.get('name','')))
    return out

def fetch(t):
    kind,eid,tab,name=t
    url=f'https://maplestory.io/api/GMS/83/{kind}/{eid}/icon'
    err=''
    for attempt in range(2):
        try:
            req=urllib.request.Request(url,headers=UA)
            with urllib.request.urlopen(req,timeout=25) as r:
                data=r.read(); ctype=(r.headers.get('content-type') or '').lower()
            if len(data)<50 or ('image' not in ctype and not data.startswith(b'\x89PNG')):
                raise ValueError(f'not-image {ctype} {len(data)}')
            d=OUT/kind; d.mkdir(parents=True,exist_ok=True)
            (d/f'{eid}.png').write_bytes(data)
            time.sleep(.1)
            return kind,eid,tab,name,url,'ok',len(data),''
        except Exception as e:
            err=repr(e); time.sleep(.4*(attempt+1))
    return kind,eid,tab,name,url,'failed',0,err

items=targets(); rows=[]
with ThreadPoolExecutor(max_workers=4) as ex:
    fs=[ex.submit(fetch,t) for t in items]
    for i,f in enumerate(as_completed(fs),1):
        rows.append(f.result())
        if i%200==0: print(i,'/',len(items))
rows.sort(key=lambda x:(x[0],x[1]))
with open('resolved-nonmaps.csv','w',newline='',encoding='utf-8') as f:
    w=csv.writer(f); w.writerow(['type','id','tab','name','url','status','size','error']); w.writerows(rows)
print('TOTAL',len(rows),'OK',sum(r[5]=='ok' for r in rows),'FAILED',sum(r[5]!='ok' for r in rows))

from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import csv, json, time, urllib.request

ROOT=Path('source/WEB')
OUT=Path('resolved-maps')
UA={'User-Agent':'KaiokenMS-v83-image-audit/1.0'}

def targets():
    out=[]
    for i in range(10):
        tab=f'Map{i}'; p=ROOT/tab/'data.json'
        if not p.exists(): continue
        for row in json.loads(p.read_text(encoding='utf-8')):
            if row.get('preview'): continue
            try: eid=int(row['id'])
            except Exception: continue
            out.append((eid,tab,row.get('name','')))
    return out

def get_image(url):
    req=urllib.request.Request(url,headers=UA)
    with urllib.request.urlopen(req,timeout=35) as r:
        data=r.read(); ctype=(r.headers.get('content-type') or '').lower()
    if len(data)<100 or ('image' not in ctype and not data.startswith(b'\x89PNG')):
        raise ValueError(f'not-image {ctype} {len(data)}')
    return data

def fetch(t):
    eid,tab,name=t
    urls=[f'https://maplestory.io/api/GMS/83/map/{eid}/minimap',f'https://maplestory.io/api/GMS/83/map/{eid}/render/0']
    errors=[]
    for url in urls:
        for attempt in range(2):
            try:
                data=get_image(url)
                OUT.mkdir(exist_ok=True)
                (OUT/f'{eid}.png').write_bytes(data)
                time.sleep(.12)
                return eid,tab,name,url,'ok',len(data),''
            except Exception as e:
                errors.append(repr(e)); time.sleep(.4*(attempt+1))
    return eid,tab,name,'','failed',0,' | '.join(errors)[-1200:]

items=targets(); rows=[]
with ThreadPoolExecutor(max_workers=2) as ex:
    fs=[ex.submit(fetch,t) for t in items]
    for i,f in enumerate(as_completed(fs),1):
        rows.append(f.result())
        if i%100==0: print(i,'/',len(items))
rows.sort(key=lambda x:x[0])
with open('resolved-maps.csv','w',newline='',encoding='utf-8') as f:
    w=csv.writer(f); w.writerow(['id','tab','name','url','status','size','error']); w.writerows(rows)
print('TOTAL',len(rows),'OK',sum(r[4]=='ok' for r in rows),'FAILED',sum(r[4]!='ok' for r in rows))

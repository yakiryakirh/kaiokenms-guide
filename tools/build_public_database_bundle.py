#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, re, html, urllib.request
from pathlib import Path
from collections import defaultdict
import xml.etree.ElementTree as ET

ITEM_TABS=['Accessory','Cap','Cape','Cash','Coat','Consume','Dragon','Etc','Face','Glove','Hair','Install','Longcoat','Pants','Pet','PetEquip','Ring','Shield','Shoes','Special','TamingMob','Weapon']
RAW_BASE='https://raw.githubusercontent.com/andrenogrib/gms_v83_wztoweb/refs/heads/main/WEB/'
COSMIC_BASE='https://raw.githubusercontent.com/P0nk/Cosmic/master/src/main/resources/db/data/'

def num(v,default=None):
    if v is None or v=='': return default
    try:
        if isinstance(v,(int,float)): return int(v) if isinstance(v,int) or float(v).is_integer() else float(v)
        s=str(v).strip()
        if re.fullmatch(r'-?\d+',s): return int(s)
        if re.fullmatch(r'-?\d+(?:\.\d+)?',s): return float(s)
    except Exception: pass
    return default

def parse_info(s):
    out={}
    if not s:return out
    for m in re.finditer(r'(?:^|,\s*)([^=,]+)=([^,]*)',str(s)):
        k=m.group(1).strip();v=m.group(2).strip()
        if k:out[k]=v
    return out

def load_rows(web,tab):
    p=web/tab/'data.json'
    if p.exists(): return json.loads(p.read_text(encoding='utf-8',errors='replace'))
    p=web/f'{tab}-data.js'
    if p.exists():
        t=p.read_text(encoding='utf-8',errors='replace');a=t.find('[');b=t.rfind(']');return json.loads(t[a:b+1])
    return []

def nid(v):
    try:return str(int(str(v)))
    except:return str(v or '')

def scalar(parent,name,default=None):
    if parent is None:return default
    for ch in parent:
        if ch.attrib.get('name')==name and ch.tag in ('int','string','short','long','float','double'):return ch.attrib.get('value',default)
    return default

def cdir(parent,name):
    if parent is None:return None
    for ch in parent:
        if ch.tag=='imgdir' and ch.attrib.get('name')==name:return ch
    return None

def dirs(parent): return [] if parent is None else [ch for ch in parent if ch.tag=='imgdir']

def pct(x,y,mini):
    w=mini.get('worldWidth') or 1;h=mini.get('worldHeight') or 1;cx=mini.get('centerX') or 0;cy=mini.get('centerY') or 0
    return round(max(0,min(100,(x+cx)/w*100)),3),round(max(0,min(100,(y+cy)/h*100)),3)

def parse_map_xml(path,meta,map_names,npc_names,mob_names):
    mid=nid(meta.get('mapId') or path.stem.split('.')[0])
    try:root=ET.parse(path).getroot()
    except Exception:return None
    md=cdir(root,'miniMap');mini={'canvasWidth':None,'canvasHeight':None,'worldWidth':num(scalar(md,'width'),1),'worldHeight':num(scalar(md,'height'),1),'centerX':num(scalar(md,'centerX'),0),'centerY':num(scalar(md,'centerY'),0),'mag':num(scalar(md,'mag'),4)}
    if md is not None:
        for ch in md:
            if ch.tag=='canvas' and ch.attrib.get('name')=='canvas':mini['canvasWidth']=num(ch.attrib.get('width'));mini['canvasHeight']=num(ch.attrib.get('height'))
    npcs=[];mobs=[]
    for e in dirs(cdir(root,'life')):
        typ=str(scalar(e,'type',''));eid=nid(scalar(e,'id',''));x=num(scalar(e,'x'));y=num(scalar(e,'y'))
        if typ not in ('n','m') or not eid or x is None or y is None:continue
        left,top=pct(x,y,mini);o={'id':eid,'name':(npc_names if typ=='n' else mob_names).get(eid,eid),'x':x,'y':y,'left':left,'top':top}
        (npcs if typ=='n' else mobs).append(o)
    portals=[]
    for e in dirs(cdir(root,'portal')):
        tm=nid(scalar(e,'tm',''))
        if not tm or tm=='999999999' or tm==mid:continue
        target=map_names.get(tm,'')
        if not target:continue
        x=num(scalar(e,'x'));y=num(scalar(e,'y'))
        if x is None or y is None:continue
        left,top=pct(x,y,mini);portals.append({'name':str(scalar(e,'pn','Portal')),'type':num(scalar(e,'pt'),0),'x':x,'y':y,'targetMapId':tm,'targetMapName':target,'targetPortal':str(scalar(e,'tn','')),'left':left,'top':top})
    preview=meta.get('preview') or '';image=(RAW_BASE+preview) if preview else f'https://maplestory.io/api/GMS/83/map/{mid}/minimap'
    return {'id':mid,'name':meta.get('mapName') or mid,'street':meta.get('streetName') or '','image':image,'portals':portals,'npcs':npcs,'mobs':mobs,'npcCount':len({x['id'] for x in npcs}),'mobCount':len({x['id'] for x in mobs}),'mini':mini}

def split_sql_tuple(s):
    vals=[];buf=[];quote=None;esc=False
    for ch in s:
        if esc:buf.append(ch);esc=False;continue
        if ch=='\\' and quote:buf.append(ch);esc=True;continue
        if quote:
            if ch==quote:quote=None
            else:buf.append(ch)
        else:
            if ch in ('"',"'"):quote=ch
            elif ch==',':vals.append(''.join(buf).strip());buf=[]
            else:buf.append(ch)
    vals.append(''.join(buf).strip())
    def cv(x):
        if x.upper()=='NULL':return None
        n=num(x,None);return n if n is not None else x
    return [cv(x) for x in vals]

def sql_rows(text):
    text='\n'.join(line for line in text.splitlines() if not line.lstrip().startswith(('#','--')));m=re.search(r'\bVALUES\b',text,re.I)
    if m:text=text[m.end():]
    for x in re.finditer(r'\(([^()]*)\)',text,re.S):yield split_sql_tuple(x.group(1))

def download_text(url):
    req=urllib.request.Request(url,headers={'User-Agent':'KaiokenMS-PublicBuilder/1.0'})
    with urllib.request.urlopen(req,timeout=120) as r:return r.read().decode('utf-8','replace')

def parse_quests(pack,npc_names,mob_names,item_names,spatial):
    qd=pack/'Quest.wz';info=ET.parse(qd/'QuestInfo.img.xml').getroot();checks={x.attrib.get('name'):x for x in dirs(ET.parse(qd/'Check.img.xml').getroot())};acts={x.attrib.get('name'):x for x in dirs(ET.parse(qd/'Act.img.xml').getroot())}
    npc_locs=defaultdict(list)
    for mid,m in spatial.items():
        for n in m.get('npcs',[]):npc_locs[n['id']].append({'mapId':mid,'mapName':m['name'],'street':m['street'],'image':m['image'],'x':n['x'],'y':n['y'],'left':n['left'],'top':n['top']})
    out=[]
    for qi in dirs(info):
        qid=nid(qi.attrib.get('name'))
        if not qid:continue
        ck=checks.get(qid);ac=acts.get(qid);start=cdir(ck,'0');end=cdir(ck,'1');reward=cdir(ac,'1')
        start_npc=nid(scalar(start,'npc',''));end_npc=nid(scalar(end,'npc',''));items=[];mobs=[];prev=[];jobs=[]
        for sec in (start,end):
            for e in dirs(cdir(sec,'item')):
                iid=nid(scalar(e,'id',''));cnt=num(scalar(e,'count'),0)
                if iid and cnt and cnt>0:items.append({'id':iid,'count':cnt,'name':item_names.get(iid,f'Item {iid}')})
            for e in dirs(cdir(sec,'mob')):
                mid=nid(scalar(e,'id',''));cnt=num(scalar(e,'count'),0)
                if mid:mobs.append({'id':mid,'count':cnt,'name':mob_names.get(mid,f'Monster {mid}')})
        for e in dirs(cdir(start,'quest')):
            pid=nid(scalar(e,'id',''));state=num(scalar(e,'state'),0)
            if pid:prev.append({'id':pid,'state':state})
        for e in dirs(cdir(start,'job')):
            v=num(e.attrib.get('value') or scalar(e,'value'),None)
            if v is None:v=num(e.attrib.get('name'),None)
            if v is not None:jobs.append(v)
        reward_items=[]
        for e in dirs(cdir(reward,'item')):
            iid=nid(scalar(e,'id',''));cnt=num(scalar(e,'count'),0)
            if iid and cnt and cnt>0:reward_items.append({'id':iid,'count':cnt,'name':item_names.get(iid,f'Item {iid}')})
        nq=nid(scalar(reward,'nextQuest','')) if reward is not None else ''
        row={'id':qid,'name':html.unescape(str(scalar(qi,'name',f'Quest {qid}'))),'parent':html.unescape(str(scalar(qi,'parent','') or '')),'summary':html.unescape(str(scalar(qi,'0','') or '')),'progressText':html.unescape(str(scalar(qi,'1','') or '')),'completeText':html.unescape(str(scalar(qi,'2','') or '')),'area':scalar(qi,'area',''),'startNpc':start_npc,'endNpc':end_npc,'lvmin':num(scalar(start,'lvmin'),0) or 0,'lvmax':num(scalar(start,'lvmax'),0) or 0,'items':items,'mobs':mobs,'prev':prev,'jobs':jobs,'nextQuest':nq or None,'exp':num(scalar(reward,'exp'),0) or 0,'meso':num(scalar(reward,'money'),num(scalar(reward,'meso'),0)) or 0,'fame':num(scalar(reward,'pop'),num(scalar(reward,'fame'),0)) or 0,'rewardItems':reward_items,'startNpcName':npc_names.get(start_npc,'') if start_npc else '','endNpcName':npc_names.get(end_npc,'') if end_npc else '','startLocations':npc_locs.get(start_npc,[]) if start_npc else [],'endLocations':npc_locs.get(end_npc,[]) if end_npc else []}
        out.append(row)
    out.sort(key=lambda x:(x['name'].lower(),int(x['id']) if x['id'].isdigit() else 0));return out

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--web',required=True);ap.add_argument('--pack',required=True);ap.add_argument('--out',required=True);a=ap.parse_args();web=Path(a.web);pack=Path(a.pack);out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
    npc_rows=load_rows(web,'Npc');mob_rows=load_rows(web,'Mob');npc_names={nid(r.get('id')):r.get('name') or nid(r.get('id')) for r in npc_rows};mob_names={nid(r.get('id')):r.get('name') or nid(r.get('id')) for r in mob_rows}
    mobs=[]
    for r in mob_rows:
        rid=nid(r.get('id'));inf=parse_info((r.get('fields') or {}).get('Info',''));mobs.append({'id':rid,'name':mob_names.get(rid,rid),'level':num(inf.get('info.level'),num((r.get('fields') or {}).get('Level'),0)) or 0,'exp':num(inf.get('info.exp'),num((r.get('fields') or {}).get('Exp'),0)) or 0,'preview':r.get('preview') or ''})
    item_names={}
    for tab in ITEM_TABS:
        for r in load_rows(web,tab):
            rid=nid(r.get('id'));name=r.get('name') or (r.get('fields') or {}).get('Name') or ''
            if rid and name and name!='MISSING NAME':item_names[rid]=name
    links=json.loads((pack/'map-links.json').read_text(encoding='utf-8'));meta={nid(k):v for k,v in links.get('maps',{}).items()};map_names={mid:(m.get('mapName') or mid) for mid,m in meta.items()};xmls={nid(p.stem.split('.')[0]):p for p in (pack/'Map.wz').glob('Map*/*.img.xml')};spatial={}
    for mid,m in meta.items():
        rec=parse_map_xml(xmls[mid],m,map_names,npc_names,mob_names) if mid in xmls else None
        if rec:spatial[mid]=rec
        else:
            pr=m.get('preview') or '';spatial[mid]={'id':mid,'name':m.get('mapName') or mid,'street':m.get('streetName') or '','image':(RAW_BASE+pr) if pr else f'https://maplestory.io/api/GMS/83/map/{mid}/minimap','portals':[],'npcs':[],'mobs':[],'npcCount':len(m.get('npcs') or []),'mobCount':len(m.get('mobs') or []),'mini':{}}
    npc_locs=defaultdict(list)
    for mid,m in spatial.items():
        for n in m['npcs']:npc_locs[n['id']].append(mid)
    npcs=[]
    for r in npc_rows:
        rid=nid(r.get('id'));seen=[]
        for mid in npc_locs.get(rid,[]):
            if mid not in seen:seen.append(mid)
        npcs.append({'id':rid,'name':npc_names.get(rid,rid),'mapCount':len(seen),'firstMap':spatial[seen[0]]['name'] if seen else '','preview':r.get('preview') or ''})
    npcs.sort(key=lambda x:(x['name'].lower(),x['id']));mobs.sort(key=lambda x:(x['name'].lower(),x['id']));maps=[{'id':mid,'name':m['name'],'street':m['street'],'npcCount':m['npcCount'],'mobCount':m['mobCount'],'portalCount':len(m['portals']),'image':m['image']} for mid,m in spatial.items()];maps.sort(key=lambda x:(x['name'].lower(),x['id']));quests=parse_quests(pack,npc_names,mob_names,item_names,spatial);idx={'meta':{'npcs':len(npcs),'maps':len(maps),'quests':len(quests),'mobs':len(mobs)},'npcs':npcs,'maps':maps,'quests':quests,'mobs':mobs}
    drop_text=download_text(COSMIC_BASE+'152-drop-data.sql');shop_text=download_text(COSMIC_BASE+'101-shops-data.sql');shopitems_text=download_text(COSMIC_BASE+'102-shopitems-data.sql');item_drops=defaultdict(dict);mob_drops=defaultdict(dict)
    for r in sql_rows(drop_text):
        if len(r)<6:continue
        mon,item,mn,mx,q,ch=r[:6]
        if not isinstance(mon,(int,float)) or not isinstance(item,(int,float)) or int(item)<=0:continue
        mon=int(mon);item=int(item);pct=(float(ch)/10000.0 if isinstance(ch,(int,float)) else None);a={'id':mon,'name':mob_names.get(str(mon),f'Monster {mon}'),'chance':pct,'min':mn,'max':mx};b={'id':item,'name':item_names.get(str(item),f'Item {item}'),'chance':pct,'min':mn,'max':mx};item_drops[str(item)][mon]=a;mob_drops[str(mon)][item]=b
    shops={}
    for r in sql_rows(shop_text):
        if len(r)>=2 and isinstance(r[0],(int,float)) and isinstance(r[1],(int,float)):shops[int(r[0])]=int(r[1])
    item_shops=defaultdict(dict)
    for r in sql_rows(shopitems_text):
        if len(r)<3:continue
        sid,iid,price=r[:3]
        if not isinstance(sid,(int,float)) or not isinstance(iid,(int,float)):continue
        npc=shops.get(int(sid))
        if npc is not None:item_shops[str(int(iid))][npc]={'id':npc,'name':npc_names.get(str(npc),f'NPC {npc}'),'price':price}
    rel={'itemNames':item_names,'itemDrops':{k:list(v.values()) for k,v in item_drops.items()},'mobDrops':{k:list(v.values()) for k,v in mob_drops.items()},'itemShops':{k:list(v.values()) for k,v in item_shops.items()}}
    def dump(name,obj,var):
        txt=json.dumps(obj,ensure_ascii=False,separators=(',',':'));(out/f'{name}.json').write_text(txt,encoding='utf-8');(out/f'{name}.js').write_text(f'window.{var}='+txt+';\n',encoding='utf-8')
    dump('db-index',idx,'KAIOKEN_DB_INDEX');dump('map-spatial',{'maps':spatial},'KAIOKEN_MAP_SPATIAL');dump('item-relations',rel,'KAIOKEN_ITEM_RELATIONS');print(json.dumps({'npcs':len(npcs),'mobs':len(mobs),'maps':len(maps),'quests':len(quests),'itemDrops':len(rel['itemDrops']),'itemShops':len(rel['itemShops'])}))

if __name__=='__main__':main()

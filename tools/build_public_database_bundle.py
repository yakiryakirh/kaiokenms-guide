#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, re, math, html, urllib.request
from pathlib import Path
from collections import defaultdict
import xml.etree.ElementTree as ET

ITEM_TABS = [
    'Accessory','Cap','Cape','Cash','Coat','Consume','Dragon','Etc','Face','Glove','Hair','Install',
    'Longcoat','Pants','Pet','PetEquip','Ring','Shield','Shoes','Special','TamingMob','Weapon'
]
MAP_TABS = [f'Map{i}' for i in [0,1,2,3,5,6,7,8,9]]
RAW_BASE='https://raw.githubusercontent.com/andrenogrib/gms_v83_wztoweb/refs/heads/main/WEB/'
COSMIC_BASE='https://raw.githubusercontent.com/P0nk/Cosmic/master/src/main/resources/db/data/'


def num(v, default=None):
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
        k=m.group(1).strip(); v=m.group(2).strip()
        if k: out[k]=v
    return out


def load_rows(web:Path, tab:str):
    p=web/tab/'data.json'
    if p.exists(): return json.loads(p.read_text(encoding='utf-8',errors='replace'))
    p=web/f'{tab}-data.js'
    if p.exists():
        t=p.read_text(encoding='utf-8',errors='replace'); a=t.find('['); b=t.rfind(']')
        return json.loads(t[a:b+1])
    return []


def normalize_id(v):
    try:return str(int(str(v)))
    except:return str(v or '')


def meaningful_npc_name(row):
    fields=row.get('fields') or {}
    name=str(fields.get('Name') or row.get('name') or '').strip()
    if not name or name in ('MISSING NAME','???') or re.fullmatch(r'\d+',name):
        return ''
    return name


def npc_public_meta(row):
    fields=row.get('fields') or {}
    name=meaningful_npc_name(row)
    dialogue=[]
    for key in ('N0','N1','D0'):
        value=str(fields.get(key) or '').strip()
        if value and value not in dialogue: dialogue.append(value)
    preview=row.get('preview') or ''
    return {
        'name':name,
        'role':str(fields.get('Function') or '').strip(),
        'dialogue':dialogue[:3],
        'preview':preview,
        'image':(RAW_BASE+preview) if preview else '',
    }


def elem_scalar(parent, name, default=None):
    if parent is None:return default
    for ch in parent:
        if ch.attrib.get('name')==name and ch.tag in ('int','string','short','long','float','double'):
            return ch.attrib.get('value',default)
    return default


def child_dir(parent,name):
    if parent is None:return None
    for ch in parent:
        if ch.tag=='imgdir' and ch.attrib.get('name')==name:return ch
    return None


def iter_dirs(parent):
    if parent is None:return []
    return [ch for ch in parent if ch.tag=='imgdir']


def pct(x,y,mini):
    w=mini.get('worldWidth') or 1; h=mini.get('worldHeight') or 1
    cx=mini.get('centerX') or 0; cy=mini.get('centerY') or 0
    left=(x+cx)/w*100; top=(y+cy)/h*100
    return round(max(0,min(100,left)),3),round(max(0,min(100,top)),3)


def parse_map_xml(path:Path, meta, map_names, npc_names, mob_names, public_npc_ids):
    mid=normalize_id(meta.get('mapId') or path.stem.split('.')[0])
    try:root=ET.parse(path).getroot()
    except Exception:return None
    mini_dir=child_dir(root,'miniMap')
    mini={
      'canvasWidth':num(elem_scalar(child_dir(mini_dir,'canvas'),'width')) if False else None,
      'canvasHeight':None,
      'worldWidth':num(elem_scalar(mini_dir,'width'),1),
      'worldHeight':num(elem_scalar(mini_dir,'height'),1),
      'centerX':num(elem_scalar(mini_dir,'centerX'),0),
      'centerY':num(elem_scalar(mini_dir,'centerY'),0),
      'mag':num(elem_scalar(mini_dir,'mag'),4),
    }
    if mini_dir is not None:
        for ch in mini_dir:
            if ch.tag=='canvas' and ch.attrib.get('name')=='canvas':
                mini['canvasWidth']=num(ch.attrib.get('width')); mini['canvasHeight']=num(ch.attrib.get('height'))
    life=[]
    for e in iter_dirs(child_dir(root,'life')):
        typ=str(elem_scalar(e,'type','')); eid=normalize_id(elem_scalar(e,'id',''))
        x=num(elem_scalar(e,'x')); y=num(elem_scalar(e,'y'))
        if typ not in ('n','m') or not eid or x is None or y is None: continue
        left,top=pct(x,y,mini)
        life.append({'type':typ,'id':eid,'x':x,'y':y,'left':left,'top':top})
    portals=[]
    for e in iter_dirs(child_dir(root,'portal')):
        tm=normalize_id(elem_scalar(e,'tm',''))
        if not tm or tm=='999999999' or tm==mid: continue
        target=map_names.get(tm,'')
        if not target: continue
        x=num(elem_scalar(e,'x')); y=num(elem_scalar(e,'y'))
        if x is None or y is None: continue
        left,top=pct(x,y,mini)
        portals.append({
            'name':str(elem_scalar(e,'pn','Portal')),'type':num(elem_scalar(e,'pt'),0),'x':x,'y':y,
            'targetMapId':tm,'targetMapName':target,'targetPortal':str(elem_scalar(e,'tn','')),
            'left':left,'top':top
        })
    npcs=[]; mobs=[]
    for x in life:
        if x['type']=='n' and x['id'] not in public_npc_ids:
            continue
        out={'id':x['id'],'name':(npc_names if x['type']=='n' else mob_names).get(x['id'],x['id']),
             'x':x['x'],'y':x['y'],'left':x['left'],'top':x['top']}
        (npcs if x['type']=='n' else mobs).append(out)
    preview=meta.get('preview') or ''
    thumb=(RAW_BASE+preview) if preview else f'https://maplestory.io/api/GMS/83/map/{mid}/minimap'
    image=f'https://maplestory.io/api/GMS/83/map/{mid}/render/0'
    return {
      'id':mid,'name':meta.get('mapName') or mid,'street':meta.get('streetName') or '',
      'image':image,'thumb':thumb,'fallbackImage':f'https://maplestory.io/api/GMS/83/map/{mid}/minimap',
      'portals':portals,'npcs':npcs,'mobs':mobs,
      'npcCount':len({x['id'] for x in npcs}),'mobCount':len({x['id'] for x in mobs}),'mini':mini
    }


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
    text='\n'.join(line for line in text.splitlines() if not line.lstrip().startswith(('#','--')))
    m=re.search(r'\bVALUES\b',text,re.I)
    if m:text=text[m.end():]
    for x in re.finditer(r'\(([^()]*)\)',text,re.S):yield split_sql_tuple(x.group(1))


def download_text(url):
    req=urllib.request.Request(url,headers={'User-Agent':'KaiokenMS-PublicBuilder/1.0'})
    with urllib.request.urlopen(req,timeout=120) as r:return r.read().decode('utf-8','replace')


def parse_quest_files(pack:Path, npc_names, mob_names, item_names, spatial):
    qdir=pack/'Quest.wz'
    info_root=ET.parse(qdir/'QuestInfo.img.xml').getroot()
    check_root=ET.parse(qdir/'Check.img.xml').getroot()
    act_root=ET.parse(qdir/'Act.img.xml').getroot()
    checks={x.attrib.get('name'):x for x in iter_dirs(check_root)}
    acts={x.attrib.get('name'):x for x in iter_dirs(act_root)}
    npc_locs=defaultdict(list)
    for mid,m in spatial.items():
        for n in m.get('npcs',[]):
            npc_locs[n['id']].append({'mapId':mid,'mapName':m['name'],'street':m['street'],'image':m['image'],'x':n['x'],'y':n['y'],'left':n['left'],'top':n['top']})
    out=[]
    for qi in iter_dirs(info_root):
        qid=normalize_id(qi.attrib.get('name'))
        if not qid:continue
        ck=checks.get(qid); ac=acts.get(qid); start=child_dir(ck,'0'); end=child_dir(ck,'1'); reward=child_dir(ac,'1')
        def scal(parent,name,default=None):return elem_scalar(parent,name,default)
        start_npc=normalize_id(scal(start,'npc','')); end_npc=normalize_id(scal(end,'npc',''))
        items=[]; mobs=[]; prev=[]; jobs=[]
        for sec in (start,end):
            for e in iter_dirs(child_dir(sec,'item')):
                iid=normalize_id(scal(e,'id','')); cnt=num(scal(e,'count'),0)
                if iid and cnt and cnt>0:items.append({'id':iid,'count':cnt,'name':item_names.get(iid,f'Item {iid}')})
            for e in iter_dirs(child_dir(sec,'mob')):
                mid=normalize_id(scal(e,'id','')); cnt=num(scal(e,'count'),0)
                if mid:mobs.append({'id':mid,'count':cnt,'name':mob_names.get(mid,f'Monster {mid}')})
        for e in iter_dirs(child_dir(start,'quest')):
            pid=normalize_id(scal(e,'id','')); state=num(scal(e,'state'),0)
            if pid:prev.append({'id':pid,'state':state})
        for e in iter_dirs(child_dir(start,'job')):
            v=num(e.attrib.get('value') or scal(e,'value'),None)
            if v is None: v=num(e.attrib.get('name'),None)
            if v is not None:jobs.append(v)
        reward_items=[]
        for e in iter_dirs(child_dir(reward,'item')):
            iid=normalize_id(scal(e,'id','')); cnt=num(scal(e,'count'),0)
            if iid and cnt and cnt>0:reward_items.append({'id':iid,'count':cnt,'name':item_names.get(iid,f'Item {iid}')})
        exp=num(scal(reward,'exp'),0) or 0
        meso=num(scal(reward,'money'),num(scal(reward,'meso'),0)) or 0
        fame=num(scal(reward,'pop'),num(scal(reward,'fame'),0)) or 0
        name=html.unescape(str(scal(qi,'name',f'Quest {qid}')))
        parent=html.unescape(str(scal(qi,'parent','') or ''))
        summary=html.unescape(str(scal(qi,'0','') or ''))
        progress=html.unescape(str(scal(qi,'1','') or ''))
        complete=html.unescape(str(scal(qi,'2','') or ''))
        nq=normalize_id(scal(reward,'nextQuest','')) if reward is not None else ''
        if not nq and ac is not None:
            nq=normalize_id(scal(child_dir(ac,'1'),'nextQuest',''))
        row={'id':qid,'name':name,'parent':parent,'summary':summary,'progressText':progress,'completeText':complete,
             'area':scal(qi,'area',''),'startNpc':start_npc,'endNpc':end_npc,'lvmin':num(scal(start,'lvmin'),0) or 0,
             'lvmax':num(scal(start,'lvmax'),0) or 0,'items':items,'mobs':mobs,'prev':prev,'jobs':jobs,
             'nextQuest':nq or None,'exp':exp,'meso':meso,'fame':fame,'rewardItems':reward_items,
             'startNpcName':npc_names.get(start_npc,'') if start_npc else '', 'endNpcName':npc_names.get(end_npc,'') if end_npc else '',
             'startLocations':npc_locs.get(start_npc,[]) if start_npc else [], 'endLocations':npc_locs.get(end_npc,[]) if end_npc else []}
        out.append(row)
    out.sort(key=lambda x:(x['name'].lower(),int(x['id']) if x['id'].isdigit() else 0))
    return out


def main():
    ap=argparse.ArgumentParser();ap.add_argument('--web',required=True);ap.add_argument('--pack',required=True);ap.add_argument('--out',required=True)
    a=ap.parse_args(); web=Path(a.web); pack=Path(a.pack); out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
    npc_rows=load_rows(web,'Npc'); mob_rows=load_rows(web,'Mob')
    npc_meta={normalize_id(r.get('id')):npc_public_meta(r) for r in npc_rows}
    public_npc_ids={rid for rid,m in npc_meta.items() if m.get('name')}
    npc_names={normalize_id(r.get('id')):(meaningful_npc_name(r) or normalize_id(r.get('id'))) for r in npc_rows}
    mob_names={normalize_id(r.get('id')):r.get('name') or normalize_id(r.get('id')) for r in mob_rows}
    mob_meta={}
    for r in mob_rows:
        rid=normalize_id(r.get('id')); info=parse_info((r.get('fields') or {}).get('Info',''))
        mob_meta[rid]={'id':rid,'name':mob_names.get(rid,rid),'level':num(info.get('info.level'),num((r.get('fields') or {}).get('Level'),0)) or 0,
                       'exp':num(info.get('info.exp'),num((r.get('fields') or {}).get('Exp'),0)) or 0,'preview':r.get('preview') or ''}
    item_names={}
    for tab in ITEM_TABS:
        for r in load_rows(web,tab):
            rid=normalize_id(r.get('id')); name=r.get('name') or (r.get('fields') or {}).get('Name') or ''
            if rid and name and name!='MISSING NAME':item_names[rid]=name
    links=json.loads((pack/'map-links.json').read_text(encoding='utf-8'))
    map_meta={normalize_id(k):v for k,v in links.get('maps',{}).items()}
    map_names={mid:(m.get('mapName') or mid) for mid,m in map_meta.items()}
    spatial={}
    xml_by_id={normalize_id(p.stem.split('.')[0]):p for p in (pack/'Map.wz').glob('Map*/*.img.xml')}
    for mid,meta in map_meta.items():
        p=xml_by_id.get(mid)
        rec=parse_map_xml(p,meta,map_names,npc_names,mob_names,public_npc_ids) if p else None
        if rec:spatial[mid]=rec
        else:
            preview=meta.get('preview') or ''
            thumb=(RAW_BASE+preview) if preview else f'https://maplestory.io/api/GMS/83/map/{mid}/minimap'
            spatial[mid]={'id':mid,'name':meta.get('mapName') or mid,'street':meta.get('streetName') or '',
                          'image':f'https://maplestory.io/api/GMS/83/map/{mid}/render/0','thumb':thumb,
                          'fallbackImage':f'https://maplestory.io/api/GMS/83/map/{mid}/minimap',
                          'portals':[],'npcs':[],'mobs':[],'npcCount':0,'mobCount':len(meta.get('mobs') or []),'mini':{}}
    npc_locs=defaultdict(list); mob_locs=defaultdict(list)
    for mid,m in spatial.items():
        for n in m['npcs']:npc_locs[n['id']].append((mid,m,n))
        for x in m['mobs']:mob_locs[x['id']].append((mid,m,x))
    npcs=[]
    for r in npc_rows:
        rid=normalize_id(r.get('id')); meta_n=npc_meta.get(rid,{})
        if not meta_n.get('name'):
            continue
        locs=npc_locs.get(rid,[]); seen=[]; names=[]
        for mid,m,n in locs:
            if mid not in seen:seen.append(mid);names.append(m['name'])
        npcs.append({'id':rid,'name':meta_n['name'],'mapCount':len(seen),'firstMap':names[0] if names else '',
                     'preview':meta_n.get('preview') or '','image':meta_n.get('image') or '',
                     'role':meta_n.get('role') or '','dialogue':meta_n.get('dialogue') or []})
    npcs.sort(key=lambda x:(x['name'].lower(),x['id']))
    mobs=list(mob_meta.values());mobs.sort(key=lambda x:(x['name'].lower(),x['id']))
    maps=[]
    for mid,m in spatial.items():
        maps.append({'id':mid,'name':m['name'],'street':m['street'],'npcCount':m['npcCount'],'mobCount':m['mobCount'],
                     'portalCount':len(m['portals']),'image':m.get('thumb') or m['image'],'hdImage':m['image']})
    maps.sort(key=lambda x:(x['name'].lower(),x['id']))
    quests=parse_quest_files(pack,npc_names,mob_names,item_names,spatial)
    idx={'meta':{'npcs':len(npcs),'npcSourceTotal':len(npc_rows),'npcInternalHidden':len(npc_rows)-len(npcs),
                 'maps':len(maps),'quests':len(quests),'mobs':len(mobs)},'npcs':npcs,'maps':maps,'quests':quests,'mobs':mobs}
    drop_text=download_text(COSMIC_BASE+'152-drop-data.sql'); shop_text=download_text(COSMIC_BASE+'101-shops-data.sql'); shopitems_text=download_text(COSMIC_BASE+'102-shopitems-data.sql')
    item_drops=defaultdict(dict); mob_drops=defaultdict(dict)
    for r in sql_rows(drop_text):
        if len(r)<6:continue
        mon,item,mn,mx,q,ch=r[:6]
        if not isinstance(mon,(int,float)) or not isinstance(item,(int,float)) or int(item)<=0:continue
        mon=int(mon); item=int(item); pct=(float(ch)/10000.0 if isinstance(ch,(int,float)) else None)
        a={'id':mon,'name':mob_names.get(str(mon),f'Monster {mon}'),'chance':pct,'min':mn,'max':mx}
        b={'id':item,'name':item_names.get(str(item),f'Item {item}'),'chance':pct,'min':mn,'max':mx}
        old=item_drops[str(item)].get(mon)
        if old is None or (pct or 0)>(old.get('chance') or 0):item_drops[str(item)][mon]=a
        old=mob_drops[str(mon)].get(item)
        if old is None or (pct or 0)>(old.get('chance') or 0):mob_drops[str(mon)][item]=b
    shops={}
    for r in sql_rows(shop_text):
        if len(r)>=2 and isinstance(r[0],(int,float)) and isinstance(r[1],(int,float)):shops[int(r[0])]=int(r[1])
    item_shops=defaultdict(dict)
    for r in sql_rows(shopitems_text):
        if len(r)<3:continue
        sid,iid,price=r[:3]
        if not isinstance(sid,(int,float)) or not isinstance(iid,(int,float)):continue
        npc=shops.get(int(sid));
        if npc is None:continue
        item_shops[str(int(iid))][npc]={'id':npc,'name':npc_names.get(str(npc),f'NPC {npc}'),'price':price}
    rel={'itemNames':item_names,'itemDrops':{k:list(v.values()) for k,v in item_drops.items()},'mobDrops':{k:list(v.values()) for k,v in mob_drops.items()},'itemShops':{k:list(v.values()) for k,v in item_shops.items()}}
    def dump(name,obj,var):
        txt=json.dumps(obj,ensure_ascii=False,separators=(',',':'))
        (out/f'{name}.json').write_text(txt,encoding='utf-8')
        (out/f'{name}.js').write_text(f'window.{var}='+txt+';\n',encoding='utf-8')
    dump('db-index',idx,'KAIOKEN_DB_INDEX');dump('map-spatial',{'maps':spatial},'KAIOKEN_MAP_SPATIAL');dump('item-relations',rel,'KAIOKEN_ITEM_RELATIONS')
    print(json.dumps({'npcs':len(npcs),'mobs':len(mobs),'maps':len(maps),'quests':len(quests),'itemDrops':len(rel['itemDrops']),'itemShops':len(rel['itemShops'])}))

if __name__=='__main__':main()

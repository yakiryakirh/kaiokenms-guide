(() => {
  'use strict';

  const API='https://maplestory.io/api/GMS/83';
  const RAW='https://raw.githubusercontent.com/andrenogrib/gms_v83_wztoweb/refs/heads/main/WEB/';
  const idx=window.KAIOKEN_DB_INDEX||{npcs:[],mobs:[],maps:[],quests:[],meta:{}};
  const spatial=(window.KAIOKEN_MAP_SPATIAL||{}).maps||{};
  const rel=window.KAIOKEN_ITEM_RELATIONS||{itemDrops:{},mobDrops:{},itemShops:{},itemNames:{}};
  const $=id=>document.getElementById(id);
  const grid=$('result-grid'), status=$('explorer-status'), search=$('db-search'), count=$('result-count');
  const sugg=$('db-suggestions'), pager=$('db-pagination'), dialog=$('detail-dialog'), detailTitle=$('detail-title'), detailBody=$('detail-body');
  let entity='item', page=1, query='', itemRows=[], customRows=[];

  const cfg={
    item:['Items','Item','📦'],mob:['Monsters','Monster','👹'],npc:['NPCs','NPC','🧑'],map:['Maps','Map','🗺️'],quest:['Quests','Quest','📜'],job:['Jobs','Job','⚔️'],custom:['KaiokenMS Unique','KaiokenMS Entry','🔥']
  };
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=s=>String(s??'').trim();
  const nkey=v=>{try{return String(parseInt(v,10))}catch{return String(v??'')}};
  const icon=(type,id)=>type==='mob'?`${API}/mob/${id}/icon`:type==='npc'?`${API}/npc/${id}/icon`:type==='item'?`${API}/item/${id}/icon`:'';
  const mapImage=m=>m?.id?`${API}/map/${m.id}/render/0`:(m?.image||m?.fallbackImage||'');
  const uniqueBy=(arr,key='id')=>[...new Map((arr||[]).map(x=>[String(x?.[key]??''),x])).values()].filter(x=>String(x?.[key]??''));

  const customFallback=[
    ...Array.from({length:7},(_,i)=>({name:`Dragon Ball (${i+1}-Star)`,category:'Dragon Balls',description:'One of the seven Dragon Balls used by the custom Shenron system.',image_url:`images/dragon-ball-${i+1}-item.png`,verified:true})),
    {name:'Maple Leaf Box',category:'Boxes',description:'Custom KaiokenMS reward box used in server progression.',image_url:'images/maple-leaf-box.png',verified:true},
    {name:'Kaioken ItemVac',category:'Utility',description:'Timed utility that automatically pulls nearby monster drops while farming.',image_url:'images/item-vac-website.png',verified:true},
    {name:'Scouter',game_id:1022042,category:'Equipment',description:'Equip the Scouter and inspect monsters for useful combat and drop information.',image_url:'images/scouter-1022042-icon.png',verified:true},
    {name:'Kaioken Force Scroll 10%',category:'Kaioken Scrolls',description:'Custom KaiokenMS progression scroll.',image_url:'images/kaioken-scroll-icon.png',verified:true},
    {name:'Kaioken Stability Scroll 100%',category:'Kaioken Scrolls',description:'Custom KaiokenMS progression scroll.',image_url:'images/kaioken-scroll-icon.png',verified:true},
    {name:'Kaioken Surge Scroll',category:'Kaioken Scrolls',description:'Custom KaiokenMS progression scroll.',image_url:'images/kaioken-scroll-icon.png',verified:true},
    {name:'Equip Enhancement Scroll',category:'Enhancement Scrolls',description:'Enhances upgraded equipment. Failure can destroy the item.',image_url:'images/equip-enhancement-scroll.png',verified:true},
    {name:'Advanced Equip Enhancement Scroll',category:'Enhancement Scrolls',description:'Advanced equipment enhancement scroll.',image_url:'images/advanced-equip-enhancement-scroll.png',verified:true},
    {name:'Protection Scroll',category:'Enhancement Scrolls',description:'Protects equipment from destruction by one failed enhancement.',image_url:'images/protection-scroll.png',verified:true}
  ];

  const jobs={
    Warrior:['Warrior (1st)','Fighter (2nd)','Page (2nd)','Spearman (2nd)','Crusader (3rd)','White Knight (3rd)','Dragon Knight (3rd)','Hero (4th)','Paladin (4th)','Dark Knight (4th)'],
    Magician:['Magician (1st)','F/P Wizard (2nd)','I/L Wizard (2nd)','Cleric (2nd)','F/P Mage (3rd)','I/L Mage (3rd)','Priest (3rd)','F/P Arch Mage (4th)','I/L Arch Mage (4th)','Bishop (4th)'],
    Bowman:['Archer (1st)','Hunter (2nd)','Crossbowman (2nd)','Ranger (3rd)','Sniper (3rd)','Bow Master (4th)','Marksman (4th)'],
    Thief:['Rogue (1st)','Assassin (2nd)','Bandit (2nd)','Hermit (3rd)','Chief Bandit (3rd)','Night Lord (4th)','Shadower (4th)'],
    Pirate:['Pirate (1st)','Brawler (2nd)','Gunslinger (2nd)','Marauder (3rd)','Outlaw (3rd)','Buccaneer (4th)','Corsair (4th)'],
    'Cygnus Knights':['Dawn Warrior','Blaze Wizard','Wind Archer','Night Walker','Thunder Breaker'],
    Aran:['Aran (1st)','Aran (2nd)','Aran (3rd)','Aran (4th)'],
    'Beginner / Other':['Beginner','Noblesse','Legend']
  };

  const style=document.createElement('style'); style.textContent=`
    .nav-back-link{appearance:none;border:1px solid #355784;background:linear-gradient(145deg,#172a4a,#0d182d);color:#fff;border-radius:999px;padding:8px 12px;font:inherit;font-weight:900;cursor:pointer}
    .pre4-card{display:flex;gap:13px;align-items:center;min-height:104px;border:1px solid #35547c;border-radius:13px;padding:13px;background:#1a2b44;cursor:pointer;transition:.15s}.pre4-card:hover{border-color:#ff8a00;transform:translateY(-1px)}
    .pre4-card img{width:64px;height:64px;object-fit:contain;border:1px solid #35547c;border-radius:10px;background:#101b2b}.pre4-card .map-thumb{width:116px;height:72px;object-fit:contain}
    .pre4-name{font-weight:1000;font-size:1.05rem;color:#f8fbff}.pre4-meta{color:#86dcff;font-size:.82rem;margin-top:5px}.pre4-sub{color:#b9c7da;font-size:.8rem;margin-top:4px}
    .pre4-detail h3{color:#ffd54a;margin:22px 0 10px}.pre4-tags{display:flex;gap:7px;flex-wrap:wrap}.pre4-tag{border:1px solid #35547c;border-radius:999px;padding:4px 9px;color:#86dcff;background:#101b2b}
    .entity-links{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.entity-link{display:flex;align-items:center;gap:10px;border:1px solid #35547c;background:#1a2b44;border-radius:11px;padding:10px;cursor:pointer;color:#fff}.entity-link:hover{border-color:#ff8a00}.entity-link img{width:48px;height:48px;object-fit:contain}
    .map-box{border:1px solid #35547c;border-radius:13px;padding:12px;margin:10px 0;background:#101b2b}.map-canvas{position:relative;overflow:auto;border:1px solid #35547c;border-radius:11px;background:#0b1320;min-height:100px;display:grid;place-items:center}.map-canvas>img{display:block;width:auto;max-width:100%;height:auto;max-height:640px;object-fit:contain;image-rendering:auto}.marker{position:absolute;transform:translate(-50%,-50%);width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 10px currentColor}.marker.portal{color:#ff9800;background:#ff9800}.marker.npc{color:#ff4d71;background:#ff4d71}.map-legend{font-size:.78rem;color:#b9c7da;margin-top:7px}.portal-list{display:grid;gap:7px;margin-top:9px}.portal-row{display:flex;justify-content:space-between;gap:10px;align-items:center;border:1px solid #35547c;border-radius:9px;padding:8px 10px}.portal-target{display:flex;flex-direction:column}.portal-target small{color:#9fb1c7;font-size:.72rem}.portal-row button,.mini-open{border:1px solid #ff8a00;background:#6b3300;color:#ffd54a;border-radius:8px;padding:6px 10px;font-weight:900;cursor:pointer}
    .stats-table{width:100%;border-collapse:collapse}.stats-table th,.stats-table td{padding:8px;border-bottom:1px solid #35547c;text-align:left}.stats-table th{color:#86dcff;width:32%}
    .job-family{border:1px solid #35547c;border-radius:12px;padding:12px;margin:9px 0;background:#101b2b}.job-family h3{margin:0 0 8px;color:#ffd54a}.job-pills{display:flex;flex-wrap:wrap;gap:7px}.job-pill{padding:6px 9px;border:1px solid #35547c;border-radius:999px;background:#1a2b44}
    .quest-text{white-space:pre-wrap;line-height:1.55;color:#dce8f6}.empty{color:#9fb1c7;padding:10px 0}
    @media(max-width:680px){.entity-links{grid-template-columns:1fr}.pre4-card .map-thumb{width:86px}.map-canvas>img{max-height:320px}}
  `; document.head.appendChild(style);

  function cleanQuestText(raw){
    let s=String(raw||'').replace(/\\n/g,'\n').replace(/\\r/g,'');
    s=s.replace(/#o(\d+)#s?#?/gi,(_,id)=>findMob(id)?.name||`Monster ${id}`);
    s=s.replace(/#p(\d+)#/gi,(_,id)=>findNpc(id)?.name||`NPC ${id}`);
    s=s.replace(/#t(\d+)#/gi,(_,id)=>rel.itemNames?.[nkey(id)]||`Item ${id}`);
    s=s.replace(/#m(\d+)#/gi,(_,id)=>spatial[nkey(id)]?.name||`Map ${id}`);
    s=s.replace(/#q(\d+)#/gi,(_,id)=>findQuest(id)?.name||`Quest ${id}`);
    s=s.replace(/#[a-zA-Z](?:\d+)?#/g,'').replace(/#[a-zA-Z]/g,'').replace(/\s+\n/g,'\n').replace(/\n{3,}/g,'\n\n');
    return s.trim();
  }
  function findNpc(id){return idx.npcs?.find(x=>nkey(x.id)===nkey(id))}
  function findMob(id){return idx.mobs?.find(x=>nkey(x.id)===nkey(id))}
  function findQuest(id){return idx.quests?.find(x=>nkey(x.id)===nkey(id))}
  function findMap(id){return idx.maps?.find(x=>nkey(x.id)===nkey(id))}
  function rowsFor(type){
    if(type==='mob')return idx.mobs||[]; if(type==='npc')return idx.npcs||[]; if(type==='map')return idx.maps||[]; if(type==='quest')return idx.quests||[];
    if(type==='custom')return customRows.length?customRows:customFallback; return [];
  }
  function titleOf(type,row){return norm(row?.name||row?.description?.name||row?.title||`ID ${row?.id??''}`)}
  function idOf(row){return row?.id??row?.itemId??row?.game_id??null}

  async function apiJson(url){const r=await fetch(url,{headers:{Accept:'application/json'}});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()}
  async function loadItems(q=''){
    const u=new URL(`${API}/item`); if(q)u.searchParams.set('searchFor',q);u.searchParams.set('startPosition','0');u.searchParams.set('count','1000');
    const d=await apiJson(u); itemRows=Array.isArray(d)?d:(d?.data||d?.items||d?.results||[]); return itemRows;
  }
  async function loadCustom(){
    try{
      const c=window.KAIOKEN_DATABASE_CONFIG;if(!window.supabase||!c?.supabaseUrl)return;
      const sb=window.supabase.createClient(c.supabaseUrl,c.supabasePublishableKey);
      const {data}=await sb.from('guide_database_entries').select('*').order('name');
      if(Array.isArray(data)) customRows=data.filter(r=>!['npc','feature','service','map','quest','job','monster','mob'].includes(String(r.entity_type||'').toLowerCase()));
    }catch(e){console.warn('custom database fallback',e)}
  }

  function filterRows(rows){
    const q=query.toLowerCase();if(!q)return [...rows].sort((a,b)=>titleOf(entity,a).localeCompare(titleOf(entity,b),undefined,{numeric:true}));
    return rows.filter(r=>titleOf(entity,r).toLowerCase().includes(q)||String(idOf(r)||'')===q).sort((a,b)=>titleOf(entity,a).localeCompare(titleOf(entity,b),undefined,{numeric:true}));
  }
  function totalPages(rows){return Math.max(1,Math.ceil(rows.length/Number(count.value||24)))}
  function paginate(rows){const size=Number(count.value||24),pages=totalPages(rows);page=Math.min(Math.max(1,page),pages);return rows.slice((page-1)*size,page*size)}
  function renderPager(rows){
    const pages=totalPages(rows);pager.innerHTML='';pager.hidden=pages<=1;if(pages<=1)return;
    const add=(label,p,active=false)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.className=active?'active':'';b.disabled=active;b.onclick=()=>{page=p;render();document.getElementById('explorer')?.scrollIntoView({behavior:'smooth'})};pager.appendChild(b)};
    if(page>1)add('‹',page-1);const nums=new Set([1,pages,page-2,page-1,page,page+1,page+2].filter(n=>n>=1&&n<=pages));let prev=0;[...nums].sort((a,b)=>a-b).forEach(n=>{if(prev&&n-prev>1){const s=document.createElement('span');s.textContent='…';pager.appendChild(s)}add(String(n),n,n===page);prev=n});if(page<pages)add('›',page+1);
  }
  function card(type,row){
    const el=document.createElement('article');el.className='pre4-card';const id=idOf(row),name=titleOf(type,row);let img='',meta='',sub='';
    if(type==='mob'){img=icon('mob',id);meta=row.level?`Lv. ${row.level}${row.exp?` • ${row.exp} EXP`:''}`:'';sub=`Found in ${mobMaps(id).length} map${mobMaps(id).length===1?'':'s'}`}
    if(type==='npc'){img=icon('npc',id);meta=row.firstMap||'Location data available in details';sub=row.mapCount?`${row.mapCount} map${row.mapCount===1?'':'s'}`:''}
    if(type==='map'){img=mapImage(spatial[nkey(id)]||row);meta=row.street||'';sub=[row.npcCount?`${row.npcCount} NPCs`:'',row.mobCount?`${row.mobCount} monsters`:'',row.portalCount?`${row.portalCount} exits`:''].filter(Boolean).join(' • ')}
    if(type==='quest'){const npc=findNpc(row.startNpc);img=npc?icon('npc',npc.id):'';meta=[row.lvmin?`Lv. ${row.lvmin}+`:'',row.startNpcName?`Starts: ${row.startNpcName}`:'',row.exp?`${row.exp} EXP`:''].filter(Boolean).join(' • ');sub=row.parent||cleanQuestText(row.summary).slice(0,90)}
    if(type==='item'){img=icon('item',id);meta=row.typeInfo?.subCategory||row.typeInfo?.category||row.description?.description||'';sub=id?`Item ${id}`:''}
    if(type==='custom'){img=row.image_url||(/Maple Leaf Box/i.test(name)?'images/maple-leaf-box.png':'');meta=row.category||'KaiokenMS Unique';sub=row.description||''}
    el.innerHTML=`${img?`<img class="${type==='map'?'map-thumb':''}" src="${esc(img)}" alt="">`:''}<div><div class="pre4-name">${esc(name)}</div>${meta?`<div class="pre4-meta">${esc(meta)}</div>`:''}${sub?`<div class="pre4-sub">${esc(sub)}</div>`:''}</div>`;el.onclick=()=>openEntity(type,row);return el;
  }

  function mapRecordsForNpc(id){const out=[];for(const m of Object.values(spatial)){const pts=(m.npcs||[]).filter(n=>nkey(n.id)===nkey(id));if(pts.length)out.push({m,pts})}return out}
  function mobMaps(id){const out=[];for(const m of Object.values(spatial)){const pts=(m.mobs||[]).filter(n=>nkey(n.id)===nkey(id));if(pts.length)out.push({m,pts})}return out}
  function realPortals(m){return uniqueBy((m?.portals||[]).filter(p=>p.targetMapId&&nkey(p.targetMapId)!==nkey(m.id)&&nkey(p.targetMapId)!=='999999999'&&p.targetMapName),'targetMapId')}
  function markerHTML(cls,p,title){return `<span class="marker ${cls}" style="left:${Number(p.left)||0}%;top:${Number(p.top)||0}%" title="${esc(title)}"></span>`}
  function mapBox(rec,{npcPoints=[],showPortals=true}={}){
    const m=rec?.m||rec;if(!m)return '';
    const portals=showPortals?realPortals(m):[];
    return `<div class="map-box"><div><b>${esc(m.name)}</b>${m.street?` <span style="color:#9fb1c7">• ${esc(m.street)}</span>`:''}</div><div class="map-canvas"><img src="${esc(mapImage(m))}" data-fallback="${esc(m.fallbackImage||'')}" alt="${esc(m.name)} map">${portals.map(p=>markerHTML('portal',p,`Portal to ${p.targetMapName}`)).join('')}${npcPoints.map(p=>markerHTML('npc',p,'NPC location')).join('')}</div><div class="map-legend">${portals.length?'● Orange marker: connected map':''}${npcPoints.length?' &nbsp; ★ NPC location':''}</div>${portals.length?`<div class="portal-list">${portals.map(p=>`<div class="portal-row"><span class="portal-target"><small>Destination map</small><b>${esc(p.targetMapName)}</b></span><button type="button" data-map="${esc(p.targetMapId)}" data-map-name="${esc(p.targetMapName)}">Open map →</button></div>`).join('')}</div>`:''}</div>`;
  }
  function bindMapButtons(root=detailBody){root.querySelectorAll('.map-canvas img[data-fallback]').forEach(img=>img.onerror=()=>{const f=img.dataset.fallback;if(f&&img.src!==f){img.onerror=null;img.src=f}});root.querySelectorAll('[data-map]').forEach(b=>b.onclick=()=>{const id=nkey(b.dataset.map),m=findMap(id)||spatial[id]||{id,name:b.dataset.mapName||`Map ${id}`};openEntity('map',m)})}
  function linkCard(type,row,extra=''){
    const id=idOf(row),name=titleOf(type,row);let img=type==='npc'?icon('npc',id):type==='mob'?icon('mob',id):type==='item'?icon('item',id):type==='map'?mapImage(spatial[nkey(id)]||row):'';
    return `<button type="button" class="entity-link" data-open-type="${type}" data-open-id="${esc(id)}">${img?`<img src="${esc(img)}" alt="">`:''}<span><b>${esc(name)}</b>${extra?`<small style="display:block;color:#9fb1c7">${esc(extra)}</small>`:''}</span></button>`;
  }
  function bindEntityLinks(root=detailBody){root.querySelectorAll('[data-open-type]').forEach(b=>b.onclick=()=>{const t=b.dataset.openType,id=b.dataset.openId;let r=t==='npc'?findNpc(id):t==='mob'?findMob(id):t==='map'?findMap(id):t==='quest'?findQuest(id):null;if(t==='item')return openItemById(id);if(r)openEntity(t,r)})}
  function showDetail(title,html){detailTitle.textContent=title;detailBody.innerHTML=`<div class="pre4-detail">${html}</div>`;bindMapButtons();bindEntityLinks();dialog.showModal()}

  function openMap(row){const m=spatial[nkey(row.id)]||row;const mobs=uniqueBy(m.mobs||[]),npcs=uniqueBy(m.npcs||[]),ports=realPortals(m);showDetail(m.name,`${mapBox(m)}<h3>Map Overview</h3><table class="stats-table"><tr><th>Area</th><td>${esc(m.street||'')}</td></tr><tr><th>NPCs</th><td>${npcs.length}</td></tr><tr><th>Monsters</th><td>${mobs.length}</td></tr><tr><th>Connected maps</th><td>${ports.length}</td></tr></table>${npcs.length?`<h3>NPCs</h3><div class="entity-links">${npcs.map(n=>linkCard('npc',findNpc(n.id)||n)).join('')}</div>`:''}${mobs.length?`<h3>Monsters</h3><div class="entity-links">${mobs.map(n=>linkCard('mob',findMob(n.id)||n)).join('')}</div>`:''}`)}
  function openNpc(row){const maps=mapRecordsForNpc(row.id),quests=(idx.quests||[]).filter(q=>nkey(q.startNpc)===nkey(row.id)||nkey(q.endNpc)===nkey(row.id)),starts=quests.filter(q=>nkey(q.startNpc)===nkey(row.id)),ends=quests.filter(q=>nkey(q.endNpc)===nkey(row.id)),extra=scalarRows(row).filter(([k])=>!/^(id|name|mapCount|firstMap)$/i.test(k)).slice(0,16);showDetail(row.name,`<div style="display:flex;gap:18px;align-items:center"><img src="${icon('npc',row.id)}" style="width:110px;height:110px;object-fit:contain" alt="${esc(row.name)}"><div><h2 style="margin:0">${esc(row.name)}</h2><div class="pre4-tags"><span class="pre4-tag">${maps.length} mapped location${maps.length===1?'':'s'}</span><span class="pre4-tag">${starts.length} quest start${starts.length===1?'':'s'}</span><span class="pre4-tag">${ends.length} quest turn-in${ends.length===1?'':'s'}</span></div></div></div>${extra.length?`<h3>NPC Details</h3><table class="stats-table">${extra.map(([k,v])=>`<tr><th>${esc(k.replace(/([A-Z])/g,' $1'))}</th><td>${esc(v)}</td></tr>`).join('')}</table>`:''}${maps.length?`<h3>Known Locations</h3><div class="pre4-tags">${maps.map(x=>`<span class="pre4-tag">${esc(x.m.name)}${x.m.street?` • ${esc(x.m.street)}`:''}</span>`).join('')}</div>`:''}${quests.length?`<h3>Related Quests</h3><div class="entity-links">${quests.map(q=>linkCard('quest',q,[nkey(q.startNpc)===nkey(row.id)?'Starts here':'',nkey(q.endNpc)===nkey(row.id)?'Ends here':''].filter(Boolean).join(' • '))).join('')}</div>`:''}${maps.length?`<h3>NPC Locations</h3>${maps.map(x=>mapBox(x.m,{npcPoints:x.pts,showPortals:true})).join('')}`:'<p class="empty">No verified v83 map location is listed for this NPC.</p>'}`)}
  function openMob(row){const maps=mobMaps(row.id),drops=rel.mobDrops?.[nkey(row.id)]||[];showDetail(row.name,`<div style="display:flex;gap:18px;align-items:center"><img src="${icon('mob',row.id)}" style="width:110px;height:110px;object-fit:contain" alt=""><div><h2 style="margin:0">${esc(row.name)}</h2><div class="pre4-tags">${row.level?`<span class="pre4-tag">Lv. ${row.level}</span>`:''}${row.exp?`<span class="pre4-tag">${row.exp} EXP</span>`:''}</div></div></div>${maps.length?`<h3>Found In</h3>${maps.map(x=>mapBox(x.m,{showPortals:true})).join('')}`:'<p class="empty">No mapped v83 spawn location is listed.</p>'}${drops.length?`<h3>Drops</h3><div class="entity-links">${drops.slice(0,150).map(d=>linkCard('item',{id:d.id,name:d.name},d.chance!=null?`${d.chance}%`:'' )).join('')}</div>`:''}`)}
  function openQuest(row){
    const start=findNpc(row.startNpc),end=findNpc(row.endNpc),reqItems=uniqueBy(row.items||[]),reqMobs=uniqueBy(row.mobs||[]),rewardItems=uniqueBy(row.rewardItems||[]),prev=(row.prev||[]).map(x=>findQuest(x.id)).filter(Boolean),next=row.nextQuest?findQuest(row.nextQuest):null;
    const startLoc=(row.startLocations||[])[0],endLoc=(row.endLocations||[])[0];
    const route=`<h3>Quest Route</h3><div class="entity-links">${start?linkCard('npc',start,'Starts with'):''}${end?linkCard('npc',end,'Ends with'):''}</div>${startLoc?mapBox(spatial[nkey(startLoc.mapId)],{npcPoints:[startLoc],showPortals:true}):''}${endLoc&&(!startLoc||nkey(endLoc.mapId)!==nkey(startLoc.mapId))?mapBox(spatial[nkey(endLoc.mapId)],{npcPoints:[endLoc],showPortals:true}):''}`;
    showDetail(row.name,`<div class="pre4-tags">${row.lvmin?`<span class="pre4-tag">Lv. ${row.lvmin}+</span>`:''}${row.exp?`<span class="pre4-tag">${row.exp} EXP</span>`:''}${row.fame?`<span class="pre4-tag">${row.fame} Fame</span>`:''}${row.meso?`<span class="pre4-tag">${row.meso} Mesos</span>`:''}</div>${row.summary?`<p class="quest-text">${esc(cleanQuestText(row.summary))}</p>`:''}${route}${row.progressText?`<h3>Objective / Progress</h3><p class="quest-text">${esc(cleanQuestText(row.progressText))}</p>`:''}${reqMobs.length?`<h3>Monsters Required</h3><div class="entity-links">${reqMobs.map(m=>linkCard('mob',findMob(m.id)||m,m.count?`Defeat ${m.count}`:'')).join('')}</div>`:''}${reqItems.length?`<h3>Items Required</h3><div class="entity-links">${reqItems.map(i=>linkCard('item',i,i.count?`Need ${i.count}`:'')).join('')}</div>`:''}${row.completeText?`<h3>Completion</h3><p class="quest-text">${esc(cleanQuestText(row.completeText))}</p>`:''}${rewardItems.length?`<h3>Item Rewards</h3><div class="entity-links">${rewardItems.map(i=>linkCard('item',i,i.count?`x${i.count}`:'')).join('')}</div>`:''}${prev.length||next?`<h3>Quest Chain</h3><div class="entity-links">${prev.map(q=>linkCard('quest',q,'Previous quest')).join('')}${next?linkCard('quest',next,'Next quest'):''}</div>`:''}`)
  }

  function scalarRows(obj,prefix='',depth=0,out=[]){if(depth>2||!obj||typeof obj!=='object')return out;for(const [k,v] of Object.entries(obj)){if(v==null||v===''||['id','name','description','typeInfo'].includes(k))continue;if(['string','number','boolean'].includes(typeof v))out.push([prefix+k,v]);else if(!Array.isArray(v))scalarRows(v,`${prefix}${k}.`,depth+1,out)}return out}
  async function openItemById(id,fallback=null){
    let row=fallback;try{row=await apiJson(`${API}/item/${id}`)}catch{};row=row||fallback||{id,name:rel.itemNames?.[nkey(id)]||`Item ${id}`};const iid=nkey(id),name=titleOf('item',row)||rel.itemNames?.[iid]||`Item ${iid}`;const drops=rel.itemDrops?.[iid]||[],shops=rel.itemShops?.[iid]||[];let stats=scalarRows(row).filter(([k])=>!/cash|icon|frame|islot|vslot/i.test(k)).slice(0,28);showDetail(name,`<div style="display:flex;gap:18px;align-items:center"><img src="${icon('item',iid)}" style="width:110px;height:110px;object-fit:contain" alt=""><div><h2 style="margin:0">${esc(name)}</h2>${row.description?.description?`<p>${esc(row.description.description)}</p>`:''}</div></div>${stats.length?`<h3>Stats & Details</h3><table class="stats-table">${stats.map(([k,v])=>`<tr><th>${esc(k.replace(/^metaInfo\./,'').replace(/^info\./,'').replace(/([A-Z])/g,' $1'))}</th><td>${esc(v)}</td></tr>`).join('')}</table>`:''}${drops.length?`<h3>Dropped By</h3><div class="entity-links">${drops.map(d=>linkCard('mob',findMob(d.id)||d,[d.chance!=null?`${d.chance}%`:'',d.min!=null&&d.max!=null?`${d.min}–${d.max}`:''].filter(Boolean).join(' • '))).join('')}</div>`:'<h3>Dropped By</h3><p class="empty">No monster drop information is listed for this item.</p>'}${shops.length?`<h3>Sold By</h3><div class="entity-links">${shops.map(s=>linkCard('npc',findNpc(s.id)||s,s.price!=null?`${Number(s.price).toLocaleString()} mesos`:'' )).join('')}</div>`:''}`)
  }
  async function openItem(row){return openItemById(idOf(row),row)}
  function openCustom(row){showDetail(row.name,`${row.image_url?`<img src="${esc(row.image_url)}" style="width:110px;height:110px;object-fit:contain" alt="">`:''}<h3>${esc(row.category||'KaiokenMS Unique')}</h3><p>${esc(row.description||'KaiokenMS custom entry.')}</p>${row.game_id?`<button class="mini-open" data-item="${esc(row.game_id)}">Open base item record</button>`:''}`);detailBody.querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>openItemById(b.dataset.item))}
  function openJobs(){showDetail('Jobs by Category',Object.entries(jobs).map(([family,names])=>`<div class="job-family"><h3>${esc(family)}</h3><div class="job-pills">${names.map(n=>`<span class="job-pill">${esc(n)}</span>`).join('')}</div></div>`).join(''))}
  function openEntity(type,row){if(type==='map')openMap(row);else if(type==='npc')openNpc(row);else if(type==='mob')openMob(row);else if(type==='quest')openQuest(row);else if(type==='item')openItem(row);else if(type==='custom')openCustom(row);else if(type==='job')openJobs()}

  async function render(){
    sugg.hidden=true;grid.innerHTML='';pager.hidden=true;const size=Number(count.value||24);
    if(entity==='job'){status.textContent='Jobs are organized by class family.';const holder=document.createElement('div');holder.style.gridColumn='1/-1';holder.innerHTML=Object.entries(jobs).map(([family,names])=>`<div class="job-family"><h3>${esc(family)}</h3><div class="job-pills">${names.map(n=>`<span class="job-pill">${esc(n)}</span>`).join('')}</div></div>`).join('');grid.appendChild(holder);return}
    if(entity==='item'){
      status.textContent='Loading GMS v83 items…';try{await loadItems(query);const rows=filterRows(itemRows);const shown=paginate(rows);status.textContent=`Page ${page} • ${rows.length} item${rows.length===1?'':'s'}.`;shown.forEach(r=>grid.appendChild(card('item',r)));renderPager(rows)}catch(e){status.textContent='The v83 item service could not be reached right now.'}return;
    }
    const all=filterRows(rowsFor(entity)),shown=paginate(all);status.textContent=`Page ${page} • ${all.length} ${cfg[entity][0].toLowerCase()}.`;shown.forEach(r=>grid.appendChild(card(entity,r)));renderPager(all)
  }

  function suggestions(){
    const q=search.value.trim().toLowerCase();if(!q){sugg.hidden=true;return}let rows=entity==='item'?itemRows:rowsFor(entity);if(entity==='job'){rows=Object.values(jobs).flat().map(name=>({name}))}const matches=rows.filter(r=>titleOf(entity,r).toLowerCase().startsWith(q)||titleOf(entity,r).toLowerCase().includes(q)).slice(0,12);if(!matches.length){sugg.hidden=true;return}sugg.innerHTML='';matches.forEach(r=>{const d=document.createElement('button');d.type='button';d.className='suggestion';d.textContent=titleOf(entity,r);d.onclick=()=>{search.value=titleOf(entity,r);query=search.value.trim();page=1;render()};sugg.appendChild(d)});sugg.hidden=false;
  }
  let st;search.addEventListener('input',()=>{clearTimeout(st);st=setTimeout(async()=>{if(entity==='item'&&search.value.trim().length){try{await loadItems(search.value.trim())}catch{}}suggestions()},100)});
  $('db-search-form').addEventListener('submit',e=>{e.preventDefault();query=search.value.trim();page=1;render()});count.addEventListener('change',()=>{page=1;render()});
  document.querySelectorAll('.entity-tab').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.entity-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');entity=b.dataset.entity;query='';search.value='';page=1;search.placeholder=`Start typing a ${cfg[entity][1].toLowerCase()} name or enter an ID…`;render()}));
  $('detail-close').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});$('nav-refresh-btn')?.addEventListener('click',()=>location.reload());

  loadCustom().finally(()=>render());
})();


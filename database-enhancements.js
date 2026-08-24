(() => {
  'use strict';
  const idx=window.KAIOKEN_DB_INDEX||{npcs:[],maps:[]};
  const spatial=(window.KAIOKEN_MAP_SPATIAL||{}).maps||{};
  const detail=document.getElementById('detail-body');
  const title=document.getElementById('detail-title');
  if(!detail||!title)return;

  const norm=s=>String(s||'').trim().replace(/\s+/g,' ');
  const npcByName=new Map((idx.npcs||[]).map(n=>[norm(n.name).toLowerCase(),n]));
  const mapRows=Object.values(spatial);
  const mapByName=new Map(mapRows.map(m=>[norm(m.name).toLowerCase(),m]));

  const style=document.createElement('style');
  style.textContent=`
    .map-render{image-rendering:auto!important}
    .npc-source-details{margin:18px 0;padding:14px 16px;border:1px solid #35547c;border-radius:12px;background:#101b2b}
    .npc-source-details h3{margin:0 0 10px;color:#ffd54a}
    .npc-source-details .npc-role{color:#86dcff;font-weight:900;margin-bottom:8px}
    .npc-source-details .npc-dialogue{margin:8px 0 0;padding-left:18px;color:#dce8f6}
    .npc-source-details .npc-dialogue li+li{margin-top:6px}
    .portal-destination-name{display:block;margin-top:4px;color:#9fb1c7;font-size:.74rem;font-weight:700;line-height:1.25}
  `;
  document.head.appendChild(style);

  function rowName(el){
    const holder=el.closest('.pre4-card,.relation-chip,.detail-top,.location-card,.quest-npc-block')||el.parentElement;
    const named=holder?.querySelector?.('.pre4-name,strong,h2,.location-map-name,.quest-map-link');
    return norm(named?.textContent||'');
  }

  function improveNpcImages(root=document){
    for(const img of root.querySelectorAll('img')){
      if(img.dataset.kaiokenNpcSource==='1')continue;
      const name=rowName(img);
      const row=npcByName.get(name.toLowerCase());
      if(!row?.image)continue;
      const original=img.src;
      img.dataset.kaiokenNpcSource='1';
      img.src=row.image;
      img.addEventListener('error',()=>{
        if(original && img.src!==original)img.src=original;
      },{once:true});
    }
  }

  function currentNpc(){
    const name=norm(title.textContent).toLowerCase();
    return npcByName.get(name)||null;
  }

  function addNpcDetails(){
    if(detail.querySelector('.npc-source-details'))return;
    const npc=currentNpc();
    if(!npc)return;
    const hasUseful=npc.role || (npc.dialogue&&npc.dialogue.length) || npc.firstMap || npc.mapCount;
    if(!hasUseful)return;
    const sec=document.createElement('section');sec.className='npc-source-details';
    const h=document.createElement('h3');h.textContent='NPC Information';sec.appendChild(h);
    if(npc.role){const p=document.createElement('div');p.className='npc-role';p.textContent=npc.role;sec.appendChild(p);}
    if(npc.firstMap){const p=document.createElement('div');p.textContent=`Known location: ${npc.firstMap}${npc.mapCount>1?` • ${npc.mapCount} maps`:''}`;sec.appendChild(p);}
    if(npc.dialogue?.length){
      const ul=document.createElement('ul');ul.className='npc-dialogue';
      for(const line of npc.dialogue){const li=document.createElement('li');li.textContent=line;ul.appendChild(li);}sec.appendChild(ul);
    }
    const loc=detail.querySelector('.location-section');
    if(loc)detail.insertBefore(sec,loc);else detail.appendChild(sec);
  }

  function mapForImage(img){
    const src=String(img.getAttribute('src')||'');
    const id=(src.match(/\/map\/(\d+)\//)||src.match(/images\/maps\/(\d+)/)||[])[1];
    if(id&&spatial[id])return spatial[id];
    const card=img.closest('.location-card');
    if(card){const name=norm(card.querySelector('.location-map-name')?.textContent).toLowerCase();if(mapByName.has(name))return mapByName.get(name);}
    const q=img.closest('.quest-npc-block');
    if(q){const name=norm((q.querySelector('.quest-map-link')?.textContent||'').split('•')[0]).toLowerCase();if(mapByName.has(name))return mapByName.get(name);}
    const direct=norm(title.textContent).toLowerCase();
    return mapByName.get(direct)||null;
  }

  function improveMapImages(root=document){
    for(const img of root.querySelectorAll('img.map-render')){
      if(img.dataset.kaiokenHdMap==='1')continue;
      const m=mapForImage(img);if(!m?.id)continue;
      const previous=img.src;
      const hd=`https://maplestory.io/api/GMS/83/map/${m.id}/render/0`;
      img.dataset.kaiokenHdMap='1';
      img.src=hd;
      img.addEventListener('error',()=>{
        const fallback=m.fallbackImage||m.thumb||previous;
        if(fallback&&img.src!==fallback)img.src=fallback;
      },{once:true});
    }
  }

  function destinationFromRow(row){
    let text=norm(row.textContent||'');
    text=text.replace(/Open map/ig,'').replace(/^To\s+/i,'').trim();
    const exact=mapByName.get(text.toLowerCase());if(exact)return exact;
    return mapRows.find(m=>text.includes(norm(m.name)))||null;
  }

  function fallbackOpenMap(map){
    if(!map)return;
    const tab=document.querySelector('[data-entity="map"]');
    const input=document.getElementById('db-search');
    const form=document.getElementById('db-search-form');
    tab?.click();
    if(input){input.value=map.name;input.dispatchEvent(new Event('input',{bubbles:true}));}
    form?.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    setTimeout(()=>{
      const cards=[...document.querySelectorAll('#result-grid .pre4-card,#result-grid button,#result-grid article')];
      const match=cards.find(c=>norm(c.textContent).includes(norm(map.name)));
      match?.click();
    },350);
  }

  function improvePortalRows(){
    const buttons=[...detail.querySelectorAll('button')].filter(b=>/open\s*map/i.test(b.textContent||''));
    for(const btn of buttons){
      if(btn.dataset.kaiokenPortalUx==='1')continue;
      const row=btn.closest('.portal-row,.relation-chip,.portal-link-row')||btn.parentElement;
      if(!row)continue;
      const target=destinationFromRow(row);
      if(!target)continue;
      btn.dataset.kaiokenPortalUx='1';
      btn.title=`Open ${target.name}`;
      const small=document.createElement('small');small.className='portal-destination-name';small.textContent=`Destination map: ${target.name}`;
      const textHolder=[...row.children].find(x=>x!==btn && !x.classList.contains('portal-destination-name'))||row;
      if(textHolder!==row)textHolder.appendChild(small);else row.insertBefore(small,btn);
      btn.addEventListener('click',()=>{
        const before=norm(title.textContent);
        setTimeout(()=>{if(norm(title.textContent)===before)fallbackOpenMap(target);},450);
      });
    }
  }

  let scheduled=false;
  function enhance(){
    scheduled=false;
    improveNpcImages(document);
    improveMapImages(detail);
    addNpcDetails();
    improvePortalRows();
  }
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(enhance);}
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
  schedule();
})();

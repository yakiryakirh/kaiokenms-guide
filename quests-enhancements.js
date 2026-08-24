(() => {
  'use strict';
  function collapse(panel, titleSelector) {
    if (!panel || panel.dataset.collapsibleReady) return;
    panel.dataset.collapsibleReady = 'true';
    const title = panel.querySelector(titleSelector), children = [...panel.children];
    const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'quest-panel-toggle'; toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = `<span>${title?.textContent?.trim() || 'Panel'}</span><span class="quest-panel-arrow">⌄</span>`;
    const body = document.createElement('div'); body.className = 'quest-panel-collapsible-body'; body.hidden = true;
    children.forEach(child => body.appendChild(child)); panel.append(toggle, body);
    toggle.addEventListener('click', () => { const open = toggle.getAttribute('aria-expanded') !== 'true'; toggle.setAttribute('aria-expanded', String(open)); body.hidden = !open; });
  }
  collapse(document.querySelector('.character-panel'), '.panel-title');
  collapse(document.getElementById('quest-backup-panel'), '.backup-title');

  const dialog = document.createElement('dialog'); dialog.className = 'quest-card-dialog';
  dialog.innerHTML = '<div class="quest-card-modal-head"><h2>Quest Details</h2><button type="button" aria-label="Close">×</button></div><div class="quest-card-modal-body"></div>';
  document.body.appendChild(dialog);
  const modalTitle = dialog.querySelector('h2'), modalBody = dialog.querySelector('.quest-card-modal-body');
  const normalizeQuestName=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const normalizeEntityName=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const questAliases={'snowfield giant':'huge creature of the snowfield'};
  const databaseQuestFor=name=>{const key=normalizeQuestName(name),wanted=questAliases[key]||key;return (window.KAIOKEN_DB_INDEX?.quests||[]).find(q=>normalizeQuestName(q.name)===wanted)};
  const entityDialog=document.createElement('dialog');entityDialog.className='quest-entity-dialog';entityDialog.innerHTML='<div class="quest-entity-head"><h2>Details</h2><button type="button" aria-label="Close">×</button></div><div class="quest-entity-body"></div>';document.body.appendChild(entityDialog);
  entityDialog.querySelector('button').onclick=()=>entityDialog.close();entityDialog.addEventListener('click',event=>{if(event.target===entityDialog)entityDialog.close()});
  const openEntity=(type,name)=>{
    const collection=type==='npc'?(window.KAIOKEN_DB_INDEX?.npcs||[]):(window.KAIOKEN_DB_INDEX?.maps||[]),key=normalizeEntityName(name);
    const entity=collection.find(entry=>normalizeEntityName(entry.name)===key);
    const heading=entityDialog.querySelector('h2'),body=entityDialog.querySelector('.quest-entity-body');heading.textContent=name||'Details';
    if(!entity){body.innerHTML='<p class="entity-empty">No additional internal database details are available for this entry yet.</p>';entityDialog.showModal();return}
    const image=entity.image||entity.preview||'',location=type==='npc'?(entity.firstMap||'Not listed'):(entity.street||entity.area||'Not listed');
    body.innerHTML=`<div class="quest-entity-summary">${image?`<img src="${image}" alt="${entity.name}" onerror="this.hidden=true">`:''}<div><h3>${entity.name}</h3><p>${type==='npc'?'Known location':'Area'}: <strong>${location}</strong></p>${entity.role?`<p>Role: <strong>${entity.role}</strong></p>`:''}${type==='npc'?`<p>${entity.mapCount||0} mapped location${entity.mapCount===1?'':'s'}</p>`:''}</div></div>${entity.dialogue?.length?`<section class="entity-dialogue"><h3>NPC dialogue</h3><p>${entity.dialogue.slice(0,3).join('</p><p>')}</p></section>`:''}`;
    entityDialog.showModal();
  };
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  document.querySelectorAll('.quest').forEach(card => {
    card.classList.add('quest-clickable'); card.tabIndex = 0; card.setAttribute('role', 'button');
    const name = () => card.querySelector('.qtitle,h2,h3,.quest-title')?.textContent?.trim() || 'Quest Details';
    card.setAttribute('aria-label', `Open quest details: ${name()}`);
    const open = event => {
      if (event?.target?.closest('a,button,input,select,textarea,label')) return;
      const clone = card.cloneNode(true); clone.classList.remove('quest-clickable', 'hidden-by-completed', 'continue-highlight'); clone.removeAttribute('role'); clone.removeAttribute('tabindex');
      clone.querySelectorAll('input,button').forEach(el => el.remove()); const dbQuest=databaseQuestFor(name());if(dbQuest){const loc=dbQuest.startLocations?.[0],npcName=dbQuest.startNpcName||'',mapName=loc?.mapName||'';const route=document.createElement('div');route.className='quest-modal-route';route.innerHTML=`<strong>📍 Where to start</strong><button type="button" class="quest-entity-link" data-entity="npc" ${npcName?'':'disabled'}>NPC: ${npcName||'Not listed'}</button><button type="button" class="quest-entity-link" data-entity="map" ${mapName?'':'disabled'}>Map: ${mapName||'Not listed'}${loc?.street?` • ${loc.street}`:''}</button>`;route.querySelector('[data-entity="npc"]')?.addEventListener('click',()=>openEntity('npc',npcName));route.querySelector('[data-entity="map"]')?.addEventListener('click',()=>openEntity('map',mapName));clone.querySelector('.qbody')?.prepend(route)} modalTitle.textContent = name(); modalBody.replaceChildren(clone); dialog.showModal();
    };
    card.addEventListener('click', open);
    card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(event); } });
  });

  const allPage = document.getElementById('all-quests');
  if (allPage) {
    const intro = allPage.querySelector(':scope > .notice');
    const sidebar = document.createElement('aside'); sidebar.className = 'quest-sidebar'; sidebar.setAttribute('aria-label', 'Quest tools');
    const tools = allPage.querySelector('.tools-panel'), searchBox = tools?.querySelector('.searchbox'), sortBox = tools?.querySelector('.sortbox'), progressBox = tools?.querySelector('.progressbox');
    const toolbar = document.createElement('div'); toolbar.className = 'quest-search-toolbar';
    [searchBox].filter(Boolean).forEach(el => toolbar.appendChild(el));
    if (sortBox) sortBox.hidden = true;
    [allPage.querySelector('.character-panel'), document.getElementById('quest-backup-panel'), progressBox].filter(Boolean).forEach(el => sidebar.appendChild(el));
    const workspace = document.createElement('div'); workspace.className = 'quest-workspace';
    const mainColumn = document.createElement('div'); mainColumn.className = 'quest-main-column';
    if (toolbar.children.length) mainColumn.appendChild(toolbar);
    [...allPage.children].filter(el => el !== intro && el !== sidebar && el !== tools).forEach(el => mainColumn.appendChild(el));
    workspace.append(mainColumn, sidebar); allPage.appendChild(workspace);

    const pagerTop = document.createElement('nav'), pagerBottom = document.createElement('nav');
    pagerTop.className = pagerBottom.className = 'quest-pagination'; pagerTop.setAttribute('aria-label', 'Quest pages'); pagerBottom.setAttribute('aria-label', 'Quest pages');
    const firstLevel = mainColumn.querySelector('.level'); if (firstLevel) mainColumn.insertBefore(pagerTop, firstLevel); mainColumn.appendChild(pagerBottom);
    let questPage = 1, pagingMode = 'pages'; const pageSize = 12;
    const modeToggle=document.createElement('div');modeToggle.className='quest-page-mode';modeToggle.innerHTML='<span>Display:</span><button type="button" class="active" data-mode="pages">Pages</button><button type="button" data-mode="continuous">Continuous list</button>';pagerTop.before(modeToggle);modeToggle.querySelectorAll('button').forEach(button=>button.onclick=()=>{pagingMode=button.dataset.mode;modeToggle.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===button));refreshPages(true)});
    const refreshPages = (reset = false) => {
      if (reset) questPage = 1;
      const cards = [...mainColumn.querySelectorAll('.quest')]; cards.forEach(card => card.classList.remove('hidden-by-page'));
      const visible = cards.filter(card => getComputedStyle(card).display !== 'none'), pages = Math.max(1, Math.ceil(visible.length / pageSize)); questPage = Math.min(questPage, pages);
      visible.forEach((card,index) => card.classList.toggle('hidden-by-page', pagingMode==='pages'&&Math.floor(index/pageSize)+1 !== questPage));
      mainColumn.querySelectorAll('.level').forEach(section => section.hidden = ![...section.querySelectorAll('.quest')].some(card => !card.classList.contains('hidden-by-page') && getComputedStyle(card).display !== 'none'));
      const draw = nav => { nav.innerHTML=''; nav.hidden=pages<=1; if(pages<=1)return; const add=(label,target,active=false)=>{const button=document.createElement('button');button.type='button';button.textContent=label;button.classList.toggle('active',active);button.disabled=active;button.onclick=()=>{questPage=target;refreshPages();pagerTop.scrollIntoView({behavior:'smooth',block:'center'})};nav.appendChild(button)}; if(questPage>1)add('‹',questPage-1); const nums=[...new Set([1,pages,questPage-1,questPage,questPage+1].filter(n=>n>0&&n<=pages))].sort((a,b)=>a-b);let prior=0;nums.forEach(n=>{if(prior&&n-prior>1){const dots=document.createElement('span');dots.textContent='…';nav.appendChild(dots)}add(String(n),n,n===questPage);prior=n});if(questPage<pages)add('›',questPage+1)};
      draw(pagerTop); draw(pagerBottom); if(pagingMode==='continuous'){pagerTop.hidden=true;pagerBottom.hidden=true}
    };
    setTimeout(()=>refreshPages(true),100);
    ['quest-search','quest-sort','hide-completed'].forEach(id=>document.getElementById(id)?.addEventListener(id==='quest-search'?'input':'click',()=>setTimeout(()=>refreshPages(true),40)));
  }

  const chainSection = document.querySelector('#chains .extra-tab-section'), chainGrid = chainSection?.querySelector('.chain-grid');
  if (chainGrid) { const important=[...chainGrid.querySelectorAll('.chain-card')].filter(card=>/muirhat|alcaster|horntail/i.test(card.dataset.sortName||card.textContent)); if(important.length){const feature=document.createElement('div');feature.className='important-chain-feature';feature.innerHTML='<strong>⭐ Start with these important unlock chains</strong><span>These paths unlock major progression and are shown before the full list.</span><div class="important-chain-links"></div>';const links=feature.querySelector('.important-chain-links');important.forEach(card=>{const button=document.createElement('button');button.type='button';button.textContent=card.querySelector('b')?.textContent||'Important chain';button.onclick=()=>card.click();links.appendChild(button)});chainGrid.before(feature)} }

  document.querySelectorAll('#top-quests tbody tr, #fame-quests tbody tr').forEach(row => {
    row.classList.add('summary-quest-clickable'); row.tabIndex = 0; row.setAttribute('role', 'button');
    const activate = () => {
      const key = String(row.dataset.sortName || row.cells?.[1]?.textContent || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      const card = [...document.querySelectorAll('#all-quests .quest')].find(q => String(q.dataset.sortName || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() === key);
      card?.click();
    };
    row.addEventListener('click', activate); row.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(); } });
  });

  const localControls=document.createElement('div');localControls.className='tab-local-controls';
  const topSort=document.getElementById('top-sort-control'),questSize=document.getElementById('quest-size-control');
  [topSort,questSize].filter(Boolean).forEach(control=>localControls.appendChild(control));
  const placeControls=tabId=>{const tab=document.getElementById(tabId);if(!tab)return;localControls.hidden=tabId==='precollect'||tabId==='chains';if(localControls.hidden)return;const target=tabId==='all-quests'?(tab.querySelector('.quest-page-mode')||tab.querySelector('.level')):(tab.querySelector('h2')||tab.firstElementChild);if(target)target.before(localControls);else tab.prepend(localControls)};
  document.querySelectorAll('.guide-tab[data-tab]').forEach(button=>button.addEventListener('click',()=>setTimeout(()=>placeControls(button.dataset.tab),0)));
  placeControls(document.querySelector('.guide-tab.active[data-tab]')?.dataset.tab||'all-quests');

  const specialDrops = document.querySelector('#precollect .quest-active-box');
  const precollectSection = specialDrops?.closest('section');
  if (specialDrops && precollectSection) precollectSection.insertBefore(specialDrops, precollectSection.querySelector('.etc-table-wrap'));
  if (precollectSection && !precollectSection.querySelector('.planner-collapse-toggle')) {
    const heading=precollectSection.querySelector('h2'), toggle=document.createElement('button'), body=document.createElement('div');
    toggle.type='button';toggle.className='planner-collapse-toggle';toggle.setAttribute('aria-expanded','true');toggle.innerHTML='<span>Hide Quest Planner</span><span>⌃</span>';
    const table=precollectSection.querySelector('.etc-table-wrap'),children=[...precollectSection.children],tableIndex=children.indexOf(table);
    body.className='planner-collapsible-body';children.filter((el,index)=>el!==heading&&el!==table&&(tableIndex<0||index<tableIndex)).forEach(el=>body.appendChild(el));heading?.after(toggle,body);
    toggle.onclick=()=>{const open=toggle.getAttribute('aria-expanded')==='true';toggle.setAttribute('aria-expanded',String(!open));body.hidden=open;toggle.firstElementChild.textContent=open?'Show Quest Planner':'Hide Quest Planner';toggle.lastElementChild.textContent=open?'⌄':'⌃'};
  }
  const style = document.createElement('style'); style.textContent = `
    .quest-panel-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;border:0;background:transparent;color:inherit;padding:0;text-align:left;font:inherit;font-weight:900;cursor:pointer}.quest-panel-arrow{font-size:1.35rem;color:#ffd54a;transition:transform .18s}.quest-panel-toggle[aria-expanded="true"] .quest-panel-arrow{transform:rotate(180deg)}.quest-panel-collapsible-body{margin-top:14px}.quest-panel-collapsible-body[hidden]{display:none}
    .quest-clickable{cursor:pointer;transition:transform .15s,border-color .15s}.quest-clickable:hover,.quest-clickable:focus-visible{transform:translateY(-1px);border-color:#ff9800;outline:2px solid transparent}.quest-card-dialog{width:min(920px,calc(100% - 24px));max-height:90vh;padding:0;border:1px solid #ff9800;border-radius:18px;background:#111c2d;color:#edf5ff;box-shadow:0 30px 90px #000}.quest-card-dialog::backdrop{background:rgba(2,8,18,.78)}.quest-card-modal-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:#172a42;border-bottom:1px solid #ff9800}.quest-card-modal-head h2{margin:0;color:#ffd54a}.quest-card-modal-head button{border:0;background:transparent;color:#fff;font-size:30px;cursor:pointer}.quest-card-modal-body{padding:18px}.quest-card-modal-body .quest{display:block!important;margin:0!important}
    .quest-workspace{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:20px;align-items:start}.quest-main-column{min-width:0}.quest-sidebar{position:sticky;top:76px;display:grid;gap:12px}.quest-sidebar .character-panel,.quest-sidebar .backup-panel,.quest-sidebar .tools-panel{margin:0}.quest-sidebar .character-panel{border:2px solid #ffbf00!important;background:linear-gradient(135deg,rgba(255,191,0,.18),rgba(19,36,58,.96))!important;box-shadow:0 0 0 3px rgba(255,191,0,.08),0 10px 28px rgba(255,152,0,.18)}.quest-sidebar .character-panel .quest-panel-toggle{color:#ffe37a}.quest-sidebar .tools-panel{display:grid;grid-template-columns:1fr}.summary-quest-clickable{cursor:pointer;transition:background .15s,box-shadow .15s}.summary-quest-clickable:hover,.summary-quest-clickable:focus-visible{background:rgba(255,152,0,.12);box-shadow:inset 4px 0 #ff9800;outline:none}.summary-quest-clickable td:nth-child(2){color:#ffd54a;text-decoration:underline;text-decoration-color:rgba(255,213,74,.35);text-underline-offset:4px}.quest-active-box{margin-bottom:18px}@media(max-width:1050px){.quest-workspace{grid-template-columns:1fr}.quest-sidebar{position:static;grid-row:1;grid-template-columns:1fr 1fr}.quest-sidebar .tools-panel{grid-column:1/-1}}@media(max-width:700px){.quest-sidebar{grid-template-columns:1fr}}
    .quest-search-toolbar{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:14px;align-items:start;margin:0 0 18px}.quest-search-toolbar .searchbox,.quest-search-toolbar .sortbox{margin:0;min-width:0}.quest-sidebar .progressbox{margin:0}.hidden-by-page{display:none!important}.quest-pagination{display:flex;align-items:center;justify-content:center;gap:7px;flex-wrap:wrap;margin:16px 0 24px}.quest-pagination button{min-width:42px;height:42px;border:1px solid #426481;border-radius:11px;background:#13243a;color:#eaf4ff;font-weight:900;cursor:pointer}.quest-pagination button:hover{border-color:#ff9800;color:#ffd54a}.quest-pagination button.active{border-color:#ff9800;background:linear-gradient(145deg,#7b3d00,#4c2700);color:#ffd54a}.quest-pagination span{color:#8fa8c2}.important-chain-feature{border:2px solid #ff9800;border-radius:14px;background:linear-gradient(135deg,rgba(255,152,0,.16),rgba(255,213,74,.04));padding:16px;margin:16px 0 20px}.important-chain-feature>strong{display:block;color:#ffd54a;font-size:1.15rem}.important-chain-feature>span{display:block;color:#dce8f6;margin:5px 0 12px}.important-chain-links{display:flex;gap:8px;flex-wrap:wrap}.important-chain-links button{border:1px solid #ff9800;border-radius:999px;background:#5b3000;color:#ffd54a;padding:8px 12px;font-weight:900;cursor:pointer}@media(max-width:1050px){.quest-search-toolbar{grid-template-columns:1fr 260px}}@media(max-width:700px){.quest-search-toolbar{grid-template-columns:1fr}}
    .planner-collapse-toggle{position:sticky;top:72px;z-index:8;width:100%;display:flex;justify-content:space-between;align-items:center;border:1px solid #ff9800;border-radius:12px;background:#13243a;color:#ffd54a;padding:12px 15px;margin:0 0 14px;font-weight:900;font-size:1rem;cursor:pointer;box-shadow:0 5px 18px rgba(0,0,0,.28)}.planner-collapsible-body[hidden]{display:none!important}.quest-page-mode{display:flex;align-items:center;justify-content:center;gap:8px;margin:12px 0}.quest-page-mode button{border:1px solid #426481;border-radius:999px;background:#13243a;color:#eaf4ff;padding:8px 13px;font-weight:900;cursor:pointer}.quest-page-mode button.active{border-color:#ff9800;background:#5b3000;color:#ffd54a}.quest-modal-route{display:flex;gap:8px 12px;flex-wrap:wrap;border:1px solid #426481;border-left:5px solid #ff9800;border-radius:10px;background:#13243a;padding:12px;margin-bottom:14px}.quest-modal-route>strong{width:100%;color:#ffd54a}.quest-entity-link{border:1px solid #426481;border-radius:999px;background:#1a3150;color:#86dcff;padding:8px 12px;font:inherit;font-weight:900;cursor:pointer}.quest-entity-link:hover{border-color:#ff9800;color:#ffd54a}.quest-entity-link:disabled{opacity:.65;cursor:not-allowed}.quest-entity-dialog{width:min(660px,calc(100% - 30px));max-height:82vh;padding:0;border:1px solid #ff9800;border-radius:18px;background:#101b2b;color:#edf5ff;box-shadow:0 30px 90px #000;z-index:10001}.quest-entity-dialog::backdrop{background:rgba(2,8,18,.45)}.quest-entity-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:#172a42;border-bottom:1px solid #ff9800}.quest-entity-head h2{margin:0;color:#ffd54a}.quest-entity-head button{border:0;background:transparent;color:#fff;font-size:30px;cursor:pointer}.quest-entity-body{padding:18px}.quest-entity-summary{display:flex;align-items:center;gap:18px}.quest-entity-summary img{width:120px;height:120px;object-fit:contain;border:1px solid #426481;border-radius:14px;background:#0b1524}.quest-entity-summary h3{margin:0 0 8px;color:#ffd54a;font-size:1.45rem}.quest-entity-summary p{margin:5px 0;color:#bcd0e7}.entity-dialogue{margin-top:16px;padding:14px;border:1px solid #35547c;border-radius:12px;background:#13243a}.entity-dialogue h3{margin-top:0;color:#86dcff}.tab-local-controls{display:flex;justify-content:flex-end;align-items:center;gap:12px;flex-wrap:wrap;margin:12px 0 18px}.tab-local-controls .top-sort-control,.tab-local-controls .quest-size-control{margin:0}.coming-soon-tab{filter:grayscale(1);opacity:.58!important;cursor:not-allowed!important;border-color:#66707d!important;background:#303844!important;color:#c3c9d0!important}
  `; document.head.appendChild(style);
})();

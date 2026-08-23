(() => {
  "use strict";

  const API = "https://maplestory.io/api/GMS/83";
  const $ = id => document.getElementById(id);
  const grid = $("result-grid");
  const status = $("explorer-status");
  const search = $("db-search");
  const countSelect = $("result-count");
  const suggestions = $("db-suggestions");
  const dialog = $("detail-dialog");
  const detailTitle = $("detail-title");
  const detailBody = $("detail-body");

  let entity = "item";
  let startPosition = 0;
  let lastQuery = "";
  let loading = false;
  let customEntries = [];
  let suggestionTimer = null;
  let suggestionRequest = 0;
  let activeSuggestion = -1;

  const entityConfig = {
    item: { label: "Items", singular: "Item", icon: "📦", placeholder: "Start typing an item name or enter an ID…", image: id => `${API}/item/${id}/icon` },
    mob: { label: "Monsters", singular: "Monster", icon: "👹", placeholder: "Start typing a monster name or enter an ID…", image: id => `${API}/mob/${id}/icon` },
    npc: { label: "NPCs", singular: "NPC", icon: "🧑", placeholder: "Start typing an NPC name or enter an ID…", image: id => `${API}/npc/${id}/icon` },
    map: { label: "Maps", singular: "Map", icon: "🗺️", placeholder: "Start typing a map name or enter an ID…", image: id => `${API}/map/${id}/icon` },
    quest: { label: "Quests", singular: "Quest", icon: "📜", placeholder: "Start typing a quest name or enter an ID…", image: id => `${API}/quest/${id}/icon` },
    job: { label: "Jobs", singular: "Job", icon: "⚔️", placeholder: "Start typing a job name or enter an ID…", image: null },
    custom: { label: "KaiokenMS Custom", singular: "Custom Entry", icon: "🔥", placeholder: "Start typing a KaiokenMS item, NPC or system…", image: null }
  };

  const usefulNPCs = [
    {name:"Master Roshi",role:"Mob Leveling Warper",image:"images/master-roshi-transparent.png",text:"Warps you to training maps based on your level so you can find a good grind spot quickly.",meta:["Custom leveling utility","Talk to him when you are not sure where to train."]},
    {name:"Frieza Final Form",role:"Ore Ring Forge",image:"images/frieza-final-form-npc.png",text:"Located on the left side of the PQ room entrance. Refine forge materials, forge one of the KaiokenMS rings and tag a ring to your name.",meta:["Each eligible ring has 10 permanent Forge levels.","Forge costs increase depending on the chosen path."]},
    {name:"Piccolo",role:"PQ Center / Hall of Fame",image:"images/piccolo-pq-center.png",text:"The central Party Quest hub. Enter through the Free Market and reach the server's PQ content from one place.",meta:["Maximum level restrictions are removed.","Up to 5 entries per week for each PQ.","PQ completions award PQ Points and weekly Hall of Fame rewards."]},
    {name:"PQ Point Shop",role:"PQ Points",image:"images/hercule-pq-shop-npc.png",text:"Spend PQ Points on progression items, custom scrolls and timed EXP or Drop coupons.",shop:["1 hour 2x EXP coupon: 40 PQ Points","1 hour 2x Drop coupon: 50 PQ Points","Kaioken Surge Scroll: 60","Kaioken Stability Scroll: 5","Senzu Bean: 12","AP Reset: 15","Maple Leaf Box: 15","Onyx Apple: 25","Equip Enhancement Scroll: 40","Advanced Equip Enhancement Scroll: 125","Protection Scroll: 75"]},
    {name:"Videl",role:"Kaio Shop / Vote Points",image:"images/videl-kaio-shop-npc.png",text:"Spend Kaio Points earned from voting on useful account progression and quality of life items.",shop:["Dragon Ball Radar: 20","1 hour 2x Drop coupon: 3","1 hour 2x EXP coupon: 3","Kaioken ItemVac (1 Hour): 3","Maple Leaf Box: 1","AP Reset: 2","Senzu Bean: 1"]},
    {name:"Bulma",role:"Supplies Shop / Mesos",image:"images/bulma-supplies-npc.png",text:"A central mesos supply shop with server utility items plus regular consumables and ammunition.",shop:["Damage Skin Selector: 777,000,000 mesos","Piece of Cracked Dimension: 500,000 mesos","Eye of Fire: 2,000,000 mesos","Fishing Chair: 50,000,000 mesos","Fishing Bait: 10,000,000 mesos","Item Megaphone: 250,000 mesos","Super Megaphone: 100,000 mesos","All Cure Potion: 3,000 mesos","Power Elixir: 5,000 mesos"]},
    {name:"Scholar Gohan",role:"Skill Book Shop",image:"images/scholar-gohan-transparent.png",text:"Lets players buy skill books with mesos instead of farming every book from monsters and bosses.",meta:["Useful after 4th Job.","Check the in game shop for the current book list and prices."]},
    {name:"Android 18",role:"Gachapon",image:"images/android-18-gachapon-npc.png",text:"The custom Gachapon NPC used for Gachapon related rewards and rolls.",meta:["Use the server's current Gachapon currency or tickets."]},
    {name:"Vegeta",role:"Scouter System",image:"images/vegeta-base-scouter-transparent.png",text:"Part of the Scouter system. With the Scouter equipped, double click monsters to inspect useful combat and drop information.",meta:["Monster HP, MP and EXP","Possible drops and drop chances"]},
    {name:"Dr. Gero",role:"Custom Utility NPC",image:"images/dr-gero-clean-transparent.png",text:"A custom KaiokenMS NPC used by server specific systems. More exact functions can be added as they are confirmed in game.",meta:["KaiokenMS custom NPC"]}
  ];

  const features = [
    ["🐉 Shenron & Dragon Balls","Collect all 7 Dragon Balls to summon Shenron and access special wishes, rewards and progression."],
    ["⚡ Super Saiyan Skill","A custom transformation tied to the Dragon Ball progression system."],
    ["🥋 Kaioken Skill","A custom 4th Job power skill with movement benefits and an HP drain tradeoff."],
    ["💥 Kamehameha","Custom Dragon Ball inspired combat skill."],
    ["⏳ Hyperbolic Time Chamber","Daily training area through Mr. Popo with level scaled monsters and bonus EXP."],
    ["📡 Scouter System","Double click monsters while using the Scouter to inspect HP, MP, EXP and drop information."],
    ["👥 PQ Center","Central PQ hub with removed maximum level restrictions, weekly entry limits, PQ Points and Hall of Fame rewards."],
    ["💎 Ore Ring Forge","KaiokenMS ring crafting and permanent 10 level forge progression through Frieza Final Form."],
    ["📜 Enhancement Scrolls","Equip Enhancement, Advanced Equip Enhancement and Protection Scrolls create a separate high risk gear upgrade layer."],
    ["🧲 Kaioken ItemVac","Timed utility that automatically pulls nearby monster drops while farming."],
    ["🗄 Ore & Scroll Banks","Dedicated storage systems for ores and scrolls to keep normal inventory cleaner."],
    ["🗺 World Map Tooltips","Extra map information for monsters, NPCs, quests and players without leaving the game."],
    ["🌀 Instant Transmission","Fast travel system available with the required active Z Card."],
    ["🎁 Daily Gift","Daily reward command with a streak system."],
    ["🏆 Chaos Bosses","Chaos Zakum and other stronger boss content extend progression."],
    ["☠️ Boss Death Count","Boss expeditions use a shared death count system for failed entries."],
    ["⏱ Boss Spawn Times","Boss spawn timing can be checked through the Bosses Card interface."],
    ["🎨 Damage Skin Selector","Custom damage number styles available through the server's selector system."],
    ["🪟 Expandable Inventory","Inventory windows can be expanded while unavailable slots stay clearly marked."],
    ["🖥 Resolution Options","Switch between multiple screen resolutions through the custom in game resolution system."],
    ["☁️ Flying Nimbus","Dragon Ball inspired flying movement that helps cross maps and reach platforms faster."],
    ["📕 Hyper Skills","A custom Hyper Skills tab and Hyper Skill Point progression tied to long term systems."],
    ["🍁 Maple Leaf Economy","Maple Leaves are used in several custom upgrades and progression systems."]
  ];

  const fallbackCustom = [
    ...Array.from({length:7},(_,i)=>({entity_type:"item",name:`Dragon Ball (${i+1}-Star)`,game_id:null,category:"Dragon Balls",description:"One of the seven Dragon Balls used by the custom Shenron system.",image_url:`images/dragon-ball-${i+1}-item.png`,verified:true})),
    {entity_type:"item",name:"Kaioken ItemVac",category:"Utility",description:"Timed item that automatically pulls monster drops toward the player while farming.",image_url:"images/item-vac-website.png",verified:true},
    {entity_type:"item",name:"Scouter",game_id:1022042,category:"Equipment",description:"Equip the Scouter and double click monsters to inspect server supplied monster information.",image_url:"images/scouter-1022042-icon.png",verified:true},
    {entity_type:"item",name:"White Scroll",game_id:2340000,category:"Scroll",description:"A rare scroll used to protect upgrade slots when another scroll fails.",image_url:"images/white-scroll-2340000.png",verified:true}
  ];

  const text = v => String(v ?? "").trim();
  const make = (tag, cls, content) => { const n=document.createElement(tag); if(cls)n.className=cls; if(content!==undefined)n.textContent=content; return n; };
  const itemId = o => o?.id ?? o?.itemId ?? o?.mobId ?? o?.npcId ?? o?.mapId ?? o?.questId ?? o?.jobId ?? null;
  const itemName = o => text(o?.name || o?.description?.name || o?.description?.Name || o?.title || o?.jobName || o?.streetName || `ID ${itemId(o) || "Unknown"}`);
  const sortRows = rows => [...rows].sort((a,b)=>itemName(a).localeCompare(itemName(b),undefined,{numeric:true,sensitivity:"base"}));
  const listFromResponse = data => Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.results) ? data.results : data && typeof data === "object" ? Object.values(data).filter(v=>v && typeof v === "object" && !Array.isArray(v)) : [];
  const iconUrlFor = (ent,id) => id!=null && entityConfig[ent]?.image ? entityConfig[ent].image(id) : "";
  const setStatus = (message,type="") => { status.textContent=message; status.className=`explorer-status${type?` ${type}`:""}`; };
  const isNumericQuery = q => /^\d{2,}$/.test(q);
  const listUrl = (ent,q,start,count) => { const u=new URL(`${API}/${ent}`); if(q)u.searchParams.set("searchFor",q); u.searchParams.set("startPosition",String(start)); u.searchParams.set("count",String(count)); return u.toString(); };
  const apiFetch = async (url,signal) => { const r=await fetch(url,{headers:{Accept:"application/json"},signal}); if(!r.ok)throw new Error(`HTTP ${r.status}`); return r.json(); };

  function addBadge(box,label,cls=""){box.append(make("span",`badge${cls?` ${cls}`:""}`,label));}
  function metaFor(o){
    const parts=[]; const type=o?.typeInfo || o?.type || {};
    if(type?.overallCategory)parts.push(type.overallCategory);
    if(type?.category)parts.push(type.category);
    if(type?.subCategory)parts.push(type.subCategory);
    if(o?.streetName)parts.push(o.streetName);
    if(o?.level)parts.push(`Lv. ${o.level}`);
    if(o?.levelMinimum)parts.push(`Lv. ${o.levelMinimum}+`);
    if(o?.function)parts.push(o.function);
    return [...new Set(parts.filter(Boolean))].slice(0,4).join(" • ");
  }

  function dragonBallImage(name){
    const m=text(name).match(/dragon\s*ball\s*\(\s*([1-7])\s*-?\s*star\s*\)/i);
    return m ? `images/dragon-ball-${m[1]}-item.png` : "";
  }
  function customImage(row){
    const name=text(row?.name);
    const ball=dragonBallImage(name); if(ball)return ball;
    if(/kaioken\s+(force|stability|surge|limit)\s+scroll/i.test(name))return "images/kaioken-scroll-icon.png";
    if(/^advanced\s+equip\s+enhancement\s+scroll$/i.test(name))return "images/advanced-equip-enhancement-scroll.png";
    if(/^equip\s+enhancement\s+scroll$/i.test(name))return "images/equip-enhancement-scroll.png";
    if(/^protection\s+scroll$/i.test(name))return "images/protection-scroll.png";
    if(/^white\s+scroll$/i.test(name))return "images/white-scroll-2340000.png";
    if(/^scouter$/i.test(name))return "images/scouter-1022042-icon.png";
    if(/kaioken\s+itemvac/i.test(name))return "images/item-vac-website.png";
    if(row?.game_id!=null && /^(item|equipment)$/i.test(text(row?.entity_type)))return `${API}/item/${row.game_id}/icon`;
    return text(row?.image_url);
  }

  function renderApiRows(rows,append=false){
    const ordered=sortRows(rows);
    if(!append)grid.replaceChildren();
    if(!ordered.length && !append){grid.append(make("div","empty",`No ${entityConfig[entity].label.toLowerCase()} found.`));return;}
    for(const row of ordered){
      const id=itemId(row), card=make("article","db-card"), icon=make("div","db-icon"), url=iconUrlFor(entity,id);
      if(url){const img=document.createElement("img");img.src=url;img.alt="";img.loading="lazy";img.referrerPolicy="no-referrer";img.onerror=()=>icon.replaceChildren(make("span","",entityConfig[entity].icon));icon.append(img);} else icon.append(make("span","",entityConfig[entity].icon));
      const main=make("div","");main.append(make("h3","",itemName(row)));if(id!=null)main.append(make("div","db-id",`ID ${id}`));const m=metaFor(row);if(m)main.append(make("div","db-meta",m));const badges=make("div","badges");addBadge(badges,"V83");addBadge(badges,entityConfig[entity].singular);main.append(badges);card.append(icon,main);card.addEventListener("click",()=>openApiDetail(row));grid.append(card);
    }
  }

  function renderCustomRows(rows){
    grid.replaceChildren();
    const q=lastQuery.toLowerCase();
    const filtered=rows.filter(x=>!q || [x.name,x.entity_type,x.category,x.subcategory,x.description,...(Array.isArray(x.aliases)?x.aliases:[])].map(text).join(" ").toLowerCase().includes(q)).sort((a,b)=>text(a.name).localeCompare(text(b.name),undefined,{numeric:true,sensitivity:"base"}));
    if(!filtered.length){grid.append(make("div","empty","No KaiokenMS custom entries match this search."));return;}
    for(const row of filtered){
      const card=make("article","db-card"), icon=make("div","db-icon"), url=customImage(row);
      if(url){const img=document.createElement("img");img.src=url;img.alt="";img.loading="lazy";img.onerror=()=>icon.replaceChildren(make("span","","🔥"));icon.append(img);} else icon.append(make("span","","🔥"));
      const main=make("div","");main.append(make("h3","",row.name));if(row.game_id!=null)main.append(make("div","db-id",`ID ${row.game_id}`));const meta=[row.entity_type,row.category,row.subcategory].filter(Boolean).join(" • ");if(meta)main.append(make("div","db-meta",meta));const badges=make("div","badges");addBadge(badges,"KaiokenMS","custom");if(row.verified)addBadge(badges,"Verified","verified");main.append(badges);card.append(icon,main);card.addEventListener("click",()=>openCustomDetail(row));grid.append(card);
    }
  }

  async function load(reset=true){
    if(loading)return; loading=true; hideSuggestions(); if(reset)startPosition=0; lastQuery=search.value.trim(); $("load-more").hidden=true;
    if(entity==="custom"){
      setStatus("Loading KaiokenMS custom database…"); await loadCustom(); renderCustomRows(customEntries); setStatus(`Loaded ${customEntries.length} custom database entries.`,"success"); loading=false; return;
    }
    const count=Number(countSelect.value||24), exact=isNumericQuery(lastQuery);
    setStatus(exact?`Loading ${entityConfig[entity].singular} ID ${lastQuery}…`:`Loading ${entityConfig[entity].label.toLowerCase()}…`);
    try{
      let data;
      if(exact){
        data=await apiFetch(`${API}/${entity}/${encodeURIComponent(lastQuery)}`);
        renderApiRows(data?[data]:[],false);
        setStatus(data?`Loaded ID ${lastQuery}.`:`No record found for ID ${lastQuery}.`,data?"success":"");
      } else {
        data=await apiFetch(listUrl(entity,lastQuery,startPosition,count));
        const rows=listFromResponse(data);
        renderApiRows(rows,!reset);
        startPosition+=rows.length;
        $("load-more").hidden=rows.length<count;
        setStatus(`Loaded ${startPosition} ${entityConfig[entity].label.toLowerCase()}${lastQuery?` matching “${lastQuery}”`:""}.`,"success");
      }
      $("api-note").hidden=true;
    } catch(err){
      console.error(err); $("api-note").hidden=false; if(reset)grid.replaceChildren(make("div","empty",`Could not load ${entityConfig[entity].label} right now.`)); setStatus("Database request failed. Please try again in a moment.","error");
    } finally { loading=false; }
  }

  function readPath(obj,path){return path.split(".").reduce((v,k)=>v==null?undefined:v[k],obj);}
  function firstValue(obj,paths){for(const p of paths){const v=readPath(obj,p);if(v!==undefined&&v!==null&&v!=="")return v;}return null;}
  function prettyLabel(key){
    const map={
      level:"Level",levelMinimum:"Minimum Level",reqLevel:"Required Level",requiredLevel:"Required Level",price:"Price",unitPrice:"Unit Price",slotMax:"Max Stack",
      hp:"HP",mp:"MP",exp:"EXP",boss:"Boss",speed:"Speed",jump:"Jump",attackSpeed:"Attack Speed",reqSTR:"Required STR",reqDEX:"Required DEX",reqINT:"Required INT",reqLUK:"Required LUK",
      incSTR:"STR",incDEX:"DEX",incINT:"INT",incLUK:"LUK",incPAD:"Weapon Attack",incMAD:"Magic Attack",incPDD:"Weapon Defense",incMDD:"Magic Defense",incACC:"Accuracy",incEVA:"Avoidability",
      streetName:"Area",category:"Category",subcategory:"Subcategory",overallCategory:"Category",role:"Role",weekly_entries_per_pq:"Weekly Entries per PQ"
    };
    return map[key] || key.replace(/_/g," ").replace(/([a-z])([A-Z])/g,"$1 $2").replace(/\b\w/g,c=>c.toUpperCase());
  }
  function friendlyPairs(data,ent,isCustom){
    const out=[]; const seen=new Set();
    const add=(label,v)=>{if(v===undefined||v===null||v===""||typeof v==="object")return;const k=`${label}:${v}`;if(seen.has(k))return;seen.add(k);out.push([label,typeof v==="boolean"?(v?"Yes":"No"):String(v)]);};
    if(isCustom){
      if(data?.entity_type)add("Type",prettyLabel(data.entity_type));
      if(data?.category)add("Category",data.category);
      if(data?.subcategory)add("Subcategory",data.subcategory);
      if(Array.isArray(data?.aliases)&&data.aliases.length)add("Also Known As",data.aliases.join(", "));
      if(data?.metadata && typeof data.metadata==="object")for(const [k,v] of Object.entries(data.metadata)){
        if(/source|url|slug|sort|created|updated|internal/i.test(k))continue;
        add(prettyLabel(k),v);
      }
      return out.slice(0,14);
    }
    const type=data?.typeInfo||data?.type||{};
    add("Category",type.overallCategory||type.category);
    add("Subcategory",type.subCategory);
    const keys=["streetName","level","levelMinimum","reqLevel","requiredLevel","price","unitPrice","slotMax","hp","mp","exp","boss","speed","jump","attackSpeed","reqSTR","reqDEX","reqINT","reqLUK","incSTR","incDEX","incINT","incLUK","incPAD","incMAD","incPDD","incMDD","incACC","incEVA"];
    for(const k of keys)add(prettyLabel(k),data?.[k]);
    const info=data?.info;
    if(info&&typeof info==="object")for(const k of keys)add(prettyLabel(k),info[k]);
    return out.slice(0,16);
  }

  async function openApiDetail(row){
    const id=itemId(row); detailTitle.textContent=itemName(row); detailBody.replaceChildren(make("div","empty","Loading details…")); dialog.showModal(); let full=row;
    try{if(id!=null)full=await apiFetch(`${API}/${entity}/${id}`);}catch(e){console.warn(e);} renderDetail(full,entity,false);
  }
  function openCustomDetail(row){detailTitle.textContent=row.name;dialog.showModal();renderDetail(row,row.entity_type||"custom",true);}
  function renderDetail(data,ent,isCustom){
    detailBody.replaceChildren(); const id=itemId(data) ?? data?.game_id ?? null; const top=make("div","detail-top"), image=make("div","detail-image"); const imageUrl=isCustom?customImage(data):iconUrlFor(ent,id);
    if(imageUrl){const img=document.createElement("img");img.src=imageUrl;img.alt=itemName(data);img.onerror=()=>image.replaceChildren(make("span","",entityConfig[ent]?.icon||"🔥"));image.append(img);} else image.append(make("span","",entityConfig[ent]?.icon||"🔥"));
    const intro=make("div",""); intro.append(make("h2","",itemName(data))); if(id!=null)intro.append(make("div","db-id",`ID ${id}`)); const desc=text(data?.description?.description || data?.description || data?.desc || data?.function); if(desc)intro.append(make("p","detail-description",desc)); top.append(image,intro); detailBody.append(top);
    const pairs=friendlyPairs(data,ent,isCustom); if(pairs.length){const quick=make("div","detail-facts");for(const [label,value] of pairs){const row=make("div","kv");row.append(make("b","",label),make("span","",value));quick.append(row);}detailBody.append(quick);} else detailBody.append(make("div","detail-empty","No additional public details are available for this entry yet."));
  }

  async function loadCustom(){
    const config=window.KAIOKEN_MARKET_CONFIG||{}; customEntries=fallbackCustom.slice();
    if(!window.supabase||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.supabaseUrl||""))return;
    try{
      const db=window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
      const {data,error}=await db.from("guide_database_entries").select("*").eq("enabled",true).order("sort_order").order("name");
      if(!error&&Array.isArray(data)&&data.length)customEntries=data;
    } catch(e){console.warn("Custom database unavailable",e);}
  }

  function renderNPCs(){
    const n=$("npc-grid");n.replaceChildren();
    for(const x of usefulNPCs){const card=make("article","npc-card"),imgbox=make("div","npc-img"),img=document.createElement("img");img.src=x.image;img.alt=x.name;img.loading="lazy";imgbox.append(img);const main=make("div","");main.append(make("h3","",x.name),make("div","npc-role",x.role),make("p","",x.text));card.append(imgbox,main);if(x.shop||x.meta){const details=document.createElement("details"),summary=document.createElement("summary");summary.textContent=x.shop?"Shop / important details":"Important details";details.append(summary);const ul=make("ul","shop-list");for(const line of x.shop||x.meta)ul.append(make("li","",line));details.append(ul);card.append(details);}n.append(card);}
  }
  function renderFeatures(){const n=$("feature-grid");n.replaceChildren();for(const [title,body] of features){const c=make("article","feature");c.append(make("h3","",title),make("p","",body),make("span","status","Available"));n.append(c);}}

  function hideSuggestions(){suggestions.hidden=true;suggestions.replaceChildren();search.setAttribute("aria-expanded","false");activeSuggestion=-1;}
  function suggestionRows(rows,q){
    const needle=q.toLowerCase();
    return sortRows(rows).sort((a,b)=>{
      const an=itemName(a).toLowerCase(),bn=itemName(b).toLowerCase();
      const ap=an.startsWith(needle)?0:1,bp=bn.startsWith(needle)?0:1;
      return ap-bp || an.localeCompare(bn,undefined,{numeric:true,sensitivity:"base"});
    }).slice(0,14);
  }
  function renderSuggestions(rows,q,isCustom=false){
    suggestions.replaceChildren(); activeSuggestion=-1;
    if(!rows.length){hideSuggestions();return;}
    rows.forEach((row,index)=>{
      const btn=make("button","suggestion-item");btn.type="button";btn.setAttribute("role","option");btn.dataset.index=String(index);
      const icon=make("span","suggestion-icon"), id=itemId(row) ?? row?.game_id ?? null, url=isCustom?customImage(row):iconUrlFor(entity,id);
      if(url){const img=document.createElement("img");img.src=url;img.alt="";img.loading="lazy";img.onerror=()=>icon.replaceChildren(make("span","",isCustom?"🔥":entityConfig[entity].icon));icon.append(img);}else icon.append(make("span","",isCustom?"🔥":entityConfig[entity].icon));
      const copy=make("span","suggestion-copy");copy.append(make("strong","",itemName(row)));const meta=[id!=null?`ID ${id}`:"",isCustom?row.category:metaFor(row)].filter(Boolean).join(" • ");if(meta)copy.append(make("small","",meta));btn.append(icon,copy);
      btn.addEventListener("mousedown",e=>e.preventDefault());
      btn.addEventListener("click",()=>{search.value=itemName(row);hideSuggestions();load(true);});
      suggestions.append(btn);
    });
    suggestions.hidden=false;search.setAttribute("aria-expanded","true");
  }
  async function updateSuggestions(){
    const q=search.value.trim(); const request=++suggestionRequest;
    if(!q || isNumericQuery(q)){hideSuggestions();return;}
    try{
      if(entity==="custom"){
        if(!customEntries.length)await loadCustom();
        const rows=customEntries.filter(x=>[x.name,...(x.aliases||[])].some(v=>text(v).toLowerCase().includes(q.toLowerCase()))).sort((a,b)=>text(a.name).localeCompare(text(b.name),undefined,{numeric:true,sensitivity:"base"}));
        if(request!==suggestionRequest)return;renderSuggestions(rows.slice(0,14),q,true);return;
      }
      const data=await apiFetch(listUrl(entity,q,0,120)); if(request!==suggestionRequest)return; const rows=suggestionRows(listFromResponse(data),q); renderSuggestions(rows,q,false);
    } catch(e){if(request===suggestionRequest)hideSuggestions();}
  }
  function scheduleSuggestions(){clearTimeout(suggestionTimer);suggestionTimer=setTimeout(updateSuggestions,130);}
  function moveSuggestion(delta){
    const items=[...suggestions.querySelectorAll(".suggestion-item")];if(!items.length)return;activeSuggestion=(activeSuggestion+delta+items.length)%items.length;items.forEach((n,i)=>n.classList.toggle("active",i===activeSuggestion));items[activeSuggestion].scrollIntoView({block:"nearest"});
  }

  document.querySelectorAll(".entity-tab").forEach(btn=>btn.addEventListener("click",()=>{
    document.querySelectorAll(".entity-tab").forEach(b=>b.classList.toggle("active",b===btn)); entity=btn.dataset.entity; search.value=""; search.placeholder=entityConfig[entity].placeholder; hideSuggestions(); load(true);
  }));
  $("db-search-form").addEventListener("submit",e=>{e.preventDefault();hideSuggestions();load(true);});
  search.addEventListener("input",scheduleSuggestions);
  search.addEventListener("focus",()=>{if(search.value.trim())scheduleSuggestions();});
  search.addEventListener("keydown",e=>{
    if(suggestions.hidden)return;
    if(e.key==="ArrowDown"){e.preventDefault();moveSuggestion(1);}
    else if(e.key==="ArrowUp"){e.preventDefault();moveSuggestion(-1);}
    else if(e.key==="Escape"){hideSuggestions();}
    else if(e.key==="Enter"&&activeSuggestion>=0){e.preventDefault();const item=suggestions.querySelectorAll(".suggestion-item")[activeSuggestion];item?.click();}
  });
  document.addEventListener("click",e=>{if(!suggestions.contains(e.target)&&e.target!==search)hideSuggestions();});
  $("load-more").addEventListener("click",()=>load(false));
  countSelect.addEventListener("change",()=>load(true));
  $("detail-close").addEventListener("click",()=>dialog.close());
  dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close();});
  $("nav-refresh-btn").addEventListener("click",()=>location.reload());

  renderNPCs(); renderFeatures(); loadCustom(); load(true);
})();

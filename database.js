(() => {
  "use strict";
  const API = "https://maplestory.io/api/GMS/83";
  const $ = id => document.getElementById(id);
  const grid = $("result-grid"), status = $("explorer-status"), search = $("db-search"), countSelect = $("result-count");
  const dialog = $("detail-dialog"), detailTitle = $("detail-title"), detailBody = $("detail-body");
  let entity = "item", startPosition = 0, lastQuery = "", loading = false, apiFailed = false, customEntries = [];

  const entityConfig = {
    item:{label:"Items",icon:"📦",placeholder:"Search items by name or enter an ID…",image:id=>`${API}/item/${id}/icon`},
    mob:{label:"Monsters",icon:"👹",placeholder:"Search monsters by name or enter an ID…",image:id=>`${API}/mob/${id}/icon`},
    npc:{label:"NPCs",icon:"🧑",placeholder:"Search NPCs by name or enter an ID…",image:id=>`${API}/npc/${id}/icon`},
    map:{label:"Maps",icon:"🗺️",placeholder:"Search maps by name or enter an ID…",image:id=>`${API}/map/${id}/icon`},
    quest:{label:"Quests",icon:"📜",placeholder:"Search quests by name or enter an ID…",image:id=>`${API}/quest/${id}/icon`},
    job:{label:"Jobs",icon:"⚔️",placeholder:"Search jobs by name or enter an ID…",image:null},
    custom:{label:"KaiokenMS Custom",icon:"🔥",placeholder:"Search KaiokenMS custom items, NPCs and systems…",image:null}
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
    {name:"Dr. Gero",role:"Custom Utility NPC",image:"images/dr-gero-clean-transparent.png",text:"A custom KaiokenMS NPC used by server specific systems. Keep this entry editable as more exact functions are confirmed in game.",meta:["KaiokenMS custom NPC"]}
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
    ["🏆 Chaos Bosses","Chaos Zakum and other stronger boss content extend the original v83 progression."],
    ["☠️ Boss Death Count","Boss expeditions use a shared death count system for failed entries."],
    ["⏱ Boss Spawn Times","Boss spawn timing can be checked through the Bosses Ticket interface."],
    ["🎨 Damage Skin Selector","Custom damage number styles, with the selector available through server shops."],
    ["🪟 Expandable Inventory","Inventory windows can be expanded while unavailable slots stay clearly marked."],
    ["🖥 Resolution Options","Switch between multiple screen resolutions through the custom in game resolution system."],
    ["☁️ Flying Nimbus","Dragon Ball inspired flying movement that helps cross maps and reach platforms faster."],
    ["📱 Mobile Friendly","The official KaiokenMS site is optimized for mobile devices."],
    ["📕 Hyper Skills","A custom Hyper Skills tab and Hyper Skill Point progression tied to the server's long term systems."],
    ["🍁 Maple Leaf Economy","Maple Leaves are used in several custom upgrades and progression systems."]
  ];

  const fallbackCustom = [
    {entity_type:"item",name:"Dragon Ball (1 Star)",game_id:null,category:"Dragon Ball",description:"One of the seven Dragon Balls used by the custom Shenron system.",image_url:"images/dragon-ball-1-item.png",verified:true,source_name:"KaiokenMS"},
    {entity_type:"item",name:"Dragon Ball (7 Star)",game_id:null,category:"Dragon Ball",description:"One of the seven Dragon Balls used by the custom Shenron system.",image_url:"images/dragon-ball-7-item.png",verified:true,source_name:"KaiokenMS"},
    {entity_type:"item",name:"Kaioken ItemVac",category:"Utility",description:"Timed item that automatically pulls monster drops toward the player while farming.",image_url:"images/item-vac-website.png",verified:true,source_name:"KaiokenMS feature announcement"},
    {entity_type:"item",name:"Scouter",game_id:1022042,category:"Equipment",description:"Equip the Scouter and double click monsters to inspect server supplied monster information.",image_url:"images/scouter-1022042-icon.png",verified:true,source_name:"KaiokenMS"},
    {entity_type:"item",name:"White Scroll",game_id:2340000,category:"Scroll",description:"Original v83 scroll with a KaiokenMS adjusted global drop chance.",image_url:"images/white-scroll-2340000.png",verified:true,source_name:"KaiokenMS patch notes"},
    {entity_type:"feature",name:"KaiokenMS Server Rates",category:"Server",description:"EXP x10, Quest EXP x5, Mesos x8 and Drop x3. Three channels are currently shown on the server website.",verified:true,source_name:"KaiokenMS patch notes / website"}
  ];

  function text(v){return String(v ?? "").trim();}
  function escapeJson(v){try{return JSON.stringify(v,null,2);}catch{return String(v);}}
  function itemName(o){return text(o?.name || o?.description?.name || o?.description?.Name || o?.title || o?.jobName || o?.streetName || `ID ${itemId(o) || "Unknown"}`);}
  function itemId(o){return o?.id ?? o?.itemId ?? o?.mobId ?? o?.npcId ?? o?.mapId ?? o?.questId ?? o?.jobId ?? null;}
  function listFromResponse(data){if(Array.isArray(data))return data;if(Array.isArray(data?.data))return data.data;if(Array.isArray(data?.items))return data.items;if(Array.isArray(data?.results))return data.results;if(data && typeof data === "object")return Object.values(data).filter(v=>v && typeof v === "object" && !Array.isArray(v));return [];}
  function metaFor(o){const parts=[];const type=o?.typeInfo || o?.type || {};if(type?.overallCategory)parts.push(type.overallCategory);if(type?.category)parts.push(type.category);if(type?.subCategory)parts.push(type.subCategory);if(o?.streetName)parts.push(o.streetName);if(o?.level)parts.push(`Lv. ${o.level}`);if(o?.levelMinimum)parts.push(`Lv. ${o.levelMinimum}+`);if(o?.function)parts.push(o.function);return [...new Set(parts.filter(Boolean))].slice(0,4).join(" • ");}
  function iconUrlFor(ent,id){const c=entityConfig[ent];return id!=null && c?.image ? c.image(id) : "";}
  function setStatus(message,type=""){status.textContent=message;status.className=`explorer-status${type?` ${type}`:""}`;}
  function make(tag,cls,content){const n=document.createElement(tag);if(cls)n.className=cls;if(content!==undefined)n.textContent=content;return n;}
  function addBadge(box,label,cls=""){const b=make("span",`badge${cls?` ${cls}`:""}`,label);box.append(b);}

  function renderApiRows(rows,append=false){if(!append)grid.replaceChildren();if(!rows.length && !append){grid.append(make("div","empty",`No ${entityConfig[entity].label.toLowerCase()} found.`));return;}
    for(const row of rows){const id=itemId(row),card=make("article","db-card"),icon=make("div","db-icon");const url=iconUrlFor(entity,id);if(url){const img=document.createElement("img");img.src=url;img.alt="";img.loading="lazy";img.referrerPolicy="no-referrer";img.onerror=()=>{icon.replaceChildren(make("span","",entityConfig[entity].icon));};icon.append(img);}else icon.append(make("span","",entityConfig[entity].icon));
      const main=make("div","");main.append(make("h3","",itemName(row)));if(id!=null)main.append(make("div","db-id",`ID ${id}`));const m=metaFor(row);if(m)main.append(make("div","db-meta",m));const badges=make("div","badges");addBadge(badges,"GMS 83");addBadge(badges,entityConfig[entity].label.slice(0,-1) || entityConfig[entity].label);main.append(badges);card.append(icon,main);card.addEventListener("click",()=>openApiDetail(row));grid.append(card);}
  }

  function renderCustomRows(rows){grid.replaceChildren();const q=lastQuery.toLowerCase();const filtered=rows.filter(x=>!q || [x.name,x.entity_type,x.category,x.subcategory,x.description,x.source_name,...(Array.isArray(x.aliases)?x.aliases:[])].map(text).join(" ").toLowerCase().includes(q));if(!filtered.length){grid.append(make("div","empty","No KaiokenMS custom entries match this search."));return;}
    for(const row of filtered){const card=make("article","db-card"),icon=make("div","db-icon");if(row.image_url){const img=document.createElement("img");img.src=row.image_url;img.alt="";img.loading="lazy";img.onerror=()=>icon.replaceChildren(make("span","","🔥"));icon.append(img);}else icon.append(make("span","","🔥"));const main=make("div","");main.append(make("h3","",row.name));if(row.game_id!=null)main.append(make("div","db-id",`ID ${row.game_id}`));main.append(make("div","db-meta",[row.entity_type,row.category,row.subcategory].filter(Boolean).join(" • ")));const badges=make("div","badges");addBadge(badges,"KaiokenMS","custom");if(row.verified)addBadge(badges,"Verified","verified");main.append(badges);card.append(icon,main);card.addEventListener("click",()=>openCustomDetail(row));grid.append(card);}
  }

  async function apiFetch(url){const r=await fetch(url,{headers:{Accept:"application/json"}});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();}
  function isNumericQuery(q){return /^\d{2,}$/.test(q);}
  function listUrl(ent,q,start,count){const u=new URL(`${API}/${ent}`);if(q)u.searchParams.set("searchFor",q);u.searchParams.set("startPosition",String(start));u.searchParams.set("count",String(count));return u.toString();}

  async function load(reset=true){if(loading)return;loading=true;if(reset)startPosition=0;lastQuery=search.value.trim();$("load-more").hidden=true;
    if(entity==="custom"){setStatus("Loading KaiokenMS custom database…");await loadCustom();renderCustomRows(customEntries);setStatus(`Loaded ${customEntries.length} custom database entries.`,"success");loading=false;return;}
    const count=Number(countSelect.value||24), exact=isNumericQuery(lastQuery);setStatus(exact?`Loading ${entityConfig[entity].label.slice(0,-1)} ID ${lastQuery}…`:`Loading ${entityConfig[entity].label.toLowerCase()}…`);
    try{let data;if(exact){data=await apiFetch(`${API}/${entity}/${encodeURIComponent(lastQuery)}`);renderApiRows(data?[data]:[],false);setStatus(data?`Loaded ID ${lastQuery} from GMS v83.`:`No record found for ID ${lastQuery}.`,data?"success":"");}
      else{data=await apiFetch(listUrl(entity,lastQuery,startPosition,count));const rows=listFromResponse(data);renderApiRows(rows,!reset);startPosition+=rows.length;$("load-more").hidden=rows.length<count;setStatus(`Loaded ${startPosition} ${entityConfig[entity].label.toLowerCase()}${lastQuery?` matching “${lastQuery}”`:""}.`,"success");}
      apiFailed=false;$("api-note").hidden=true;
    }catch(err){console.error(err);apiFailed=true;$("api-note").hidden=false;if(reset)grid.replaceChildren(make("div","empty",`Could not load ${entityConfig[entity].label} from MapleStory.IO right now.`));setStatus(`GMS v83 API request failed: ${err.message}.`,"error");}
    finally{loading=false;}
  }

  async function openApiDetail(row){const id=itemId(row);detailTitle.textContent=`${itemName(row)}${id!=null?` • ${id}`:""}`;detailBody.replaceChildren(make("div","empty","Loading full GMS v83 record…"));dialog.showModal();let full=row;try{if(id!=null)full=await apiFetch(`${API}/${entity}/${id}`);}catch(e){console.warn(e);}renderDetail(full,entity,false);}
  function openCustomDetail(row){detailTitle.textContent=row.name;dialog.showModal();renderDetail(row,row.entity_type||"custom",true);}
  function fieldEntries(obj){const skip=new Set(["id","name","description","image_url","imageUrl","aliases","metadata","source_url","source_name","enabled","verified","created_at","updated_at"]);return Object.entries(obj||{}).filter(([k,v])=>!skip.has(k)&&v!==null&&v!==undefined&&typeof v!=="object").slice(0,18);}
  function renderDetail(data,ent,isCustom){detailBody.replaceChildren();const id=itemId(data) ?? data?.game_id ?? null;const top=make("div","detail-top"),image=make("div","detail-image");const imageUrl=isCustom?data?.image_url:iconUrlFor(ent,id);if(imageUrl){const img=document.createElement("img");img.src=imageUrl;img.alt="";img.onerror=()=>image.replaceChildren(make("span","","📦"));image.append(img);}else image.append(make("span","",entityConfig[ent]?.icon||"🔥"));const intro=make("div","");intro.append(make("h2","",itemName(data)));if(id!=null)intro.append(make("div","db-id",`ID ${id}`));const desc=text(data?.description?.description || data?.description || data?.desc || data?.function);if(desc)intro.append(make("p","db-meta",desc));const sources=make("div","detail-source");const mapleWiki=document.createElement("a");mapleWiki.className="source-chip";mapleWiki.href="https://maplestory.wiki/GMS/83";mapleWiki.target="_blank";mapleWiki.rel="noopener";mapleWiki.textContent="MapleStory.Wiki GMS83";sources.append(mapleWiki);if(isCustom&&data?.source_url){const s=document.createElement("a");s.className="source-chip";s.href=data.source_url;s.target="_blank";s.rel="noopener";s.textContent=data.source_name||"KaiokenMS source";sources.append(s);}intro.append(sources);top.append(image,intro);detailBody.append(top);
    const quick=make("div","");for(const [k,v] of fieldEntries(data)){const row=make("div","kv");row.append(make("b","",k.replaceAll("_"," ")),make("span","",String(v)));quick.append(row);}detailBody.append(quick);
    const extra=data?.metadata && typeof data.metadata==="object"?data.metadata:null;if(extra){const h=make("div","raw-json"),s=make("summary","","KaiokenMS metadata"),pre=make("pre","",escapeJson(extra));const d=document.createElement("details");d.append(s,pre);h.append(d);detailBody.append(h);}
    const raw=make("div","raw-json"),details=document.createElement("details"),summary=make("summary","",isCustom?"Full custom record":"Full GMS v83 record"),pre=make("pre","",escapeJson(data));details.append(summary,pre);raw.append(details);detailBody.append(raw);
  }

  async function loadCustom(){const config=window.KAIOKEN_MARKET_CONFIG||{};customEntries=fallbackCustom.slice();if(!window.supabase||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.supabaseUrl||""))return;try{const db=window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});const {data,error}=await db.from("guide_database_entries").select("*").eq("enabled",true).order("sort_order").order("name");if(!error&&Array.isArray(data)&&data.length)customEntries=data;try{const {data:userData}=await db.auth.getUser();if(userData?.user){const {data:r}=await db.rpc("market_staff_role");if(r==="editor"||r==="game_developer")$("staff-entry").classList.add("visible");}}catch{} }catch(e){console.warn("Custom database unavailable",e);}}

  function renderNPCs(){const n=$("npc-grid");n.replaceChildren();for(const x of usefulNPCs){const card=make("article","npc-card"),imgbox=make("div","npc-img"),img=document.createElement("img");img.src=x.image;img.alt=x.name;img.loading="lazy";imgbox.append(img);const main=make("div","");main.append(make("h3","",x.name),make("div","npc-role",x.role),make("p","",x.text));card.append(imgbox,main);if(x.shop||x.meta){const details=document.createElement("details"),summary=document.createElement("summary");summary.textContent=x.shop?"Shop / important details":"Important details";details.append(summary);const ul=make("ul","shop-list");for(const line of x.shop||x.meta)ul.append(make("li","",line));details.append(ul);card.append(details);}n.append(card);}}
  function renderFeatures(){const n=$("feature-grid");n.replaceChildren();for(const [title,body] of features){const c=make("article","feature");c.append(make("h3","",title),make("p","",body),make("span","status","Confirmed / documented"));n.append(c);}}

  document.querySelectorAll(".entity-tab").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".entity-tab").forEach(b=>b.classList.toggle("active",b===btn));entity=btn.dataset.entity;search.value="";search.placeholder=entityConfig[entity].placeholder;load(true);}));
  $("db-search-form").addEventListener("submit",e=>{e.preventDefault();load(true);});
  $("load-more").addEventListener("click",()=>load(false));
  countSelect.addEventListener("change",()=>load(true));
  $("detail-close").addEventListener("click",()=>dialog.close());
  dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close();});
  $("nav-refresh-btn").addEventListener("click",()=>location.reload());
  renderNPCs();renderFeatures();loadCustom();load(true);
})();

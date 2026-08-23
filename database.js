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
    custom: { label: "KaiokenMS Unique", singular: "KaiokenMS Entry", icon: "✨", placeholder: "Start typing a unique KaiokenMS item…", image: null }
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
    {entity_type:"item",name:"Kaioken Force Scroll 10%",category:"Kaioken Scrolls",description:"Adds 0~2 Weapon Attack and 0~2 Magic Attack to equipment. Success rate: 10%.",image_url:"images/kaioken-scroll-icon.png",verified:true},
    {entity_type:"item",name:"Kaioken Stability Scroll 100%",category:"Kaioken Scrolls",description:"Safely adds 1~2 to existing non-attack equipment stats. Success rate: 100%.",image_url:"images/kaioken-scroll-icon.png",verified:true},
    {entity_type:"item",name:"Kaioken Surge Scroll",category:"Kaioken Scrolls",description:"Custom KaiokenMS progression scroll.",image_url:"images/kaioken-scroll-icon.png",verified:true},
    {entity_type:"item",name:"Kaioken Limit Scroll",category:"Kaioken Scrolls",description:"Custom KaiokenMS progression scroll.",image_url:"images/kaioken-scroll-icon.png",verified:false},
    {entity_type:"item",name:"Equip Enhancement Scroll",category:"Enhancement Scrolls",description:"Enhances upgraded equipment. Failure destroys the item.",image_url:"images/equip-enhancement-scroll.png",verified:true},
    {entity_type:"item",name:"Advanced Equip Enhancement Scroll",category:"Enhancement Scrolls",description:"Enhances upgraded equipment with higher success rates. Failure destroys the item.",image_url:"images/advanced-equip-enhancement-scroll.png",verified:true},
    {entity_type:"item",name:"Protection Scroll",category:"Enhancement Scrolls",description:"Protects equipment from being destroyed by one failed scroll.",image_url:"images/protection-scroll.png",verified:true},
    {entity_type:"item",name:"Kaioken ItemVac",category:"Utility",description:"Timed item that automatically pulls monster drops toward the player while farming.",image_url:"images/item-vac-website.png",verified:true},
    {entity_type:"item",name:"Scouter",game_id:1022042,category:"Equipment",description:"Equip the Scouter and double click monsters to inspect server supplied monster information.",image_url:"images/scouter-1022042-icon.png",verified:true},
    {entity_type:"item",name:"Kaioken Diamonds",category:"Custom Materials",description:"KaiokenMS custom progression material.",verified:false},
    {entity_type:"equipment",name:"Shenron Ring",category:"Special Ring",description:"Special KaiokenMS ring. Exact acquisition details are still being verified.",verified:false},
    {entity_type:"item",name:"Senzu Bean",category:"Dragon Ball Items",description:"Dragon Ball themed consumable sold by server shops.",verified:true},
    {entity_type:"item",name:"Maple Leaf Box",category:"Boxes",description:"Custom server reward box used in KaiokenMS progression.",verified:true}
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
  const lower = v => text(v).toLowerCase();
  const sourceLike = /maplestory\.?wiki|maplestory\.?io|hidden\s*street|bbb\s*hidden|global\s*hidden/i;

  const customHiddenNames = new Set([
    "white scroll","chaos scroll","scroll for claw for att 10%","scroll for wand for magic attack 50%",
    "piece of time","maple leaf","2x exp service","2x drop service","pet vac service","fame service"
  ]);
  function isPublicCustom(row){
    const name=lower(row?.name), type=lower(row?.entity_type);
    if(!name || customHiddenNames.has(name))return false;
    if(["npc","feature","service","map","quest","job","monster","mob"].includes(type))return false;
    return true;
  }

  function addBadge(box,label,cls=""){box.append(make("span",`badge${cls?` ${cls}`:""}`,label));}
  function metaFor(o){
    const parts=[]; const type=o?.typeInfo || o?.type || {};
    if(type?.overallCategory)parts.push(type.overallCategory);
    if(type?.category)parts.push(type.category);
    if(type?.subCategory)parts.push(type.subCategory);
    if(o?.streetName)parts.push(o.streetName);
    if(o?.level)parts.push(`Lv. ${o.level}`);
    if(o?.levelMinimum)parts.push(`Lv. ${o.levelMinimum}+`);
    if(typeof o?.function === "string")parts.push(o.function);
    return [...new Set(parts.filter(Boolean))].slice(0,4).join(" • ");
  }

  function dragonBallImage(name){
    const m=text(name).match(/dragon\s*ball\s*\(\s*([1-7])\s*-?\s*star\s*\)/i);
    return m ? `images/dragon-ball-${m[1]}-item.png?v=3` : "";
  }
  function customImage(row){
    const name=text(row?.name);
    const ball=dragonBallImage(name); if(ball)return ball;
    if(/kaioken\s+(force|stability|surge|limit)\s+scroll/i.test(name))return "images/kaioken-scroll-icon.png?v=3";
    if(/^advanced\s+equip\s+enhancement\s+scroll$/i.test(name))return "images/advanced-equip-enhancement-scroll.png?v=3";
    if(/^equip\s+enhancement\s+scroll$/i.test(name))return "images/equip-enhancement-scroll.png?v=3";
    if(/^protection\s+scroll$/i.test(name))return "images/protection-scroll.png?v=3";
    if(/^scouter$/i.test(name))return "images/scouter-1022042-icon.png?v=3";
    if(/kaioken\s+itemvac/i.test(name))return "images/item-vac-website.png?v=3";
    if(row?.game_id!=null && /^(item|equipment)$/i.test(text(row?.entity_type)))return `${API}/item/${row.game_id}/icon`;
    const u=text(row?.image_url); return sourceLike.test(u)?"":u;
  }
  function customEmoji(row){
    const n=lower(row?.name);
    if(n.includes("diamond"))return "💎";
    if(n.includes("ring"))return "💍";
    if(n.includes("senzu"))return "🫘";
    if(n.includes("box"))return "🎁";
    if(n.includes("radar"))return "📡";
    if(n.includes("scroll"))return "📜";
    if(n.includes("scouter"))return "📟";
    if(n.includes("vac"))return "🧲";
    return "✨";
  }

  function renderApiRows(rows,append=false){
    const ordered=sortRows(rows);
    if(!append)grid.replaceChildren();
    if(!ordered.length && !append){grid.append(make("div","empty",`No ${entityConfig[entity].label.toLowerCase()} found.`));return;}
    for(const row of ordered){
      const id=itemId(row), card=make("article","db-card"), icon=make("div","db-icon"), url=iconUrlFor(entity,id);
      if(url){const img=document.createElement("img");img.src=url;img.alt="";img.loading="lazy";img.referrerPolicy="no-referrer";img.onerror=()=>icon.replaceChildren(make("span","",entityConfig[entity].icon));icon.append(img);} else icon.append(make("span","",entityConfig[entity].icon));
      const main=make("div","");main.append(make("h3","",itemName(row)));if(id!=null)main.append(make("div","db-id",`ID ${id}`));const m=metaFor(row);if(m)main.append(make("div","db-meta",m));
      card.append(icon,main);card.addEventListener("click",()=>openApiDetail(row));grid.append(card);
    }
  }

  function publicCustomRows(rows){return rows.filter(isPublicCustom);}
  function renderCustomRows(rows){
    grid.replaceChildren();
    const q=lastQuery.toLowerCase();
    const filtered=publicCustomRows(rows).filter(x=>!q || [x.name,x.category,x.subcategory,x.description,...(Array.isArray(x.aliases)?x.aliases:[])].map(text).join(" ").toLowerCase().includes(q)).sort((a,b)=>text(a.name).localeCompare(text(b.name),undefined,{numeric:true,sensitivity:"base"}));
    if(!filtered.length){grid.append(make("div","empty","No KaiokenMS unique entries match this search."));return;}
    for(const row of filtered){
      const card=make("article","db-card"), icon=make("div","db-icon"), url=customImage(row);
      if(url){const img=document.createElement("img");img.src=url;img.alt="";img.loading="lazy";img.onerror=()=>icon.replaceChildren(make("span","",customEmoji(row)));icon.append(img);} else icon.append(make("span","",customEmoji(row)));
      const main=make("div","");main.append(make("h3","",row.name));if(row.game_id!=null)main.append(make("div","db-id",`ID ${row.game_id}`));const meta=[row.category,row.subcategory].filter(Boolean).join(" • ");if(meta)main.append(make("div","db-meta",meta));const badges=make("div","badges");addBadge(badges,"KaiokenMS","custom");if(row.verified)addBadge(badges,"Verified","verified");main.append(badges);card.append(icon,main);card.addEventListener("click",()=>openCustomDetail(row));grid.append(card);
    }
  }

  async function load(reset=true,opts={}){
    if(loading)return; loading=true; if(!opts.keepSuggestions)hideSuggestions(); if(reset)startPosition=0; lastQuery=search.value.trim(); $("load-more").hidden=true;
    if(entity==="custom"){
      setStatus("Loading KaiokenMS unique database…"); await loadCustom(); const rows=publicCustomRows(customEntries); renderCustomRows(rows); setStatus(`Loaded ${rows.length} KaiokenMS unique entries.`,"success"); loading=false; return;
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
        let rows=listFromResponse(data);
        if(lastQuery){const q=lastQuery.toLowerCase();rows=rows.filter(r=>itemName(r).toLowerCase().includes(q));}
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

  function safeDescription(data){
    const d=data?.description;
    if(typeof d==="string")return d;
    if(d&&typeof d==="object")return text(d.description||d.desc||d.text||d.name);
    return text(data?.desc||data?.function||data?.summary);
  }
  function prettyLabel(key){
    const map={
      level:"Level",levelMinimum:"Minimum Level",reqLevel:"Required Level",requiredLevel:"Required Level",price:"Price",unitPrice:"Unit Price",slotMax:"Max Stack",tuc:"Upgrade Slots",
      hp:"HP",mp:"MP",exp:"EXP",boss:"Boss",speed:"Speed",jump:"Jump",attackSpeed:"Attack Speed",reqSTR:"Required STR",reqDEX:"Required DEX",reqINT:"Required INT",reqLUK:"Required LUK",
      incSTR:"STR",incDEX:"DEX",incINT:"INT",incLUK:"LUK",incPAD:"Weapon Attack",incMAD:"Magic Attack",incPDD:"Weapon Defense",incMDD:"Magic Defense",incACC:"Accuracy",incEVA:"Avoidability",incSpeed:"Speed",incJump:"Jump",
      streetName:"Area",category:"Category",subcategory:"Subcategory",overallCategory:"Category",role:"Role",weekly_entries_per_pq:"Weekly Entries per PQ",success:"Success Rate",successRate:"Success Rate"
    };
    return map[key] || key.replace(/_/g," ").replace(/([a-z])([A-Z])/g,"$1 $2").replace(/\b\w/g,c=>c.toUpperCase());
  }
  function deepScalar(obj,keys,maxDepth=5){
    const wanted=new Set(keys.map(k=>k.toLowerCase())); const seen=new Set();
    function walk(v,depth){
      if(v==null||depth>maxDepth||typeof v!=="object"||seen.has(v))return undefined;seen.add(v);
      for(const [k,val] of Object.entries(v)){if(wanted.has(k.toLowerCase()) && (typeof val==="string"||typeof val==="number"||typeof val==="boolean"))return val;}
      for(const [k,val] of Object.entries(v)){
        if(/frame|image|icon|sound|effect|animation|base64/i.test(k))continue;
        const found=walk(val,depth+1);if(found!==undefined)return found;
      }
      return undefined;
    }
    return walk(obj,0);
  }
  function statsFor(data,ent,isCustom){
    const out=[],seen=new Set();
    const add=(label,value)=>{if(value===undefined||value===null||value===""||typeof value==="object")return;const v=typeof value==="boolean"?(value?"Yes":"No"):String(value);const key=`${label}:${v}`;if(seen.has(key))return;seen.add(key);out.push([label,v]);};
    if(isCustom){
      if(data?.category)add("Category",data.category);if(data?.subcategory)add("Subcategory",data.subcategory);
      const md=data?.metadata&&typeof data.metadata==="object"?data.metadata:{};
      for(const [k,v] of Object.entries(md)){if(/source|url|slug|sort|created|updated|internal/i.test(k))continue;add(prettyLabel(k),v);}
      return out.slice(0,18);
    }
    const type=data?.typeInfo||data?.type||{}; add("Category",type.overallCategory||type.category);add("Subcategory",type.subCategory);
    const specs=[
      ["Level",["level"]],["Required Level",["reqLevel","requiredLevel","levelMinimum"]],["Upgrade Slots",["tuc","upgradeSlots","slots"]],
      ["HP",["hp","maxHP"]],["MP",["mp","maxMP"]],["EXP",["exp"]],["Boss",["boss"]],
      ["STR",["incSTR"]],["DEX",["incDEX"]],["INT",["incINT"]],["LUK",["incLUK"]],
      ["Weapon Attack",["incPAD","pad"]],["Magic Attack",["incMAD","mad"]],["Weapon Defense",["incPDD","pdd"]],["Magic Defense",["incMDD","mdd"]],
      ["Accuracy",["incACC","acc"]],["Avoidability",["incEVA","eva"]],["Speed",["incSpeed","speed"]],["Jump",["incJump","jump"]],
      ["Success Rate",["successRate","success"]],["Price",["price","unitPrice"]],["Max Stack",["slotMax"]]
    ];
    for(const [label,keys] of specs)add(label,deepScalar(data,keys));
    return out.slice(0,20);
  }

  function relationArray(data,paths){
    for(const path of paths){
      const parts=path.split(".");let cur=data;
      for(const part of parts){if(cur==null)break;const key=Object.keys(cur).find(k=>k.toLowerCase()===part.toLowerCase());cur=key?cur[key]:undefined;}
      if(Array.isArray(cur))return cur;
    }
    return [];
  }
  function normalizeRelation(v){
    if(v==null)return null;
    if(typeof v==="number")return{id:v,name:`ID ${v}`};
    if(typeof v==="string")return /^\d+$/.test(v)?{id:Number(v),name:`ID ${v}`}:{id:null,name:v};
    if(typeof v!=="object")return null;
    const id=v.id??v.itemId??v.mobId??v.npcId??v.mapId??v.questId??v.targetMapId??v.targetMap??null;
    const name=text(v.name||v.mapName||v.streetName||v.description?.name||v.title||v.targetMapName||(id!=null?`ID ${id}`:""));
    return name||id!=null?{id:id!=null?Number(id):null,name:name||`ID ${id}`,raw:v}:null;
  }
  function relationRows(data,paths){
    const out=[],seen=new Set();
    for(const v of relationArray(data,paths)){const r=normalizeRelation(v);if(!r)continue;const key=`${r.id??""}:${r.name}`;if(seen.has(key))continue;seen.add(key);out.push(r);}return out;
  }
  function relationIcon(type,id){return id!=null?iconUrlFor(type,id):"";}
  function switchEntity(target){
    entity=target;document.querySelectorAll(".entity-tab").forEach(b=>b.classList.toggle("active",b.dataset.entity===target));search.placeholder=entityConfig[target]?.placeholder||"Search database…";
  }
  async function openLinked(target,rel){
    if(!target||target==="custom")return;
    switchEntity(target);hideSuggestions();
    if(rel?.id!=null){search.value=String(rel.id);await load(true);try{const full=await apiFetch(`${API}/${target}/${rel.id}`);detailTitle.textContent=itemName(full);renderDetail(full,target,false);dialog.showModal();}catch{dialog.close();}}
    else {search.value=rel?.name||"";await load(true);dialog.close();}
    document.getElementById("explorer")?.scrollIntoView({behavior:"smooth",block:"start"});
  }
  function appendRelationSection(title,rows,targetType,emptyText=""){
    if(!rows.length){if(emptyText){const sec=make("section","relation-section");sec.append(make("h3","",title),make("p","relation-empty",emptyText));detailBody.append(sec);}return;}
    const sec=make("section","relation-section"),list=make("div","relation-list");sec.append(make("h3","",title));
    for(const rel of rows){const btn=make("button","relation-chip");btn.type="button";const icon=make("span","relation-icon"),url=relationIcon(targetType,rel.id);if(url){const img=document.createElement("img");img.src=url;img.alt="";img.loading="lazy";img.onerror=()=>icon.replaceChildren(make("span","",entityConfig[targetType]?.icon||"•"));icon.append(img);}else icon.append(make("span","",entityConfig[targetType]?.icon||"•"));const copy=make("span","relation-copy");copy.append(make("strong","",rel.name));if(rel.id!=null)copy.append(make("small","",`ID ${rel.id}`));btn.append(icon,copy);btn.addEventListener("click",()=>openLinked(targetType,rel));list.append(btn);}sec.append(list);detailBody.append(sec);
  }

  function itemDroppedBy(data){return relationRows(data,["metaInfo.droppedBy","metainfo.droppedby","droppedBy","droppedby"]);}
  function mobDrops(data){return relationRows(data,["drops","metaInfo.drops","metainfo.drops"]);}
  function foundMaps(data){return relationRows(data,["foundAt","foundat","metaInfo.foundAt","metainfo.foundat","maps","mapNames"]);}
  function relatedQuests(data){return relationRows(data,["relatedQuestsInfo","relatedquestsinfo","relatedQuests","relatedquests"]);}
  function mapLife(data,type){
    const life=relationArray(data,["life"]),want=type==="mob"?["mob","monster","m"]:["npc","n"];
    return life.filter(x=>want.includes(lower(x?.type))).map(normalizeRelation).filter(Boolean);
  }
  function mapPortals(data){return relationArray(data,["portals"]).map(p=>normalizeRelation({id:p?.targetMapId??p?.targetMap,name:p?.targetMapName||p?.targetName||(p?.targetMapId!=null?`Map ${p.targetMapId}`:"")})).filter(Boolean);}

  async function openApiDetail(row){
    const id=itemId(row); detailTitle.textContent=itemName(row); detailBody.replaceChildren(make("div","empty","Loading details…")); dialog.showModal(); let full=row;
    try{if(id!=null)full=await apiFetch(`${API}/${entity}/${id}`);}catch(e){console.warn(e);} renderDetail(full,entity,false);
  }
  function openCustomDetail(row){detailTitle.textContent=row.name;dialog.showModal();renderDetail(row,row.entity_type||"custom",true);}
  function renderDetail(data,ent,isCustom){
    detailBody.replaceChildren(); const id=itemId(data) ?? data?.game_id ?? null; const top=make("div","detail-top"), image=make("div","detail-image"); const imageUrl=isCustom?customImage(data):iconUrlFor(ent,id);
    if(imageUrl){const img=document.createElement("img");img.src=imageUrl;img.alt=itemName(data);img.onerror=()=>image.replaceChildren(make("span","",isCustom?customEmoji(data):(entityConfig[ent]?.icon||"✨")));image.append(img);} else image.append(make("span","",isCustom?customEmoji(data):(entityConfig[ent]?.icon||"✨")));
    const intro=make("div",""); intro.append(make("h2","",itemName(data))); if(id!=null)intro.append(make("div","db-id",`ID ${id}`)); const desc=safeDescription(data); if(desc && !sourceLike.test(desc))intro.append(make("p","detail-description",desc)); top.append(image,intro); detailBody.append(top);
    const pairs=statsFor(data,ent,isCustom); if(pairs.length){const quick=make("section","detail-facts");quick.append(make("h3","","Stats & Details"));for(const [label,value] of pairs){const row=make("div","kv");row.append(make("b","",label),make("span","",value));quick.append(row);}detailBody.append(quick);}
    if(isCustom)return;
    if(ent==="item"){
      appendRelationSection("Dropped By",itemDroppedBy(data),"mob","No monster drop information is listed for this item.");
      appendRelationSection("Related Quests",relatedQuests(data),"quest");
    } else if(ent==="mob"){
      appendRelationSection("Found In Maps",foundMaps(data),"map","No map locations are listed for this monster yet.");
      appendRelationSection("Drops",mobDrops(data),"item");
    } else if(ent==="npc"){
      appendRelationSection("Found In Maps",foundMaps(data),"map","No map locations are listed for this NPC yet.");
      appendRelationSection("Related Quests",relatedQuests(data),"quest");
    } else if(ent==="map"){
      appendRelationSection("Monsters",mapLife(data,"mob"),"mob");
      appendRelationSection("NPCs",mapLife(data,"npc"),"npc");
      appendRelationSection("Portals",mapPortals(data),"map");
    }
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
  function prefixSorted(rows,q){
    const needle=q.toLowerCase(), unique=[],seen=new Set();
    for(const row of rows){const name=itemName(row),id=itemId(row)??row?.game_id??"",key=`${id}:${name}`;if(!name||seen.has(key))continue;seen.add(key);unique.push(row);}
    return unique.filter(r=>itemName(r).toLowerCase().includes(needle)).sort((a,b)=>{const an=itemName(a).toLowerCase(),bn=itemName(b).toLowerCase();const ap=an.startsWith(needle)?0:1,bp=bn.startsWith(needle)?0:1;return ap-bp||an.localeCompare(bn,undefined,{numeric:true,sensitivity:"base"});});
  }
  function renderSuggestions(rows,isCustom=false){
    suggestions.replaceChildren(); activeSuggestion=-1;
    if(!rows.length){suggestions.append(make("div","suggestion-empty","No matching names found."));suggestions.hidden=false;search.setAttribute("aria-expanded","true");return;}
    rows.slice(0,40).forEach((row,index)=>{
      const btn=make("button","suggestion-item");btn.type="button";btn.setAttribute("role","option");btn.dataset.index=String(index);
      const icon=make("span","suggestion-icon"), id=itemId(row) ?? row?.game_id ?? null, url=isCustom?customImage(row):iconUrlFor(entity,id);
      if(url){const img=document.createElement("img");img.src=url;img.alt="";img.loading="lazy";img.onerror=()=>icon.replaceChildren(make("span","",isCustom?customEmoji(row):entityConfig[entity].icon));icon.append(img);}else icon.append(make("span","",isCustom?customEmoji(row):entityConfig[entity].icon));
      const copy=make("span","suggestion-copy");copy.append(make("strong","",itemName(row)));const meta=[id!=null?`ID ${id}`:"",isCustom?[row.category,row.subcategory].filter(Boolean).join(" • "):metaFor(row)].filter(Boolean).join(" • ");if(meta)copy.append(make("small","",meta));btn.append(icon,copy);
      btn.addEventListener("mousedown",e=>e.preventDefault());
      btn.addEventListener("click",()=>{search.value=itemName(row);hideSuggestions();load(true);});
      suggestions.append(btn);
    });
    suggestions.hidden=false;search.setAttribute("aria-expanded","true");
  }
  async function updateSuggestions(){
    const q=search.value.trim(), request=++suggestionRequest;
    if(!q || isNumericQuery(q)){hideSuggestions();return;}
    try{
      if(entity==="custom"){
        if(!customEntries.length)await loadCustom(); const rows=prefixSorted(publicCustomRows(customEntries),q);if(request!==suggestionRequest)return;renderSuggestions(rows,true);return;
      }
      const data=await apiFetch(listUrl(entity,q,0,240));if(request!==suggestionRequest)return;const rows=prefixSorted(listFromResponse(data),q);renderSuggestions(rows,false);
    } catch(e){if(request===suggestionRequest){suggestions.replaceChildren(make("div","suggestion-empty","Suggestions are temporarily unavailable."));suggestions.hidden=false;}}
  }
  async function liveSearch(){
    const q=search.value.trim();if(!q||isNumericQuery(q))return;
    lastQuery=q;
    try{
      if(entity==="custom"){if(!customEntries.length)await loadCustom();const rows=prefixSorted(publicCustomRows(customEntries),q);renderCustomRows(rows);setStatus(`Showing ${rows.length} matching KaiokenMS entries.`,"success");return;}
      const count=Number(countSelect.value||24),data=await apiFetch(listUrl(entity,q,0,Math.max(120,count)));const rows=prefixSorted(listFromResponse(data),q);renderApiRows(rows.slice(0,count),false);setStatus(`Showing ${Math.min(rows.length,count)} alphabetical matches for “${q}”.`,"success");
    }catch(e){console.warn(e);}
  }
  function scheduleSuggestions(){clearTimeout(suggestionTimer);suggestionTimer=setTimeout(()=>{updateSuggestions();liveSearch();},180);}
  function moveSuggestion(delta){const items=[...suggestions.querySelectorAll(".suggestion-item")];if(!items.length)return;activeSuggestion=(activeSuggestion+delta+items.length)%items.length;items.forEach((n,i)=>n.classList.toggle("active",i===activeSuggestion));items[activeSuggestion].scrollIntoView({block:"nearest"});}

  document.querySelectorAll(".entity-tab").forEach(btn=>btn.addEventListener("click",()=>{
    document.querySelectorAll(".entity-tab").forEach(b=>b.classList.toggle("active",b===btn)); entity=btn.dataset.entity; search.value=""; search.placeholder=entityConfig[entity].placeholder; hideSuggestions(); load(true);
  }));
  $("db-search-form").addEventListener("submit",e=>{e.preventDefault();hideSuggestions();load(true);});
  search.addEventListener("input",scheduleSuggestions);
  search.addEventListener("focus",()=>{if(search.value.trim())scheduleSuggestions();});
  search.addEventListener("keydown",e=>{
    if(suggestions.hidden)return;
    if(e.key==="ArrowDown"){e.preventDefault();moveSuggestion(1);}else if(e.key==="ArrowUp"){e.preventDefault();moveSuggestion(-1);}else if(e.key==="Escape"){hideSuggestions();}else if(e.key==="Enter"&&activeSuggestion>=0){e.preventDefault();suggestions.querySelectorAll(".suggestion-item")[activeSuggestion]?.click();}
  });
  document.addEventListener("click",e=>{if(!suggestions.contains(e.target)&&e.target!==search)hideSuggestions();});
  $("load-more").addEventListener("click",()=>load(false));countSelect.addEventListener("change",()=>load(true));$("detail-close").addEventListener("click",()=>dialog.close());dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close();});$("nav-refresh-btn").addEventListener("click",()=>location.reload());

  renderNPCs(); renderFeatures(); loadCustom(); load(true);
})();

(() => {
  'use strict';
  const idx=window.KAIOKEN_DB_INDEX;
  const spatial=(window.KAIOKEN_MAP_SPATIAL||{}).maps||{};
  if(idx?.npcs){
    idx.npcs=idx.npcs.filter(n=>{
      const name=String(n?.name||'').trim();
      return name && name!=='???' && name!=='MISSING NAME' && !/^\d+$/.test(name);
    });
    if(idx.meta)idx.meta.npcs=idx.npcs.length;
  }
  for(const [id,m] of Object.entries(spatial)){
    if(!m)continue;
    const old=String(m.image||'');
    if(!m.thumb)m.thumb=old;
    if(!m.fallbackImage)m.fallbackImage=`https://maplestory.io/api/GMS/83/map/${id}/minimap`;
    m.image=`https://maplestory.io/api/GMS/83/map/${id}/render/0`;
  }
})();

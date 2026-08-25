(() => {
  'use strict';
  const key = `kaioken-scroll:${location.pathname}${location.search}${location.hash}`;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const save = () => { try { sessionStorage.setItem(key, JSON.stringify({ x: scrollX, y: scrollY })); } catch (_) {} };
  const restore = () => {
    let forceTop = false;
    try { forceTop = sessionStorage.getItem('kaioken-force-top') === '1'; if (forceTop) sessionStorage.removeItem('kaioken-force-top'); } catch (_) {}
    if (forceTop) { requestAnimationFrame(() => scrollTo(0, 0)); return; }
    let pos; try { pos = JSON.parse(sessionStorage.getItem(key) || 'null'); } catch (_) {}
    if (pos && Number.isFinite(pos.y)) requestAnimationFrame(() => requestAnimationFrame(() => scrollTo(pos.x || 0, pos.y)));
  };
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (link && !link.hasAttribute('download') && link.target !== '_blank') {
      if (link.closest('.site-nav')) {
        try { sessionStorage.setItem('kaioken-force-top', '1'); } catch (_) {}
        const target = new URL(link.getAttribute('href'), location.href);
        if (target.pathname === location.pathname && target.search === location.search) {
          event.preventDefault();
          document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
          try { sessionStorage.removeItem(key); sessionStorage.removeItem('kaioken-force-top'); } catch (_) {}
          if (location.hash) history.replaceState(null, '', `${location.pathname}${location.search}`);
          scrollTo({ top: 0, left: 0, behavior: 'smooth' });
          return;
        }
      }
      save();
    }
  }, true);
  addEventListener('pagehide', save); addEventListener('beforeunload', save);
  addEventListener('pageshow', restore); addEventListener('popstate', restore);
  const currentPage = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const oldBack = document.querySelector('[data-site-back]');
  if (oldBack) oldBack.remove();
  const back = document.createElement('button');
  back.type = 'button'; back.dataset.siteBack = ''; back.className = 'nav-back-link floating-back'; back.innerHTML = '<span aria-hidden="true">↩</span><b>Back</b>';
  back.title = 'Return to the exact place you left';
  back.setAttribute('aria-label','Back to the exact place you left');
  back.addEventListener('click', () => {
    save();
    let internalPrevious = false;
    try { internalPrevious = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch (_) {}
    if (location.protocol !== 'file:' && internalPrevious && history.length > 1) history.back();
    else location.href = 'index.html';
  });
  if (currentPage !== 'index.html') document.body.appendChild(back);
  document.querySelectorAll('.back-top,.scroll-top,.scroll-to-top,[data-scroll-top]').forEach(element => element.remove());
  const scrollTop = document.createElement('button');
  scrollTop.type='button';scrollTop.className='floating-scroll-top';scrollTop.innerHTML='<span class="dragon-stars" aria-hidden="true"><i>★</i><i>★</i><i>★</i><i>★</i><i>★</i><i>★</i><i>★</i></span><span class="dragon-arrow" aria-hidden="true">↑</span>';scrollTop.title='Back to top';scrollTop.setAttribute('aria-label','Back to top');
  scrollTop.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));document.body.appendChild(scrollTop);
  const syncScrollTop=()=>scrollTop.classList.toggle('visible',scrollY>360);addEventListener('scroll',syncScrollTop,{passive:true});syncScrollTop();
  const style = document.createElement('style'); style.id = 'kaioken-navigation-style';
  style.textContent = '.nav-back-link{appearance:none;border:1px solid #55759d;background:linear-gradient(145deg,#203a5d,#0d182d);color:#fff;border-radius:999px;padding:11px 15px;font:inherit;font-weight:900;cursor:pointer}.nav-back-link:hover{border-color:#ff9f1a;color:#ffd54a}.floating-back{position:fixed;z-index:9998;left:18px;bottom:20px;display:flex;align-items:center;gap:7px;box-shadow:0 10px 28px rgba(0,0,0,.42)}.floating-scroll-top{position:fixed;z-index:9998;right:20px;bottom:20px;width:64px;height:64px;padding:0;overflow:visible;border:2px solid #fff0a0;border-radius:50%;background:radial-gradient(circle at 34% 24%,#fffbd0 0 4%,#ffd94d 12%,#ff9c00 49%,#e54a00 78%,#851600 100%);color:#fff;cursor:pointer;box-shadow:inset -8px -10px 14px rgba(112,16,0,.4),inset 6px 6px 10px rgba(255,255,220,.48),0 0 0 3px rgba(255,122,0,.2),0 10px 30px rgba(232,93,0,.5);opacity:0;visibility:hidden;transform:translateY(12px);transition:.18s}.floating-scroll-top:before{content:"";position:absolute;inset:6px 9px auto 9px;height:17px;border-radius:50%;background:linear-gradient(rgba(255,255,255,.56),transparent);filter:blur(1px)}.dragon-stars{position:absolute;inset:0;opacity:.96}.dragon-stars i{position:absolute;color:#b5140b;font-style:normal;font-size:8px;line-height:1;text-shadow:0 1px 1px rgba(255,220,80,.7)}.dragon-stars i:nth-child(1){left:21px;top:18px}.dragon-stars i:nth-child(2){left:31px;top:16px}.dragon-stars i:nth-child(3){left:41px;top:22px}.dragon-stars i:nth-child(4){left:19px;top:30px}.dragon-stars i:nth-child(5){left:31px;top:28px}.dragon-stars i:nth-child(6){left:42px;top:33px}.dragon-stars i:nth-child(7){left:30px;top:42px}.dragon-arrow{position:absolute;z-index:3;left:50%;bottom:-8px;display:grid;place-items:center;width:25px;height:25px;transform:translateX(-50%);border:2px solid #ffe989;border-radius:50%;background:linear-gradient(145deg,#7f1d0d,#42100b);font-size:17px;font-weight:1000;line-height:1;color:#fff;text-shadow:0 1px 2px #000;box-shadow:0 4px 10px rgba(0,0,0,.45)}.floating-scroll-top.visible{opacity:1;visibility:visible;transform:none}.floating-scroll-top:hover{filter:brightness(1.09) saturate(1.08);transform:translateY(-3px)}@media(max-width:620px){.floating-back b{display:none}.floating-back{width:48px;height:48px;padding:0;justify-content:center;left:10px;bottom:12px}.floating-scroll-top{right:10px;bottom:15px;width:56px;height:56px}.dragon-stars{transform:scale(.9);transform-origin:center}.dragon-arrow{width:23px;height:23px;font-size:15px}}';
  document.head.appendChild(style);

  const communityStyle=document.createElement('style');communityStyle.textContent=`
    .site-nav{display:grid!important;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:12px}.site-nav .brand{padding:8px 12px;border:1px solid rgba(255,213,74,.28);border-radius:13px;background:linear-gradient(145deg,rgba(39,63,94,.78),rgba(12,23,38,.72));box-shadow:inset 0 1px rgba(255,255,255,.05),0 5px 18px rgba(0,0,0,.18);letter-spacing:.045em;text-shadow:0 0 13px rgba(255,213,74,.16);white-space:nowrap}.site-nav .nav-links{justify-content:center;min-width:0}.nav-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px}.community-tools{display:flex;align-items:center;gap:8px}.live-viewers,.feedback-open{border:1px solid #426481;border-radius:999px;background:#13243a;color:#eaf4ff;padding:8px 12px;font:inherit;font-weight:900;white-space:nowrap}.live-viewers[hidden]{display:none!important}.feedback-open{cursor:pointer}.feedback-open:hover{border-color:#ff9800;color:#ffd54a}.page-exit{position:fixed;z-index:9999;top:92px;right:max(20px,calc((100vw - 1120px)/2 + 22px));display:grid;place-items:center;width:48px;height:48px;border:2px solid #ffb0b0;border-radius:14px;background:linear-gradient(145deg,#e83b3b,#991414);color:#fff;font-size:31px;line-height:1;font-weight:1000;cursor:pointer;box-shadow:0 7px 22px rgba(180,0,0,.42)}.page-exit:hover{transform:scale(1.05);background:linear-gradient(145deg,#ff5252,#ae1515)}.feedback-dialog{width:min(620px,calc(100% - 24px));border:1px solid #ff9800;border-radius:18px;padding:0;background:#111c2d;color:#edf5ff;box-shadow:0 30px 90px #000}.feedback-dialog::backdrop{background:rgba(2,8,18,.78)}.feedback-head{display:flex;align-items:center;justify-content:space-between;padding:15px 18px;border-bottom:1px solid #426481;background:#172a42}.feedback-head h2{margin:0;color:#ffd54a}.feedback-close{border:0;background:transparent;color:#fff;font-size:30px;cursor:pointer}.feedback-form{display:grid;gap:12px;padding:18px}.feedback-form label{display:grid;gap:6px;font-weight:900;color:#86dcff}.feedback-form input,.feedback-form select,.feedback-form textarea{width:100%;box-sizing:border-box;border:1px solid #426481;border-radius:10px;background:#0d1828;color:#fff;padding:11px;font:inherit}.feedback-form textarea{min-height:130px;resize:vertical}.feedback-submit{border:1px solid #ff9800;border-radius:10px;background:linear-gradient(135deg,#ff9800,#e85d00);color:#fff;padding:11px 14px;font-weight:1000;cursor:pointer}.feedback-note{margin:0;color:#aebed0;font-size:.84rem}.feedback-message{color:#ffd54a;font-weight:900}@media(max-width:1350px){.site-nav{grid-template-columns:auto auto}.site-nav .brand{grid-column:1}.site-nav .nav-links{grid-column:1/-1;grid-row:2;justify-content:center}.nav-actions{grid-column:2;grid-row:1}.page-exit{top:142px}}@media(max-width:700px){.site-nav{display:flex!important;flex-wrap:wrap}.site-nav .brand{margin-right:auto}.site-nav .nav-links{order:3;width:100%}.live-viewers span,.feedback-open span{display:none}.live-viewers,.feedback-open{padding:8px}.page-exit{top:148px;right:10px;width:42px;height:42px}}
    .site-nav{grid-template-columns:minmax(0,1fr) auto minmax(0,1fr)!important;gap:16px!important}.site-nav .nav-links{grid-column:1!important;grid-row:1!important;justify-self:start!important;justify-content:flex-start!important}.site-nav .brand{grid-column:2!important;grid-row:1!important;justify-self:center!important;display:flex!important;align-items:center;gap:10px}.nav-actions{grid-column:3!important;grid-row:1!important;justify-self:end!important}.nav-shenron{width:46px;height:36px;object-fit:contain;filter:drop-shadow(0 2px 5px rgba(0,0,0,.5))}@media(max-width:1350px){.site-nav{grid-template-columns:minmax(0,1fr) auto!important}.site-nav .brand{grid-column:1!important;justify-self:start!important}.site-nav .nav-links{grid-column:1/-1!important;grid-row:2!important;justify-self:center!important;justify-content:center!important}.nav-actions{grid-column:2!important;grid-row:1!important}}
    .feedback-file-help{color:#9fb0c4;font-size:.78rem;font-weight:700}.feedback-file-preview{display:flex;align-items:center;gap:12px;border:1px solid #35547c;border-radius:12px;padding:10px;background:#0d1828}.feedback-file-preview[hidden]{display:none}.feedback-file-preview img{width:110px;height:76px;object-fit:contain;border-radius:8px;background:#07101c}.feedback-file-preview button{border:1px solid #c65a5a;border-radius:8px;background:#3a1c25;color:#ffd4d4;padding:7px 10px;font-weight:900;cursor:pointer}.feedback-honeypot{position:absolute!important;left:-10000px!important;width:1px!important;height:1px!important;overflow:hidden!important}
  `;document.head.appendChild(communityStyle);
  const nav=document.querySelector('.site-nav');
  const page=currentPage;
  const guideSections=new Set(['quick-start.html','monster-book.html','leveling.html','achievements.html','alts-mules.html','mesos-farming.html','pq-bossing.html','dragon-balls.html','fishing.html','rebirth.html','economy.html','commands.html','routine.html']);
  if(nav){
    nav.querySelectorAll('a[href="./"]').forEach(link=>link.setAttribute('href','index.html'));
    const brand=nav.querySelector('.brand');
    if(brand)brand.innerHTML='<img class="nav-shenron" src="images/shenron-nav.png" alt="Shenron"><span>KAIOKENMS COMMUNITY GUIDE</span>';
    const refresh=nav.querySelector('.nav-refresh-btn'),actions=document.createElement('div');actions.className='nav-actions';
    const tools=document.createElement('div');tools.className='community-tools';tools.innerHTML='<button type="button" class="feedback-open">✍️ <span>Suggest an edit</span></button>';
    actions.appendChild(tools);if(refresh)actions.appendChild(refresh);nav.appendChild(actions);
  }
  if(guideSections.has(page)){const exit=document.createElement('button');exit.type='button';exit.className='page-exit';exit.textContent='×';exit.title='Close this section and return to Guide Sections';exit.setAttribute('aria-label','Close section and return to Guide Sections');exit.onclick=()=>{save();location.href='guide.html'};document.body.appendChild(exit);addEventListener('keydown',event=>{if(event.key==='Escape'&&!event.defaultPrevented&&!document.querySelector('dialog[open]')){event.preventDefault();exit.click();}});}
  const pageExit=document.querySelector('.page-exit');
  const pageExitHost=document.querySelector('main.wrap > section');
  if(pageExit && pageExitHost){
    pageExitHost.classList.add('page-exit-host');
    pageExitHost.appendChild(pageExit);
  }
  const pageExitStyle=document.createElement('style');
  pageExitStyle.textContent='.page-exit{position:absolute!important;top:20px!important;right:20px!important;left:auto!important;z-index:2;display:grid;place-items:center;width:48px;height:48px;margin:0!important}.page-exit-host{position:relative}.page-exit:hover{transform:scale(1.05)}@media(max-width:700px){.page-exit{width:42px;height:42px;top:14px!important;right:14px!important}}';
  document.head.appendChild(pageExitStyle);
  const quickPlayPages=[...guideSections];
  const quickPlayActive=new URLSearchParams(location.search).get('quickplay')==='1'&&guideSections.has(page);
  if(quickPlayActive){
    document.body.classList.add('quick-play-active');
    const position=quickPlayPages.indexOf(page),withMode=href=>`${href}?quickplay=1`;
    document.querySelectorAll('a[href]').forEach(link=>{const target=(link.getAttribute('href')||'').split('?')[0].toLowerCase();if(guideSections.has(target))link.href=withMode(target)});
    const previous=withMode(quickPlayPages[(position-1+quickPlayPages.length)%quickPlayPages.length]),next=withMode(quickPlayPages[(position+1)%quickPlayPages.length]);
    const bar=document.createElement('nav');bar.className='quick-play-nav';bar.setAttribute('aria-label','Quick Play navigation');bar.innerHTML=`<a href="${previous}" aria-label="Previous Quick Play page">←</a><span><b>Quick Play</b><small>${position+1} / ${quickPlayPages.length}</small></span><a href="${next}" aria-label="Next Quick Play page">→</a>`;document.body.appendChild(bar);
    const quickStyle=document.createElement('style');quickStyle.textContent='.quick-play-nav{position:fixed;z-index:9997;left:50%;bottom:16px;transform:translateX(-50%);display:flex;align-items:center;gap:8px;padding:7px;border:1px solid #ff9800;border-radius:999px;background:rgba(8,18,35,.96);box-shadow:0 12px 35px rgba(0,0,0,.5);backdrop-filter:blur(10px)}.quick-play-nav a{display:grid;place-items:center;width:42px;height:42px;border:1px solid #426481;border-radius:50%;background:#172a46;color:#fff;text-decoration:none;font-size:24px;font-weight:1000}.quick-play-nav a:hover{border-color:#ff9800;color:#ffd54a}.quick-play-nav span{display:grid;min-width:92px;text-align:center;color:#ffd54a;line-height:1.05}.quick-play-nav small{margin-top:3px;color:#9fc6e8}.quick-play-active .floating-back{bottom:82px}@media(max-width:620px){.quick-play-nav{bottom:10px}.quick-play-nav span{min-width:78px}.quick-play-active .floating-back{bottom:72px}}';document.head.appendChild(quickStyle);
    document.querySelector('.page-exit')?.addEventListener('click',event=>{event.stopImmediatePropagation();location.href='index.html'},true);
    addEventListener('keydown',event=>{if(event.key==='ArrowLeft')location.href=previous;if(event.key==='ArrowRight')location.href=next});
  }else if(guideSections.has(page)){
    const position=quickPlayPages.indexOf(page);
    const previous=quickPlayPages[(position-1+quickPlayPages.length)%quickPlayPages.length];
    const next=quickPlayPages[(position+1)%quickPlayPages.length];
    addEventListener('keydown',event=>{
      if(event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
      const target=event.target;
      if(target instanceof Element&&target.closest('input,textarea,select,[contenteditable="true"],dialog[open]'))return;
      if(event.key==='ArrowLeft'){event.preventDefault();location.href=previous;}
      if(event.key==='ArrowRight'){event.preventDefault();location.href=next;}
    });
  }
  const feedback=document.createElement('dialog');feedback.className='feedback-dialog';feedback.innerHTML='<div class="feedback-head"><h2>Suggest an improvement</h2><button type="button" class="feedback-close" aria-label="Close">×</button></div><form class="feedback-form"><p class="feedback-note">Found a mistake, missing image or useful addition? Send the exact page and details to the guide maintainer.</p><label>Your name / IGN<input name="reporter" required maxlength="80" placeholder="So the maintainer knows who sent it"></label><label>Type<select name="type"><option>Correction</option><option>Missing image or details</option><option>New content</option><option>Design / usability</option></select></label><label>Page or entry<input name="subject" required maxlength="160" placeholder="Example: NPC Jade, Snowfield Giant quest..."></label><label>What should be changed?<textarea name="details" required maxlength="5000" placeholder="Explain what is wrong and what the correct information should be."></textarea></label><label>Screenshot (optional)<input class="feedback-file" type="file" name="screenshot" accept="image/png,image/jpeg,image/webp"><span class="feedback-file-help">PNG, JPG or WebP • maximum 8 MB</span></label><div class="feedback-file-preview" hidden><img alt="Screenshot preview"><button type="button" aria-label="Remove screenshot">Remove</button></div><label class="feedback-honeypot" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label><input type="hidden" name="page"><input type="hidden" name="form_started_at"><button class="feedback-submit" type="submit">Send suggestion</button><div class="feedback-message" role="status"></div></form>';document.body.appendChild(feedback);
  document.querySelector('.feedback-open')?.addEventListener('click',()=>{feedback.querySelector('[name="page"]').value=location.href;feedback.querySelector('[name="form_started_at"]').value=String(Date.now());feedback.querySelector('.feedback-message').textContent='';feedback.showModal()});feedback.querySelector('.feedback-close').onclick=()=>feedback.close();feedback.addEventListener('click',e=>{if(e.target===feedback)feedback.close()});
  let communityClient=null;
  const loadScript=src=>new Promise((resolve,reject)=>{const old=[...document.scripts].find(s=>s.src===new URL(src,location.href).href);if(old){old.addEventListener('load',resolve,{once:true});if(src.includes('supabase-config')&&window.KAIOKEN_DATABASE_CONFIG)resolve();else if(src.includes('supabase-js')&&window.supabase)resolve();return}const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
  const visitorSeed=()=>{const key='kaioken_anonymous_visitor_v1';let value=localStorage.getItem(key);if(!value){value=crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;localStorage.setItem(key,value)}return value};
  const visitorHash=async()=>{const bytes=new TextEncoder().encode(visitorSeed());const digest=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('')};
  async function connectCommunity(){try{if(!window.KAIOKEN_DATABASE_CONFIG)await loadScript('supabase-config.js');if(!window.supabase)await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');const c=window.KAIOKEN_DATABASE_CONFIG;if(!c?.supabaseUrl)return;communityClient=window.supabase.createClient(c.supabaseUrl,c.supabasePublishableKey);const key=await visitorHash();communityClient.rpc('guide_record_visit',{p_visitor:key,p_path:location.pathname}).then(({error})=>{if(error)console.warn('Anonymous visit could not be recorded',error)});const channel=communityClient.channel('kaioken-guide-viewers',{config:{presence:{key}}});channel.on('presence',{event:'sync'},()=>{const count=Object.keys(channel.presenceState()).length;document.querySelectorAll('[data-live-count]').forEach(el=>el.textContent=String(Math.max(1,count)))}).subscribe(async status=>{if(status==='SUBSCRIBED')await channel.track({page:location.pathname,online_at:new Date().toISOString()})});}catch(e){console.warn('Community realtime unavailable',e)}}
  connectCommunity();
  const fileInput=feedback.querySelector('.feedback-file'),filePreview=feedback.querySelector('.feedback-file-preview'),previewImage=filePreview.querySelector('img');
  const clearFile=()=>{fileInput.value='';previewImage.removeAttribute('src');filePreview.hidden=true};
  fileInput.addEventListener('change',()=>{const file=fileInput.files?.[0];if(!file)return clearFile();if(file.size>8*1024*1024){clearFile();feedback.querySelector('.feedback-message').textContent='The screenshot must be smaller than 8 MB.';return}previewImage.src=URL.createObjectURL(file);filePreview.hidden=false});
  filePreview.querySelector('button').onclick=clearFile;
  const fileToDataUrl=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});
  const savePreviewSuggestion=async(record,file)=>{const payload={...record,id:crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`,created_at:new Date().toISOString(),screenshot:file?{name:file.name,type:file.type,data:await fileToDataUrl(file)}:null};await new Promise((resolve,reject)=>{const request=indexedDB.open('kaioken-private-feedback-preview',1);request.onupgradeneeded=()=>request.result.createObjectStore('suggestions',{keyPath:'id'});request.onerror=()=>reject(request.error);request.onsuccess=()=>{const tx=request.result.transaction('suggestions','readwrite');tx.objectStore('suggestions').put(payload);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)}})};
  feedback.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,message=form.querySelector('.feedback-message'),submit=form.querySelector('.feedback-submit'),formData=new FormData(form),file=fileInput.files?.[0]||null,data={reporter:formData.get('reporter'),type:formData.get('type'),subject:formData.get('subject'),details:formData.get('details'),page:formData.get('page')};message.textContent='Sending…';submit.disabled=true;let sent=false,endpointConfigured=false;try{if(!window.KAIOKEN_DATABASE_CONFIG)await loadScript('supabase-config.js');const endpoint=window.KAIOKEN_DATABASE_CONFIG?.feedbackEndpoint;endpointConfigured=Boolean(endpoint);if(endpoint){const result=await fetch(endpoint,{method:'POST',body:formData});const payload=await result.json().catch(()=>({}));if(!result.ok)throw new Error(payload.error||`HTTP ${result.status}`);sent=true;message.textContent=`Thank you — suggestion #${payload.reference||''} was sent privately.`}else if(communityClient&&!file){const result=await communityClient.from('guide_feedback').insert({feedback_type:data.type,subject:data.subject,details:data.details,page_url:data.page,status:'new'});if(!result.error)sent=true}}catch(error){message.textContent=endpointConfigured?(error?.message||'The suggestion could not be sent. Please try again.'):'Unable to connect to the private inbox.'}finally{submit.disabled=false}if(sent){form.reset();clearFile()}else if(!endpointConfigured){await savePreviewSuggestion(data,file);message.textContent='Saved privately in this Preview until the maintainer inbox is available.'} });
})();


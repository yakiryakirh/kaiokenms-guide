(() => {
  'use strict';
  const key = `kaioken-scroll:${location.pathname}${location.search}${location.hash}`;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const save = () => { try { sessionStorage.setItem(key, JSON.stringify({ x: scrollX, y: scrollY })); } catch (_) {} };
  const restore = () => {
    let pos; try { pos = JSON.parse(sessionStorage.getItem(key) || 'null'); } catch (_) {}
    if (pos && Number.isFinite(pos.y)) requestAnimationFrame(() => requestAnimationFrame(() => scrollTo(pos.x || 0, pos.y)));
  };
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (link && !link.hasAttribute('download') && link.target !== '_blank') save();
  }, true);
  addEventListener('pagehide', save); addEventListener('beforeunload', save);
  addEventListener('pageshow', restore); addEventListener('popstate', restore);
  const links = document.querySelector('.site-nav .nav-links, nav .nav-links');
  if (links && !links.querySelector('[data-site-back]')) {
    const back = document.createElement('button');
    back.type = 'button'; back.dataset.siteBack = ''; back.className = 'nav-back-link'; back.textContent = '↩ Back';
    back.title = 'Return to the exact place you left';
    back.addEventListener('click', () => { save(); if (history.length > 1) history.back(); else location.href = 'guide.html'; });
    links.prepend(back);
  }
  const style = document.createElement('style'); style.id = 'kaioken-navigation-style';
  style.textContent = '.nav-back-link{appearance:none;border:1px solid #355784;background:linear-gradient(145deg,#172a4a,#0d182d);color:#fff;border-radius:999px;padding:8px 12px;font:inherit;font-weight:900;cursor:pointer}.nav-back-link:hover{border-color:#ff9f1a;color:#ffd54a}';
  document.head.appendChild(style);
})();


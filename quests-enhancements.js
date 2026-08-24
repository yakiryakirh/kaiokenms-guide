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
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  document.querySelectorAll('.quest').forEach(card => {
    card.classList.add('quest-clickable'); card.tabIndex = 0; card.setAttribute('role', 'button');
    const name = () => card.querySelector('.qtitle,h2,h3,.quest-title')?.textContent?.trim() || 'Quest Details';
    card.setAttribute('aria-label', `Open quest details: ${name()}`);
    const open = event => {
      if (event?.target?.closest('a,button,input,select,textarea,label')) return;
      const clone = card.cloneNode(true); clone.classList.remove('quest-clickable', 'hidden-by-completed', 'continue-highlight'); clone.removeAttribute('role'); clone.removeAttribute('tabindex');
      clone.querySelectorAll('input,button').forEach(el => el.remove()); modalTitle.textContent = name(); modalBody.replaceChildren(clone); dialog.showModal();
    };
    card.addEventListener('click', open);
    card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(event); } });
  });
  const style = document.createElement('style'); style.textContent = `
    .quest-panel-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;border:0;background:transparent;color:inherit;padding:0;text-align:left;font:inherit;font-weight:900;cursor:pointer}.quest-panel-arrow{font-size:1.35rem;color:#ffd54a;transition:transform .18s}.quest-panel-toggle[aria-expanded="true"] .quest-panel-arrow{transform:rotate(180deg)}.quest-panel-collapsible-body{margin-top:14px}.quest-panel-collapsible-body[hidden]{display:none}
    .quest-clickable{cursor:pointer;transition:transform .15s,border-color .15s}.quest-clickable:hover,.quest-clickable:focus-visible{transform:translateY(-1px);border-color:#ff9800;outline:2px solid transparent}.quest-card-dialog{width:min(920px,calc(100% - 24px));max-height:90vh;padding:0;border:1px solid #ff9800;border-radius:18px;background:#111c2d;color:#edf5ff;box-shadow:0 30px 90px #000}.quest-card-dialog::backdrop{background:rgba(2,8,18,.78)}.quest-card-modal-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:#172a42;border-bottom:1px solid #ff9800}.quest-card-modal-head h2{margin:0;color:#ffd54a}.quest-card-modal-head button{border:0;background:transparent;color:#fff;font-size:30px;cursor:pointer}.quest-card-modal-body{padding:18px}.quest-card-modal-body .quest{display:block!important;margin:0!important}
  `; document.head.appendChild(style);
})();


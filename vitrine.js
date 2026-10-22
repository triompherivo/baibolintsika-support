(() => {
  'use strict';
  const header = document.querySelector('.site-header');
  const menu = document.querySelector('.menu-toggle');
  const closeMenu = () => { menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Ouvrir le menu'); header.classList.remove('menu-open'); };
  menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu'); header.classList.toggle('menu-open', open); });
  document.querySelectorAll('.nav a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  const picker = document.querySelector('.download-picker');
  const pickerButtons = [...document.querySelectorAll('.picker-button')];
  const panels = [...document.querySelectorAll('[data-panel]')];
  const activate = product => {
    pickerButtons.forEach(button => { const active = button.dataset.product === product; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
    panels.forEach(panel => { panel.hidden = panel.dataset.panel !== product; });
  };
  picker.addEventListener('click', e => { const button = e.target.closest('[data-product]'); if (button) activate(button.dataset.product); });
  activate('app');
  document.querySelectorAll('.product .store-button, .browser-stores a').forEach(a => a.addEventListener('click', () => { const section = a.closest('.product'); activate(section.id === 'verse' ? 'verse' : section.id === 'yachad' ? 'yachad' : 'app'); }));
  const dialog = document.querySelector('#image-dialog');
  const dialogImage = document.querySelector('#dialog-image');
  const caption = document.querySelector('#dialog-caption');
  let imageTrigger;
  const closeDialog = () => { if (dialog.open) dialog.close(); };
  document.querySelectorAll('[data-zoom]').forEach(button => button.addEventListener('click', () => { imageTrigger = button; dialogImage.src = button.dataset.zoom; dialogImage.alt = button.querySelector('img').alt; caption.textContent = button.dataset.caption; dialog.showModal(); }));
  document.querySelector('.dialog-close').addEventListener('click', closeDialog);
  dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeDialog(); } });
  dialog.addEventListener('close', () => { if (imageTrigger) imageTrigger.focus({preventScroll:true}); });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } }), {threshold:0.08});
    document.querySelectorAll('.product').forEach(section => observer.observe(section));
  }
})();

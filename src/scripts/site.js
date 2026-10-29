const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];

const header=$('[data-header]');
const updateHeader=()=>header?.classList.toggle('scrolled',window.scrollY>18);
updateHeader(); window.addEventListener('scroll',updateHeader,{passive:true});

const menuButton=$('[data-menu-toggle]'); const mobileNav=$('[data-mobile-nav]');
const closeMenu=()=>{menuButton?.setAttribute('aria-expanded','false');mobileNav?.classList.remove('open');};
menuButton?.addEventListener('click',()=>{const open=menuButton.getAttribute('aria-expanded')!=='true';menuButton.setAttribute('aria-expanded',String(open));mobileNav?.classList.toggle('open',open);});
mobileNav?.querySelectorAll('a').forEach((link)=>link.addEventListener('click',closeMenu));
document.addEventListener('keydown',(event)=>{if(event.key==='Escape')closeMenu();});

$$('[data-language-select]').forEach((select)=>select.addEventListener('change',()=>{
  const language=select.value; try{localStorage.setItem('gallivantsoft-language',language);}catch{}
  const privacy=location.pathname.includes('/privacy'); const suffix=privacy?'privacy/':''; const hash=privacy?'':location.hash;
  location.assign(`/${language}/${suffix}${hash}`);
}));

if(document.body.dataset.rootEntry==='true'){
  let preferred=''; try{preferred=localStorage.getItem('gallivantsoft-language')||'';}catch{}
  const browser=(navigator.languages?.[0]||navigator.language||'').toLowerCase();
  const detected=preferred|| (browser.startsWith('zh')?'zh':browser.startsWith('ms')?'ms':'en');
  if(detected!=='en' && ['zh','ms'].includes(detected)) location.replace(`/${detected}/${location.hash}`);
}

$$('[data-service-toggle]').forEach((button)=>button.addEventListener('click',()=>{
  const detail=button.parentElement?.querySelector('[data-service-detail]'); if(!detail)return;
  const open=button.getAttribute('aria-expanded')!=='true'; button.setAttribute('aria-expanded',String(open)); detail.hidden=!open;
  const label=button.querySelector('span'); if(label)label.textContent=open?label.dataset.less:label.dataset.more;
  const icon=button.querySelector('i'); if(icon)icon.textContent=open?'−':'＋';
}));

$$('.faq-list details').forEach((detail)=>detail.addEventListener('toggle',()=>{if(detail.open)$$('.faq-list details').forEach((other)=>{if(other!==detail)other.open=false;});}));

const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!reduceMotion && 'IntersectionObserver' in window){const observer=new IntersectionObserver((entries)=>entries.forEach((entry)=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}}),{threshold:.12,rootMargin:'0px 0px -30px'});$$('.reveal').forEach((node)=>observer.observe(node));}else{$$('.reveal').forEach((node)=>node.classList.add('visible'));}

const backTop=$('[data-back-top]'); window.addEventListener('scroll',()=>backTop?.classList.toggle('show',window.scrollY>700),{passive:true}); backTop?.addEventListener('click',()=>scrollTo({top:0,behavior:reduceMotion?'auto':'smooth'}));
const year=$('[data-year]'); if(year)year.textContent=String(new Date().getFullYear());

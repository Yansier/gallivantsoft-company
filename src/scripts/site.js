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
  const segments=location.pathname.split('/').filter(Boolean); const supported=['en','zh','ms'];
  if(supported.includes(segments[0]))segments[0]=language;else segments.unshift(language);
  const target=`/${segments.join('/')}/`;
  location.assign(`${target}${location.hash}`);
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

const projectForm=$('[data-project-form]');
if(projectForm){
  const output=$('[data-enquiry-output]',projectForm); const outputText=$('[data-enquiry-text]',projectForm); const status=$('[data-form-status]',projectForm);
  const labels=$('[data-message-labels]',projectForm)?.dataset||{};
  const clearErrors=()=>{$$('[data-error-for]',projectForm).forEach((error)=>error.classList.remove('show')); $$('[aria-invalid=true]',projectForm).forEach((field)=>field.removeAttribute('aria-invalid'));};
  const prepareEnquiry=()=>{
  const form=new FormData(projectForm); const projectType=String(form.get('projectType')||'').trim(); const description=String(form.get('description')||'').trim();
  clearErrors();
  const invalid=[];
  if(!projectType)invalid.push('projectType'); if(description.length<20)invalid.push('description');
  invalid.forEach((name)=>{const field=projectForm.elements.namedItem(name);field?.setAttribute('aria-invalid','true');$(`[data-error-for="${name}"]`,projectForm)?.classList.add('show');});
  if(invalid.length){projectForm.elements.namedItem(invalid[0])?.focus();return null;}
  const lines=[projectForm.dataset.messageTitle||'GallivantSoft project enquiry','',`${labels.projectType}: ${projectType}`,`${labels.description}: ${description}`];
  [['budget',labels.budget],['timeline',labels.timeline],['name',labels.name]].forEach(([name,label])=>{const value=String(form.get(name)||'').trim();if(value)lines.push(`${label}: ${value}`);});
  const body=lines.join('\n'); if(outputText)outputText.value=body; if(output)output.hidden=false; return body;
  };
  const setStatus=(message)=>{if(status)status.textContent=message||'';};
  const copyEnquiry=async()=>{const body=prepareEnquiry();if(!body)return;try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(body);setStatus(labels.copied);}catch{outputText?.focus();outputText?.select();setStatus(labels.copyManual);}};
  projectForm.addEventListener('submit',(event)=>{event.preventDefault();const body=prepareEnquiry();if(!body)return;const subject=projectForm.dataset.messageTitle||'GallivantSoft - New Project Enquiry';const url=`mailto:${projectForm.dataset.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;const limit=Number(projectForm.dataset.mailtoLimit)||1800;if(url.length>limit){outputText?.focus();setStatus(labels.mailtoLong);return;}setStatus(labels.mailOpened);window.location.href=url;});
  $('[data-copy-enquiry]',projectForm)?.addEventListener('click',copyEnquiry);
}

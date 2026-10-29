import { createTwinStore } from './state.js';

const root=document.querySelector('[data-digital-twin]');
if(root){
  const copy=JSON.parse(document.querySelector('[data-twin-copy]').textContent);const store=createTwinStore();let launched=false;
  const $=(name)=>root.querySelector(`[data-twin-${name}]`);const buttons={create:$('create'),start:$('start'),next:$('next'),pause:$('pause'),reset:$('reset')};
  const zoneForStage=(stage)=>stage<=0?'storage':stage<=2?'processing':'dispatch';
  const messageFor=(state)=>{const key=state.events[0]||'ready';if(key==='moving')return `${copy.messages.moving} ${copy.zoneNames[zoneForStage(state.targetStage)]}.`;if(key==='arrived')return `${copy.messages.arrived} ${copy.zoneNames[zoneForStage(state.stage)]}.`;return copy.messages[key]||copy.messages.ready;};
  const render=(state)=>{
    $('order').textContent=state.orderId;$('stage').textContent=copy.stages[state.stage+1];$('status').textContent=copy.statuses[state.status];$('throughput').textContent=state.orders?`${state.stage===3?'1':'0'} / 1`:'0 / 0';$('cycle').textContent=state.startedAt&&state.status!=='idle'?`${Math.max(1,Math.round((Date.now()-state.startedAt)/1000))}s`:'—';$('activity').textContent=messageFor(state);
    buttons.create.disabled=!['idle','complete'].includes(state.status);buttons.start.disabled=state.status!=='created';buttons.next.disabled=state.status!=='running'||state.stage>=3;buttons.pause.disabled=!['moving','paused'].includes(state.status);buttons.pause.textContent=state.paused?copy.resume:copy.pause;buttons.reset.disabled=state.status==='idle';
    root.querySelectorAll('[data-twin-zone]').forEach((button)=>{const selected=button.dataset.twinZone===state.selectedZone;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});$('zone-name').textContent=copy.zoneNames[state.selectedZone];$('zone-text').textContent=copy.zoneText[state.selectedZone];
  };
  store.subscribe(render);buttons.create.addEventListener('click',()=>store.createOrder());buttons.start.addEventListener('click',()=>store.start());buttons.next.addEventListener('click',()=>store.next());buttons.pause.addEventListener('click',()=>store.togglePause());buttons.reset.addEventListener('click',()=>store.reset());root.querySelectorAll('[data-twin-zone]').forEach((button)=>button.addEventListener('click',()=>store.selectZone(button.dataset.twinZone)));
  $('launch').addEventListener('click',async()=>{if(launched)return;launched=true;$('launch').disabled=true;$('launch').textContent=copy.loading;const lowPerformance=innerWidth<=760||(navigator.deviceMemory&&navigator.deviceMemory<=4);$('mode').textContent=lowPerformance?copy.lowMode:copy.fullMode;try{const {createTwinScene}=await import('./scene.js');const scene=await createTwinScene({canvas:$('canvas'),store,lowPerformance,onFallback:()=>{root.classList.add('twin-fallback');$('fallback').hidden=false;}});if(scene)root.classList.add('twin-launched');else root.classList.add('twin-launched');}catch{root.classList.add('twin-launched','twin-fallback');$('fallback').hidden=false;}});
}

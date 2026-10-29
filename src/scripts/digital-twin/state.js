const initialState=()=>({status:'idle',stage:-1,targetStage:null,paused:false,orderId:'—',selectedZone:'storage',events:['ready'],orders:0,startedAt:0});

export function createTwinStore(){
  let state=initialState(); const subscribers=new Set();
  const emit=()=>subscribers.forEach((listener)=>listener(state));
  const update=(patch)=>{state={...state,...patch};emit();};
  return {
    getState:()=>state,
    subscribe(listener){subscribers.add(listener);listener(state);return()=>subscribers.delete(listener);},
    selectZone(zone){update({selectedZone:zone});},
    createOrder(){if(!['idle','complete'].includes(state.status))return;const id=`GS-${String(Date.now()).slice(-5)}`;update({...initialState(),status:'created',orderId:id,orders:1,events:['created'],startedAt:Date.now()});},
    start(){if(state.status!=='created')return;update({status:'moving',targetStage:0,events:['moving',...state.events]});},
    next(){if(state.status!=='running'||state.stage>=3)return;update({status:'moving',targetStage:state.stage+1,events:['moving',...state.events]});},
    togglePause(){if(!['moving','paused'].includes(state.status))return;const paused=!state.paused;update({paused,status:paused?'paused':'moving',events:[paused?'paused':'resumed',...state.events]});},
    completeTransition(stage){if(state.targetStage!==stage||state.status!=='moving')return;const complete=stage===3;update({stage,targetStage:null,paused:false,status:complete?'complete':'running',events:[complete?'complete':'arrived',...state.events]});},
    reset(){state=initialState();state.events=['reset'];emit();}
  };
}

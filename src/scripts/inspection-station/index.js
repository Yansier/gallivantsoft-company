const root=document.querySelector('[data-inspection-viewer]');

if(root&&root.dataset.viewerBound!=='true'){
  root.dataset.viewerBound='true';
  const launch=root.querySelector('[data-viewer-launch]');
  const loading=root.querySelector('[data-viewer-loading]');
  const progress=root.querySelector('[data-viewer-progress]');
  const fallback=root.querySelector('[data-viewer-fallback]');
  const fallbackTitle=root.querySelector('[data-viewer-fallback-title]');
  const fallbackText=root.querySelector('[data-viewer-fallback-text]');
  const controls=root.querySelector('[data-viewer-controls]');
  const structureStatus=root.querySelector('[data-components-status]');
  const activity=root.querySelector('[data-viewer-activity]');
  const stateLabel=root.querySelector('[data-assembly-state]');
  const selectedName=root.querySelector('[data-selected-name]');
  const selectedIntro=root.querySelector('[data-selected-intro]');
  const selectedDetails=root.querySelector('[data-selected-details]');
  const selectedSystem=root.querySelector('[data-selected-system]');
  const selectedFunction=root.querySelector('[data-selected-function]');
  const selectedConstruction=root.querySelector('[data-selected-construction]');
  const copyNode=document.querySelector('[data-viewer-copy]');
  const copy=copyNode?JSON.parse(copyNode.textContent||'{}'):{};
  const expectedComponents=[...root.querySelectorAll('[data-component-name]')].map((node)=>node.dataset.componentName);
  const selectionButtons=[...root.querySelectorAll('[data-select-component]')];
  const actionButtons=Object.fromEntries([...root.querySelectorAll('[data-action]')].map((button)=>[button.dataset.action,button]));
  let viewer=null;let launching=false;

  const supportsWebGL=()=>{
    try{
      const probe=document.createElement('canvas');
      return Boolean(window.WebGL2RenderingContext&&probe.getContext('webgl2',{failIfMajorPerformanceCaveat:true})||probe.getContext('webgl'));
    }catch{return false;}
  };

  const showFallback=(error)=>{
    console.warn('Inspection Station viewer unavailable',error);
    loading.hidden=true;fallback.hidden=false;
    if(fallbackTitle)fallbackTitle.textContent=copy.fallbackTitle||fallbackTitle.textContent;
    if(fallbackText)fallbackText.textContent=copy.fallbackText||fallbackText.textContent;
    launch.disabled=false;launching=false;
  };

  const updateStructure=(structure)=>{
    const missing=structure?.missing||expectedComponents;
    root.querySelectorAll('[data-component-name]').forEach((node)=>node.classList.toggle('missing',missing.includes(node.dataset.componentName)));
    if(structureStatus)structureStatus.textContent=missing.length
      ?`${copy.structureMissing||'Missing components'}: ${missing.join(', ')}`
      :copy.structureReady||'All model components verified.';
    structureStatus?.classList.toggle('verified',missing.length===0);
  };

  const renderState=(state)=>{
    if(!state)return;
    const detail=state.selectedKey?copy.componentDetails?.[state.selectedKey]:null;
    if(stateLabel)stateLabel.textContent=copy.states?.[state.displayState]||state.displayState;
    if(activity)activity.textContent=copy.messages?.[state.message]||copy.messages?.ready||'';
    if(selectedName)selectedName.textContent=detail?.name||copy.noSelectionTitle||'Select a component';
    if(selectedIntro)selectedIntro.textContent=detail?detail.function:copy.noSelectionText||'';
    if(selectedDetails)selectedDetails.hidden=!detail;
    if(selectedSystem)selectedSystem.textContent=detail?.system||'';
    if(selectedFunction)selectedFunction.textContent=detail?.function||'';
    if(selectedConstruction)selectedConstruction.textContent=detail?.construction||'';
    selectionButtons.forEach((button)=>button.setAttribute('aria-pressed',String(button.dataset.selectComponent===state.selectedKey)));

    const animating=state.assembly==='exploding'||state.assembly==='assembling';
    const hasSelection=Boolean(state.selectedKey);
    actionButtons.focus.disabled=!hasSelection||animating;
    actionButtons.isolate.disabled=!hasSelection||animating||state.isolated;
    actionButtons['show-full'].disabled=!state.isolated;
    actionButtons['clear-selection'].disabled=!hasSelection;
    actionButtons.explode.disabled=state.assembly==='exploded'||state.assembly==='exploding';
    actionButtons.reassemble.disabled=state.assembly==='assembled'||state.assembly==='assembling';
    actionButtons['reset-all'].disabled=false;
  };

  selectionButtons.forEach((button)=>button.addEventListener('click',()=>viewer?.selectComponent(button.dataset.selectComponent)));
  actionButtons.focus?.addEventListener('click',()=>viewer?.focusSelected());
  actionButtons.isolate?.addEventListener('click',()=>viewer?.isolateSelected());
  actionButtons['show-full']?.addEventListener('click',()=>viewer?.showFull());
  actionButtons['clear-selection']?.addEventListener('click',()=>viewer?.clearSelection());
  actionButtons.explode?.addEventListener('click',()=>viewer?.explode());
  actionButtons.reassemble?.addEventListener('click',()=>viewer?.reassemble());
  actionButtons['reset-all']?.addEventListener('click',()=>viewer?.resetAll());

  const start=async()=>{
    if(launching||viewer)return;
    launching=true;launch.disabled=true;fallback.hidden=true;loading.hidden=false;
    if(progress)progress.textContent='0%';
    if(!supportsWebGL()){showFallback(new Error('WebGL is unavailable'));return;}
    try{
      const {createInspectionViewer}=await import('./viewer.js');
      viewer=await createInspectionViewer({
        root,
        canvas:root.querySelector('[data-viewer-canvas]'),
        stage:root.querySelector('[data-viewer-stage]'),
        modelUrl:root.dataset.modelUrl,
        expectedComponents,
        copy,
        onProgress:(value)=>{if(progress)progress.textContent=`${Math.round(value*100)}%`;},
        onInteraction:renderState
      });
      updateStructure(viewer.structure);
      loading.hidden=true;controls.hidden=false;root.classList.add('viewer-ready');
      selectionButtons.forEach((button)=>{button.disabled=false;});
      renderState(viewer.getState());
    }catch(error){showFallback(error);}
    finally{launching=false;}
  };

  launch?.addEventListener('click',start);
  const dispose=()=>{viewer?.dispose();viewer=null;};
  window.addEventListener('pagehide',dispose,{once:true});
}

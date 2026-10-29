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
  const stateContext=root.querySelector('[data-experience-title]');
  const selectedName=root.querySelector('[data-selected-name]');
  const selectedIntro=root.querySelector('[data-selected-intro]');
  const selectedDetails=root.querySelector('[data-selected-details]');
  const selectedSystem=root.querySelector('[data-selected-system]');
  const selectedFunction=root.querySelector('[data-selected-function]');
  const selectedConstruction=root.querySelector('[data-selected-construction]');
  const assemblySlider=root.querySelector('[data-assembly-slider]');
  const assemblyPercent=root.querySelector('[data-assembly-percent]');
  const assemblyMode=root.querySelector('[data-assembly-mode]');
  const assemblyTools=root.querySelector('[data-assembly-tools]');
  const assemblyPanels=[...root.querySelectorAll('[data-assembly-panel]')];
  const operatingPanel=root.querySelector('[data-operating-panel]');
  const modeButtons=[...root.querySelectorAll('[data-experience-mode]')];
  const operationStatus=root.querySelector('[data-operation-status]');
  const operationStage=root.querySelector('[data-operation-stage]');
  const operationProgress=root.querySelector('[data-operation-progress]');
  const operationWorkpiece=root.querySelector('[data-operation-workpiece]');
  const operationResult=root.querySelector('[data-operation-result]');
  const operationActivity=root.querySelector('[data-operation-activity]');
  const operationMeter=root.querySelector('[data-operation-meter]');
  const operationProgressBar=root.querySelector('[data-operation-progressbar]');
  const operationLight=root.querySelector('[data-operation-light]');
  const operationButtons=Object.fromEntries([...root.querySelectorAll('[data-operation-action]')].map((button)=>[button.dataset.operationAction,button]));
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
    const operating=state.experienceMode==='operating';const preparing=state.pendingMode==='operating';
    if(stateLabel)stateLabel.textContent=operating?(copy.operation?.states?.[state.displayState]||state.displayState):(copy.states?.[state.displayState]||state.displayState);
    if(stateContext)stateContext.textContent=operating?(copy.operation?.operatingMode||'Operating Mode'):(copy.explorerTitle||'Assembly Explorer');
    if(activity)activity.textContent=copy.messages?.[state.message]||copy.messages?.ready||'';
    modeButtons.forEach((button)=>{const selected=(operating||preparing)?button.dataset.experienceMode==='operating':button.dataset.experienceMode==='assembly';button.setAttribute('aria-pressed',String(selected));button.disabled=preparing;});
    assemblyPanels.forEach((panel)=>{panel.hidden=operating;});
    if(operatingPanel)operatingPanel.hidden=!operating;
    if(selectedName)selectedName.textContent=detail?.name||copy.noSelectionTitle||'Select a component';
    if(selectedIntro)selectedIntro.textContent=detail?detail.function:copy.noSelectionText||'';
    if(selectedDetails)selectedDetails.hidden=!detail;
    if(selectedSystem)selectedSystem.textContent=detail?.system||'';
    if(selectedFunction)selectedFunction.textContent=detail?.function||'';
    if(selectedConstruction)selectedConstruction.textContent=detail?.construction||'';
    selectionButtons.forEach((button)=>button.setAttribute('aria-pressed',String(button.dataset.selectComponent===state.selectedKey)));

    const progressValue=Math.round((state.assemblyProgress||0)*100);
    const progressCopy=copy.assemblyControl||{};
    const progressState=progressValue<=0?progressCopy.assembled:progressValue>=100?progressCopy.exploded:progressCopy.partial;
    const modeCopy=state.assemblyMode==='auto'?progressCopy.automatic:['manual','scrubbing'].includes(state.assemblyMode)?progressCopy.manual:progressState;
    if(assemblySlider){
      assemblySlider.value=String(progressValue);
      assemblySlider.style.setProperty('--assembly-progress',`${progressValue}%`);
      assemblySlider.setAttribute('aria-valuetext',`${progressValue}% — ${progressState||state.displayState}`);
    }
    if(assemblyPercent)assemblyPercent.textContent=`${progressValue}%`;
    if(assemblyMode)assemblyMode.textContent=modeCopy||progressState||'';
    if(assemblyTools)assemblyTools.dataset.mode=state.assemblyMode;

    const animating=state.assemblyMode==='auto';
    const manipulating=animating||state.assemblyMode==='scrubbing';
    const hasSelection=Boolean(state.selectedKey);
    actionButtons.focus.disabled=operating||!hasSelection||manipulating;
    actionButtons.isolate.disabled=!hasSelection||manipulating||state.isolated;
    actionButtons['show-full'].disabled=!state.isolated;
    actionButtons['clear-selection'].disabled=!hasSelection;
    actionButtons.explode.disabled=progressValue>=100||state.assembly==='exploding';
    actionButtons.reassemble.disabled=progressValue<=0||state.assembly==='assembling';
    actionButtons['reset-all'].disabled=operating;
    assemblySlider.disabled=operating||preparing;

    if(operating){
      const operation=state.operation||{state:'OFF',stage:'OFF',progress:0};const operationCopy=copy.operation||{};
      if(operationStatus)operationStatus.textContent=operationCopy.states?.[operation.state]||operation.state;
      if(operationStage)operationStage.textContent=operationCopy.stages?.[operation.stage]||operation.stage;
      const operationPercent=Math.round((operation.progress||0)*100);
      if(operationProgress)operationProgress.textContent=`${operationPercent}%`;
      if(operationMeter)operationMeter.style.width=`${operationPercent}%`;
      if(operationProgressBar){operationProgressBar.setAttribute('aria-valuenow',String(operationPercent));operationProgressBar.setAttribute('aria-valuetext',`${operationPercent}% — ${operationCopy.stages?.[operation.stage]||operation.stage}`);}
      if(operationWorkpiece)operationWorkpiece.textContent=operation.workpiece||'—';
      if(operationResult)operationResult.textContent=operation.result?(operationCopy.results?.[operation.result]||operation.result):'—';
      if(operationActivity)operationActivity.textContent=operationCopy.messages?.[operation.message]||operationCopy.messages?.off||'';
      if(operationLight){operationLight.dataset.state=operation.state;operationLight.setAttribute('aria-label',operationCopy.states?.[operation.state]||operation.state);}
      if(operatingPanel)operatingPanel.dataset.state=operation.state;
      const running=['FEEDING','POSITIONING','SCANNING','EVALUATING','OUTPUTTING'].includes(operation.state);
      operationButtons['power-on'].disabled=operation.state!=='OFF';
      operationButtons.start.disabled=!['READY','COMPLETE'].includes(operation.state);
      operationButtons.pause.disabled=!running;operationButtons.pause.hidden=operation.state==='PAUSED';
      operationButtons.resume.disabled=operation.state!=='PAUSED';operationButtons.resume.hidden=operation.state!=='PAUSED';
      operationButtons.reset.disabled=operation.state==='OFF';
      operationButtons['power-off'].disabled=operation.state==='OFF';
    }
  };

  selectionButtons.forEach((button)=>button.addEventListener('click',()=>viewer?.selectComponent(button.dataset.selectComponent)));
  actionButtons.focus?.addEventListener('click',()=>viewer?.focusSelected());
  actionButtons.isolate?.addEventListener('click',()=>viewer?.isolateSelected());
  actionButtons['show-full']?.addEventListener('click',()=>viewer?.showFull());
  actionButtons['clear-selection']?.addEventListener('click',()=>viewer?.clearSelection());
  actionButtons.explode?.addEventListener('click',()=>viewer?.explode());
  actionButtons.reassemble?.addEventListener('click',()=>viewer?.reassemble());
  actionButtons['reset-all']?.addEventListener('click',()=>viewer?.resetAll());
  modeButtons.forEach((button)=>button.addEventListener('click',()=>viewer?.setExperienceMode(button.dataset.experienceMode)));
  operationButtons['power-on']?.addEventListener('click',()=>viewer?.powerOn());
  operationButtons.start?.addEventListener('click',()=>viewer?.startInspection());
  operationButtons.pause?.addEventListener('click',()=>viewer?.pauseOperation());
  operationButtons.resume?.addEventListener('click',()=>viewer?.resumeOperation());
  operationButtons.reset?.addEventListener('click',()=>viewer?.resetOperation());
  operationButtons['power-off']?.addEventListener('click',()=>viewer?.powerOff());

  let sliderActive=false;
  const beginSliderControl=()=>{
    if(!viewer||assemblySlider?.disabled||sliderActive)return;
    sliderActive=true;viewer.beginAssemblyScrub();
  };
  const updateSliderControl=()=>{
    if(!viewer||!assemblySlider)return;
    const requestedProgress=Number(assemblySlider.value)/100;
    beginSliderControl();
    viewer.setAssemblyProgress(requestedProgress);
  };
  const endSliderControl=()=>{
    if(!viewer||!sliderActive)return;
    sliderActive=false;viewer.endAssemblyScrub();
  };
  assemblySlider?.addEventListener('pointerdown',beginSliderControl);
  assemblySlider?.addEventListener('input',updateSliderControl);
  assemblySlider?.addEventListener('change',endSliderControl);
  assemblySlider?.addEventListener('pointercancel',endSliderControl);
  assemblySlider?.addEventListener('blur',endSliderControl);

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
      if(new URLSearchParams(location.search).has('inspectionQa'))root.inspectionQa=viewer;
      loading.hidden=true;controls.hidden=false;root.classList.add('viewer-ready');
      selectionButtons.forEach((button)=>{button.disabled=false;});
      if(assemblySlider)assemblySlider.disabled=false;
      renderState(viewer.getState());
    }catch(error){showFallback(error);}
    finally{launching=false;}
  };

  launch?.addEventListener('click',start);
  const dispose=()=>{delete root.inspectionQa;viewer?.dispose();viewer=null;};
  window.addEventListener('pagehide',dispose,{once:true});
}

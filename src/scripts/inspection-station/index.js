const root=document.querySelector('[data-inspection-viewer]');

if(root && root.dataset.viewerBound!=='true'){
  root.dataset.viewerBound='true';
  const launch=root.querySelector('[data-viewer-launch]');
  const loading=root.querySelector('[data-viewer-loading]');
  const progress=root.querySelector('[data-viewer-progress]');
  const fallback=root.querySelector('[data-viewer-fallback]');
  const fallbackTitle=root.querySelector('[data-viewer-fallback-title]');
  const fallbackText=root.querySelector('[data-viewer-fallback-text]');
  const controls=root.querySelector('[data-viewer-controls]');
  const structureStatus=root.querySelector('[data-components-status]');
  const copyNode=document.querySelector('[data-viewer-copy]');
  const copy=copyNode?JSON.parse(copyNode.textContent||'{}'):{};
  const expectedComponents=[...root.querySelectorAll('[data-component-name]')].map((node)=>node.dataset.componentName);
  let viewer=null;
  let launching=false;

  const supportsWebGL=()=>{
    try{
      const probe=document.createElement('canvas');
      return Boolean(window.WebGL2RenderingContext&&probe.getContext('webgl2',{failIfMajorPerformanceCaveat:true})||probe.getContext('webgl'));
    }catch{return false;}
  };

  const showFallback=(error)=>{
    console.error('Inspection Station viewer unavailable',error);
    loading.hidden=true;
    fallback.hidden=false;
    if(fallbackTitle)fallbackTitle.textContent=copy.fallbackTitle||fallbackTitle.textContent;
    if(fallbackText)fallbackText.textContent=copy.fallbackText||fallbackText.textContent;
    launch.disabled=false;
    launching=false;
  };

  const updateStructure=(structure)=>{
    const missing=structure?.missing||expectedComponents;
    root.querySelectorAll('[data-component-name]').forEach((node)=>{
      node.classList.toggle('missing',missing.includes(node.dataset.componentName));
    });
    if(structureStatus)structureStatus.textContent=missing.length
      ?`${copy.structureMissing||'Missing components'}: ${missing.join(', ')}`
      :copy.structureReady||'All model components verified.';
    structureStatus?.classList.toggle('verified',missing.length===0);
  };

  const start=async()=>{
    if(launching||viewer)return;
    launching=true;
    launch.disabled=true;
    fallback.hidden=true;
    loading.hidden=false;
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
        onProgress:(value)=>{if(progress)progress.textContent=`${Math.round(value*100)}%`;}
      });
      updateStructure(viewer.structure);
      loading.hidden=true;
      controls.hidden=false;
      root.classList.add('viewer-ready');
    }catch(error){showFallback(error);}
    finally{launching=false;}
  };

  launch?.addEventListener('click',start);
  const dispose=()=>{viewer?.dispose();viewer=null;};
  window.addEventListener('pagehide',dispose,{once:true});
}

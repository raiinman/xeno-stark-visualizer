// A replayable guide. It explains the live interface without changing the workspace.
export function createWalkthrough() {
  const $ = id => document.getElementById(id);
  const panel=$('walkthrough'), trigger=$('help-button');
  const steps=[
    {title:'Explore folders',copy:'The center is the folder you’re in. Folder icons have a tab and their names end with /. Click one to see what’s inside. Up one folder and Back to root take you back.',tip:'Colors are visual accents. The folder shape tells you what to open.',targets:['.graph-guide']},
    {title:'Read a file',copy:'The glowing shapes around the center, without folder tabs, are files. Click one to read it. Drag the window’s title bar, resize an edge, or use minus to park it in the bottom dock. Click its dock name to return.',tip:'If a label is hard to find, Files opens a list of the files in this view.',targets:['#files-button']},
    {title:'Travel through history',copy:'A commit is a saved version of the project. The slider under the graph chooses that version. Move left for older commits, or choose Latest to return to the newest available version.',tip:'The graph and file previews follow the selected commit. Each repository remembers where you left its history.',targets:['.timeline']},
    {title:'Search and keep exploring',copy:'Find a file filters the current folder. Page arrows reveal more items in large folders. Scroll below the graph, or use Explore, for repository choices, themes, and the full folder browser.',tip:'Your files, folder, page, view, and selected commit are remembered separately for each repository. You can replay this guide any time.',targets:['.search','.explore-button']}
  ];
  let index=0;
  function clearTargets(){document.querySelectorAll('.walkthrough-target').forEach(el=>el.classList.remove('walkthrough-target'));}
  function close(){panel.hidden=true;trigger.setAttribute('aria-expanded','false');clearTargets();trigger.focus({preventScroll:true});}
  function render(){
    const step=steps[index];clearTargets();
    panel.dataset.step=String(index+1);
    $('walkthrough-progress').textContent=`Step ${index+1} of ${steps.length}`;
    $('walkthrough-title').textContent=step.title;$('walkthrough-copy').textContent=step.copy;$('walkthrough-tip').textContent=step.tip;
    $('walkthrough-back').disabled=index===0;$('walkthrough-next').textContent=index===steps.length-1?'Done':'Next';
    for(const selector of step.targets)document.querySelector(selector)?.classList.add('walkthrough-target');
    $('walkthrough-title').focus({preventScroll:true});
  }
  trigger.onclick=()=>{if(!panel.hidden){close();return;}index=0;panel.hidden=false;trigger.setAttribute('aria-expanded','true');render();};
  $('walkthrough-close').onclick=close;
  $('walkthrough-back').onclick=()=>{if(index>0){index--;render();}};
  $('walkthrough-next').onclick=()=>{if(index===steps.length-1)close();else{index++;render();}};
  window.addEventListener('keydown',event=>{
    if(panel.hidden)return;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();}
    else if(panel.contains(event.target)&&['ArrowLeft','ArrowRight'].includes(event.key)){
      event.preventDefault();event.stopImmediatePropagation();
      (event.key==='ArrowLeft'?$('walkthrough-back'):$('walkthrough-next')).click();
    }
  },true);
}

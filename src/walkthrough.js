// A replayable guide. It explains the live interface without changing the workspace.
export function createWalkthrough() {
  const $ = id => document.getElementById(id);
  const panel=$('walkthrough'), trigger=$('help-button');
  const steps=[
    {title:'Explore folders',copy:'The center is the folder you’re in. Folder icons have a tab and their names end with /. Click one to see what’s inside. Up one folder and Back to root take you back.',tip:'Colors are visual accents. The folder shape tells you what to open.',targets:['.graph-guide']},
    {title:'Read a file',copy:'The glowing shapes around the center, without folder tabs, are files. Click one to read it. A Changed file opens its before-and-after code side by side. Drag the window’s title bar, resize an edge, or use minus to park it in the bottom dock. Click its dock name to return.',tip:'If a label is hard to find, Files opens a list of the files in this view.',targets:['#files-button']},
    {title:'Travel through history',copy:'A commit is a saved version of the project. The slider under the graph chooses that version. History plays from the oldest available commit and loops. Use Pause to explore, drag the slider to choose a version, or choose Latest.',tip:'The graph and file previews follow the selected commit. Added, Changed, and Removed markers explain each step. Select the counts under the timeline to pause and see all affected files. Opening a file also pauses playback.',targets:['.timeline']},
    {title:'Search and keep exploring',copy:'Find a file filters the current folder. Page arrows reveal more items in large folders. Scroll below the graph, or use Explore, for repository choices, themes, and the full folder browser.',tip:'Your files, folder, page, and view are remembered separately for each repository. You can replay this guide any time.',targets:['.search','.explore-button']}
  ];
  const storageKey='xeno-stark:walkthrough:v1';
  let index=0,firstVisit=false;
  const home=document.createComment('walkthrough home');panel.before(home);
  const dialog=document.createElement('dialog');dialog.className='first-visit-dialog';dialog.setAttribute('aria-labelledby','walkthrough-title');document.body.append(dialog);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  function remember(){try{localStorage.setItem(storageKey,'done');}catch{}}
  function open(blocking=false){index=0;firstVisit=blocking;panel.hidden=false;trigger.setAttribute('aria-expanded','true');if(blocking){dialog.append(panel);document.body.classList.add('first-visit-open');dialog.showModal();}render();}
  function clearTargets(){document.querySelectorAll('.walkthrough-target').forEach(el=>el.classList.remove('walkthrough-target'));}
  function close(){remember();panel.hidden=true;trigger.setAttribute('aria-expanded','false');clearTargets();if(firstVisit){firstVisit=false;dialog.close();home.after(panel);document.body.classList.remove('first-visit-open');window.dispatchEvent(new Event('walkthrough-dismissed'));}trigger.focus({preventScroll:true});}
  function render(){
    const step=steps[index];clearTargets();
    panel.dataset.step=String(index+1);
    $('walkthrough-progress').textContent=`Step ${index+1} of ${steps.length}`;
    $('walkthrough-title').textContent=step.title;$('walkthrough-copy').textContent=step.copy;$('walkthrough-tip').textContent=step.tip;
    $('walkthrough-back').disabled=index===0;$('walkthrough-next').textContent=index===steps.length-1?'Done':'Next';
    for(const selector of step.targets)document.querySelector(selector)?.classList.add('walkthrough-target');
    $('walkthrough-title').focus({preventScroll:true});
  }
  trigger.onclick=()=>{if(!panel.hidden){close();return;}open();};
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
  let seen=false;
  try{seen=localStorage.getItem(storageKey)==='done';}catch{}
  if(!seen)open(true);
}

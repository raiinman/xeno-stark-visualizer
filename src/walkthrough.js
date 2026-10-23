// A replayable guide. It explains the live interface without changing the workspace.
export function createWalkthrough() {
  const $ = id => document.getElementById(id);
  const panel=$('walkthrough'), trigger=$('help-button');
  const steps=[
    {title:'This bottom bar rebuilds Xeno Space',copy:'This is the repository timeline. Play advances through saved versions of the project, from oldest to newest, then loops. With each step, Xeno Space becomes that version: new file orbs appear, changed files are marked, removed ones fade, and folders rearrange.',tip:'The guide has paused playback. After closing it, use Play/Pause here whenever you want to watch the repository grow or stop to explore.',targets:['.timeline']},
    {title:'Choose a version and watch its changes',copy:'Drag the highlighted slider to travel to a specific saved version. The graph and any files you open show that version. Speed controls how fast history plays; Latest jumps to the newest available version.',tip:'The counts below the slider show added, changed, and removed files. Click them to pause and see exactly which files changed. This bar changes the whole Xeno Space, not just the text below it.',targets:['#history','#playback-speed','#changes-button']},
    {title:'This is your repository in Xeno Space',copy:'The center is your current folder. Tabbed folder icons open folders; the other glowing nodes open files. Lines show which folder each item belongs to. Your location is named above the graph.',tip:'Colors belong to the visual theme. Folder shapes and file names tell you what to open.',targets:['#graph','.graph-guide']},
    {title:'Open and compare files',copy:'Click a file node to read it in a holographic window. The Files button highlighted here gives you a list too. A Changed file opens old and new code side by side.',tip:'Move, resize, or minimize file windows. Next change jumps to edits; Show only changes hides unchanged code. Opening a file pauses history.',targets:['#files-button']},
    {title:'Find a file or explore another project',copy:'Search filters the current folder. Explore takes you below Xeno Space to repository selection, themes, layouts, and the full folder browser. You can also scroll down there.',tip:'Each repository remembers its workspace. How to use this replays this guide whenever you need a reminder of the timeline or controls.',targets:['.search','.explore-button']}
  ];
  const storageKey='xeno-stark:walkthrough:v1';
  let index=0,firstVisit=false;
  const home=document.createComment('walkthrough home');panel.before(home);
  const dialog=document.createElement('dialog');dialog.className='first-visit-dialog';dialog.setAttribute('aria-labelledby','walkthrough-title');document.body.append(dialog);
  const ns='http://www.w3.org/2000/svg';
  const spotlight=document.createElementNS(ns,'svg');spotlight.classList.add('walkthrough-spotlight');spotlight.setAttribute('aria-hidden','true');dialog.append(spotlight);
  function targetRects(){
    return steps[index].targets.map(selector=>{
      const el=document.querySelector(selector);if(!el)return null;
      const r=el.getBoundingClientRect();
      if(selector==='#graph')return {left:r.left+r.width*.22,top:r.top+Math.min(170,r.height*.4),right:r.right-r.width*.22,bottom:r.bottom-65};
      return {left:r.left-5,top:r.top-5,right:r.right+5,bottom:r.bottom+5};
    }).filter(r=>r&&r.right>r.left&&r.bottom>r.top);
  }
  function position(){
    if(panel.hidden)return;
    const w=innerWidth,h=innerHeight,margin=16,rects=targetRects();
    const width=panel.getBoundingClientRect().width,height=panel.getBoundingClientRect().height;
    const target=rects[0]||{left:w/2,right:w/2,top:h/2,bottom:h/2};
    const candidates=[{left:target.right+20,top:(target.top+target.bottom-height)/2},{left:target.left-width-20,top:(target.top+target.bottom-height)/2},{left:(w-width)/2,top:target.top-height-20},{left:(w-width)/2,top:target.bottom+20}];
    const clamp=(v,min,max)=>Math.max(min,Math.min(Math.max(min,max),v));
    const options=candidates.map(c=>({left:clamp(c.left,margin,w-width-margin),top:clamp(c.top,margin,h-height-margin)}));
    const overlap=c=>rects.reduce((sum,r)=>sum+Math.max(0,Math.min(c.left+width,r.right)-Math.max(c.left,r.left))*Math.max(0,Math.min(c.top+height,r.bottom)-Math.max(c.top,r.top)),0);
    options.sort((a,b)=>overlap(a)-overlap(b));const best=options[0];
    panel.style.left=`${best.left}px`;panel.style.top=`${best.top}px`;
    if(!firstVisit)return;
    spotlight.setAttribute('viewBox',`0 0 ${w} ${h}`);spotlight.replaceChildren();
    const mask=document.createElementNS(ns,'path');
    mask.setAttribute('fill-rule','evenodd');mask.setAttribute('d',`M0 0H${w}V${h}H0Z`+rects.map(r=>`M${r.left} ${r.top}H${r.right}V${r.bottom}H${r.left}Z`).join(''));mask.setAttribute('fill','#01060bd9');spotlight.append(mask);
    for(const r of rects){const outline=document.createElementNS(ns,'rect');outline.setAttribute('x',r.left);outline.setAttribute('y',r.top);outline.setAttribute('width',r.right-r.left);outline.setAttribute('height',r.bottom-r.top);outline.setAttribute('rx','4');outline.setAttribute('class','spotlight-outline');spotlight.append(outline);}
    const arrow=document.createElementNS(ns,'path');
    const tx=(target.left+target.right)/2,ty=(target.top+target.bottom)/2;
    const sx=clamp(tx,best.left,best.left+width),sy=clamp(ty,best.top,best.top+height);
    const dx=tx-sx,dy=ty-sy,length=Math.hypot(dx,dy)||1,ux=dx/length,uy=dy/length;
    const ex=tx-ux*8,ey=ty-uy*8;
    arrow.setAttribute('d',`M${sx} ${sy}L${ex} ${ey}M${ex-ux*10-uy*5} ${ey-uy*10+ux*5}L${ex} ${ey}L${ex-ux*10+uy*5} ${ey-uy*10-ux*5}`);arrow.setAttribute('class','spotlight-arrow');spotlight.append(arrow);
  }
  window.addEventListener('resize',position);window.addEventListener('scroll',position,{passive:true});
  new ResizeObserver(position).observe(panel);
  dialog.addEventListener('cancel' ,event=>{event.preventDefault();close();});
  function remember(){try{localStorage.setItem(storageKey,'done');}catch{}}
  function open(blocking=false){window.dispatchEvent(new Event('walkthrough-opened'));index=0;panel.classList.add('is-guided');firstVisit=blocking;panel.hidden=false;trigger.setAttribute('aria-expanded','true');if(blocking){dialog.append(panel);document.body.classList.add('first-visit-open');dialog.showModal();}render();}
  function clearTargets(){document.querySelectorAll('.walkthrough-target').forEach(el=>el.classList.remove('walkthrough-target'));}
  function close(){remember();panel.hidden=true;trigger.setAttribute('aria-expanded','false');clearTargets();panel.classList.remove('is-guided');panel.style.removeProperty('left');panel.style.removeProperty('top');if(firstVisit){firstVisit=false;dialog.close();home.after(panel);document.body.classList.remove('first-visit-open');window.dispatchEvent(new Event('walkthrough-dismissed'));}trigger.focus({preventScroll:true});}
  function render(){
    const step=steps[index];clearTargets();
    panel.dataset.step=String(index+1);
    $('walkthrough-progress').textContent=`Step ${index+1} of ${steps.length}`;
    $('walkthrough-title').textContent=step.title;$('walkthrough-copy').textContent=step.copy;$('walkthrough-tip').textContent=step.tip;
    $('walkthrough-back').disabled=index===0;$('walkthrough-next').textContent=index===steps.length-1?'Done':'Next';
    for(const selector of step.targets)document.querySelector(selector)?.classList.add('walkthrough-target');
    $('walkthrough-title').focus({preventScroll:true});
    position();
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

// The original Stark/Xeno graph's 3D layouts, perspective, and tactical drawing language.
// Data and file navigation remain in app.js. All coordinates below are world-space.
const TAU = Math.PI * 2;

export function layoutHologramNodes(nodes, mode = 'orbital') {
  const files = nodes.filter(n => !n.folder || n.parent && n.fileCount);
  const center = nodes.find(n => !n.parent);
  const overview = files.some(n=>n.fileCount) || files.length > 12 && files.every(n=>n.parent === center);
  const clusters = overview ? files.map(n=>n.path) : [...new Set(files.map(n => n.parent.path))];
  const groups = overview ? files.map(n=>[n]) : clusters.map(path => files.filter(n => n.parent.path === path));
  if (center) Object.assign(center, { x: 0, y: 0, z: 0, cluster: 0 });
  groups.forEach((group, index) => {
    const sector = index / clusters.length * TAU;
    // Original concentric folder sectors and orbiting file satellites.
    const radius = clusters[index] === '' ? 0.33 : 0.68 + (index % 2) * 0.15;
    const hub = { x: Math.cos(sector) * radius, y: ((index % 3) - 1) * 0.20, z: Math.sin(sector) * radius };
    const folder = nodes.find(n => n.folder && n.path === clusters[index]);
    if (folder && folder !== center) Object.assign(folder, hub, { cluster: index });
    group.forEach((node, i) => {
      const angle = sector + i / group.length * TAU;
      const spread = group.length === 1 ? 0.15 : 0.17 + (i % 3) * 0.075;
      Object.assign(node, {
        cluster: index,
        x: hub.x + Math.cos(angle) * spread,
        y: hub.y + Math.sin(i * 1.7) * 0.16,
        z: hub.z + Math.sin(angle) * spread
      });
    });
  });
  if (mode === 'helix') {
    files.forEach((node, i) => {
      const t = Math.floor(i / 2) / Math.max(1, Math.ceil(files.length / 2) - 1);
      const angle = t * TAU * 1.6 + (i % 2 ? Math.PI : 0);
      Object.assign(node, { x: Math.cos(angle) * .55, y: (t - .5) * 2.25, z: Math.sin(angle) * .55 });
    });
  } else if (mode === 'hive') {
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    groups.forEach((group, index) => {
      const phi = Math.acos(1 - 2 * (index + .5) / groups.length), theta = TAU * (index + .5) / goldenRatio;
      const hub = {x:.86*Math.sin(phi)*Math.cos(theta),y:.86*Math.cos(phi),z:.86*Math.sin(phi)*Math.sin(theta)};
      const folder = nodes.find(n => n.folder && n.path === clusters[index]);
      if (folder && folder !== center) Object.assign(folder,hub);
      group.forEach((node,i) => {
        const a = i / group.length * TAU, r = .15 + (i % 3)*.035;
        Object.assign(node,{x:hub.x+Math.cos(a)*r,y:hub.y+Math.sin(a)*r,z:hub.z+Math.sin(i*2.4)*.12});
      });
    });
  }
  // Intermediate folders follow their descendants, so every visible connection is real.
  for (const folder of [...nodes].filter(n => n.folder && n.parent).sort((a,b) => b.depth - a.depth)) {
    if (folder.children.length && (mode === 'helix' || !clusters.includes(folder.path))) {
      const points = folder.children;
      for (const axis of ['x', 'y', 'z']) folder[axis] = points.reduce((sum,n) => sum + n[axis], 0) / points.length * .62;
      folder.cluster = points[0].cluster;
    }
  }
}

function colorFor(node, theme) {
  // Restore the original lens palettes. Shapes, rather than color, identify folders.
  const index = node.cluster || 0;
  if (theme === 'jarvis') return ['#00e5ff','#ffcc00','#38bdf8','#f59e0b'][index % 4];
  if (theme === 'muthur') return ['#39ff14','#00ff88','#a3e635','#ff9900'][index % 4];
  return ['#ffb800','#00f0ff','#39ff14','#38bdf8','#b481ff','#ff637c'][index % 6];
}

// Sample displayed coordinates so interrupted transitions never jump.
export function nodePose(node,index,state,time,motion=true){
  if(!motion)return {...node,t:1,pop:1};
  const transition=state.transition;
  if(transition){
    const t=Math.max(0,Math.min(1,(time-transition.at)/transition.duration));
    const ease=t*t*t*(t*(t*6-15)+10),from=transition.from.get(node.path);
    const origin=from || {x:0,y:-.12,z:0,pop:0};
    return {x:origin.x+(node.x-origin.x)*ease,y:origin.y+(node.y-origin.y)*ease,z:origin.z+(node.z-origin.z)*ease,
      t:from?1:t,pop:from?origin.pop+(1-origin.pop)*ease:Math.max(0,1+2.2*Math.pow(t-1,3)+1.2*Math.pow(t-1,2))};
  }
  const age=Number.isFinite(state.entranceAt)?Math.max(0,time-state.entranceAt):10000;
  const delay=node.parent?650+(index-1)/Math.max(1,state.nodes.length-2)*3200:0;
  const t=Math.max(0,Math.min(1,(age-delay)/1200));
  const ease=1-Math.pow(1-t,4),twist=(1-ease)*1.2,radius=.15+.85*ease;
  return {t,pop:t===1?1:1+2.2*Math.pow(t-1,3)+1.2*Math.pow(t-1,2),x:(node.x*Math.cos(twist)-node.z*Math.sin(twist))*radius,y:node.y*radius-(1-ease)*.25,z:(node.x*Math.sin(twist)+node.z*Math.cos(twist))*radius};
}

export function drawHologram({ctx, width, height, state, core, palette, time, motion, labels}) {
  ctx.clearRect(0, 0, width, height);
  if (!state.nodes.length) return [];
  const theme = state.theme || 'fusion';
  const cyan = theme === 'muthur' ? '#39ff14' : '#00f0ff';
  const acid = theme === 'jarvis' ? '#ffcc00' : '#39ff14';
  const gold = theme === 'muthur' ? '#a3e635' : '#ffb800';
  const clock = motion ? time : 0;
  const age=motion && Number.isFinite(state.entranceAt)?Math.max(0,time-state.entranceAt):10000;
  const ignition=Math.min(1,age/1100);
  const arrival=new Map(state.nodes.map((node,index)=>[node,nodePose(node,index,state,time,motion)]));
  const plotTop = labels ? (width<600?165:145) : 24, plotHeight = Math.max(100,height-plotTop-(labels?65:24));
  const unit = Math.max(35, Math.min(width * .30, plotHeight * .43)) * state.zoom * (state.layoutMode === 'helix' ? .82 : 1);
  const distance = 3.6;
  const cy = Math.cos(state.yaw), sy = Math.sin(state.yaw);
  const cp = Math.cos(state.pitch), sp = Math.sin(state.pitch);
  function project(p) {
    // Same perspective orbit model as the original, scaled to the full viewport.
    const x = p.x * cy - p.z * sy;
    const rz = p.x * sy + p.z * cy;
    const y = p.y * cp - rz * sp;
    const depth = p.y * sp + rz * cp;
    const scale = distance / (distance + depth);
    return { x: width * .5 + x * unit * scale, y: plotTop+plotHeight*.5-y*unit*scale, depth, scale };
  }
  function path3D(points, color, alpha, lineWidth = 1, glow = false) {
    ctx.save();
    ctx.beginPath();
    points.forEach((point,i) => { const p = project(point); if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y); });
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha * ignition;
    ctx.lineWidth = lineWidth;
    if(glow){ctx.shadowColor=color;ctx.shadowBlur=7;}
    ctx.stroke();ctx.restore();
  }
  function gimbal(radius, tilt, axis, offset, color, index) {
    const spin = clock * .00008 * (index % 2 ? -1 : 1) + offset;
    const point = (a, r = radius) => {
      const x = Math.cos(a + spin) * r, z = Math.sin(a + spin) * r;
      if(axis === 'z')return {x:x*Math.cos(tilt),y:x*Math.sin(tilt),z};
      return {x,y:z*Math.sin(tilt),z:z*Math.cos(tilt)};
    };
    const ring = Array.from({length:145},(_,i)=>point(i/144*TAU));
    path3D(ring,color,.16,1);
    // Short illuminated bands and machined azimuth ticks define each gimbal plane.
    for(let band=0;band<3;band++) {
      const start=band/3*TAU+.2;
      path3D(Array.from({length:28},(_,i)=>point(start+i/27*.48)),color,.48,1.6,true);
    }
    for(let i=0;i<64;i++) {
      const a=i/64*TAU;
      path3D([point(a,radius),point(a,radius+(i%8? .012:.035))],color,i%8?.22:.55,1);
    }
  }

  // Transparent projector light, anchored below a volumetric floating graph.
  const bottom = project({x:0,y:-.56,z:0});
  const center = project({x:0,y:0,z:0});
  const beam=ctx.createLinearGradient(0,center.y-unit*.8,0,bottom.y+unit*.45);
  beam.addColorStop(0,cyan+'00');beam.addColorStop(.7,cyan+'08');beam.addColorStop(1,cyan+'00');
  ctx.fillStyle=beam;ctx.beginPath();ctx.moveTo(center.x-unit*.50,center.y-unit*.85);ctx.lineTo(center.x+unit*.50,center.y-unit*.85);ctx.lineTo(bottom.x+unit*.12,bottom.y+unit*.35);ctx.lineTo(bottom.x-unit*.12,bottom.y+unit*.35);ctx.closePath();ctx.fill();
  // Lens instruments and topology guides are decorative, never dependency edges.
  if (theme === 'jarvis') {
    for (let i=-5;i<=5;i++) {
      path3D([{x:i*.22,y:-.9,z:-1.1},{x:i*.22,y:-.9,z:1.1}],cyan,.13);
      path3D([{x:-1.1,y:-.9,z:i*.22},{x:1.1,y:-.9,z:i*.22}],cyan,.13);
    }
    gimbal(.3,Math.PI/2,'x',0,cyan,0);gimbal(1.12,0,'x',0,cyan,1);
  } else if (theme === 'muthur') {
    for (let i=0;i<height;i+=5) { ctx.fillStyle='#39ff1405';ctx.fillRect(0,i,width,1); }
    gimbal(1.12,Math.PI/2,'x',0,acid,0);
    const sweep=clock*.0003;
    path3D([{x:0,y:0,z:0},{x:Math.cos(sweep)*1.12,y:Math.sin(sweep)*1.12,z:0}],acid,.48,2,true);
  } else {
    gimbal(.36, .18, 'x', 0, gold, 0);gimbal(.72, -.25, 'x', .35, acid, 1);
    gimbal(1.04, .12, 'x', .8, cyan, 2);gimbal(.93, 1.12, 'z', .2, cyan, 3);
  }
  if (theme !== 'muthur') {
    // Reactor vanes for ARC-XENO; calibrated targeting brackets for J.A.R.V.I.S.
    const radius = theme === 'fusion' ? .22 : .31, segments = theme === 'fusion' ? 12 : 4;
    for(let i=0;i<segments;i++) {
      const a=i/segments*TAU+(theme==='fusion'?clock*.00005:Math.PI/4);
      const points=Array.from({length:12},(_,j)=>({x:Math.cos(a+j/11*.16)*radius,y:Math.sin(a+j/11*.16)*radius,z:0}));
      path3D(points,theme==='fusion'?gold:cyan,.8,theme==='fusion'?3:2,true);
      if(theme==='jarvis') path3D([{x:Math.cos(a)*.34,y:Math.sin(a)*.34,z:0},{x:Math.cos(a)*.42,y:Math.sin(a)*.42,z:0}],gold,.75,2);
    }
    if(theme==='fusion') gimbal(.25,.9,'z',.5,cyan,4);
  }
  if (state.layoutMode === 'helix') {
    const strand = (t,side) => ({x:Math.cos(t*TAU*1.6+side*Math.PI)*.55,y:(t-.5)*2.25,z:Math.sin(t*TAU*1.6+side*Math.PI)*.55});
    for (let side=0;side<2;side++) path3D(Array.from({length:97},(_,i)=>strand(i/96,side)),side?gold:cyan,.5,1.5,true);
    for(let i=0;i<=14;i++)path3D([strand(i/14,0),strand(i/14,1)],cyan,.12);
  } else if (state.layoutMode === 'hive') {
    for (const folder of state.nodes.filter(n=>n.folder&&n.parent)) {
      path3D(Array.from({length:7},(_,i)=>({x:folder.x+Math.cos(i/6*TAU)*.27,y:folder.y+Math.sin(i/6*TAU)*.27,z:folder.z})),colorFor(folder,theme),.32,1.2,true);
    }
  }

  const projections = state.nodes.filter(node=>arrival.get(node).t>0).map(node => ({...project(arrival.get(node)), node, color:colorFor(node,theme)}));
  const byNode = new Map(projections.map(p=>[p.node,p]));
  const active = new Set();
  for(let node=state.hovered;node;node=node.parent)active.add(node);
  function curve(a,b,index) {
    if (theme === 'jarvis') return t => t<.5 ? {x:a.x+(b.x-a.x)*t*2,y:a.y,z:a.z+(b.z-a.z)*t*2} : {x:b.x,y:a.y+(b.y-a.y)*(t-.5)*2,z:b.z};
    const mid={x:(a.x+b.x)*.5+(b.z-a.z)*.16,y:(a.y+b.y)*.5+.10+Math.sin(index*1.7)*.07,z:(a.z+b.z)*.5-(b.x-a.x)*.16};
    return t=>{
      const s=1-t;
      return {x:s*s*a.x+2*s*t*mid.x+t*t*b.x,y:s*s*a.y+2*s*t*mid.y+t*t*b.y,z:s*s*a.z+2*s*t*mid.z+t*t*b.z};
    };
  }
  // Biomechanical tendrils and plasma spores follow actual folder/file connections.
  state.nodes.forEach((node,index)=>{
    if(!node.parent || arrival.get(node).t<=0)return;
    const lit=active.has(node)||(state.hovered?.folder && node.path.startsWith(state.hovered.path+'/'));
    const point=curve(arrival.get(node.parent),arrival.get(node),index);
    const points=Array.from({length:22},(_,i)=>point(i/21*Math.min(1,arrival.get(node).t*2)));
    const color=lit?gold:colorFor(node,theme);
    path3D(points,color,lit?.18:.02,lit?5:2);
    path3D(points,color,lit?.85:.30,lit?1.8:.9,lit);
    if(motion && arrival.get(node).t===1 && (index%2===0||lit)) {
      const t=(clock*.00022+index*.137)%1;
      const p=project(point(t));
      ctx.save();ctx.fillStyle=lit?gold:acid;ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=8;ctx.globalAlpha=lit?.95:.68;
      ctx.beginPath();ctx.arc(p.x,p.y,lit?2.3:1.4,0,TAU);ctx.fill();ctx.restore();
    }
  });

  // Removed nodes dissolve without remaining interactive.
  if(motion && state.transition){
    const progress=Math.max(0,Math.min(1,(time-state.transition.at)/state.transition.duration));
    if(progress<1){
      const paths=new Set(state.nodes.map(n=>n.path));
      for(const [path,old] of state.transition.from){
        if(paths.has(path))continue;
        const p=project(old),color=colorFor(old.node,theme);
        ctx.save();ctx.globalAlpha=(1-progress)*(1-progress);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=12;
        ctx.beginPath();ctx.arc(p.x,p.y,7+progress*20,0,TAU);ctx.stroke();
        ctx.beginPath();ctx.arc(p.x,p.y,Math.max(.1,5*(1-progress)),0,TAU);ctx.fill();
        if(labels && state.changeMarkers?.get(path)==='− Removed'){
          ctx.font='11px ui-monospace,Consolas,monospace';const label='− Removed: '+old.node.name;const w=ctx.measureText(label).width;
          if(state.labelBackgrounds){ctx.fillStyle='#03090d';ctx.fillRect(p.x+10,p.y-10,w+6,18);}ctx.fillStyle=color;ctx.fillText(label,p.x+13,p.y+3);
        }
        ctx.restore();
      }
    }
  }
  const labelCandidates=[];
  for(const p of [...projections].sort((a,b)=>b.depth-a.depth)) {
    const n=p.node;
    const hovered=n===state.hovered || (!n.folder && n.path===state.previewPath);
    const changed=state.changed.has(n.path)&&time-state.changedAt<2500;
    const color=p.color;
    const size=n.folder?(n.fileCount?10:5):7.5+Math.min(4,Math.log2(1+(n.size||0)/700)*.65);
    const r=Math.max(4,size*p.scale)*(width<600?.82:1);
    p.r=r;
    ctx.save();
    const birth=arrival.get(n), pop=Math.max(.001,birth.pop);
    ctx.translate(p.x,p.y);ctx.scale(pop,pop);ctx.translate(-p.x,-p.y);
    if(birth.t<1){
      ctx.strokeStyle=color;ctx.globalAlpha=(1-birth.t)*.7;ctx.lineWidth=1.5;
      ctx.beginPath();ctx.arc(p.x,p.y,r+birth.t*26,0,TAU);ctx.stroke();ctx.globalAlpha=1;
    }
    if(!n.parent) {
      const glow=ctx.createRadialGradient(p.x,p.y,3,p.x,p.y,42);
      glow.addColorStop(0,cyan+'66');glow.addColorStop(1,cyan+'00');
      ctx.fillStyle=glow;ctx.beginPath();ctx.arc(p.x,p.y,42,0,TAU);ctx.fill();
      if(theme==='jarvis') {
        const iris=ctx.createRadialGradient(p.x,p.y,2,p.x,p.y,20);iris.addColorStop(0,'#ecffff');iris.addColorStop(.2,'#21dfff');iris.addColorStop(.5,'#064369');iris.addColorStop(1,'#020f24');
        ctx.fillStyle=iris;ctx.beginPath();ctx.arc(p.x,p.y,20,0,TAU);ctx.fill();ctx.strokeStyle=cyan;ctx.lineWidth=1;
        for(const r of [9,16,21]){ctx.beginPath();ctx.arc(p.x,p.y,r,0,TAU);ctx.stroke();}
      } else if(core.complete&&core.naturalWidth){ctx.save();ctx.beginPath();ctx.arc(p.x,p.y,19,0,TAU);ctx.clip();ctx.filter=theme==='muthur'?'sepia(1) saturate(3) hue-rotate(40deg)':'none';ctx.drawImage(core,p.x-19,p.y-19,38,38);ctx.restore();}
      ctx.strokeStyle=gold;ctx.globalAlpha=.7;ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,24,0,TAU);ctx.stroke();
    } else if(n.folder) {
      ctx.strokeStyle=color;ctx.globalAlpha=hovered?1:.75;ctx.lineWidth=1;
      ctx.fillStyle='#06131bf5';ctx.beginPath();ctx.moveTo(p.x-r,p.y-r*.55);ctx.lineTo(p.x-r*.2,p.y-r*.55);ctx.lineTo(p.x+r*.1,p.y-r*.25);ctx.lineTo(p.x+r,p.y-r*.25);ctx.lineTo(p.x+r,p.y+r*.65);ctx.lineTo(p.x-r,p.y+r*.65);ctx.closePath();ctx.fill();ctx.stroke();
    } else if(theme==='jarvis') {
      // Precision optical modules: circular glass, calibrated ticks, fixed brackets.
      const lens=ctx.createRadialGradient(p.x-r*.25,p.y-r*.25,0,p.x,p.y,r);
      lens.addColorStop(0,'#efffff');lens.addColorStop(.2,color);lens.addColorStop(.55,'#093d64');lens.addColorStop(1,'#020b1c');
      ctx.fillStyle=lens;ctx.beginPath();ctx.arc(p.x,p.y,r,0,TAU);ctx.fill();
      ctx.strokeStyle=color;ctx.lineWidth=1;
      for(const radius of [r*.65,r*1.15,r*1.45]){ctx.beginPath();ctx.arc(p.x,p.y,radius,0,TAU);ctx.stroke();}
      for(let tick=0;tick<12;tick++){
        const a=tick/12*TAU;ctx.beginPath();ctx.moveTo(p.x+Math.cos(a)*r*1.5,p.y+Math.sin(a)*r*1.5);ctx.lineTo(p.x+Math.cos(a)*r*1.75,p.y+Math.sin(a)*r*1.75);ctx.stroke();
      }
      ctx.strokeStyle=gold;ctx.lineWidth=1.3;
      const sweep=clock*.001+(n.cluster||0);
      ctx.strokeStyle=hovered?'#ffffff':color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,r*1.3,sweep,sweep+.65);ctx.stroke();
      if(changed){ctx.strokeStyle=gold;ctx.beginPath();ctx.arc(p.x,p.y,r*2.1,0,TAU);ctx.stroke();}
    } else {
      // Original luminous halo, hexagonal chitin core, and arc nucleus.
      const glow=ctx.createRadialGradient(p.x,p.y,r*.2,p.x,p.y,r*2.5);
      glow.addColorStop(0,color+'bb');glow.addColorStop(.45,color+'44');glow.addColorStop(1,color+'00');
      ctx.fillStyle=glow;ctx.beginPath();ctx.arc(p.x,p.y,r*2.5,0,TAU);ctx.fill();
      ctx.beginPath();
      const sides=theme==='jarvis'?4:theme==='muthur'?18:6;
      for(let side=0;side<=sides;side++){
        const angle=side/sides*TAU+(theme==='jarvis'?Math.PI/4:clock*.00012);
        const pulse=theme==='muthur'?1+Math.sin(angle*3+clock*.0015+n.cluster)*.16:1;
        const x=p.x+Math.cos(angle)*r*pulse,y=p.y+Math.sin(angle)*r*pulse;
        if(side)ctx.lineTo(x,y);else ctx.moveTo(x,y);
      }
      ctx.fillStyle='#041018';ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=hovered?2:1.3;ctx.stroke();
      ctx.beginPath();ctx.arc(p.x,p.y,Math.max(2,r*.34),0,TAU);ctx.fillStyle=hovered?'#ffffff':color;ctx.fill();
      // Add machinery around the existing glyph and nucleus, retaining each lens.
      if(theme==='fusion'){
        ctx.save();ctx.strokeStyle=color;ctx.lineWidth=.8;ctx.globalAlpha=.8;
        const spin=clock*.00035+(n.cluster||0);
        for(let ring=0;ring<2;ring++){
          ctx.beginPath();ctx.ellipse(p.x,p.y,r*(1.5+ring*.25),r*(.48+ring*.15),spin+ring*Math.PI/2,0,TAU);ctx.stroke();
        }
        const segments=6;
        for(let i=0;i<segments;i++){
          const a=i/segments*TAU+spin;
          ctx.beginPath();ctx.arc(p.x,p.y,r*1.8,a,a+.35);ctx.stroke();
          if(i%2===0){ctx.fillStyle=cyan;ctx.beginPath();ctx.arc(p.x+Math.cos(a)*r*1.5,p.y+Math.sin(a)*r*.55,1.4,0,TAU);ctx.fill();}
        }
        ctx.restore();
      }
      if(hovered||changed){
        ctx.strokeStyle=hovered?gold:acid;ctx.lineWidth=1.5;
        ctx.beginPath();ctx.arc(p.x,p.y,r+6,-.5,.5);ctx.stroke();
        ctx.beginPath();ctx.arc(p.x,p.y,r+6,Math.PI-.5,Math.PI+.5);ctx.stroke();
      }
      if(changed&&motion){
        const progress=(time-state.changedAt)/2500;
        ctx.globalAlpha=(1-progress)*.8;ctx.strokeStyle=acid;ctx.lineWidth=1.4;
        ctx.beginPath();ctx.arc(p.x,p.y,r+progress*38,0,TAU);ctx.stroke();
      }
    }
    ctx.restore();
    if(n.parent&&labels&&arrival.get(n).t>.7)labelCandidates.push({...p,r:theme==='jarvis'&&!n.folder?r*2:r,hovered});
  }
  // Keep names legible over the effects; hidden collisions remain accessible in Files.
  const occupied=[];
  labelCandidates.sort((a,b)=>Number(b.hovered)-Number(a.hovered)||Number(state.changeMarkers?.has(b.node.path))-Number(state.changeMarkers?.has(a.node.path))||Number(b.node.folder)-Number(a.node.folder)||a.depth-b.depth);
  for(const p of labelCandidates){
    const size=width<600?11:12;
    ctx.font=`${p.hovered?'600 ':'500 '}${size}px ui-monospace,Consolas,monospace`;
    const max=width<600?19:30;
    const marker=state.changeMarkers?.get(p.node.path)||'';
    const suffix=(p.node.fileCount?' · '+p.node.fileCount.toLocaleString():'')+(marker?' '+marker:'');
    const room=Math.max(6,max-suffix.length), name=p.node.name;
    const text=(name.length>room?name.slice(0,room-1)+'…':name)+suffix;
    const tw=ctx.measureText(text).width;
    const choices=[{x:p.x+p.r+4,y:p.y-9},{x:p.x-p.r-10-tw,y:p.y-9},{x:p.x-tw*.5-3,y:p.y-p.r-25},{x:p.x-tw*.5-3,y:p.y+p.r+8}];
    const b=choices.map(b=>({...b,w:tw+6,h:18})).find(b=>b.x>=10&&b.x+b.w<=width-10&&b.y>=plotTop&&b.y+b.h<=height-60&&(p.hovered||!occupied.some(o=>b.x<o.x+o.w&&b.x+b.w>o.x&&b.y<o.y+o.h&&b.y+b.h>o.y))&&(p.hovered||!projections.some(o=>o.node!==p.node&&Math.abs(o.x-(b.x+b.w/2))<b.w/2+7&&Math.abs(o.y-(b.y+9))<13)));
    if(!b)continue;
    occupied.push(b);byNode.get(p.node).labelBox=b;
    ctx.save();if(state.labelBackgrounds){ctx.fillStyle='#03090de6';ctx.fillRect(b.x,b.y,b.w,b.h);}
    ctx.fillStyle=p.hovered?gold:p.node.folder?p.color:'#dcf8ff';ctx.fillText(text,b.x+3,b.y+13);ctx.restore();
  }
  // Original targeting language stays inside the graph, not in extra dashboard cards.
  ctx.save();ctx.strokeStyle=cyan;ctx.globalAlpha=.5;ctx.lineWidth=1;
  for(const [x,y,sx,sy]of[[16,56,1,1],[width-16,56,-1,1],[16,height-58,1,-1],[width-16,height-58,-1,-1]]){
    ctx.beginPath();ctx.moveTo(x,y+sy*13);ctx.lineTo(x,y);ctx.lineTo(x+sx*18,y);ctx.stroke();
  }
  if(width>720){
    ctx.globalAlpha=.7;ctx.font='11px ui-monospace,Consolas,monospace';ctx.fillStyle=cyan;
    const yaw=((Math.round(state.yaw*180/Math.PI)%360)+360)%360;
    ctx.fillText(`Turn ${String(yaw).padStart(3,'0')}° / Tilt ${Math.round(state.pitch*180/Math.PI)}°`,width-200,35);
  }
  ctx.restore();
  if(state.previewPath && state.previewTarget){
    const source=projections.find(p=>!p.node.folder && p.node.path===state.previewPath);
    if(source){
      const target=state.previewTarget;
      ctx.save();ctx.strokeStyle=cyan;ctx.globalAlpha=.7;ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(source.x,source.y);ctx.lineTo(source.x+25,source.y-25);ctx.lineTo(target.x-22,target.y);ctx.lineTo(target.x,target.y);ctx.stroke();
      ctx.fillStyle=gold;ctx.beginPath();ctx.arc(source.x,source.y,3,0,TAU);ctx.fill();ctx.restore();
    }
  }
  return projections;
}

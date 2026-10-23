// The original Stark/Xeno graph's 3D layouts, perspective, and tactical drawing language.
// Data and file navigation remain in app.js. All coordinates below are world-space.
const TAU = Math.PI * 2;
const FUSION = ['#ffb800', '#00f0ff', '#39ff14', '#38bdf8', '#b481ff', '#ff637c'];

function colorFor(node, theme) {
  const index = node.cluster || 0;
  if (theme === 'jarvis') return ['#00e5ff','#ffcc00','#38bdf8','#f59e0b'][index % 4];
  if (theme === 'muthur') return ['#39ff14','#00ff88','#a3e635','#ff9900'][index % 4];
  return FUSION[index % FUSION.length];
}

export function drawHologram({ctx, width, height, state, core, palette, time, motion, labels}) {
  ctx.clearRect(0, 0, width, height);
  if (!state.nodes.length) return [];
  const theme = state.theme || 'fusion';
  const cyan = theme === 'muthur' ? '#39ff14' : '#00f0ff';
  const acid = theme === 'jarvis' ? '#ffcc00' : '#39ff14';
  const gold = theme === 'muthur' ? '#a3e635' : '#ffb800';
  const clock = motion ? time : 0;
  const unit = Math.max(35, Math.min(width * .30, height * .41)) * state.zoom;
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
    return { x: width * .5 + x * unit * scale, y: height * .49 - y * unit * scale, depth, scale };
  }
  function path3D(points, color, alpha, lineWidth = 1, glow = false) {
    ctx.save();
    ctx.beginPath();
    points.forEach((point,i) => { const p = project(point); if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y); });
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
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
    path3D(ring,color,.20,1,true);
    // Short illuminated bands and machined azimuth ticks define each gimbal plane.
    for(let band=0;band<3;band++) {
      const start=band/3*TAU+.2;
      path3D(Array.from({length:28},(_,i)=>point(start+i/27*.48)),color,.64,2,true);
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
  // Original three gimbal radii, now with distinct crossing planes for visible 3D depth.
  gimbal(.36, .18, 'x', 0, gold, 0);
  gimbal(.72, -.25, 'x', .35, acid, 1);
  gimbal(1.04, .12, 'x', .8, cyan, 2);
  gimbal(.93, 1.12, 'z', .2, cyan, 3);

  const projections = state.nodes.map(node => ({...project(node), node, color:colorFor(node,theme)}));
  const byNode = new Map(projections.map(p=>[p.node,p]));
  const active = new Set();
  for(let node=state.hovered;node;node=node.parent)active.add(node);
  function curve(a,b,index) {
    const mid={x:(a.x+b.x)*.5+(b.z-a.z)*.16,y:(a.y+b.y)*.5+.10+Math.sin(index*1.7)*.07,z:(a.z+b.z)*.5-(b.x-a.x)*.16};
    return t=>{
      const s=1-t;
      return {x:s*s*a.x+2*s*t*mid.x+t*t*b.x,y:s*s*a.y+2*s*t*mid.y+t*t*b.y,z:s*s*a.z+2*s*t*mid.z+t*t*b.z};
    };
  }
  // Biomechanical tendrils and plasma spores follow actual folder/file connections.
  state.nodes.forEach((node,index)=>{
    if(!node.parent)return;
    const lit=active.has(node)||(state.hovered?.folder && node.path.startsWith(state.hovered.path+'/'));
    const point=curve(node.parent,node,index);
    const points=Array.from({length:22},(_,i)=>point(i/21));
    const color=lit?gold:colorFor(node,theme);
    path3D(points,color,lit?.20:.045,lit?6:3);
    path3D(points,color,lit?.85:.33,lit?1.8:.9,lit);
    if(motion && (index%2===0||lit)) {
      const t=(clock*.00022+index*.137)%1;
      const p=project(point(t));
      ctx.save();ctx.fillStyle=lit?gold:acid;ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=8;ctx.globalAlpha=lit?.95:.68;
      ctx.beginPath();ctx.arc(p.x,p.y,lit?2.3:1.4,0,TAU);ctx.fill();ctx.restore();
    }
  });

  const labelCandidates=[];
  for(const p of [...projections].sort((a,b)=>b.depth-a.depth)) {
    const n=p.node;
    const hovered=n===state.hovered || (!n.folder && n.path===state.previewPath);
    const changed=state.changed.has(n.path)&&time-state.changedAt<2500;
    const color=changed?acid:p.color;
    const size=n.folder?(n.fileCount?10:5):7.5+Math.min(4,Math.log2(1+(n.size||0)/700)*.65);
    const r=Math.max(4,size*p.scale)*(width<600?.82:1);
    p.r=r;
    ctx.save();
    if(!n.parent) {
      const glow=ctx.createRadialGradient(p.x,p.y,3,p.x,p.y,42);
      glow.addColorStop(0,cyan+'66');glow.addColorStop(1,cyan+'00');
      ctx.fillStyle=glow;ctx.beginPath();ctx.arc(p.x,p.y,42,0,TAU);ctx.fill();
      if(core.complete&&core.naturalWidth){ctx.save();ctx.beginPath();ctx.arc(p.x,p.y,19,0,TAU);ctx.clip();ctx.drawImage(core,p.x-19,p.y-19,38,38);ctx.restore();}
      ctx.strokeStyle=gold;ctx.globalAlpha=.7;ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,24,0,TAU);ctx.stroke();
    } else if(n.folder) {
      ctx.strokeStyle=color;ctx.globalAlpha=hovered?1:.75;ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(p.x,p.y,r,0,TAU);ctx.stroke();ctx.fillStyle=color;ctx.fillRect(p.x-1,p.y-1,2,2);
    } else {
      // Original luminous halo, hexagonal chitin core, and arc nucleus.
      const glow=ctx.createRadialGradient(p.x,p.y,r*.2,p.x,p.y,r*2.5);
      glow.addColorStop(0,color+'bb');glow.addColorStop(.45,color+'44');glow.addColorStop(1,color+'00');
      ctx.fillStyle=glow;ctx.beginPath();ctx.arc(p.x,p.y,r*2.5,0,TAU);ctx.fill();
      ctx.beginPath();
      for(let side=0;side<=6;side++){
        const angle=side/6*TAU+clock*.00012;
        const x=p.x+Math.cos(angle)*r,y=p.y+Math.sin(angle)*r;
        if(side)ctx.lineTo(x,y);else ctx.moveTo(x,y);
      }
      ctx.fillStyle='#041018';ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=hovered?2:1.3;ctx.stroke();
      ctx.beginPath();ctx.arc(p.x,p.y,Math.max(2,r*.34),0,TAU);ctx.fillStyle=hovered?'#ffffff':color;ctx.fill();
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
    if(n.parent&&labels)labelCandidates.push({...p,r,hovered});
  }
  // Keep names legible over the effects; hidden collisions remain accessible in Files.
  const occupied=[];
  labelCandidates.sort((a,b)=>Number(b.hovered)-Number(a.hovered)||Number(a.node.folder)-Number(b.node.folder)||a.depth-b.depth);
  for(const p of labelCandidates){
    const size=width<600?11:12;
    ctx.font=`${p.hovered?'600 ':'500 '}${size}px ui-monospace,Consolas,monospace`;
    const max=width<600?19:30;
    const label=p.node.fileCount ? p.node.name+' · '+p.node.fileCount : p.node.name;
    const text=label.length>max?label.slice(0,max-1)+'…':label;
    const tw=ctx.measureText(text).width;
    let tx=p.x+p.r+7;
    if(tx+tw>width-18)tx=p.x-p.r-7-tw;
    const b={x:tx-3,y:p.y-9,w:tw+6,h:18};
    if(b.x<10||b.x+b.w>width-10||b.y<65||b.y+b.h>height-60)continue;
    if(!p.hovered&&occupied.some(o=>b.x<o.x+o.w&&b.x+b.w>o.x&&b.y<o.y+o.h&&b.y+b.h>o.y))continue;
    // Avoid placing a label across another node's hit target.
    if(!p.hovered&&projections.some(o=>o.node!==p.node&&Math.abs(o.x-(b.x+b.w/2))<b.w/2+7&&Math.abs(o.y-p.y)<13))continue;
    occupied.push(b);byNode.get(p.node).labelBox=b;
    ctx.save();ctx.fillStyle='#03090de6';ctx.fillRect(b.x,b.y,b.w,b.h);
    ctx.fillStyle=p.hovered?gold:p.node.folder?p.color:'#dcf8ff';ctx.fillText(text,tx,p.y+4);ctx.restore();
  }
  // Original targeting language stays inside the graph, not in extra dashboard cards.
  ctx.save();ctx.strokeStyle=cyan;ctx.globalAlpha=.5;ctx.lineWidth=1;
  for(const [x,y,sx,sy]of[[16,56,1,1],[width-16,56,-1,1],[16,height-58,1,-1],[width-16,height-58,-1,-1]]){
    ctx.beginPath();ctx.moveTo(x,y+sy*13);ctx.lineTo(x,y);ctx.lineTo(x+sx*18,y);ctx.stroke();
  }
  if(width>720){
    ctx.globalAlpha=.7;ctx.font='11px ui-monospace,Consolas,monospace';ctx.fillStyle=cyan;
    const yaw=((Math.round(state.yaw*180/Math.PI)%360)+360)%360;
    ctx.fillText(`AZ ${String(yaw).padStart(3,'0')}°  /  EL ${Math.round(state.pitch*180/Math.PI)}°`,width-180,35);
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

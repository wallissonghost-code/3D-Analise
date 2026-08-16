import * as THREE from 'three';
import { buildEdges,faceCount,faceVertexIndices,faceVertices } from '../mesh/geometry-utils.js';

const NORMAL=[.62,.58,.88],HOVER=[.20,1.00,.42],SELECTED=[1.00,.56,.12];
const BOX_DRAG_THRESHOLD=7;

export class MeshSelection{
 constructor(engine,onChange=()=>{}){
  this.engine=engine;this.onChange=onChange;this.mesh=null;this.mode='vertex';this.vertices=new Set();this.edges=new Set();this.faces=new Set();this.vertexPoints=null;this.edgeLines=null;this.faceOverlay=null;
  this.vertexPixelTolerance=13;this.hoverVertex=null;this._hoverFrame=0;this._hoverEvent=null;this._pointer=null;this._boxEl=null;this.isBoxSelecting=false;this._cancellingOrbit=false;
  this._pointerMove=e=>this._handlePointerMove(e);this._pointerUp=e=>this._handlePointerUp(e);this._pointerLeave=()=>{if(!this._pointer)this._setHover(null)};
  this.engine.canvas.addEventListener('pointermove',this._pointerMove,true);this.engine.canvas.addEventListener('pointerup',this._pointerUp,true);this.engine.canvas.addEventListener('pointercancel',this._pointerUp,true);this.engine.canvas.addEventListener('pointerleave',this._pointerLeave)
 }
 enter(mesh){this.exit();this.mesh=mesh;this.rebuild();this.emit()}
 exit(){this._finishPointer();for(const o of [this.vertexPoints,this.edgeLines,this.faceOverlay]){if(o){o.parent?.remove(o);o.geometry?.dispose?.();o.material?.dispose?.()}}this.vertexPoints=this.edgeLines=this.faceOverlay=null;this.mesh=null;this.hoverVertex=null;this.clear(false)}
 setMode(mode){if(!['vertex','edge','face'].includes(mode))return;this.mode=mode;this.hoverVertex=null;this.clear(false);this.rebuild();this.emit()}
 clear(emit=true){this.vertices.clear();this.edges.clear();this.faces.clear();this.updateHighlight();if(emit)this.emit()}
 rebuild(){
  if(!this.mesh)return;
  for(const o of [this.vertexPoints,this.edgeLines,this.faceOverlay]){if(o){o.parent?.remove(o);o.geometry?.dispose?.();o.material?.dispose?.()}}
  const g=this.mesh.geometry,p=g.getAttribute('position');
  const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(p.array.slice?p.array.slice():new p.array.constructor(p.array),3));
  const pts=new THREE.Points(pg,new THREE.PointsMaterial({color:0xffffff,size:.11,sizeAttenuation:true,depthTest:false,transparent:true,opacity:.99,vertexColors:true}));pts.userData.helper=true;pts.renderOrder=1000;this.mesh.add(pts);this.vertexPoints=pts;
  const edges=buildEdges(g),arr=[];for(const e of edges)arr.push(e.a.x,e.a.y,e.a.z,e.b.x,e.b.y,e.b.z);const eg=new THREE.BufferGeometry();eg.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));const lines=new THREE.LineSegments(eg,new THREE.LineBasicMaterial({color:0xffffff,depthTest:false,transparent:true,opacity:.78,vertexColors:true}));lines.userData.helper=true;lines.renderOrder=999;this.mesh.add(lines);this.edgeLines=lines;this._edges=edges;
  this.updateHighlight()
 }
 pointerSelect(e){
  if(!this.mesh||e.button!==0)return false;
  this._finishPointer();
  this._pointer={id:e.pointerId,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,dragging:false,add:e.shiftKey,remove:e.ctrlKey||e.metaKey,controlsWasEnabled:this.engine.controls.enabled};
  // Deliberately leave OrbitControls untouched here. A simple click must remain a
  // normal click and camera orbit must not be changed until the drag threshold is crossed.
  return true
 }
 _handlePointerMove(e){
  if(!this.mesh)return;
  if(this._pointer&&e.pointerId===this._pointer.id){
    const p=this._pointer;p.x=e.clientX;p.y=e.clientY;const dx=p.x-p.startX,dy=p.y-p.startY;
    if(!p.dragging&&dx*dx+dy*dy>=BOX_DRAG_THRESHOLD*BOX_DRAG_THRESHOLD)this._beginBoxSelection(p,e);
    if(p.dragging){this._updateBox();e.preventDefault();e.stopImmediatePropagation();return}
  }
  if(this.mode==='vertex')this._queueHover(e);else this._setHover(null)
 }
 _beginBoxSelection(p,e){
  p.dragging=true;this.isBoxSelecting=true;
  // OrbitControls has already seen pointerdown because it owns the existing camera
  // gesture. Cancel only that in-progress gesture when Box Select actually starts,
  // then block subsequent pointermove events until selection is finished.
  this._cancelOrbitGesture(p.id,e);
  this.engine.controls.enabled=false;
  this._ensureBox();this._updateBox()
 }
 _cancelOrbitGesture(pointerId,sourceEvent){
  if(this._cancellingOrbit)return;this._cancellingOrbit=true;
  try{
    const ev=new PointerEvent('pointercancel',{bubbles:true,cancelable:true,pointerId,pointerType:sourceEvent?.pointerType||'mouse',isPrimary:sourceEvent?.isPrimary??true,clientX:sourceEvent?.clientX||0,clientY:sourceEvent?.clientY||0,button:0,buttons:0});
    this.engine.canvas.dispatchEvent(ev)
  }catch{}
  finally{this._cancellingOrbit=false}
 }
 _handlePointerUp(e){
  if(this._cancellingOrbit)return;
  const p=this._pointer;if(!p||e.pointerId!==p.id)return;
  if(p.dragging)this._applyBoxSelection(p);else this._clickSelect(e,p);
  this._finishPointer();
  // Do not stop pointerup. OrbitControls is allowed to receive the release event so
  // its own pointer bookkeeping remains clean for the next normal camera drag.
 }
 _clickSelect(e,p){
  const ray=this.engine.screenRay(e.clientX,e.clientY),add=p.add,remove=p.remove,multi=add||remove;
  if(this.mode==='vertex'){
    const hit=this._nearestVertexScreen(e.clientX,e.clientY);
    if(hit!=null){mutateSelection(this.vertices,hit,{add,remove});this._setHover(hit);this.updateHighlight();this.emit();return}
  }else if(this.mode==='face'){
    const hit=ray.intersectObject(this.mesh,false)[0];if(hit?.faceIndex!=null){mutateSelection(this.faces,hit.faceIndex,{add,remove});this.updateHighlight();this.emit();return}
  }else if(this.mode==='edge'){
    const hit=ray.intersectObject(this.mesh,false)[0];if(hit?.faceIndex!=null){const tri=faceVertices(this.mesh.geometry,hit.faceIndex),world=hit.point.clone();this.mesh.worldToLocal(world);let best=-1,bd=Infinity;for(const pair of [[0,1],[1,2],[2,0]]){const d=distancePointSegment(world,tri[pair[0]],tri[pair[1]]);if(d<bd){bd=d;best=this._edges.findIndex(ed=>(ed.a.distanceToSquared(tri[pair[0]])<1e-8&&ed.b.distanceToSquared(tri[pair[1]])<1e-8)||(ed.a.distanceToSquared(tri[pair[1]])<1e-8&&ed.b.distanceToSquared(tri[pair[0]])<1e-8))}}if(best>=0){mutateSelection(this.edges,best,{add,remove});this.updateHighlight();this.emit();return}}
  }
  if(!multi)this.clear()
 }
 _applyBoxSelection(p){
  const rect=normalizedRect(p.startX,p.startY,p.x,p.y),hits=[];
  if(this.mode==='vertex'){
    const pos=this.mesh.geometry.getAttribute('position');for(let i=0;i<pos.count;i++){const q=this._screenVertex(i);if(q&&inside(rect,q.x,q.y))hits.push(i)};applyMany(this.vertices,hits,p)
  }else if(this.mode==='edge'){
    for(let i=0;i<this._edges.length;i++){const e=this._edges[i],a=this._screenPoint(e.a),b=this._screenPoint(e.b);if(a&&b&&(inside(rect,a.x,a.y)||inside(rect,b.x,b.y)||segmentIntersectsRect(a,b,rect)))hits.push(i)}applyMany(this.edges,hits,p)
  }else{
    const g=this.mesh.geometry;for(let f=0;f<faceCount(g);f++){const vs=faceVertices(g,f).map(v=>this._screenPoint(v)).filter(Boolean);if(vs.length===3){const c={x:(vs[0].x+vs[1].x+vs[2].x)/3,y:(vs[0].y+vs[1].y+vs[2].y)/3};if(inside(rect,c.x,c.y)||vs.every(v=>inside(rect,v.x,v.y)))hits.push(f)}}applyMany(this.faces,hits,p)
  }
  this.updateHighlight();this.emit()
 }
 _ensureBox(){if(this._boxEl)return;const el=document.createElement('div');el.className='mesh-box-select';document.body.appendChild(el);this._boxEl=el}
 _updateBox(){if(!this._boxEl||!this._pointer)return;const r=normalizedRect(this._pointer.startX,this._pointer.startY,this._pointer.x,this._pointer.y);Object.assign(this._boxEl.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'})}
 _finishPointer(){
  const p=this._pointer;this._pointer=null;this.isBoxSelecting=false;
  if(p&&p.dragging)this.engine.controls.enabled=p.controlsWasEnabled!==false;
  if(this._boxEl){this._boxEl.remove();this._boxEl=null}
 }
 _queueHover(e){this._hoverEvent={x:e.clientX,y:e.clientY};if(this._hoverFrame)return;this._hoverFrame=requestAnimationFrame(()=>{this._hoverFrame=0;const q=this._hoverEvent;this._hoverEvent=null;if(q)this._setHover(this._nearestVertexScreen(q.x,q.y))})}
 _setHover(index){if(this.hoverVertex===index)return;this.hoverVertex=index;this.updateHighlight()}
 _nearestVertexScreen(clientX,clientY){
  if(!this.mesh)return null;const p=this.mesh.geometry.getAttribute('position'),tol2=this.vertexPixelTolerance*this.vertexPixelTolerance;let best=null,bestD=tol2,bestDepth=Infinity;
  for(let i=0;i<p.count;i++){const q=this._screenVertex(i);if(!q)continue;const dx=q.x-clientX,dy=q.y-clientY,d=dx*dx+dy*dy;if(d<bestD-1e-4||(Math.abs(d-bestD)<1e-4&&q.depth<bestDepth)){bestD=d;bestDepth=q.depth;best=i}}
  return best
 }
 _screenVertex(i){const p=this.mesh.geometry.getAttribute('position');if(!p||i<0||i>=p.count)return null;return this._screenPoint(new THREE.Vector3().fromBufferAttribute(p,i))}
 _screenPoint(local){
  if(!this.mesh)return null;const rect=this.engine.canvas.getBoundingClientRect(),camera=this.engine.camera;this.mesh.updateWorldMatrix(true,false);camera.updateMatrixWorld?.();const world=local.clone().applyMatrix4(this.mesh.matrixWorld),ndc=world.clone().project(camera);if(ndc.z<-1||ndc.z>1||!Number.isFinite(ndc.x)||!Number.isFinite(ndc.y))return null;return{x:rect.left+(ndc.x*.5+.5)*rect.width,y:rect.top+(-ndc.y*.5+.5)*rect.height,depth:camera.position.distanceToSquared(world)}
 }
 selectedVertexIndices(){if(this.mode==='vertex')return new Set(this.vertices);const out=new Set();if(this.mode==='edge')for(const i of this.edges)for(const v of this._edges[i]?.vertexIndices||this._edges[i]?.indices||[])out.add(v);if(this.mode==='face')for(const f of this.faces)for(const i of faceVertexIndices(this.mesh.geometry,f))out.add(i);return out}
 selectedFaceIndices(){if(this.mode==='face')return new Set(this.faces);if(this.mode==='edge'){const s=new Set();for(const i of this.edges)for(const f of this._edges[i]?.faces||[])s.add(f);return s}return new Set()}
 updateHighlight(){
  if(!this.mesh)return;if(this.faceOverlay){this.faceOverlay.parent?.remove(this.faceOverlay);this.faceOverlay.geometry.dispose();this.faceOverlay.material.dispose();this.faceOverlay=null}
  const g=this.mesh.geometry,p=g.getAttribute('position');
  if(this.vertexPoints){const hp=this.vertexPoints.geometry.getAttribute('position');if(hp?.count===p.count){hp.array.set(p.array);hp.needsUpdate=true}const c=[];for(let i=0;i<p.count;i++){const rgb=this.vertices.has(i)?SELECTED:(this.mode==='vertex'&&this.hoverVertex===i?HOVER:NORMAL);c.push(...rgb)}this.vertexPoints.geometry.setAttribute('color',new THREE.Float32BufferAttribute(c,3));this.vertexPoints.material.vertexColors=true;this.vertexPoints.material.needsUpdate=true;this.vertexPoints.visible=this.mode==='vertex'}
  if(this.edgeLines){this.edgeLines.visible=this.mode==='edge';const c=[];for(let i=0;i<this._edges.length;i++){const rgb=this.edges.has(i)?SELECTED:[.42,.48,.58];c.push(...rgb,...rgb)}this.edgeLines.geometry.setAttribute('color',new THREE.Float32BufferAttribute(c,3));this.edgeLines.material.vertexColors=true;this.edgeLines.material.needsUpdate=true}
  if(this.mode==='face'&&this.faces.size){const a=[];for(const f of this.faces)for(const v of faceVertices(g,f))a.push(v.x,v.y,v.z);const og=new THREE.BufferGeometry();og.setAttribute('position',new THREE.Float32BufferAttribute(a,3));const mat=new THREE.MeshBasicMaterial({color:0xff8a32,transparent:true,opacity:.40,depthTest:false,side:THREE.DoubleSide});this.faceOverlay=new THREE.Mesh(og,mat);this.faceOverlay.userData.helper=true;this.faceOverlay.renderOrder=1001;this.mesh.add(this.faceOverlay)}
 }
 emit(){this.onChange({mode:this.mode,count:this.mode==='vertex'?this.vertices.size:this.mode==='edge'?this.edges.size:this.faces.size,hoverVertex:this.hoverVertex})}
}
function mutateSelection(set,value,{add=false,remove=false}={}){if(remove){set.delete(value);return}if(add){set.add(value);return}set.clear();set.add(value)}
function applyMany(set,values,p){if(!p.add&&!p.remove)set.clear();for(const v of values)p.remove?set.delete(v):set.add(v)}
function normalizedRect(x1,y1,x2,y2){const left=Math.min(x1,x2),top=Math.min(y1,y2),right=Math.max(x1,x2),bottom=Math.max(y1,y2);return{left,top,right,bottom,width:right-left,height:bottom-top}}
function inside(r,x,y){return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom}
function segmentIntersectsRect(a,b,r){if(inside(r,a.x,a.y)||inside(r,b.x,b.y))return true;return segments(a,b,{x:r.left,y:r.top},{x:r.right,y:r.top})||segments(a,b,{x:r.right,y:r.top},{x:r.right,y:r.bottom})||segments(a,b,{x:r.right,y:r.bottom},{x:r.left,y:r.bottom})||segments(a,b,{x:r.left,y:r.bottom},{x:r.left,y:r.top})}
function segments(a,b,c,d){const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x),a1=cross(a,b,c),a2=cross(a,b,d),a3=cross(c,d,a),a4=cross(c,d,b);return((a1<=0&&a2>=0)||(a1>=0&&a2<=0))&&((a3<=0&&a4>=0)||(a3>=0&&a4<=0))}
function distancePointSegment(p,a,b){const ab=b.clone().sub(a),t=Math.max(0,Math.min(1,p.clone().sub(a).dot(ab)/(ab.lengthSq()||1)));return p.distanceTo(a.clone().add(ab.multiplyScalar(t)))}

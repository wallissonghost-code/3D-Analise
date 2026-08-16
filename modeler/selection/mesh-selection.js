import * as THREE from 'three';
import { buildEdges,faceVertexIndices,faceVertices } from '../mesh/geometry-utils.js';

const NORMAL=[.62,.58,.88],HOVER=[.20,1.00,.42],SELECTED=[1.00,.56,.12];

export class MeshSelection{
 constructor(engine,onChange=()=>{}){
  this.engine=engine;this.onChange=onChange;this.mesh=null;this.mode='vertex';this.vertices=new Set();this.edges=new Set();this.faces=new Set();this.vertexPoints=null;this.edgeLines=null;this.faceOverlay=null;
  this.vertexPixelTolerance=13;this.hoverVertex=null;this._hoverFrame=0;this._hoverEvent=null;
  this._pointerMove=e=>this._handlePointerMove(e);this._pointerLeave=()=>this._setHover(null);
  this.engine.canvas.addEventListener('pointermove',this._pointerMove);this.engine.canvas.addEventListener('pointerleave',this._pointerLeave)
 }
 enter(mesh){this.exit();this.mesh=mesh;this.rebuild();this.emit()}
 exit(){for(const o of [this.vertexPoints,this.edgeLines,this.faceOverlay]){if(o){o.parent?.remove(o);o.geometry?.dispose?.();o.material?.dispose?.()}}this.vertexPoints=this.edgeLines=this.faceOverlay=null;this.mesh=null;this.hoverVertex=null;this.clear(false)}
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
  const ray=this.engine.screenRay(e.clientX,e.clientY),add=e.shiftKey,remove=e.ctrlKey||e.metaKey,multi=add||remove;
  if(this.mode==='vertex'){
    const hit=this._nearestVertexScreen(e.clientX,e.clientY);
    if(hit!=null){mutateSelection(this.vertices,hit,{add,remove});this._setHover(hit);this.updateHighlight();this.emit();return true}
  }else if(this.mode==='face'){
    const hit=ray.intersectObject(this.mesh,false)[0];if(hit?.faceIndex!=null){mutateSelection(this.faces,hit.faceIndex,{add,remove});this.updateHighlight();this.emit();return true}
  }else if(this.mode==='edge'){
    const hit=ray.intersectObject(this.mesh,false)[0];if(hit?.faceIndex!=null){const tri=faceVertices(this.mesh.geometry,hit.faceIndex),world=hit.point.clone();this.mesh.worldToLocal(world);let best=-1,bd=Infinity;for(const pair of [[0,1],[1,2],[2,0]]){const d=distancePointSegment(world,tri[pair[0]],tri[pair[1]]);if(d<bd){bd=d;best=this._edges.findIndex(ed=>(ed.a.distanceToSquared(tri[pair[0]])<1e-8&&ed.b.distanceToSquared(tri[pair[1]])<1e-8)||(ed.a.distanceToSquared(tri[pair[1]])<1e-8&&ed.b.distanceToSquared(tri[pair[0]])<1e-8))}}if(best>=0){mutateSelection(this.edges,best,{add,remove});this.updateHighlight();this.emit();return true}}
  }
  if(!multi)this.clear();return true
 }
 _handlePointerMove(e){if(!this.mesh)return;if(this.mode==='vertex')this._queueHover(e);else this._setHover(null)}
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
function distancePointSegment(p,a,b){const ab=b.clone().sub(a),t=Math.max(0,Math.min(1,p.clone().sub(a).dot(ab)/(ab.lengthSq()||1)));return p.distanceTo(a.clone().add(ab.multiplyScalar(t)))}

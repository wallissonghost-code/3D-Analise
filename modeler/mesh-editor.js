import * as THREE from 'three';
import { MeshSelection } from './selection/mesh-selection.js';
import { editableGeometry,refreshGeometry,subdivisionOnce } from './mesh/geometry-utils.js';
import { extrudeFaces } from './mesh/extrude.js';
import { insetFaces } from './mesh/inset.js';
import { loopCut } from './mesh/loop-cut.js';
import { bevelEdges } from './mesh/bevel.js';

export class MeshEditor{
 constructor(engine,{onCommit=()=>{},getMirror=()=>({axes:[],clipping:false}),onSelectionChange=()=>{}}={}){
  this.engine=engine;this.onCommit=onCommit;this.getMirror=getMirror;this.onSelectionChange=onSelectionChange;this.mesh=null;this.proxy=null;this.dragBefore=null;this.proxyStart=null;this.proportional=false;this.proportionalRadius=.75;
  this.selection=new MeshSelection(engine,s=>{this._updateProxy();onSelectionChange({active:this.active,...s})});
 }
 get active(){return!!this.mesh}
 get mode(){return this.selection.mode}
 get selected(){return this.selection.selectedVertexIndices()}
 enter(object){let mesh=object?.isMesh?object:null;if(!mesh)object?.traverse(o=>{if(!mesh&&o.isMesh&&!o.userData?.helper)mesh=o});if(!mesh||!mesh.geometry?.getAttribute('position'))return false;this.exit();mesh.geometry=editableGeometry(mesh.geometry);this.mesh=mesh;this.selection.enter(mesh);this.proxy=new THREE.Object3D();this.proxy.userData.helper=true;this.engine.scene.add(this.proxy);this.engine.detach();this.engine.setTransformMode('translate');this.engine.attach(this.proxy);this.engine.transform.visible=false;return true}
 exit(){this.selection.exit();if(this.proxy){this.engine.detach();this.proxy.parent?.remove(this.proxy)}this.mesh=null;this.proxy=null;this.dragBefore=null}
 setMode(mode){if(!this.active)return;this.selection.setMode(mode);this._updateProxy()}
 pointerSelect(e){return this.selection.pointerSelect(e)}
 clearSelection(){this.selection.clear()}
 transformStart(){if(!this.active||!this.selected.size)return;this.dragBefore=this.mesh.geometry.clone();this.proxyStart=this.proxy.position.clone()}
 transformChange(){if(!this.active||!this.selected.size||!this.proxyStart)return;const deltaWorld=this.proxy.position.clone().sub(this.proxyStart);if(deltaWorld.lengthSq()<1e-16)return;const p=this.mesh.geometry.getAttribute('position'),selected=[...this.selected],all=new Set(selected);if(this.proportional){const centers=selected.map(i=>new THREE.Vector3().fromBufferAttribute(p,i));for(let i=0;i<p.count;i++){if(all.has(i))continue;const v=new THREE.Vector3().fromBufferAttribute(p,i);let d=Infinity;for(const c of centers)d=Math.min(d,v.distanceTo(c));if(d<this.proportionalRadius)all.add(i)}}for(const i of all){const local=new THREE.Vector3().fromBufferAttribute(p,i),world=this.mesh.localToWorld(local.clone()),weight=this.proportional&&!this.selected.has(i)?this._weight(local,p,selected):1;world.addScaledVector(deltaWorld,weight);const next=this.mesh.worldToLocal(world);applyClip(next,this.getMirror());p.setXYZ(i,next.x,next.y,next.z)}p.needsUpdate=true;refreshGeometry(this.mesh.geometry);this.selection.rebuild();this.proxyStart.copy(this.proxy.position)}
 _weight(v,p,ids){let d=Infinity;for(const i of ids)d=Math.min(d,v.distanceTo(new THREE.Vector3().fromBufferAttribute(p,i)));const t=Math.max(0,1-d/this.proportionalRadius);return t*t*(3-2*t)}
 transformEnd(){if(!this.dragBefore)return;const before=this.dragBefore,after=this.mesh.geometry.clone();this.dragBefore=null;this.onCommit(before,after,this.mesh,true);this._updateProxy()}
 snapshot(){return this.mesh?.geometry?.clone()||null}
 restore(g){if(!this.mesh||!g)return;this.mesh.geometry.dispose?.();this.mesh.geometry=g.clone();refreshGeometry(this.mesh.geometry);this.selection.enter(this.mesh);this._updateProxy()}
 mergeSelected(mode='center',threshold=1e-4){if(!this.active||this.selected.size<2)return false;const before=this.mesh.geometry.clone(),p=this.mesh.geometry.getAttribute('position'),ids=[...this.selected],target=new THREE.Vector3();if(mode==='first')target.fromBufferAttribute(p,ids[0]);else if(mode==='last')target.fromBufferAttribute(p,ids[ids.length-1]);else{for(const i of ids)target.add(new THREE.Vector3().fromBufferAttribute(p,i));target.multiplyScalar(1/ids.length)}applyClip(target,this.getMirror());if(mode==='distance'){for(let a=0;a<ids.length;a++){const va=new THREE.Vector3().fromBufferAttribute(p,ids[a]);for(let b=a+1;b<ids.length;b++){const vb=new THREE.Vector3().fromBufferAttribute(p,ids[b]);if(va.distanceTo(vb)<=threshold)p.setXYZ(ids[b],va.x,va.y,va.z)}}}else for(const i of ids)p.setXYZ(i,target.x,target.y,target.z);p.needsUpdate=true;refreshGeometry(this.mesh.geometry);this.selection.rebuild();this.onCommit(before,this.mesh.geometry.clone(),this.mesh,true);return true}
 extrude(distance=.2){const faces=this.selection.selectedFaceIndices();if(!faces.size)return false;return this._apply(extrudeFaces(this.mesh.geometry,faces,distance),'Extrude')}
 inset(amount=.2){const faces=this.selection.selectedFaceIndices();if(!faces.size)return false;return this._apply(insetFaces(this.mesh.geometry,faces,amount),'Inset')}
 loopCut(position=.5){return this._apply(loopCut(this.mesh.geometry,position),'Loop Cut')}
 bevel(width=.08,segments=1){if(this.mode!=='edge'||!this.selection.edges.size)return false;return this._apply(bevelEdges(this.mesh.geometry,this.selection.edges,width,segments),'Bevel')}
 knife(){const faces=this.selection.selectedFaceIndices();if(!faces.size)return false;const g=this.mesh.geometry.clone(),p=g.getAttribute('position'),arr=[];for(let f=0;f<p.count/3;f++){const A=new THREE.Vector3().fromBufferAttribute(p,f*3),B=new THREE.Vector3().fromBufferAttribute(p,f*3+1),C=new THREE.Vector3().fromBufferAttribute(p,f*3+2);if(!faces.has(f)){for(const v of [A,B,C])arr.push(v.x,v.y,v.z);continue}const M=A.clone().add(B).add(C).multiplyScalar(1/3);for(const tri of [[A,B,M],[B,C,M],[C,A,M]])for(const v of tri)arr.push(v.x,v.y,v.z)}const next=new THREE.BufferGeometry();next.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));refreshGeometry(next);return this._apply(next,'Knife')}
 subdivide(level=1){if(!this.active)return false;let next=this.mesh.geometry.clone();for(let i=0;i<Math.max(1,Math.min(3,level));i++){const tri=next.getAttribute('position').count/3;if(tri*4>200000){alert('Subdivisão cancelada: limite de 200 mil triângulos.');return false}next=subdivisionOnce(next)}return this._apply(next,'Subdivision')}
 setProportional(enabled,radius=this.proportionalRadius){this.proportional=!!enabled;this.proportionalRadius=Math.max(.01,Number(radius)||.75)}
 _apply(next,label){const before=this.mesh.geometry.clone();this.mesh.geometry.dispose?.();this.mesh.geometry=next;refreshGeometry(next);this.selection.enter(this.mesh);this.onCommit(before,next.clone(),this.mesh,true,label);return true}
 _updateProxy(){if(!this.proxy||!this.mesh||!this.selected.size){if(this.engine.transform)this.engine.transform.visible=false;return}const p=this.mesh.geometry.getAttribute('position'),sum=new THREE.Vector3();for(const i of this.selected){const v=new THREE.Vector3().fromBufferAttribute(p,i);this.mesh.localToWorld(v);sum.add(v)}sum.multiplyScalar(1/this.selected.size);this.proxy.position.copy(sum);this.proxy.quaternion.identity();this.proxy.scale.set(1,1,1);this.proxyStart=sum.clone();this.engine.attach(this.proxy);this.engine.transform.visible=true}
}
function applyClip(v,{axes=[],clipping=false}={}){if(!clipping)return;for(const a of axes||[])if(Math.abs(v[a])<.045)v[a]=0}

import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { deepCloneObject } from './object-factory.js';

function combos(axes){const a=axes.filter(Boolean),out=[];for(let mask=1;mask<(1<<a.length);mask++){const c=[];for(let i=0;i<a.length;i++)if(mask&(1<<i))c.push(a[i]);out.push(c)}return out}
function sanitizeReal(root){root.traverse(o=>{delete o.userData.helper;delete o.userData.mirrorHelper;delete o.userData.mirroredClone;delete o.userData.sourceUuid;delete o.userData.mirrorAxes});root.userData.editable=true;return root}
function nonIndexedClone(geometry){return geometry.index?geometry.toNonIndexed():geometry.clone()}
function reverseWinding(geometry){const g=nonIndexedClone(geometry),attrs=Object.values(g.attributes);for(let i=0;i<g.getAttribute('position').count;i+=3){for(const attr of attrs){const a0=i*attr.itemSize,b0=(i+2)*attr.itemSize;for(let c=0;c<attr.itemSize;c++){const t=attr.array[a0+c];attr.array[a0+c]=attr.array[b0+c];attr.array[b0+c]=t}attr.needsUpdate=true}}geometry.dispose?.();return g}

export class MirrorSystem{
 constructor(){this.entries=new Map();this.clipping=true;this.merge=true}
 setOptions({clipping,merge}){if(clipping!=null)this.clipping=!!clipping;if(merge!=null)this.merge=!!merge}
 setAxes(source,axes=[]){
  if(!source||source.userData?.mirrorHelper)return;this.clear(source,false);const enabled=[...new Set(axes.filter(a=>['x','y','z'].includes(a)))];
  if(!enabled.length){delete source.userData.mirrorAxes;return}const parent=source.parent;if(!parent)return;source.userData.mirrorAxes=[...enabled];
  const helpers=[];for(const set of combos(enabled)){const wrap=new THREE.Group();wrap.name=`Mirror_${set.join('').toUpperCase()}_${source.name}`;wrap.userData.helper=true;wrap.userData.mirrorHelper=true;wrap.userData.sourceUuid=source.uuid;for(const axis of set)wrap.scale[axis]=-1;const clone=deepCloneObject(source,{instance:true});clone.name=source.name+` [Mirror ${set.join('').toUpperCase()}]`;clone.userData.helper=true;clone.userData.mirroredClone=true;clone.userData.sourceUuid=source.uuid;delete clone.userData.mirrorAxes;wrap.add(clone);parent.add(wrap);helpers.push({axes:set,wrap,clone})}this.entries.set(source.uuid,{source,helpers});this.sync(source)
 }
 sync(source){const e=this.entries.get(source?.uuid);if(!e)return;for(const h of e.helpers){h.clone.position.copy(source.position);h.clone.quaternion.copy(source.quaternion);h.clone.scale.copy(source.scale);h.clone.visible=source.visible;syncGeometryAndMaterial(source,h.clone)}}
 has(source){return this.entries.has(source?.uuid)}
 axesFor(source){const e=this.entries.get(source?.uuid);if(e){const s=new Set();e.helpers.forEach(h=>h.axes.forEach(a=>s.add(a)));return[...s]}return Array.isArray(source?.userData?.mirrorAxes)?[...source.userData.mirrorAxes]:[]}
 clear(source,keepResult=true){
  const e=this.entries.get(source?.uuid);if(!e){if(!keepResult&&source?.userData)delete source.userData.mirrorAxes;return[]}
  const made=[],parent=source.parent;if(keepResult&&parent){parent.updateWorldMatrix(true,false);const inv=new THREE.Matrix4().copy(parent.matrixWorld).invert();for(const h of e.helpers){h.clone.updateWorldMatrix(true,true);const local=new THREE.Matrix4().multiplyMatrices(inv,h.clone.matrixWorld);const real=sanitizeReal(deepCloneObject(h.clone,{instance:false}));real.name=h.clone.name.replace(' [Mirror',' Mirror').replace(']','');local.decompose(real.position,real.quaternion,real.scale);parent.add(real);made.push(real)}}
  for(const h of e.helpers)h.wrap.parent?.remove(h.wrap);this.entries.delete(source.uuid);delete source.userData.mirrorAxes;return made
 }
 apply(source){
  const e=this.entries.get(source?.uuid);if(!e)return{made:[],merged:false};
  if(this.merge&&source.isMesh)return this._mergeMesh(source,e);
  return{made:this.clear(source,true),merged:false}
 }
 _mergeMesh(source,e){
  source.updateWorldMatrix(true,false);const inv=new THREE.Matrix4().copy(source.matrixWorld).invert(),geos=[nonIndexedClone(source.geometry)];
  for(const h of e.helpers){h.clone.updateWorldMatrix(true,false);let g=nonIndexedClone(h.clone.geometry),m=new THREE.Matrix4().multiplyMatrices(inv,h.clone.matrixWorld);g.applyMatrix4(m);if(m.determinant()<0)g=reverseWinding(g);geos.push(g)}
  let merged=mergeGeometries(geos,false);geos.forEach(g=>g.dispose?.());if(!merged)return{made:this.clear(source,true),merged:false};
  if(this.clipping){const welded=mergeVertices(merged,1e-5);merged.dispose();merged=welded}
  merged.computeVertexNormals();merged.computeBoundingBox();merged.computeBoundingSphere();const before=source.geometry.clone();for(const h of e.helpers)h.wrap.parent?.remove(h.wrap);this.entries.delete(source.uuid);delete source.userData.mirrorAxes;source.geometry=merged;return{made:[source],merged:true,before,after:merged.clone()}
 }
 removeAll(){for(const e of [...this.entries.values()])this.clear(e.source,false)}
 restore(root){const pending=[];root?.traverse(o=>{if(!o.userData?.helper&&Array.isArray(o.userData?.mirrorAxes)&&o.userData.mirrorAxes.length)pending.push([o,[...o.userData.mirrorAxes]])});for(const [o,axes] of pending)this.setAxes(o,axes);return pending.length}
}

function syncGeometryAndMaterial(source,clone){const sm=[],cm=[];source.traverse(o=>{if(o.isMesh)sm.push(o)});clone.traverse(o=>{if(o.isMesh)cm.push(o)});for(let i=0;i<Math.min(sm.length,cm.length);i++){cm[i].geometry=sm[i].geometry;cm[i].material=sm[i].material}}

import * as THREE from 'three';
import { deepCloneObject } from './object-factory.js';

function combos(axes){const a=axes.filter(Boolean);const out=[];for(let mask=1;mask<(1<<a.length);mask++){const c=[];for(let i=0;i<a.length;i++)if(mask&(1<<i))c.push(a[i]);out.push(c)}return out}
export class MirrorSystem{
 constructor(){this.entries=new Map();this.clipping=true;this.merge=true}
 setOptions({clipping,merge}){if(clipping!=null)this.clipping=!!clipping;if(merge!=null)this.merge=!!merge}
 setAxes(source,axes=[]){if(!source||source.userData?.mirrorHelper)return;this.clear(source,false);const enabled=axes.filter(a=>['x','y','z'].includes(a));if(!enabled.length)return;const parent=source.parent;if(!parent)return;const helpers=[];for(const set of combos(enabled)){const wrap=new THREE.Group();wrap.name=`Mirror_${set.join('').toUpperCase()}_${source.name}`;wrap.userData.helper=true;wrap.userData.mirrorHelper=true;wrap.userData.sourceUuid=source.uuid;for(const axis of set)wrap.scale[axis]=-1;const clone=deepCloneObject(source,{instance:true});clone.name=source.name+` [Mirror ${set.join('').toUpperCase()}]`;clone.userData.helper=true;clone.userData.mirroredClone=true;clone.userData.sourceUuid=source.uuid;wrap.add(clone);parent.add(wrap);helpers.push({axes:set,wrap,clone})}this.entries.set(source.uuid,{source,helpers});this.sync(source)}
 sync(source){const e=this.entries.get(source?.uuid);if(!e)return;for(const h of e.helpers){h.clone.position.copy(source.position);h.clone.quaternion.copy(source.quaternion);h.clone.scale.copy(source.scale);h.clone.visible=source.visible;syncGeometryAndMaterial(source,h.clone)}}
 has(source){return this.entries.has(source?.uuid)}
 axesFor(source){const e=this.entries.get(source?.uuid);if(!e)return[];const s=new Set();e.helpers.forEach(h=>h.axes.forEach(a=>s.add(a)));return[...s]}
 clear(source,keepResult=true){const e=this.entries.get(source?.uuid);if(!e)return[];const made=[];const parent=source.parent;if(keepResult&&parent){parent.updateWorldMatrix(true,false);const inv=new THREE.Matrix4().copy(parent.matrixWorld).invert();for(const h of e.helpers){h.clone.updateWorldMatrix(true,true);const local=new THREE.Matrix4().multiplyMatrices(inv,h.clone.matrixWorld);const real=deepCloneObject(h.clone,{instance:false});real.userData.helper=false;delete real.userData.mirroredClone;delete real.userData.sourceUuid;real.name=h.clone.name.replace(' [Mirror',' Mirror').replace(']','');local.decompose(real.position,real.quaternion,real.scale);parent.add(real);made.push(real)}}for(const h of e.helpers)h.wrap.parent?.remove(h.wrap);this.entries.delete(source.uuid);return made}
 apply(source){return this.clear(source,true)}
 removeAll(){for(const e of [...this.entries.values()])this.clear(e.source,false)}
}
function syncGeometryAndMaterial(source,clone){const sm=[],cm=[];source.traverse(o=>{if(o.isMesh)sm.push(o)});clone.traverse(o=>{if(o.isMesh)cm.push(o)});for(let i=0;i<Math.min(sm.length,cm.length);i++){cm[i].geometry=sm[i].geometry;cm[i].material=sm[i].material}}

import * as THREE from 'three';
import { createPrimitive, applyMaterial } from './object-factory.js';

function mesh(g,m,name,type){const o=new THREE.Mesh(g,m);o.name=name;o.castShadow=true;o.receiveShadow=true;o.userData.editable=true;o.userData.componentType=type;return o}
function standard(color,metalness=.05,roughness=.5){return new THREE.MeshStandardMaterial({color,metalness,roughness})}
function mount(name,pos,type='wheel'){const g=new THREE.SphereGeometry(.09,12,8),m=new THREE.MeshBasicMaterial({color:0x7c5cff,wireframe:true,transparent:true,opacity:.7});const o=new THREE.Mesh(g,m);o.name=name;o.position.copy(pos);o.userData.isMount=true;o.userData.mountType=type;o.userData.helper=true;o.userData.occupied=false;return o}
function scopeFor(object){let cur=object;while(cur?.parent){if(cur.userData?.template)return cur;cur=cur.parent}return object?.parent||object}
function findMount(scope,uuid){let found=null;scope?.traverse?.(o=>{if(!found&&o.userData?.isMount&&o.uuid===uuid)found=o});return found}

export function createCarTemplate(){
 const root=new THREE.Group();root.name='Carro';root.userData.template='car';root.userData.editable=true;
 const body=mesh(new THREE.BoxGeometry(2.4,.65,4.2,4,2,8),standard(0x6f2cff,.72,.24),'Carroceria','body');body.position.y=.72;root.add(body);
 const cabin=mesh(new THREE.BoxGeometry(1.95,.78,1.95,2,2,4),standard(0x202936,.18,.26),'Cabine','body');cabin.position.set(0,1.35,-.15);cabin.scale.set(.95,1,1);root.add(cabin);
 const bumperF=mesh(new THREE.BoxGeometry(2.15,.18,.25),standard(0x20242b,.6,.32),'Parachoque_Frente','body');bumperF.position.set(0,.54,2.18);root.add(bumperF);
 const bumperB=bumperF.clone();bumperB.name='Parachoque_Traseiro';bumperB.position.z=-2.18;root.add(bumperB);
 const positions=[[-1.23,.48,1.48],[1.23,.48,1.48],[-1.23,.48,-1.48],[1.23,.48,-1.48]];const names=['Roda_Dianteira_Esquerda','Roda_Dianteira_Direita','Roda_Traseira_Esquerda','Roda_Traseira_Direita'];positions.forEach((p,i)=>root.add(mount('Mount_'+names[i],new THREE.Vector3(...p))));
 body.userData.mirrorRecommended='x';cabin.userData.mirrorRecommended='x';return root;
}
export function createWheel(name='Roda'){const w=mesh(new THREE.CylinderGeometry(.48,.48,.34,32,2),standard(0x14171c,.05,.88),name,'wheel');w.rotation.z=Math.PI/2;w.userData.snapType='wheel';return w}

export function rebuildMountOccupancy(root){
 if(!root)return 0;const mounts=new Map();root.traverse(o=>{if(o.userData?.isMount){o.userData.occupied=false;mounts.set(o.uuid,o)}});let used=0;root.traverse(o=>{if(o.userData?.isMount)return;const id=o.userData?.mountUuid;if(id&&mounts.has(id)){mounts.get(id).userData.occupied=true;used++}});return used
}
export function releaseMount(object,root=scopeFor(object)){
 if(!object)return false;const id=object.userData?.mountUuid;if(!id)return false;const old=findMount(root,id);if(old)old.userData.occupied=false;delete object.userData.mountUuid;delete object.userData.mountName;return true
}
export function availableMounts(root,type='wheel'){rebuildMountOccupancy(root);const out=[];root?.traverse(o=>{if(o.userData?.isMount&&o.userData.mountType===type&&!o.userData.occupied)out.push(o)});return out}
export function snapToMount(object,mount){
 if(!object||!mount)return false;const scope=scopeFor(mount)||scopeFor(object);releaseMount(object,scope);const p=mount.getWorldPosition(new THREE.Vector3());const parent=object.parent;if(parent)parent.worldToLocal(p);object.position.copy(p);mount.userData.occupied=true;object.userData.mountUuid=mount.uuid;object.userData.mountName=mount.name;return true
}

export function createPersonTemplate(){
 const root=new THREE.Group();root.name='Pessoa';root.userData.template='person';root.userData.editable=true;
 const skin=standard(0xc98d72,0,.62),cloth=standard(0x42506a,.05,.6);
 const head=mesh(new THREE.SphereGeometry(.48,28,18),skin.clone(),'Cabeça','head');head.position.y=3.05;root.add(head);
 const torso=mesh(new THREE.CapsuleGeometry(.62,1.25,6,16),cloth.clone(),'Tronco','torso');torso.position.y=1.85;root.add(torso);
 const armG=new THREE.CapsuleGeometry(.18,1.15,5,12);const leftArm=mesh(armG,skin.clone(),'Braço_Esquerdo','arm');leftArm.position.set(-.92,1.9,0);leftArm.rotation.z=-.08;root.add(leftArm);const rightArm=leftArm.clone();rightArm.name='Braço_Direito';rightArm.position.x=.92;rightArm.rotation.z=.08;root.add(rightArm);
 const handG=new THREE.SphereGeometry(.22,16,10);const lh=mesh(handG,skin.clone(),'Mão_Esquerda','hand');lh.position.set(-.95,1.14,0);root.add(lh);const rh=lh.clone();rh.name='Mão_Direita';rh.position.x=.95;root.add(rh);
 const legG=new THREE.CapsuleGeometry(.23,1.55,5,12);const leftLeg=mesh(legG,cloth.clone(),'Perna_Esquerda','leg');leftLeg.position.set(-.32,.35,0);root.add(leftLeg);const rightLeg=leftLeg.clone();rightLeg.name='Perna_Direita';rightLeg.position.x=.32;root.add(rightLeg);
 const footG=new THREE.BoxGeometry(.42,.25,.72);const lf=mesh(footG,standard(0x17191e),'Pé_Esquerdo','foot');lf.position.set(-.32,-.62,.18);root.add(lf);const rf=lf.clone();rf.name='Pé_Direito';rf.position.x=.32;root.add(rf);
 return root;
}
export function createRobotTemplate(){const root=createPersonTemplate();root.name='Robô';root.userData.template='robot';root.traverse(o=>{if(o.isMesh)applyMaterial(o,{color:o.userData.componentType==='head'?'#7c5cff':'#6b7280',metalness:.72,roughness:.28})});return root}
export function createFurnitureTemplate(){const root=new THREE.Group();root.name='Mobiliário';root.userData.template='furniture';root.userData.editable=true;const top=createPrimitive('cube','Tampo');top.scale.set(1.7,.12,.85);top.position.y=1.15;applyMaterial(top,{color:'#7b4d2c',roughness:.72});root.add(top);[[-1.4,.5,-.62],[1.4,.5,-.62],[-1.4,.5,.62],[1.4,.5,.62]].forEach((p,i)=>{const leg=createPrimitive('cube','Pé_'+(i+1));leg.scale.set(.12,.58,.12);leg.position.set(...p);applyMaterial(leg,{color:'#5a351e',roughness:.78});root.add(leg)});return root}
export function createTemplate(type){if(type==='car')return createCarTemplate();if(type==='person')return createPersonTemplate();if(type==='robot')return createRobotTemplate();if(type==='furniture')return createFurnitureTemplate();const root=new THREE.Group();root.name='Objeto';root.userData.template='object';root.userData.editable=true;return root}

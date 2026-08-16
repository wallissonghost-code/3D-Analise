import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';

function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
function isTransient(o){return o.name==='_VertexPoints'||o.name==='_VertexProxy'}
function exportClone(root){
 const c=root.clone(true),kill=[];c.traverse(o=>{if(o.userData?.isMount||isTransient(o))kill.push(o)});kill.forEach(o=>o.parent?.remove(o));c.traverse(o=>{delete o.userData.helper;delete o.userData.isMount;delete o.userData.occupied;delete o.userData.mountType;delete o.userData.mirrorHelper;delete o.userData.mirroredClone;delete o.userData.sourceUuid;delete o.userData.mirrorAxes});return c
}
function projectClone(root){
 const c=root.clone(true),kill=[];c.traverse(o=>{if(isTransient(o)||o.userData?.mirrorHelper)kill.push(o)});kill.forEach(o=>o.parent?.remove(o));return c
}
export async function exportGLB(root,name='modelo'){const exporter=new GLTFExporter(),target=exportClone(root);const data=await new Promise((resolve,reject)=>exporter.parse(target,resolve,reject,{binary:true,onlyVisible:true,trs:false}));downloadBlob(new Blob([data],{type:'model/gltf-binary'}),safe(name)+'.glb')}
export async function exportGLTF(root,name='modelo'){const exporter=new GLTFExporter(),target=exportClone(root);const data=await new Promise((resolve,reject)=>exporter.parse(target,resolve,reject,{binary:false,onlyVisible:true,trs:false}));downloadBlob(new Blob([JSON.stringify(data,null,2)],{type:'model/gltf+json'}),safe(name)+'.gltf')}
export function exportOBJ(root,name='modelo'){const exporter=new OBJExporter(),target=exportClone(root),text=exporter.parse(target);downloadBlob(new Blob([text],{type:'text/plain'}),safe(name)+'.obj')}
export function saveProject(root,name='Meu Projeto 3D'){const target=projectClone(root),payload={app:'3D Analise Modeler',version:2,name,createdAt:new Date().toISOString(),scene:target.toJSON()};downloadBlob(new Blob([JSON.stringify(payload)],{type:'application/json'}),safe(name)+'.3da.json')}
export async function loadProject(file){const text=await file.text(),data=JSON.parse(text);if(!data?.scene||!data?.app?.includes?.('3D Analise'))throw new Error('Projeto inválido');const loader=new THREE.ObjectLoader(),obj=loader.parse(data.scene);return{version:data.version||1,name:data.name||file.name.replace(/\.3da\.json$/i,''),object:obj}}
function safe(v){return(String(v||'modelo').trim()||'modelo').replace(/[\\/:*?"<>|]+/g,'_').replace(/\s+/g,'_')}

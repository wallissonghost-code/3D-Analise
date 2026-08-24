import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas=document.querySelector('#viewer');
const viewerWrap=document.querySelector('.viewer-wrap');
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x101720);

const camera=new THREE.PerspectiveCamera(42,1,0.01,10000);
camera.position.set(5,3.5,6);

const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.1;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;

const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;
controls.dampingFactor=.07;
controls.rotateSpeed=.65;
controls.zoomSpeed=.85;
controls.panSpeed=.7;
controls.screenSpacePanning=true;
controls.autoRotate=false;
controls.autoRotateSpeed=1.25;

const hemi=new THREE.HemisphereLight(0xeaf4ff,0x26313f,1.5);
scene.add(hemi);
const key=new THREE.DirectionalLight(0xffffff,4.5);key.position.set(6,8,7);key.castShadow=true;key.shadow.mapSize.set(2048,2048);scene.add(key);
const fill=new THREE.DirectionalLight(0x9ec7ff,2.1);fill.position.set(-5,3,-4);scene.add(fill);
const rim=new THREE.DirectionalLight(0xffffff,1.7);rim.position.set(0,6,-8);scene.add(rim);

const grid=new THREE.GridHelper(20,20,0x3b4757,0x202936);grid.position.y=0;scene.add(grid);
const floorMat=new THREE.ShadowMaterial({opacity:.28});
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),floorMat);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);

let currentRoot=null;
let currentFileUrl=null;
let lastBox=null;
let lastCenter=new THREE.Vector3();
let lastSize=new THREE.Vector3(1,1,1);
let originalMaterials=[];
let lastRemoteBlob=null;
let lastRemoteName='modelo.glb';

const $=s=>document.querySelector(s);
const els={
 fileInput:$('#fileInput'),dropZone:$('#dropZone'),emptyState:$('#emptyState'),statusBadge:$('#statusBadge'),
 fileName:$('#fileName'),fileSize:$('#fileSize'),meshCount:$('#meshCount'),triangleCount:$('#triangleCount'),materialCount:$('#materialCount'),dimensions:$('#dimensions'),
 gridToggle:$('#gridToggle'),autoRotate:$('#autoRotate'),wireframe:$('#wireframe'),shadows:$('#shadows'),lightPower:$('#lightPower'),lightPowerValue:$('#lightPowerValue'),resetCamera:$('#resetCamera'),
 modelUrl:$('#modelUrl'),openUrl:$('#openUrl'),downloadUrl:$('#downloadUrl'),urlStatus:$('#urlStatus'),urlImportBtn:$('#urlImportBtn')
};

function resize(){const r=viewerWrap.getBoundingClientRect();renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix()}
new ResizeObserver(resize).observe(viewerWrap);resize();

function humanBytes(n){if(!Number.isFinite(n))return '—';const u=['B','KB','MB','GB'];let i=0,v=n;while(v>=1024&&i<u.length-1){v/=1024;i++}return `${v.toFixed(v>=10||i===0?0:1)} ${u[i]}`}
function fmt(n){return new Intl.NumberFormat('pt-BR').format(n)}
function disposeRoot(root){root.traverse(o=>{if(o.geometry)o.geometry.dispose?.();if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{for(const k in m){const v=m[k];if(v&&v.isTexture)v.dispose?.()}m.dispose?.()})}})}
function clearModel(){if(currentRoot){scene.remove(currentRoot);disposeRoot(currentRoot);currentRoot=null}if(currentFileUrl){URL.revokeObjectURL(currentFileUrl);currentFileUrl=null}originalMaterials=[]}
function setUrlStatus(text,state=''){els.urlStatus.textContent=text;els.urlStatus.dataset.state=state}

function analyze(root,file){let meshes=0,triangles=0;const mats=new Set();root.traverse(o=>{if(!o.isMesh)return;meshes++;o.castShadow=true;o.receiveShadow=true;const p=o.geometry?.getAttribute?.('position');const idx=o.geometry?.index;triangles+=idx?idx.count/3:(p?p.count/3:0);const list=Array.isArray(o.material)?o.material:[o.material];list.filter(Boolean).forEach(m=>mats.add(m.uuid))});
 lastBox=new THREE.Box3().setFromObject(root);lastBox.getCenter(lastCenter);lastBox.getSize(lastSize);
 els.fileName.textContent=file.name;els.fileSize.textContent=humanBytes(file.size);els.meshCount.textContent=fmt(meshes);els.triangleCount.textContent=fmt(Math.round(triangles));els.materialCount.textContent=fmt(mats.size);els.dimensions.textContent=`${lastSize.x.toFixed(2)} × ${lastSize.y.toFixed(2)} × ${lastSize.z.toFixed(2)}`;
 els.statusBadge.textContent='MODELO PRONTO';els.statusBadge.classList.add('ready');els.emptyState.classList.add('hidden');
}

function frameModel(view='iso'){
 if(!currentRoot)return;
 lastBox=new THREE.Box3().setFromObject(currentRoot);lastBox.getCenter(lastCenter);lastBox.getSize(lastSize);
 const max=Math.max(lastSize.x,lastSize.y,lastSize.z,0.01);const dist=max/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)))*1.55;
 const dirs={front:[0,0,1],back:[0,0,-1],left:[-1,0,0],right:[1,0,0],top:[0,1,0],iso:[1,.65,1]};
 const d=new THREE.Vector3(...(dirs[view]||dirs.iso)).normalize();camera.position.copy(lastCenter).addScaledVector(d,dist);camera.near=Math.max(.001,dist/1000);camera.far=Math.max(100,dist*100);camera.updateProjectionMatrix();controls.target.copy(lastCenter);controls.update();
 floor.position.y=lastBox.min.y-.002;grid.position.y=floor.position.y+.001;
}

async function loadFile(file){
 if(!file)return;const ext=file.name.split('.').pop()?.toLowerCase();if(!['glb','gltf'].includes(ext)){alert('Use um arquivo .GLB ou .GLTF');return}
 clearModel();els.statusBadge.textContent='CARREGANDO…';els.statusBadge.classList.remove('ready');
 const loader=new GLTFLoader();currentFileUrl=URL.createObjectURL(file);
 try{
  const gltf=await loader.loadAsync(currentFileUrl);currentRoot=gltf.scene||gltf.scenes?.[0];if(!currentRoot)throw new Error('Cena 3D não encontrada');scene.add(currentRoot);
  analyze(currentRoot,file);frameModel('iso');applyWireframe();applyShadows();
 }catch(err){console.error(err);els.statusBadge.textContent='ERRO';alert(ext==='gltf'?'Este GLTF pode depender de arquivos .bin/texturas externos. Para análise local, prefira GLB, que leva tudo em um único arquivo.':'Não foi possível abrir este modelo 3D.');clearModel();throw err}
}

function normalizeUrl(raw){
 const value=(raw||'').trim();
 if(!value)throw new Error('Cole uma URL primeiro.');
 const url=new URL(value);
 if(!/^https?:$/.test(url.protocol))throw new Error('Use uma URL http ou https.');
 return url.toString();
}

function nameFromUrl(url){
 try{const u=new URL(url);const last=decodeURIComponent(u.pathname.split('/').filter(Boolean).pop()||'modelo.glb');return last.toLowerCase().endsWith('.glb')?last:'modelo.glb'}catch{return 'modelo.glb'}
}

function extractGlbCandidates(text,baseUrl){
 const found=new Set();
 const decoded=text.replace(/\\u002F/g,'/').replace(/\\\//g,'/').replace(/&amp;/g,'&');
 const patterns=[/https?:[^"'<>\s]+?\.glb(?:\?[^"'<>\s]*)?/gi,/[^"'<>\s]+?\.glb(?:\?[^"'<>\s]*)?/gi];
 for(const re of patterns){for(const m of decoded.matchAll(re)){let candidate=m[0].replace(/[),]+$/,'');try{candidate=new URL(candidate,baseUrl).toString();found.add(candidate)}catch{}}}
 return [...found];
}

async function fetchAsBlob(url){
 const response=await fetch(url,{method:'GET',mode:'cors',credentials:'omit',cache:'no-store'});
 if(!response.ok)throw new Error(`HTTP ${response.status}`);
 return {blob:await response.blob(),contentType:(response.headers.get('content-type')||'').toLowerCase(),finalUrl:response.url||url};
}

async function resolveRemoteGlb(inputUrl){
 const url=normalizeUrl(inputUrl);
 setUrlStatus('Analisando URL…','loading');

 if(/\.glb(?:$|[?#])/i.test(url)){
  const direct=await fetchAsBlob(url);
  if(direct.blob.size<20)throw new Error('O arquivo retornado está vazio ou inválido.');
  return {blob:direct.blob,url:direct.finalUrl,name:nameFromUrl(direct.finalUrl)};
 }

 const page=await fetch(url,{method:'GET',mode:'cors',credentials:'omit',cache:'no-store'});
 if(!page.ok)throw new Error(`A página respondeu HTTP ${page.status}`);
 const type=(page.headers.get('content-type')||'').toLowerCase();
 if(type.includes('model/gltf-binary')||type.includes('application/octet-stream')){
  const blob=await page.blob();
  return {blob,url:page.url||url,name:nameFromUrl(page.url||url)};
 }

 const text=await page.text();
 const candidates=extractGlbCandidates(text,page.url||url);
 if(!candidates.length)throw new Error('Nenhum link .glb público foi encontrado nessa página.');

 let lastError=null;
 for(const candidate of candidates){
  try{
   setUrlStatus(`Encontrado GLB. Tentando baixar…`,'loading');
   const result=await fetchAsBlob(candidate);
   if(result.blob.size>=20)return {blob:result.blob,url:result.finalUrl,name:nameFromUrl(result.finalUrl)};
  }catch(err){lastError=err}
 }
 throw lastError||new Error('Foi encontrado um GLB, mas o servidor bloqueou o download.');
}

async function importRemoteUrl(){
 try{
  els.openUrl.disabled=true;els.downloadUrl.disabled=true;
  const result=await resolveRemoteGlb(els.modelUrl.value);
  const file=new File([result.blob],result.name,{type:result.blob.type||'model/gltf-binary'});
  lastRemoteBlob=result.blob;lastRemoteName=result.name;
  await loadFile(file);
  setUrlStatus(`Pronto: ${result.name} • ${humanBytes(result.blob.size)}`,'success');
 }catch(err){
  console.error(err);
  const cors=/Failed to fetch|NetworkError|Load failed/i.test(String(err?.message||err));
  setUrlStatus(cors?'O servidor bloqueou o acesso pelo navegador (CORS). É necessário um backend/proxy autorizado para esse site.':`Não foi possível importar: ${err.message||err}`,'error');
 }finally{els.openUrl.disabled=false;els.downloadUrl.disabled=false}
}

async function downloadRemoteUrl(){
 try{
  els.openUrl.disabled=true;els.downloadUrl.disabled=true;
  let blob=lastRemoteBlob,name=lastRemoteName;
  if(!blob){const result=await resolveRemoteGlb(els.modelUrl.value);blob=result.blob;name=result.name;lastRemoteBlob=blob;lastRemoteName=name}
  const href=URL.createObjectURL(blob);const a=document.createElement('a');a.href=href;a.download=name||'modelo.glb';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),1500);
  setUrlStatus(`Download iniciado: ${name}`,'success');
 }catch(err){console.error(err);setUrlStatus(`Não foi possível baixar: ${err.message||err}`,'error')}
 finally{els.openUrl.disabled=false;els.downloadUrl.disabled=false}
}

els.fileInput.addEventListener('change',e=>loadFile(e.target.files?.[0]));
['dragenter','dragover'].forEach(n=>els.dropZone.addEventListener(n,e=>{e.preventDefault();els.dropZone.classList.add('dragover')}));
['dragleave','drop'].forEach(n=>els.dropZone.addEventListener(n,e=>{e.preventDefault();els.dropZone.classList.remove('dragover')}));
els.dropZone.addEventListener('drop',e=>loadFile(e.dataTransfer?.files?.[0]));
window.addEventListener('dragover',e=>e.preventDefault());
window.addEventListener('drop',e=>{e.preventDefault();if(!els.dropZone.contains(e.target))loadFile(e.dataTransfer?.files?.[0])});

els.openUrl.addEventListener('click',importRemoteUrl);
els.downloadUrl.addEventListener('click',downloadRemoteUrl);
els.modelUrl.addEventListener('input',()=>{lastRemoteBlob=null;setUrlStatus('Pronto para testar a URL.','')});
els.modelUrl.addEventListener('keydown',e=>{if(e.key==='Enter')importRemoteUrl()});
els.urlImportBtn.addEventListener('click',()=>{els.modelUrl.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>els.modelUrl.focus(),250)});

document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>frameModel(b.dataset.view)));
els.resetCamera.addEventListener('click',()=>frameModel('iso'));
els.gridToggle.addEventListener('change',()=>grid.visible=els.gridToggle.checked);
els.autoRotate.addEventListener('change',()=>controls.autoRotate=els.autoRotate.checked);
function applyWireframe(){if(!currentRoot)return;currentRoot.traverse(o=>{if(!o.isMesh||!o.material)return;(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if('wireframe'in m)m.wireframe=els.wireframe.checked})})}
els.wireframe.addEventListener('change',applyWireframe);
function applyShadows(){renderer.shadowMap.enabled=els.shadows.checked;floor.visible=els.shadows.checked;if(currentRoot)currentRoot.traverse(o=>{if(o.isMesh){o.castShadow=els.shadows.checked;o.receiveShadow=els.shadows.checked}})}
els.shadows.addEventListener('change',applyShadows);
els.lightPower.addEventListener('input',()=>{const v=Number(els.lightPower.value);els.lightPowerValue.value=`${v.toFixed(1)}×`;hemi.intensity=1.5*v;key.intensity=4.5*v;fill.intensity=2.1*v;rim.intensity=1.7*v});

document.querySelectorAll('[data-bg]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-bg]').forEach(b=>b.classList.toggle('active',b===btn));const mode=btn.dataset.bg;if(mode==='dark'){scene.background=new THREE.Color(0x050608);grid.material.opacity=.55}else if(mode==='light'){scene.background=new THREE.Color(0xd9dde2);grid.material.opacity=.3}else{scene.background=new THREE.Color(0x101720);grid.material.opacity=1}}));

function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera)}animate();

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { enhanceModelingToolbar } from './ui/modeling-toolbar.js';

const MODEL_EXT=/\.(glb|gltf)$/i;

function install(attempt=0){
  const input=document.querySelector('#openProjectInput');
  if(!input)return;
  if(input.dataset.modelImportInstalled)return;
  const original=input.onchange;
  if(!original&&attempt<30){setTimeout(()=>install(attempt+1),50);return}
  input.dataset.modelImportInstalled='1';
  input.onchange=async e=>{
    const files=[...(e.target.files||[])];
    const main=files.find(f=>MODEL_EXT.test(f.name));
    if(!main){return original?.call(input,e)}
    try{await importModel(files,main)}catch(err){console.error(err);notify('Não foi possível abrir este GLB/glTF. Verifique o arquivo e seus recursos externos.')}
    finally{e.target.value=''}
  };
}

async function importModel(files,main){
  const engine=window.__modelerEngine;
  if(!engine?.root)throw new Error('SceneEngine indisponível');
  const urls=new Map(),created=[];
  for(const file of files){
    if(file===main)continue;
    const url=URL.createObjectURL(file);created.push(url);
    urls.set(normalize(file.name),url);urls.set(normalize(baseName(file.name)),url)
  }
  const manager=new THREE.LoadingManager();
  manager.setURLModifier(url=>{
    const key=normalize(decodeURIComponent(url.split(/[?#]/)[0]||''));
    return urls.get(key)||urls.get(normalize(baseName(key)))||url
  });
  const loader=new GLTFLoader(manager);
  let gltf;
  try{
    const data=/\.glb$/i.test(main.name)?await main.arrayBuffer():await main.text();
    gltf=await new Promise((resolve,reject)=>loader.parse(data,'',resolve,reject))
  }finally{created.forEach(URL.revokeObjectURL)}

  const root=gltf.scene||new THREE.Group();
  const name=main.name.replace(/\.(glb|gltf)$/i,'')||'Modelo importado';
  if(!root.name||/^scene$/i.test(root.name))root.name=name;
  root.userData.importedModel=true;root.userData.importSource=main.name;root.userData.animationCount=gltf.animations?.length||0;

  let meshes=0,rigged=0;
  root.traverse(o=>{
    if(!o.isMesh)return;meshes++;
    o.userData.importedMesh=true;o.castShadow=true;o.receiveShadow=true;
    const g=o.geometry;
    if(g?.getAttribute?.('position')){
      if(!g.getAttribute('normal'))g.computeVertexNormals();
      g.computeBoundingBox();g.computeBoundingSphere()
    }
    if(o.isSkinnedMesh||o.skeleton){rigged++;o.userData.riggedImport=true}
  });
  if(!meshes)throw new Error('O arquivo não possui malha editável');

  window.__modeler?.newProject?.();
  engine.root.add(root);
  const project=document.querySelector('#projectName');if(project){project.value=name;project.dispatchEvent(new Event('input',{bubbles:true}))}
  engine.frameObjects([root],'iso');

  await nextFrame();await nextFrame();
  autoSelectFirstMesh(root,engine);
  const extra=rigged?` · ${rigged} malha${rigged===1?'':'s'} com rig detectada${rigged===1?'':'s'}; a edição de vértices pode alterar o rig.`:'';
  notify(`Modelo aberto: ${meshes} malha${meshes===1?'':'s'} pronta${meshes===1?'':'s'} para seleção e edição${extra}`)
}

function autoSelectFirstMesh(root,engine){
  let mesh=null;root.traverse(o=>{if(!mesh&&o.isMesh&&o.visible)mesh=o});if(!mesh)return;
  mesh.updateWorldMatrix(true,false);engine.camera.updateMatrixWorld();
  const box=new THREE.Box3().setFromObject(mesh),center=box.getCenter(new THREE.Vector3()).project(engine.camera),r=engine.canvas.getBoundingClientRect();
  if(!Number.isFinite(center.x)||Math.abs(center.x)>1.2||Math.abs(center.y)>1.2)return;
  const clientX=r.left+(center.x*.5+.5)*r.width,clientY=r.top+(-center.y*.5+.5)*r.height;
  engine.canvas.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,buttons:1,clientX,clientY,pointerType:'mouse',isPrimary:true}));
  window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,button:0,buttons:0,clientX,clientY,pointerType:'mouse',isPrimary:true}))
}

function notify(text){
  const box=document.querySelector('#smartSuggestion'),span=document.querySelector('#suggestionText'),accept=document.querySelector('#suggestionAccept');
  if(span)span.textContent=text;if(accept)accept.classList.add('hidden');box?.classList.remove('hidden')
}
function normalize(v){return String(v||'').replace(/^\.\//,'').replace(/\\/g,'/').toLowerCase()}
function baseName(v){return String(v||'').split('/').pop()||''}
function nextFrame(){return new Promise(resolve=>requestAnimationFrame(resolve))}

enhanceModelingToolbar();
install();

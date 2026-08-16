import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { ViewportEnvironment } from './viewport/environment.js';

export class SceneEngine{
  constructor(canvas,wrap){
    this.canvas=canvas;this.wrap=wrap;this.scene=new THREE.Scene();this.scene.background=null;
    this.perspective=new THREE.PerspectiveCamera(45,1,.01,10000);this.perspective.position.set(6,4.5,7);
    this.ortho=new THREE.OrthographicCamera(-5,5,5,-5,.01,10000);this.ortho.position.copy(this.perspective.position);
    this.camera=this.perspective;this.isOrtho=false;
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:false});this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.controls=this._makeOrbit(this.camera);
    this.transform=null;this.transformMode='translate';this.transformListeners={};this._createTransform();
    this.root=new THREE.Group();this.root.name='Projeto';this.root.userData.projectRoot=true;this.scene.add(this.root);
    this.environment=new ViewportEnvironment({scene:this.scene,renderer:this.renderer,wrap:this.wrap,canvas:this.canvas,getCamera:()=>this.camera});
    this.grid=this.environment.grid;this.floor=this.environment.floor;
    this.beforeRender=[];this._running=true;
    this._resizeObserver=new ResizeObserver(()=>this.resize());this._resizeObserver.observe(wrap);this.resize();this._loop();
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this._running=false;window.dispatchEvent(new CustomEvent('modeler-webgl-lost'))});
    canvas.addEventListener('webglcontextrestored',()=>{this._running=true;this.resize();this._loop();window.dispatchEvent(new CustomEvent('modeler-webgl-restored'))});
  }
  _makeOrbit(camera,target){const c=new OrbitControls(camera,this.canvas);c.enableDamping=true;c.dampingFactor=.08;c.screenSpacePanning=true;c.rotateSpeed=.7;c.zoomSpeed=.9;c.panSpeed=.8;c.target.copy(target||new THREE.Vector3());c.update();return c}
  _createTransform(){
    if(this.transform){this.transform.detach();this.scene.remove(this.transform);this.transform.dispose?.()}
    this.transform=new TransformControls(this.camera,this.canvas);this.transform.setMode(this.transformMode);this.transform.setSize(.9);this.transform.userData.helper=true;this.scene.add(this.transform);
    this.transform.addEventListener('dragging-changed',e=>{this.controls.enabled=!e.value;this.transformListeners.dragging?.(e.value)});
    this.transform.addEventListener('mouseDown',()=>this.transformListeners.start?.());
    this.transform.addEventListener('mouseUp',()=>this.transformListeners.end?.());
    this.transform.addEventListener('objectChange',()=>this.transformListeners.change?.());
  }
  onTransform(events){this.transformListeners=events||{}}
  resize(){const r=this.wrap.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height);this.renderer.setSize(w,h,false);this.perspective.aspect=w/h;this.perspective.updateProjectionMatrix();const span=7,aspect=w/h;this.ortho.left=-span*aspect;this.ortho.right=span*aspect;this.ortho.top=span;this.ortho.bottom=-span;this.ortho.updateProjectionMatrix()}
  setTransformMode(mode){this.transformMode=mode;this.transform.setMode(mode)}
  attach(obj){if(obj&&this._isInScene(obj))this.transform.attach(obj);else this.transform.detach()}
  detach(){this.transform.detach()}
  _isInScene(obj){let cur=obj;while(cur){if(cur===this.scene)return true;cur=cur.parent}return false}
  _validateTransformTarget(){if(this.transform?.object&&!this._isInScene(this.transform.object))this.transform.detach()}
  setOrtho(enabled){enabled=!!enabled;if(this.isOrtho===enabled)return;const old=this.camera,next=enabled?this.ortho:this.perspective,target=this.controls.target.clone();next.position.copy(old.position);next.quaternion.copy(old.quaternion);next.up.copy(old.up);if(enabled){const d=old.position.distanceTo(target);next.zoom=Math.max(.1,7/Math.max(.1,d));next.updateProjectionMatrix()}this.camera=next;this.isOrtho=enabled;this.controls.dispose();this.controls=this._makeOrbit(this.camera,target);this._createTransform();this.resize()}
  frameObjects(objects=[this.root],view='iso'){
    const box=new THREE.Box3();objects.filter(Boolean).forEach(o=>box.expandByObject(o));if(box.isEmpty())box.set(new THREE.Vector3(-1,-1,-1),new THREE.Vector3(1,1,1));const c=box.getCenter(new THREE.Vector3()),s=box.getSize(new THREE.Vector3()),max=Math.max(s.x,s.y,s.z,1);const dirs={front:[0,0,1],back:[0,0,-1],left:[-1,0,0],right:[1,0,0],top:[0,1,0],iso:[1,.7,1]};const d=new THREE.Vector3(...(dirs[view]||dirs.iso)).normalize();this.camera.up.set(0,view==='top'?0:1,view==='top'?-1:0);
    if(this.isOrtho){this.camera.position.copy(c).addScaledVector(d,max*4);this.camera.zoom=Math.max(.1,6/Math.max(1,max));this.camera.updateProjectionMatrix()}else{const dist=max/(2*Math.tan(THREE.MathUtils.degToRad(this.perspective.fov/2)))*1.65;this.camera.position.copy(c).addScaledVector(d,dist);this.camera.near=Math.max(.001,dist/1000);this.camera.far=Math.max(100,dist*100);this.camera.updateProjectionMatrix()}this.controls.target.copy(c);this.controls.update();this.environment.setTarget(c)
  }
  screenRay(clientX,clientY){const r=this.canvas.getBoundingClientRect(),p=new THREE.Vector2((clientX-r.left)/Math.max(1,r.width)*2-1,-((clientY-r.top)/Math.max(1,r.height)*2-1));const ray=new THREE.Raycaster();ray.setFromCamera(p,this.camera);return ray}
  setGridVisible(v){this.environment.setGrid(v)}
  setFloorVisible(v){this.environment.setFloor(v)}
  setEnvironment(mode){this.environment.setMode(mode)}
  setShadows(v){this.environment.setShadows(v)}
  _loop(){if(!this._running)return;requestAnimationFrame(()=>this._loop());this._validateTransformTarget();this.controls.update();this.environment.setTarget(this.controls.target);this.environment.update();for(const fn of this.beforeRender)fn();this.renderer.setViewport(0,0,this.wrap.clientWidth,this.wrap.clientHeight);this.renderer.setScissorTest(false);this.renderer.render(this.scene,this.camera);this.environment.renderGizmo(this.camera)}
}

export { THREE };

import * as THREE from 'three';

const ENVIRONMENTS={studio:'studio',track:'track',grid:'grid'};

export class ViewportEnvironment{
  constructor({scene,renderer,wrap,canvas,getCamera}){
    this.scene=scene;this.renderer=renderer;this.wrap=wrap;this.canvas=canvas;this.getCamera=getCamera;
    this.group=new THREE.Group();this.group.name='_ViewportEnvironment';this.group.userData.helper=true;this.group.userData.viewportEnvironment=true;scene.add(this.group);
    this.mode=ENVIRONMENTS.studio;this.gridEnabled=true;this.floorEnabled=true;this.shadowsEnabled=true;this.backgroundMode='gradient';
    this._buildSky();this._buildFloor();this._buildGrid();this._buildTrack();this._buildLights();this._buildAxesGizmo();this._buildControls();this.apply();
  }
  _buildSky(){
    const g=new THREE.SphereGeometry(90,24,16);
    const m=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,depthTest:false,uniforms:{top:{value:new THREE.Color(0x080d14)},horizon:{value:new THREE.Color(0x202b37)},bottom:{value:new THREE.Color(0x0b1016)}},vertexShader:`varying float vY;void main(){vY=position.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`uniform vec3 top;uniform vec3 horizon;uniform vec3 bottom;varying float vY;void main(){float t=clamp(vY/90.0*.5+.5,0.0,1.0);vec3 c=t<.5?mix(bottom,horizon,smoothstep(0.0,.5,t)):mix(horizon,top,smoothstep(.5,1.0,t));gl_FragColor=vec4(c,1.0);}`});
    this.sky=new THREE.Mesh(g,m);this.sky.name='_ViewportSky';this.sky.frustumCulled=false;this.sky.renderOrder=-1000;this.sky.userData.helper=true;this.group.add(this.sky)
  }
  _buildFloor(){
    const alpha=createRadialFadeTexture(768,.62,.98);
    const mat=new THREE.MeshStandardMaterial({color:0x252b31,roughness:.92,metalness:.02,transparent:true,alphaMap:alpha,opacity:.98,depthWrite:true});
    this.floor=new THREE.Mesh(new THREE.PlaneGeometry(36,36),mat);this.floor.name='_ViewportFloor';this.floor.rotation.x=-Math.PI/2;this.floor.position.y=-.012;this.floor.receiveShadow=true;this.floor.userData.helper=true;this.group.add(this.floor)
  }
  _buildGrid(){
    const tex=createGridTexture(1024);
    const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,depthTest:true,opacity:.82,toneMapped:false});
    this.grid=new THREE.Mesh(new THREE.PlaneGeometry(34,34),mat);this.grid.name='_ViewportGrid';this.grid.rotation.x=-Math.PI/2;this.grid.position.y=.008;this.grid.renderOrder=-5;this.grid.userData.helper=true;this.group.add(this.grid)
  }
  _buildTrack(){
    this.track=new THREE.Group();this.track.name='_ViewportTrack';this.track.userData.helper=true;this.group.add(this.track);
    const roadMat=new THREE.MeshStandardMaterial({color:0x1b1e21,roughness:.96,metalness:0,transparent:true,alphaMap:createRadialFadeTexture(768,.7,.99),opacity:.98});
    const road=new THREE.Mesh(new THREE.PlaneGeometry(16,34),roadMat);road.rotation.x=-Math.PI/2;road.position.y=.002;road.receiveShadow=true;road.userData.helper=true;this.track.add(road);
    const markingMat=new THREE.MeshBasicMaterial({color:0xb8bec4,transparent:true,opacity:.34,depthWrite:false,toneMapped:false});
    for(const x of [-5.6,5.6]){const line=new THREE.Mesh(new THREE.PlaneGeometry(.09,28),markingMat);line.rotation.x=-Math.PI/2;line.position.set(x,.018,0);line.userData.helper=true;this.track.add(line)}
    for(let z=-12;z<=12;z+=3.2){const dash=new THREE.Mesh(new THREE.PlaneGeometry(.10,1.5),markingMat);dash.rotation.x=-Math.PI/2;dash.position.set(0,.019,z);dash.userData.helper=true;this.track.add(dash)}
  }
  _buildLights(){
    this.lights=new THREE.Group();this.lights.name='_ViewportLights';this.lights.userData.helper=true;this.group.add(this.lights);
    this.hemi=new THREE.HemisphereLight(0xe8f0ff,0x18202a,1.45);this.lights.add(this.hemi);
    this.key=new THREE.DirectionalLight(0xffffff,3.25);this.key.position.set(7,10,8);this.key.castShadow=true;this.key.shadow.mapSize.set(2048,2048);this.key.shadow.camera.left=-14;this.key.shadow.camera.right=14;this.key.shadow.camera.top=14;this.key.shadow.camera.bottom=-14;this.key.shadow.camera.near=.1;this.key.shadow.camera.far=50;this.key.shadow.bias=-.00015;this.lights.add(this.key);
    this.fill=new THREE.DirectionalLight(0x9bbcff,1.25);this.fill.position.set(-7,5,-4);this.lights.add(this.fill);
    this.rim=new THREE.DirectionalLight(0xffffff,.85);this.rim.position.set(1,8,-10);this.lights.add(this.rim)
  }
  _buildAxesGizmo(){
    this.gizmoScene=new THREE.Scene();this.gizmoCamera=new THREE.PerspectiveCamera(32,1,.1,20);this.gizmoRoot=new THREE.Group();this.gizmoScene.add(this.gizmoRoot);
    const origin=new THREE.Mesh(new THREE.SphereGeometry(.07,12,8),new THREE.MeshBasicMaterial({color:0xd7dde5,depthTest:false}));this.gizmoRoot.add(origin);
    this.gizmoRoot.add(axisLine(new THREE.Vector3(1,0,0),0xff5a5f),axisLine(new THREE.Vector3(0,1,0),0x5de27b),axisLine(new THREE.Vector3(0,0,1),0x5597ff));
    this.gizmoRoot.add(labelSprite('X','#ff6b70',new THREE.Vector3(1.18,0,0)),labelSprite('Y','#68ee84',new THREE.Vector3(0,1.18,0)),labelSprite('Z','#69a4ff',new THREE.Vector3(0,0,1.18)))
  }
  _buildControls(){
    const panel=document.createElement('div');panel.className='viewport-scene-controls';panel.innerHTML=`<label>Ambiente<select data-env><option value="studio">Studio</option><option value="track">Pista</option><option value="grid">Grid</option></select></label><label class="compact"><input data-grid type="checkbox" checked> Grid</label><label class="compact"><input data-floor type="checkbox" checked> Chão</label><label class="compact"><input data-shadows type="checkbox" checked> Sombras</label><label class="compact"><input data-track type="checkbox"> Pista</label><label>Fundo<select data-background><option value="gradient">Gradiente</option><option value="solid">Sólido</option></select></label>`;this.wrap.appendChild(panel);this.panel=panel;
    injectViewportStyles();
    panel.querySelector('[data-env]').addEventListener('change',e=>this.setMode(e.target.value));panel.querySelector('[data-grid]').addEventListener('change',e=>this.setGrid(e.target.checked));panel.querySelector('[data-floor]').addEventListener('change',e=>this.setFloor(e.target.checked));panel.querySelector('[data-shadows]').addEventListener('change',e=>this.setShadows(e.target.checked));panel.querySelector('[data-track]').addEventListener('change',e=>this.setMode(e.target.checked?'track':'studio'));panel.querySelector('[data-background]').addEventListener('change',e=>{this.backgroundMode=e.target.value;this.apply()});
    queueMicrotask(()=>document.querySelector('#gridToggleBtn')?.addEventListener('click',()=>queueMicrotask(()=>{this.gridEnabled=this.grid.visible;this._syncControls()})))
  }
  setMode(mode){this.mode=Object.values(ENVIRONMENTS).includes(mode)?mode:ENVIRONMENTS.studio;if(this.mode==='grid'){this.floorEnabled=false}else if(!this.floorEnabled)this.floorEnabled=true;this.apply()}
  setGrid(v){this.gridEnabled=!!v;this.apply()}
  setFloor(v){this.floorEnabled=!!v;this.apply()}
  setShadows(v){this.shadowsEnabled=!!v;this.apply()}
  apply(){
    const track=this.mode==='track';this.track.visible=track&&this.floorEnabled;this.floor.visible=this.floorEnabled&&!track&&this.mode!=='grid';this.grid.visible=this.gridEnabled;this.sky.visible=this.backgroundMode==='gradient';this.scene.background=this.backgroundMode==='solid'?new THREE.Color(0x0c1118):null;
    this.renderer.shadowMap.enabled=this.shadowsEnabled;this.key.castShadow=this.shadowsEnabled;this.floor.receiveShadow=this.shadowsEnabled;this.track.traverse(o=>{if(o.isMesh&&o.material?.isMeshStandardMaterial)o.receiveShadow=this.shadowsEnabled});
    if(track){this.grid.material.opacity=.34;this.key.intensity=3.5;this.fill.intensity=1.05}else{this.grid.material.opacity=this.mode==='grid'?.95:.72;this.key.intensity=3.25;this.fill.intensity=1.25}
    this._syncControls()
  }
  _syncControls(){if(!this.panel)return;this.panel.querySelector('[data-env]').value=this.mode;this.panel.querySelector('[data-grid]').checked=this.gridEnabled;this.panel.querySelector('[data-floor]').checked=this.floorEnabled;this.panel.querySelector('[data-shadows]').checked=this.shadowsEnabled;this.panel.querySelector('[data-track]').checked=this.mode==='track';this.panel.querySelector('[data-background]').value=this.backgroundMode;const btn=document.querySelector('#gridToggleBtn');if(btn)btn.classList.toggle('active',this.gridEnabled)}
  update(){const cam=this.getCamera?.();if(cam&&this.sky){this.sky.position.x=cam.position.x;this.sky.position.z=cam.position.z}}
  renderGizmo(mainCamera){
    const r=this.wrap.getBoundingClientRect(),size=Math.min(92,Math.max(70,r.width*.12));if(r.width<260||r.height<220)return;
    const dir=mainCamera.position.clone();const target=this._target?.clone?.()||new THREE.Vector3();dir.sub(target).normalize();this.gizmoCamera.position.copy(dir.multiplyScalar(3.4));this.gizmoCamera.up.copy(mainCamera.up);this.gizmoCamera.lookAt(0,0,0);this.gizmoCamera.updateMatrixWorld();
    const renderer=this.renderer;renderer.autoClear=false;renderer.clearDepth();renderer.setScissorTest(true);renderer.setScissor(r.width-size-10,10,size,size);renderer.setViewport(r.width-size-10,10,size,size);renderer.render(this.gizmoScene,this.gizmoCamera);renderer.setScissorTest(false);renderer.setViewport(0,0,r.width,r.height);renderer.autoClear=true
  }
  setTarget(target){this._target=target}
}

function createRadialFadeTexture(size=512,inner=.62,outer=.98){const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d'),g=x.createRadialGradient(size/2,size/2,size*inner/2,size/2,size/2,size*outer/1.42);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.72,'rgba(255,255,255,.95)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,size,size);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.NoColorSpace;return t}
function createGridTexture(size=1024){const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d');x.clearRect(0,0,size,size);const center=size/2,max=size*.49;for(let i=0;i<=size;i+=32){const d=Math.abs(i-center)/max,fade=Math.max(0,1-Math.pow(d,3));const major=i%160===0;x.strokeStyle=`rgba(${major?'150,164,181':'104,118,136'},${(major?.34:.16)*fade})`;x.lineWidth=major?2:1;x.beginPath();x.moveTo(i,0);x.lineTo(i,size);x.stroke();x.beginPath();x.moveTo(0,i);x.lineTo(size,i);x.stroke()}const mask=x.createRadialGradient(center,center,size*.18,center,center,size*.70);mask.addColorStop(0,'rgba(255,255,255,1)');mask.addColorStop(.72,'rgba(255,255,255,.92)');mask.addColorStop(1,'rgba(255,255,255,0)');x.globalCompositeOperation='destination-in';x.fillStyle=mask;x.fillRect(0,0,size,size);x.globalCompositeOperation='source-over';const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t}
function axisLine(v,color){const g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),v]);return new THREE.Line(g,new THREE.LineBasicMaterial({color,depthTest:false,toneMapped:false}))}
function labelSprite(text,color,pos){const c=document.createElement('canvas');c.width=c.height=96;const x=c.getContext('2d');x.font='700 52px system-ui';x.textAlign='center';x.textBaseline='middle';x.fillStyle=color;x.fillText(text,48,50);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false,toneMapped:false}));s.position.copy(pos);s.scale.set(.38,.38,.38);return s}
function injectViewportStyles(){if(document.querySelector('#viewportUxStyles'))return;const s=document.createElement('style');s.id='viewportUxStyles';s.textContent=`.viewport-scene-controls{position:absolute;right:12px;top:52px;z-index:9;display:grid;grid-template-columns:repeat(2,minmax(92px,1fr));gap:6px 8px;padding:9px 10px;border:1px solid rgba(154,169,190,.18);border-radius:10px;background:rgba(9,13,19,.82);backdrop-filter:blur(10px);box-shadow:0 8px 30px rgba(0,0,0,.18);font:600 10px/1.15 system-ui;color:#aeb8c7}.viewport-scene-controls label{display:flex;align-items:center;justify-content:space-between;gap:5px}.viewport-scene-controls label:not(.compact){grid-column:span 2}.viewport-scene-controls select{min-width:92px;background:#111823;color:#dce3ee;border:1px solid #2b3543;border-radius:6px;padding:4px 6px;font-size:10px}.viewport-scene-controls input{accent-color:#8b5cf6}.mesh-box-select{position:fixed;z-index:10000;pointer-events:none;border:1px solid rgba(139,92,246,.95);background:rgba(139,92,246,.12);box-shadow:0 0 0 1px rgba(255,255,255,.08) inset}.viewport-axis-label{position:absolute;right:12px;bottom:44px;z-index:4;font:700 9px system-ui;color:#79889c;pointer-events:none}@media(max-width:760px){.viewport-scene-controls{top:44px;right:7px;grid-template-columns:1fr;padding:7px;max-width:126px}.viewport-scene-controls label:not(.compact){grid-column:span 1}.viewport-scene-controls .compact{font-size:9px}.viewport-scene-controls select{min-width:68px;max-width:76px}}`;document.head.appendChild(s)}

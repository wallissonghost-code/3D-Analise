import { ModelingBaseConstraint } from './constraint.js';

export class ModelingBaseController{
  constructor(engine){
    this.engine=engine;
    this.environment=engine.environment;
    this.constraint=new ModelingBaseConstraint(this._surface());
    this._shortcutHeld=false;
    queueMicrotask(()=>this._bindUI());
    this._keyDown=e=>this._onKeyDown(e);
    this._keyUp=e=>this._onKeyUp(e);
    window.addEventListener('keydown',this._keyDown);
    window.addEventListener('keyup',this._keyUp)
  }
  _surface(){
    let road=null;
    this.environment?.track?.traverse?.(o=>{if(!road&&o.isMesh&&o.material?.isMeshStandardMaterial)road=o});
    return road||this.environment?.floor||null
  }
  _bindUI(){
    const panel=this.environment?.panel;if(!panel)return;
    const envSelect=panel.querySelector('[data-env]');
    const trackOption=envSelect?.querySelector('option[value="track"]');if(trackOption)trackOption.textContent='Base de Modelagem';
    const oldTrack=panel.querySelector('[data-track]');if(oldTrack){const label=oldTrack.closest('label');if(label)label.style.display='none'}
    const section=document.createElement('div');section.className='modeling-base-controls';
    section.innerHTML=`<div class="modeling-base-title"><span data-base-dot>⚪</span><b>Base de Modelagem</b></div><label class="compact"><input data-base-active type="checkbox"> Ativa</label><label class="compact"><input data-base-restrict type="checkbox" checked> Restringir deformação</label><label class="compact"><input data-base-contact type="checkbox" checked> Manter contato</label><small>Segure Alt+B para suspender a restrição</small>`;
    panel.appendChild(section);this.panel=section;
    section.querySelector('[data-base-active]').addEventListener('change',e=>this.setActive(e.target.checked));
    section.querySelector('[data-base-restrict]').addEventListener('change',e=>{this.constraint.restrict=e.target.checked;this._sync()});
    section.querySelector('[data-base-contact]').addEventListener('change',e=>{this.constraint.maintainContact=e.target.checked;this._sync()});
    envSelect?.addEventListener('change',()=>{if(this.environment.mode==='track'){this.constraint.active=true}else if(this.constraint.active&&this.environment.mode!=='track'){this.constraint.active=false}this._sync()});
    const style=document.createElement('style');style.textContent=`.modeling-base-controls{grid-column:1/-1;margin-top:4px;padding-top:7px;border-top:1px solid rgba(154,169,190,.14);display:grid;gap:5px}.modeling-base-title{display:flex;align-items:center;gap:5px;color:#d9e1ec}.modeling-base-controls small{font-size:8px;color:#77869a}.modeling-base-controls.suspended{opacity:.66}.modeling-base-controls.suspended .modeling-base-title b:after{content:' · suspensa';color:#d8ad63}`;document.head.appendChild(style);
    this._sync()
  }
  setActive(v){
    this.constraint.active=!!v;
    if(v)this.environment.setMode('track');
    this._sync()
  }
  toggle(){this.setActive(!this.constraint.active)}
  _sync(){
    if(!this.panel)return;
    const active=this.constraint.active;
    this.panel.querySelector('[data-base-active]').checked=active;
    this.panel.querySelector('[data-base-restrict]').checked=this.constraint.restrict;
    this.panel.querySelector('[data-base-contact]').checked=this.constraint.maintainContact;
    this.panel.querySelector('[data-base-dot]').textContent=active?'🟢':'⚪';
    this.panel.classList.toggle('suspended',this.constraint.temporarilyDisabled)
  }
  _onKeyDown(e){
    if(e.repeat||e.altKey!==true||e.key.toLowerCase()!=='b')return;
    if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
    e.preventDefault();this._shortcutHeld=true;this.constraint.setTemporaryDisabled(true);this._sync()
  }
  _onKeyUp(e){
    if(!this._shortcutHeld||e.key.toLowerCase()!=='b')return;
    this._shortcutHeld=false;this.constraint.setTemporaryDisabled(false);this._sync()
  }
}

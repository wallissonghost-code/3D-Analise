import { subdivisionOnce,refreshGeometry } from '../../mesh/geometry-utils.js';

export class SubdivisionModifier{
 constructor(){this.states=new WeakMap()}
 enabled(mesh){return this.states.has(mesh)}
 enable(mesh,level=1){if(!mesh)return false;let state=this.states.get(mesh);if(!state){state={base:mesh.geometry.clone(),level:1};this.states.set(mesh,state)}state.level=Math.max(1,Math.min(3,level));this.refresh(mesh);return true}
 setBase(mesh,geometry){const s=this.states.get(mesh);if(!s)return false;s.base?.dispose?.();s.base=geometry.clone();this.refresh(mesh);return true}
 refresh(mesh){const s=this.states.get(mesh);if(!s)return false;let g=s.base.clone();for(let i=0;i<s.level;i++)g=subdivisionOnce(g);mesh.geometry.dispose?.();mesh.geometry=refreshGeometry(g);return true}
 disable(mesh,{restore=true}={}){const s=this.states.get(mesh);if(!s)return false;if(restore){mesh.geometry.dispose?.();mesh.geometry=refreshGeometry(s.base.clone())}s.base.dispose?.();this.states.delete(mesh);return true}
 apply(mesh){const s=this.states.get(mesh);if(!s)return false;s.base.dispose?.();this.states.delete(mesh);return true}
 base(mesh){return this.states.get(mesh)?.base||null}
}

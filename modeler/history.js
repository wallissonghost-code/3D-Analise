export class CommandHistory{
 constructor(limit=80,onChange=()=>{}){this.undoStack=[];this.redoStack=[];this.limit=limit;this.onChange=onChange}
 execute(command){if(!command?.redo||!command?.undo)return false;command.redo();this._record(command);return true}
 push(command){if(!command?.undo||!command?.redo)return false;this._record(command);return true}
 _record(command){this.undoStack.push(command);if(this.undoStack.length>this.limit)this.undoStack.shift();this.redoStack=[];this._emit(command.label||'Alteração')}
 undo(){const c=this.undoStack.pop();if(!c)return;c.undo();this.redoStack.push(c);this._emit('Desfeito: '+(c.label||'alteração'))}
 redo(){const c=this.redoStack.pop();if(!c)return;c.redo();this.undoStack.push(c);this._emit('Refeito: '+(c.label||'alteração'))}
 clear(){this.undoStack=[];this.redoStack=[];this._emit('Histórico limpo')}
 _emit(label){this.onChange({undo:this.undoStack.length,redo:this.redoStack.length,label})}
}
export function geometryCommand(mesh,before,after,label='Editar malha',onApply=()=>{}){return{label,undo(){mesh.geometry.dispose?.();mesh.geometry=before.clone();onApply(mesh)},redo(){mesh.geometry.dispose?.();mesh.geometry=after.clone();onApply(mesh)}}}
export function captureTransform(obj){return{position:obj.position.clone(),quaternion:obj.quaternion.clone(),scale:obj.scale.clone()}}
export function applyTransform(obj,s){if(!obj||!s)return;obj.position.copy(s.position);obj.quaternion.copy(s.quaternion);obj.scale.copy(s.scale);obj.updateMatrixWorld(true)}

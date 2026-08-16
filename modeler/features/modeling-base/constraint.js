import * as THREE from 'three';

// Editing constraint for the viewport Modeling Base. This is intentionally not
// physics/collision: it only adjusts candidate mesh-edit positions while enabled.
export class ModelingBaseConstraint{
  constructor(surface=null){
    this.surface=surface;
    this.active=false;
    this.restrict=true;
    this.maintainContact=true;
    this.clearance=0.004;
    this.contactBand=0.035;
    this.temporarilyDisabled=false;
    this._plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
    this._normalMatrix=new THREE.Matrix3();
  }
  setSurface(surface){this.surface=surface;return this}
  enabled(){return !!(this.active&&this.restrict&&!this.temporarilyDisabled&&this.surface)}
  setTemporaryDisabled(v){this.temporarilyDisabled=!!v}
  updatePlane(){
    if(!this.surface)return this._plane.set(new THREE.Vector3(0,1,0),0);
    this.surface.updateWorldMatrix(true,false);
    const point=this.surface.localToWorld(new THREE.Vector3(0,0,0));
    // PlaneGeometry normal is +Z. The road is rotated into the XZ ground plane,
    // so transform the actual local surface normal instead of assuming world Y.
    this._normalMatrix.getNormalMatrix(this.surface.matrixWorld);
    const normal=new THREE.Vector3(0,0,1).applyMatrix3(this._normalMatrix).normalize();
    if(normal.y<0)normal.multiplyScalar(-1);
    return this._plane.setFromNormalAndCoplanarPoint(normal,point)
  }
  constrainWorldPosition(candidateWorld,previousWorld=null){
    if(!this.enabled())return candidateWorld;
    const plane=this.updatePlane(),d=plane.distanceToPoint(candidateWorld),min=this.clearance;
    if(d<min)candidateWorld.addScaledVector(plane.normal,min-d);
    if(this.maintainContact&&previousWorld){
      const before=plane.distanceToPoint(previousWorld),after=plane.distanceToPoint(candidateWorld);
      // A vertex already resting on the guide stays cleanly on it for shallow edits,
      // while deliberate upward edits remain free.
      if(Math.abs(before)<=this.contactBand&&after>=min&&after<=this.contactBand){
        candidateWorld.addScaledVector(plane.normal,min-after)
      }
    }
    return candidateWorld
  }
}

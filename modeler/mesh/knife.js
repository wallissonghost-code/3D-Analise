import * as THREE from 'three';
import { editableGeometry,faceVertices,refreshGeometry } from './geometry-utils.js';

// Triangle knife primitive. Points are expected in local mesh coordinates and on two
// different edges of the target face. The face is replaced by three triangles.
export function knifeFace(source,faceIndex,p1,p2){
 const g=editableGeometry(source),p=g.getAttribute('position');
 if(faceIndex<0||faceIndex>=p.count/3)return g;
 const out=[];
 for(let f=0;f<p.count/3;f++){
  const tri=faceVertices(g,f);
  if(f!==faceIndex){push(out,...tri);continue}
  const e1=nearestEdge(tri,p1),e2=nearestEdge(tri,p2);
  if(!e1||!e2||sameEdge(e1,e2)){push(out,...tri);continue}
  const shared=e1.find(i=>e2.includes(i));
  if(shared==null){push(out,...tri);continue}
  const a=tri[shared],b=tri[e1.find(i=>i!==shared)],c=tri[e2.find(i=>i!==shared)];
  const q1=projectSegment(p1,tri[e1[0]],tri[e1[1]]),q2=projectSegment(p2,tri[e2[0]],tri[e2[1]]);
  const normal=new THREE.Triangle(...tri).getNormal(new THREE.Vector3());
  emit(out,[a,q1,q2],normal);emit(out,[q1,b,c],normal);emit(out,[q1,c,q2],normal)
 }
 const next=new THREE.BufferGeometry();next.setAttribute('position',new THREE.Float32BufferAttribute(out,3));return refreshGeometry(next)
}
export function nearestPointOnFaceEdges(source,faceIndex,point){const g=editableGeometry(source),tri=faceVertices(g,faceIndex);let best=null,d=Infinity;for(const e of [[0,1],[1,2],[2,0]]){const q=projectSegment(point,tri[e[0]],tri[e[1]]),nd=q.distanceToSquared(point);if(nd<d){d=nd;best=q}}return best}
function nearestEdge(tri,p){let best=null,d=Infinity;for(const e of [[0,1],[1,2],[2,0]]){const q=projectSegment(p,tri[e[0]],tri[e[1]]),nd=q.distanceToSquared(p);if(nd<d){d=nd;best=e}}return best}
function projectSegment(p,a,b){const ab=b.clone().sub(a),t=THREE.MathUtils.clamp(p.clone().sub(a).dot(ab)/(ab.lengthSq()||1),0,1);return a.clone().addScaledVector(ab,t)}
function sameEdge(a,b){return a[0]===b[0]&&a[1]===b[1]}
function emit(out,tri,n){const test=new THREE.Triangle(...tri).getNormal(new THREE.Vector3());if(test.dot(n)<0)tri=[tri[0],tri[2],tri[1]];push(out,...tri)}
function push(out,...vs){for(const v of vs)out.push(v.x,v.y,v.z)}

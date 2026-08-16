import * as THREE from 'three';

export function editableGeometry(geometry){
  const g=geometry.index?geometry.toNonIndexed():geometry.clone();
  g.deleteAttribute('normal');
  g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
  return g;
}
export function refreshGeometry(g){g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();for(const a of Object.values(g.attributes))a.needsUpdate=true;return g}
export function cloneGeometryState(g){return g.clone()}
export function faceVertices(g,faceIndex){const p=g.getAttribute('position'),i=faceIndex*3;return [0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(p,i+k))}
export function faceNormal(g,faceIndex){const [a,b,c]=faceVertices(g,faceIndex);return new THREE.Vector3().subVectors(b,a).cross(new THREE.Vector3().subVectors(c,a)).normalize()}
export function faceCenter(g,faceIndex){const vs=faceVertices(g,faceIndex);return vs[0].add(vs[1]).add(vs[2]).multiplyScalar(1/3)}
export function edgeKey(a,b,tol=1e-5){const q=v=>`${Math.round(v.x/tol)},${Math.round(v.y/tol)},${Math.round(v.z/tol)}`;const A=q(a),B=q(b);return A<B?`${A}|${B}`:`${B}|${A}`}
export function buildEdges(g){const out=[],map=new Map(),p=g.getAttribute('position');for(let f=0;f<p.count/3;f++){const ids=[f*3,f*3+1,f*3+2];for(const [a,b] of [[0,1],[1,2],[2,0]]){const ia=ids[a],ib=ids[b],va=new THREE.Vector3().fromBufferAttribute(p,ia),vb=new THREE.Vector3().fromBufferAttribute(p,ib),k=edgeKey(va,vb);if(!map.has(k)){const e={key:k,a:va,b:vb,indices:new Set([ia,ib]),faces:new Set([f])};map.set(k,e);out.push(e)}else{const e=map.get(k);e.indices.add(ia);e.indices.add(ib);e.faces.add(f)}}}return out}
export function replaceGeometry(mesh,next){const old=mesh.geometry;mesh.geometry=refreshGeometry(next);old?.dispose?.()}
export function mergeVerticesByDistance(g,indices,threshold=1e-4){const p=g.getAttribute('position');const ids=[...indices];if(ids.length<2)return false;for(let i=0;i<ids.length;i++){const a=ids[i],va=new THREE.Vector3().fromBufferAttribute(p,a);for(let j=i+1;j<ids.length;j++){const b=ids[j],vb=new THREE.Vector3().fromBufferAttribute(p,b);if(va.distanceTo(vb)<=threshold)p.setXYZ(b,va.x,va.y,va.z)}}p.needsUpdate=true;refreshGeometry(g);return true}
export function subdivisionOnce(source){const g=editableGeometry(source),p=g.getAttribute('position'),arr=[];for(let i=0;i<p.count;i+=3){const A=new THREE.Vector3().fromBufferAttribute(p,i),B=new THREE.Vector3().fromBufferAttribute(p,i+1),C=new THREE.Vector3().fromBufferAttribute(p,i+2);const AB=A.clone().add(B).multiplyScalar(.5),BC=B.clone().add(C).multiplyScalar(.5),CA=C.clone().add(A).multiplyScalar(.5);for(const tri of [[A,AB,CA],[AB,B,BC],[CA,BC,C],[AB,BC,CA]])for(const v of tri)arr.push(v.x,v.y,v.z)}const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));return refreshGeometry(out)}

import * as THREE from 'three';
import { editableGeometry,buildEdges,faceCount,faceVertices } from './geometry-utils.js';

// Adds a real topological cut through faces connected to the selected edge(s).
// On triangulated meshes the cut propagates across adjacent triangles by splitting
// each touched face from the selected edge point to the opposite vertex.
export function loopCut(source,t=.5,edgeIndices=null){
 const g=editableGeometry(source),k=THREE.MathUtils.clamp(t,.05,.95),edges=buildEdges(g);
 const selected=edgeIndices&&edgeIndices.size?new Set(edgeIndices):null;
 const faceCuts=new Map();
 if(selected){
  for(const ei of selected){const e=edges[ei];if(!e)continue;for(const f of e.faces||[]){const list=faceCuts.get(f)||[];list.push(e);faceCuts.set(f,list)}}
 }
 const out=[];
 for(let f=0;f<faceCount(g);f++){
  const [A,B,C]=faceVertices(g,f),cuts=faceCuts.get(f);
  if(!cuts?.length){push(out,A,B,C);continue}
  const e=cuts[0],pair=findPair([A,B,C],e.a,e.b);
  if(!pair){push(out,A,B,C);continue}
  const i0=pair[0],i1=pair[1],io=[0,1,2].find(i=>i!==i0&&i!==i1),v=[A,B,C],M=v[i0].clone().lerp(v[i1],k),O=v[io];
  if((i0===0&&i1===1)||(i0===1&&i1===2)||(i0===2&&i1===0)){push(out,v[i0],M,O);push(out,M,v[i1],O)}
  else {push(out,v[i1],M,O);push(out,M,v[i0],O)}
 }
 if(!selected){out.length=0;for(let f=0;f<faceCount(g);f++){const [a,b,c]=faceVertices(g,f),ab=a.clone().lerp(b,k),ac=a.clone().lerp(c,k);push(out,a,ab,ac);push(out,ab,b,c);push(out,ab,c,ac)}}
 const next=new THREE.BufferGeometry();next.setAttribute('position',new THREE.Float32BufferAttribute(out,3));return editableGeometry(next)
}
function findPair(v,a,b){const eps=1e-8;for(const [i,j] of [[0,1],[1,2],[2,0]])if((v[i].distanceToSquared(a)<eps&&v[j].distanceToSquared(b)<eps)||(v[i].distanceToSquared(b)<eps&&v[j].distanceToSquared(a)<eps))return[i,j];return null}
function push(out,a,b,c){for(const v of [a,b,c])out.push(v.x,v.y,v.z)}

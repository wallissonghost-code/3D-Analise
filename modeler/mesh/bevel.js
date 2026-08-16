import * as THREE from 'three';
import { editableGeometry,buildEdges,faceVertices,refreshGeometry } from './geometry-utils.js';

// Triangle-safe bevel. Selected shared edges are replaced by a narrow strip and
// adjacent triangles are rebuilt against the strip, instead of merely moving points.
export function bevelEdges(source,edgeIndices,width=.08,segments=1){
 const g=editableGeometry(source),edges=buildEdges(g),selected=new Set(edgeIndices),w=THREE.MathUtils.clamp(Math.abs(width),.001,.45);
 if(!selected.size)return g;
 const p=g.getAttribute('position'),faceEdge=new Map();
 for(const ei of selected){const e=edges[ei];if(!e)continue;for(const f of e.faces||[]){if(!faceEdge.has(f))faceEdge.set(f,[]);faceEdge.get(f).push(e)}}
 const rebuilt=[],strips=[];
 for(let f=0;f<p.count/3;f++){
  const tri=faceVertices(g,f),list=faceEdge.get(f);
  if(!list?.length){push(rebuilt,...tri);continue}
  // One bevel edge per face per pass keeps topology deterministic. Multiple selected
  // edges are handled across their neighboring faces and can be repeated by the user.
  const e=list[0],pair=findPair(tri,e.a,e.b);if(!pair){push(rebuilt,...tri);continue}
  const [i,j]=pair,k=[0,1,2].find(x=>x!==i&&x!==j),A=tri[i],B=tri[j],O=tri[k];
  const lenA=A.distanceTo(O),lenB=B.distanceTo(O),ta=Math.min(.45,w/Math.max(lenA,1e-6)),tb=Math.min(.45,w/Math.max(lenB,1e-6));
  const A2=A.clone().lerp(O,ta),B2=B.clone().lerp(O,tb);
  // Rebuild the adjacent face using the inset bevel edge.
  if(oriented(i,j)){push(rebuilt,A2,B2,O)}else push(rebuilt,B2,A2,O);
  strips.push({A,B,A2,B2,normal:new THREE.Triangle(...tri).getNormal(new THREE.Vector3())});
 }
 // Add bevel strips. Segment count interpolates between old and inset edges.
 const seg=Math.max(1,Math.min(6,Math.round(segments)));
 for(const s of strips){let pa=s.A,pb=s.B;for(let n=1;n<=seg;n++){const t=n/seg,na=s.A.clone().lerp(s.A2,t),nb=s.B.clone().lerp(s.B2,t);push(rebuilt,pa,pb,nb);push(rebuilt,pa,nb,na);pa=na;pb=nb}}
 const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.Float32BufferAttribute(rebuilt,3));return refreshGeometry(out)
}
function oriented(i,j){return(i===0&&j===1)||(i===1&&j===2)||(i===2&&j===0)}
function findPair(v,a,b){const eps=1e-8;for(const [i,j] of [[0,1],[1,2],[2,0]])if((v[i].distanceToSquared(a)<eps&&v[j].distanceToSquared(b)<eps)||(v[i].distanceToSquared(b)<eps&&v[j].distanceToSquared(a)<eps))return[i,j];return null}
function push(out,...vs){for(const v of vs)out.push(v.x,v.y,v.z)}

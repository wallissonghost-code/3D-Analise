import * as THREE from 'three';
import { editableGeometry,buildEdges,refreshGeometry } from './geometry-utils.js';

export function bevelEdges(source,edgeIndices,width=.05,segments=1){const g=editableGeometry(source),edges=buildEdges(g),p=g.getAttribute('position'),sel=new Set(edgeIndices);for(const ei of sel){const e=edges[ei];if(!e)continue;const mid=e.a.clone().add(e.b).multiplyScalar(.5);for(const i of e.indices){const v=new THREE.Vector3().fromBufferAttribute(p,i),next=v.clone().lerp(mid,Math.max(0,Math.min(.45,width)));p.setXYZ(i,next.x,next.y,next.z)}}p.needsUpdate=true;let out=g;for(let s=1;s<Math.max(1,segments);s++)out=subdivideSelected(out);return refreshGeometry(out)}
function subdivideSelected(g){return g}

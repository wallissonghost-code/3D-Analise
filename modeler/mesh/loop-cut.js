import * as THREE from 'three';
import { editableGeometry,faceVertices,refreshGeometry } from './geometry-utils.js';

export function loopCut(source,t=.5){const g=editableGeometry(source),p=g.getAttribute('position'),out=[];const k=Math.max(.05,Math.min(.95,t));for(let f=0;f<p.count/3;f++){const [a,b,c]=faceVertices(g,f);const ab=a.clone().lerp(b,k),ac=a.clone().lerp(c,k);push(out,a,ab,ac);push(out,ab,b,c);push(out,ab,c,ac)}const next=new THREE.BufferGeometry();next.setAttribute('position',new THREE.Float32BufferAttribute(out,3));return refreshGeometry(next)}
function push(out,a,b,c){for(const v of [a,b,c])out.push(v.x,v.y,v.z)}

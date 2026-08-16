import * as THREE from 'three';
import { editableGeometry,faceVertices,faceNormal,refreshGeometry } from './geometry-utils.js';

export function extrudeFaces(source,faces,distance=.2){const g=editableGeometry(source),selected=new Set(faces),p=g.getAttribute('position'),out=[];for(let f=0;f<p.count/3;f++){const tri=faceVertices(g,f);if(!selected.has(f)){pushTri(out,...tri);continue}const n=faceNormal(g,f),top=tri.map(v=>v.clone().addScaledVector(n,distance));pushTri(out,...top);for(let e=0;e<3;e++){const a=tri[e],b=tri[(e+1)%3],A=top[e],B=top[(e+1)%3];pushTri(out,a,b,B);pushTri(out,a,B,A)}}const next=new THREE.BufferGeometry();next.setAttribute('position',new THREE.Float32BufferAttribute(out,3));return refreshGeometry(next)}
function pushTri(out,a,b,c){for(const v of [a,b,c])out.push(v.x,v.y,v.z)}

import * as THREE from 'three';
import { editableGeometry,faceCount,faceVertices,faceCenter } from './geometry-utils.js';

export function insetFaces(source,faces,amount=.2){const g=editableGeometry(source),selected=new Set(faces),out=[];for(let f=0;f<faceCount(g);f++){const tri=faceVertices(g,f);if(!selected.has(f)){push(out,...tri);continue}const c=faceCenter(g,f),inner=tri.map(v=>v.clone().lerp(c,Math.max(0,Math.min(.95,amount))));push(out,...inner);for(let e=0;e<3;e++){const a=tri[e],b=tri[(e+1)%3],A=inner[e],B=inner[(e+1)%3];push(out,a,b,B);push(out,a,B,A)}}const next=new THREE.BufferGeometry();next.setAttribute('position',new THREE.Float32BufferAttribute(out,3));return editableGeometry(next)}
function push(out,a,b,c){for(const v of [a,b,c])out.push(v.x,v.y,v.z)}

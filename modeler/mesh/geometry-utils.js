import * as THREE from 'three';

// Build a topology-oriented indexed geometry. Vertices occupying the same position
// are welded into one logical vertex so vertex editing does not tear shared faces.
// Non-position attributes keep the first value encountered for a welded vertex.
export function editableGeometry(geometry,tolerance=1e-5){
  if(!geometry?.getAttribute('position'))return geometry?.clone?.()||geometry;
  const source=geometry.clone(),pos=source.getAttribute('position'),srcIndex=source.index;
  const attrs=Object.fromEntries(Object.entries(source.attributes).filter(([name])=>name!=='normal'));
  const names=Object.keys(attrs),maps=new Map(),vertices=[],attributeData=Object.fromEntries(names.map(n=>[n,[]])),indices=[];
  const q=v=>Math.round(v/tolerance);
  const readVertex=(vi)=>{
    const key=`${q(pos.getX(vi))},${q(pos.getY(vi))},${q(pos.getZ(vi))}`;
    let logical=maps.get(key);
    if(logical==null){
      logical=vertices.length;maps.set(key,logical);vertices.push(vi);
      for(const name of names){const a=attrs[name],dst=attributeData[name];for(let c=0;c<a.itemSize;c++)dst.push(a.array[vi*a.itemSize+c])}
    }
    return logical;
  };
  const cornerCount=srcIndex?srcIndex.count:pos.count;
  for(let i=0;i<cornerCount;i++)indices.push(readVertex(srcIndex?srcIndex.getX(i):i));
  const out=new THREE.BufferGeometry();
  for(const name of names){const a=attrs[name],Ctor=a.array.constructor;out.setAttribute(name,new THREE.BufferAttribute(new Ctor(attributeData[name]),a.itemSize,a.normalized))}
  const IndexCtor=vertices.length>65535?Uint32Array:Uint16Array;out.setIndex(new THREE.BufferAttribute(new IndexCtor(indices),1));
  source.dispose?.();
  return refreshGeometry(out);
}

export function refreshGeometry(g){
  if(!g)return g;
  g.deleteAttribute('normal');g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
  for(const a of Object.values(g.attributes))a.needsUpdate=true;if(g.index)g.index.needsUpdate=true;return g
}
export function cloneGeometryState(g){return g.clone()}
export function faceCount(g){return g?.index?Math.floor(g.index.count/3):Math.floor((g?.getAttribute('position')?.count||0)/3)}
export function faceVertexIndices(g,faceIndex){const i=faceIndex*3;if(g.index)return[g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2)];return[i,i+1,i+2]}
export function faceVertices(g,faceIndex){const p=g.getAttribute('position');return faceVertexIndices(g,faceIndex).map(i=>new THREE.Vector3().fromBufferAttribute(p,i))}
export function faceNormal(g,faceIndex){const [a,b,c]=faceVertices(g,faceIndex);return new THREE.Vector3().subVectors(b,a).cross(new THREE.Vector3().subVectors(c,a)).normalize()}
export function faceCenter(g,faceIndex){const vs=faceVertices(g,faceIndex);return vs[0].add(vs[1]).add(vs[2]).multiplyScalar(1/3)}
export function edgeKeyByIndex(a,b){return a<b?`${a}|${b}`:`${b}|${a}`}
export function edgeKey(a,b,tol=1e-5){const q=v=>`${Math.round(v.x/tol)},${Math.round(v.y/tol)},${Math.round(v.z/tol)}`;const A=q(a),B=q(b);return A<B?`${A}|${B}`:`${B}|${A}`}
export function buildEdges(g){
  const out=[],map=new Map(),p=g.getAttribute('position'),faces=faceCount(g);
  for(let f=0;f<faces;f++){
    const ids=faceVertexIndices(g,f);
    for(const [a,b] of [[0,1],[1,2],[2,0]]){
      const ia=ids[a],ib=ids[b],k=edgeKeyByIndex(ia,ib),va=new THREE.Vector3().fromBufferAttribute(p,ia),vb=new THREE.Vector3().fromBufferAttribute(p,ib);
      if(!map.has(k)){const e={key:k,a:va,b:vb,vertexIndices:[ia,ib],indices:new Set([ia,ib]),faces:new Set([f])};map.set(k,e);out.push(e)}else map.get(k).faces.add(f)
    }
  }
  return out
}
export function replaceGeometry(mesh,next){const old=mesh.geometry;mesh.geometry=refreshGeometry(next);old?.dispose?.()}
export function mergeVerticesByDistance(g,indices,threshold=1e-4){const p=g.getAttribute('position'),ids=[...indices];if(ids.length<2)return false;for(let i=0;i<ids.length;i++){const a=ids[i],va=new THREE.Vector3().fromBufferAttribute(p,a);for(let j=i+1;j<ids.length;j++){const b=ids[j],vb=new THREE.Vector3().fromBufferAttribute(p,b);if(va.distanceTo(vb)<=threshold)p.setXYZ(b,va.x,va.y,va.z)}}p.needsUpdate=true;refreshGeometry(g);return true}
export function subdivisionOnce(source){
  const g=editableGeometry(source),arr=[],faces=faceCount(g);
  for(let f=0;f<faces;f++){
    const [A,B,C]=faceVertices(g,f),AB=A.clone().add(B).multiplyScalar(.5),BC=B.clone().add(C).multiplyScalar(.5),CA=C.clone().add(A).multiplyScalar(.5);
    for(const tri of [[A,AB,CA],[AB,B,BC],[CA,BC,C],[AB,BC,CA]])for(const v of tri)arr.push(v.x,v.y,v.z)
  }
  const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));return editableGeometry(out)
}

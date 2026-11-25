import * as T from 'three'
import { center,type Point,type Rect } from './model'

type Shape='box'|'round'|'pipe'|'branch'|'tree'|'leaf'|'sphere'
type Surface='solid'|'glass'|'ghost'|'light'|'paint'
type Part={at:Point;size:Point;color:T.ColorRepresentation;rotation:number;id?:string;tilt:number;axis?:Point}
export type Place=(at:Point,size:Point,color:T.ColorRepresentation,id?:string,rotation?:number,shape?:Shape,surface?:Surface,tilt?:number,axis?:Point)=>void
export type Picks=T.InstancedMesh & {userData:{ids:(string|undefined)[]}}
export const slab=.18
export const colors={trim:'#f7f2e6',stone:'#d9ccb0',concrete:'#d4d6ca',paving:'#a0a8a0',asphalt:'#737d77',fence:'#495c50',rack:'#213733',metal:'#516860',door:'#608479',solar:'#234253',screen:'#324f54',white:'#f1f2e8'}
const shapes:Record<Shape,T.BufferGeometry>={
  box:new T.BoxGeometry(1,1,1),round:new T.CylinderGeometry(.5,.5,1,12),
  pipe:new T.CylinderGeometry(.5,.5,1,24).rotateZ(Math.PI/2),
  branch:new T.CylinderGeometry(.34,.5,1,7),
  tree:new T.IcosahedronGeometry(.5,1),sphere:new T.SphereGeometry(.5,16,9),
  leaf:new T.IcosahedronGeometry(.5),
}
const materials:Record<Surface,T.Material>={
  solid:new T.MeshStandardMaterial({roughness:.88,metalness:.035}),
  glass:new T.MeshStandardMaterial({transparent:true,opacity:.47,depthWrite:false}),
  ghost:new T.MeshStandardMaterial({transparent:true,opacity:.17,depthWrite:false}),
  light:new T.MeshBasicMaterial(),
  paint:new T.MeshStandardMaterial({roughness:.36,metalness:.18}),
}
export function batch(visibleIds?:ReadonlySet<string>){
  const buckets=new Map<string,{shape:Shape;surface:Surface;items:Part[]}>()
  const box:Place=(at,size,color,id,rotation=0,shape='box',surface='solid',tilt=0,axis)=>{
    if(visibleIds&&(!id||!visibleIds.has(id))) return
    const key=shape+'-'+surface
    const bucket=buckets.get(key)??{shape,surface,items:[]}
    bucket.items.push({at,size,color,rotation,id,tilt,axis})
    buckets.set(key,bucket)
  }
  function finish(group:T.Group) {
    const marker=new T.Object3D(),color=new T.Color(),up=new T.Vector3(0,1,0),direction=new T.Vector3()
    for(const {shape,surface,items} of buckets.values()){
      const mesh=new T.InstancedMesh(shapes[shape],materials[surface],items.length) as Picks
      mesh.userData.ids=items.map(item=>item.id)
      for(const [i,item] of items.entries()){
        marker.position.set(...item.at);marker.scale.set(...item.size);marker.rotation.set(item.tilt,item.rotation,0)
        if(item.axis) marker.quaternion.setFromUnitVectors(up,direction.set(...item.axis).normalize())
        marker.updateMatrix();mesh.setMatrixAt(i,marker.matrix);mesh.setColorAt(i,color.set(item.color))
      }
      mesh.computeBoundingSphere()
      mesh.castShadow=surface==='solid'||surface==='paint';mesh.receiveShadow=mesh.castShadow
      group.add(mesh)
    }
  }
  return {box,finish}
}
export function rod(box:Place,start:Point,end:Point,diameter:number,color:string,id?:string,shape:'round'|'branch'='round'){
  const axis:Point=[end[0]-start[0],end[1]-start[1],end[2]-start[2]]
  const length=Math.hypot(...axis)
  if(length<.001) return
  box([(start[0]+end[0])/2,(start[1]+end[1])/2,(start[2]+end[2])/2],[diameter,length,diameter],
    color,id,0,shape,'solid',0,axis)
}
export function cableGland(box:Place,[x,y,z]:Point,id:string){
  box([x,y-.066,z],[.103,.042,.103],colors.rack,id,0,'round')
  box([x,y-.026,z],[.073,.052,.073],'#9bab9d',id,0,'round')
}
export function segment(box:Place,a:Point,b:Point,width:number,color:string,height=width,id?:string) {
  const length=Math.hypot(b[0]-a[0],b[2]-a[2])
  if(length<.001) return
  box([(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2],[width,height,length],color,id,Math.atan2(b[0]-a[0],b[2]-a[2]))
}
export function flooring(box:Place,rect:Rect,y:number,color:string,id?:string,thickness=.06){
  const [x,,z]=center(rect);box([x,y-thickness/2,z],[rect[2],thickness,rect[3]],color,id)
}
export function disposeGroup(group:T.Group){
  group.traverse(object=>{
    if(object instanceof T.InstancedMesh) object.dispose()
    else if(object instanceof T.Mesh){object.geometry.dispose();(object.material as T.Material).dispose()}
  })
  group.removeFromParent()
}

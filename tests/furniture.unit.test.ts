import { Box3,Color,InstancedMesh,Matrix4,Object3D,Vector3 } from 'three'
import { expect,it } from 'vitest'
import { capacity,defaults } from '../src/engineering'
import { slab,type Picks } from '../src/geometryTools'
import { property } from '../src/model'
import { disposeGeometry,geometry,visibleFloor } from '../src/siteGeometry'

const furnishedRooms=new Set(['break','delivery','meeting','noc','offices','reception','restroom','shared','utility'])
// At the scene's depth range, keep distinct faces at least 0.25 mm apart.
const clearance=.00025
type Face={center:Vector3;normal:Vector3;halfEdges:[Vector3,Vector3]}
type Part={bounds:Box3;faces:Face[];id:Picks['userData']['ids'][number];color:string}

function boxFaces(world:Matrix4):Face[]{
  const center=new Vector3().setFromMatrixPosition(world)
  const halfAxes=[0,1,2].map(axis=>new Vector3().setFromMatrixColumn(world,axis).multiplyScalar(.5))
  return halfAxes.flatMap((halfAxis,index)=>{
    const halfEdges:[Vector3,Vector3]=[halfAxes[(index+1)%3],halfAxes[(index+2)%3]]
    return [-1,1].map(sign=>({
      center:center.clone().addScaledVector(halfAxis,sign),
      normal:halfAxis.clone().normalize().multiplyScalar(sign),
      halfEdges,
    }))
  })
}

function boxParts(group:Object3D){
  const parts:Part[]=[]
  const instance=new Matrix4(),world=new Matrix4(),color=new Color()
  const unitBox=new Box3(new Vector3(-.5,-.5,-.5),new Vector3(.5,.5,.5))
  group.updateMatrixWorld(true)
  group.traverseVisible(object=>{
    if(!(object instanceof InstancedMesh)||object.geometry.type!=='BoxGeometry') return
    const mesh=object as Picks
    for(let i=0;i<mesh.count;i++){
      mesh.getMatrixAt(i,instance)
      world.multiplyMatrices(mesh.matrixWorld,instance)
      mesh.getColorAt(i,color)
      parts.push({bounds:unitBox.clone().applyMatrix4(world),faces:boxFaces(world),id:mesh.userData.ids[i],color:color.getHexString()})
    }
  })
  return parts
}

function overlappingFaces(a:Part,b:Part,slabTop:number){
  if(!a.bounds.intersectsBox(b.bounds)) return undefined
  const offset=new Vector3()
  for(const face of a.faces){
    for(const other of b.faces){
      if(face.normal.dot(other.normal)<1-1e-8) continue
      // Undersides embedded in the slab cannot be seen from either camera.
      if(face.normal.y<-.99999&&face.center.y<=slabTop&&other.center.y<=slabTop) continue
      offset.subVectors(other.center,face.center)
      if(Math.abs(offset.dot(face.normal))>=clearance) continue
      // The two edge directions from each rectangle are the separating axes in the plane.
      const overlaps=[...face.halfEdges,...other.halfEdges].every(axis=>{
        const projectedRadius=({halfEdges:[u,v]}:Face)=>Math.abs(axis.dot(u))+Math.abs(axis.dot(v))
        const left=projectedRadius(face),right=projectedRadius(other)
        const overlap=Math.min(2*left,2*right,left+right-Math.abs(offset.dot(axis)))
        return overlap>clearance*axis.length()
      })
      if(overlaps) return face.center.toArray().map(value=>value.toFixed(3)).join(', ')
    }
  }
}

it('évite les faces superposées sur le mobilier des deux étages, y compris en visite à pied',()=>{
  const inputs=defaults(3)
  const building=geometry(capacity(3,inputs),inputs,3)
  const problems=new Set<string>()
  const describe=(part:Part)=>{
    const position=part.bounds.getCenter(new Vector3()).toArray().map(value=>value.toFixed(3)).join(', ')
    return (part.id||'bâtiment')+' #'+part.color+' ['+position+']'
  }
  try{
    for(const floor of ['ground','upper'] as const){
      visibleFloor(building,floor)
      const slabTop=floor==='upper'?property.technicalHeight+slab:slab
      for(const walk of [false,true]){
        building.cutWalls.visible=building.upperCutWalls.visible=!walk
        building.walkWalls.visible=building.upperWalkWalls.visible=walk
        const parts=boxParts(building[floor])
        for(const [i,part] of parts.entries()){
          for(let j=i+1;j<parts.length;j++){
            const other=parts[j]
            if(!furnishedRooms.has(part.id||'')&&!furnishedRooms.has(other.id||'')) continue
            const face=overlappingFaces(part,other,slabTop+clearance)
            if(face) problems.add(describe(part)+' / '+describe(other)+' · face ['+face+']')
          }
        }
      }
    }
    expect([...problems]).toEqual([])
  }finally{
    disposeGeometry(building)
  }
})

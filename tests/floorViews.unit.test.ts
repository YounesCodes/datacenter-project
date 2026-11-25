import { Raycaster,Vector3 } from 'three'
import { expect,it } from 'vitest'
import { capacity,defaults } from '../src/engineering'
import { slab } from '../src/geometryTools'
import { eastGroundDoors,property,rooms,stairs } from '../src/model'
import { disposeGeometry,geometry,visibleFloor } from '../src/siteGeometry'

it('garde les accès du rez-de-chaussée visibles sous la coupe de l’étage',()=>{
  const inputs=defaults(1)
  const building=geometry(capacity(1,inputs),inputs,1)
  try{
    visibleFloor(building,'upper')
    building.upper.updateMatrixWorld(true)
    const [x,,width]=property.building
    const east=x+width
    const distance=(z:number)=>new Raycaster(new Vector3(east+1,1.35,z),new Vector3(-1,0,0))
      .intersectObject(building.upperBase,true)[0]?.distance??Infinity
    expect(distance(8)).toBeCloseTo(1)
    expect(distance(eastGroundDoors.reception[0])).toBeGreaterThan(1.3)
    expect(distance(eastGroundDoors.stairs[0])).toBeLessThan(1.1)
  }finally{
    disposeGeometry(building)
  }
})

it('laisse un passage libre entre les pièces de l’étage et le garde-corps',()=>{
  const stairEdge=stairs.opening[0]
  for(const id of ['shared','restroom']){
    const [x,,width]=rooms.find(room=>room.id===id)!.rect
    expect(stairEdge-(x+width)-property.wall/2-stairs.railWidth/2,id).toBeGreaterThanOrEqual(1.5)
  }
})

it('sépare le fond de la bibliothèque du mur du bureau de direction',()=>{
  const inputs=defaults(1)
  const building=geometry(capacity(1,inputs),inputs,1)
  try{
    visibleFloor(building,'upper')
    building.upper.updateMatrixWorld(true)
    const [x,z,w]=rooms.find(room=>room.id==='offices')!.rect
    const wallFace=x+w-property.wall/2
    const origin=new Vector3(wallFace-.4,property.technicalHeight+slab+.25,z+1.25)
    const hits=new Raycaster(origin,new Vector3(1,0,0),0,.41)
      .intersectObjects(building.upper.children.filter(part=>part.visible),true)
    expect(hits).toHaveLength(2)
    const [back,wall]=hits
    expect(wall.point.x).toBeCloseTo(wallFace)
    expect(wall.distance-back.distance).toBeGreaterThan(.03)
  }finally{
    disposeGeometry(building)
  }
})

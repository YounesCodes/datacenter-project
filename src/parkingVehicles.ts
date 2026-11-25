import * as T from 'three'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import parkingAsset from './assets/parking-cars.glb?url'
import { center,parking,siteAccess } from './model'

const vehicles=[
  {bay:0,model:'hatchback',color:'#dddcd3'},
  {bay:1,model:'family-sedan',color:'#9c6149'},
]
let asset:ReturnType<GLTFLoader['loadAsync']>|undefined

export async function parkedVehicles(){
  asset??=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(parkingAsset).catch(error=>{
    asset=undefined
    throw error
  })
  const {scene}=await asset
  scene.updateMatrixWorld(true)
  const group=new T.Group()
  group.name='Véhicules stationnés'
  const transform=new T.Matrix4()
  const color=new T.Color()
  for(const name of new Set(vehicles.map(vehicle=>vehicle.model))){
    const template=scene.getObjectByName(name)
    const slots=vehicles.filter(vehicle=>vehicle.model===name)
    template?.traverse(part=>{
      if(!(part instanceof T.Mesh)) return
      const mesh=new T.InstancedMesh(part.geometry,part.material,slots.length)
      mesh.name=part.name
      for(const [index,{bay,color:paint}] of slots.entries()){
        const [x,,z]=center(parking.bays[bay])
        transform.makeRotationY(parking.yaw).setPosition(x,siteAccess.surfaceY,z)
        transform.multiply(part.matrixWorld)
        mesh.setMatrixAt(index,transform)
        if(!part.geometry.hasAttribute('color')) mesh.setColorAt(index,color.set(paint))
      }
      mesh.castShadow=true
      mesh.receiveShadow=true
      group.add(mesh)
    })
  }
  return group
}

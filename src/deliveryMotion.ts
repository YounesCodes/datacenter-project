import { deliveryTruck } from './model'

type TruckPose=[x:number,z:number,yaw:number]
const [bayX,,bayZ]=deliveryTruck.rearAxle

// Positions de l’essieu arrière sur la trajectoire entre l’entrée et le quai.
const approach:TruckPose[]=[
  [26.9,27.1,-1.571],[26.57,25.055,-1.251],[25.613,23.217,-.931],
  [24.127,21.774,-.611],[22.335,20.722,-.611],[20.631,19.529,-.611],
  [18.927,18.336,-.611],[17.188,17.195,-.531],[15.258,16.444,-.211],
  [13.203,16.122,-.091],[11.144,15.83,-.171],[9.088,15.517,-.171],
  [7.029,15.225,-.091],[4.95,15.182,-.011],[bayX,bayZ,0],
]

export function deliveryPose(progress:number):TruckPose{
  if(progress===1) return [bayX,bayZ,0]
  const step=progress*(approach.length-1),index=Math.floor(step),fraction=step-index
  const [x,z,yaw]=approach[index],[nx,nz,nextYaw]=approach[index+1]
  return [x+(nx-x)*fraction,z+(nz-z)*fraction,yaw+(nextYaw-yaw)*fraction]
}

export function truckBlocks([x,z,yaw]:TruckPose,walkX:number,walkZ:number){
  const dx=walkX-x,dz=walkZ-z,cos=Math.cos(yaw),sin=Math.sin(yaw)
  const length=dx*cos-dz*sin,width=dx*sin+dz*cos
  return length>deliveryTruck.rearOverhang-deliveryTruck.length-.25&&length<deliveryTruck.rearOverhang+.25&&Math.abs(width)<deliveryTruck.width/2+.25
}

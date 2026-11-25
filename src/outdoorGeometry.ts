import * as T from 'three'
import { equipment,hallInfrastructure,parking,property,technicalPorts,type Phase,type Point } from './model'
import type { Capacity } from './engineering'
import { batch,cableGland,colors as C,flooring,rod,segment,type Place } from './geometryTools'
import { fuelTank,oliveTree } from './outdoorDetails'

function terrain(group:T.Group){
  const shape=new T.Shape(property.boundary.map(([x,z])=>new T.Vector2(x,-z)))
  const geometry=new T.ExtrudeGeometry(shape,{depth:.78,bevelEnabled:false})
  geometry.rotateX(-Math.PI/2);geometry.translate(0,-.8,0)
  const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({color:C.stone,roughness:.98}))
  mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh)
}
const landscapedBeds:{rect:[number,number,number,number];trees:Point[]}[]=[
  {rect:[-28,-20.2,5.9,5.9],trees:[[-26.4,-18.35,1.18],[-24.16,-16.4,1.05]]},
  {rect:[27.1,-12.35,1.81,23.35],trees:[[28,-9.4,.74],[28,-3.8,.73],[28,2.8,.75],[28,8.1,.71]]},
  {rect:[-28,19.37,24,1.75],trees:[[-24.4,20.25,.74],[-18.9,20.24,.73],[-12.8,20.25,.71],[-6.85,20.24,.75]]},
  {rect:[9.55,19.68,6.6,1.43],trees:[[11.2,20.4,.60],[14.7,20.4,.61]]},
]
function landscaping(box:Place){
  for(const {rect:[x,z,w,d],trees} of landscapedBeds){
    flooring(box,[x,z,w,d],.035,'#a8a68a')
    flooring(box,[x+.11,z+.11,w-.22,d-.22],.045,'#a1a788')
    for(const [tx,tz,size] of trees){
      box([tx,.048,tz],[.68*size,.014,.62*size],'#97886d',undefined,.45,'round')
      oliveTree(box,tx,tz,size)
    }
  }
}
export function outdoor(cap:Capacity,phase:Phase,visibleIds?:ReadonlySet<string>){
  const group=new T.Group()
  if(!visibleIds||visibleIds.has('reserve')) terrain(group)
  const {box,finish}=batch(visibleIds)
  flooring(box,[-28,12.9,54,6.42],parking.surfaceY,C.asphalt)
  flooring(box,[20.5,-12.5,6.5,32],.04,C.asphalt)
  flooring(box,[-28,-12.85,7.6,25.65],.045,'#b7b6a8')
  flooring(box,[-21,-19.9,26.1,6.6],.05,'#bfc6b8')
  flooring(box,[2.1,11.9,7,7.9],.06,'#a8ada2')
  flooring(box,[11,12,8,2.1],.062,'#deded0')
  flooring(box,[17,13.7,2.1,6.5],.065,C.trim)
  flooring(box,[19.92,2.15,1.86,2.12],.096,C.concrete)
  flooring(box,[19.92,10.48,1.56,1.44],.074,C.concrete)
  flooring(box,property.reserve,.055,'#b6c09d','reserve')
  const [rx,rz,rw,rd]=property.reserve
  for(const [a,b] of [
    [[rx,.075,rz],[rx+rw,.075,rz]],[[rx,.075,rz+rd],[rx+rw,.075,rz+rd]],
    [[rx,.075,rz],[rx,.075,rz+rd]],[[rx+rw,.075,rz],[rx+rw,.075,rz+rd]],
  ] as [Point,Point][]){
    const n=Math.floor(Math.hypot(a[0]-b[0],a[2]-b[2])/.85)
    const pos=(f:number):Point=>[T.MathUtils.lerp(a[0],b[0],f),.075,T.MathUtils.lerp(a[2],b[2],f)]
    for(let i=0;i<n;i++) segment(box,pos(i/n),pos((i+.58)/n),.09,'#6f8067',.028,'reserve')
  }
  if(phase===3){
    box([14.2,1.37,-16.8],[13,2.65,4.6],'#5f8e71','reserve',0,'box','ghost')
    for(const x of [7.7,20.7]) for(const z of [-19.1,-14.5]) box([x,1.38,z],[.11,2.65,.11],'#728c6e','reserve')
    for(const z of [-19.1,-14.5]) box([14.2,2.72,z],[13,.11,.11],'#728c6e','reserve')
  }
  for(const [a,b] of property.boundary.map((p,i)=>[p,property.boundary[(i+1)%property.boundary.length]])){
    const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/2.8)
    for(let i=0;i<n;i++){
      const [x,z]=[T.MathUtils.lerp(a[0],b[0],i/n),T.MathUtils.lerp(a[1],b[1],i/n)]
      const [nx,nz]=[T.MathUtils.lerp(a[0],b[0],(i+1)/n),T.MathUtils.lerp(a[1],b[1],(i+1)/n)]
      if(z>20.5 && Math.min(x,nx)>19 && Math.min(x,nx)<27) continue
      box([x,.79,z],[.12,1.58,.12],C.fence)
      for(const h of [.2,.77,1.37]) segment(box,[x,h,z],[nx,h,nz],.047,C.fence,.056)
    }
  }
  for(let i=0;i<=parking.bayCount;i++){
    const x=parking.firstLine+i*parking.bayWidth
    box([x,.065,parking.z],[.075,.024,parking.bayDepth],C.white)
  }
  const rowWidth=parking.bayCount*parking.bayWidth
  box([parking.firstLine+rowWidth/2,.065,14.11],[rowWidth,.025,.082],C.white)
  for(let i=0;i<10;i++) box([18.05,.081,14+i*.56],[1.83,.027,.2],C.white)
  if(!visibleIds) landscaping(box)
  box([25.9,1.32,14.7],[2.36,2.64,2.5],C.trim,'security')
  box([25.9,2.69,14.7],[2.67,.14,2.78],C.fence,'security')
  box([24.69,1.58,14.7],[.08,.9,1.57],C.screen,'security')
  box([23.1,.56,19.8],[.37,1.12,.4],C.white,'security')
  for(let i=0;i<9;i++) box([23.1+i*.47,1.05,19.8],[.49,.12,.12],i%2?'#b8644d':C.white,'security')
  box([27.3,1.72,11.5],[.11,3.45,.11],C.fence,'camera')
  box([27.17,3.33,11.33],[.26,.19,.48],C.white,'camera',.64)
  const point=(id:string)=>equipment.find(item=>item.id===id)!.position
  const [tx,,tz]=point('transformer')
  const [gridX,gridY,gridZ]=technicalPorts.grid
  box([gridX,.115,gridZ],[1.59,.14,.98],C.trim,'transformer')
  box([gridX,.754,gridZ],[1.29,1.13,.72],'#66796f','transformer')
  box([gridX,1.34,gridZ],[1.31,.079,.74],C.metal,'transformer')
  box([gridX,.79,gridZ+.366],[1.12,.91,.042],'#87968a','transformer')
  box([gridX+.281,.81,gridZ+.397],[.051,.178,.036],C.rack,'transformer')
  box([gridX-.283,.938,gridZ+.398],[.164,.137,.023],'#c3a867','transformer')
  cableGland(box,[gridX,gridY,gridZ],'transformer')
  box([tx,.12,tz],[4.6,.24,4.7],C.trim,'transformer')
  box([tx,1.1,tz],[2.45,1.82,2],C.metal,'transformer')
  box([tx,2.025,tz],[2.56,.12,2.12],'#779087','transformer')
  for(const side of [-1,1]){
    box([tx+side*1.395,.49,tz],[.18,.13,1.83],C.rack,'transformer')
    box([tx+side*1.395,1.67,tz],[.18,.13,1.83],C.rack,'transformer')
    for(let i=0;i<8;i++) box([tx+side*1.39,1.078,tz-.816+i*.233],[.35,1.13,.106],'#748b78','transformer')
  }
  for(let i=0;i<3;i++){
    const x=tx-.66+i*.66
    box([x,2.31,tz],[.087,.54,.087],C.rack,'transformer',0,'round')
    for(let fin=0;fin<5;fin++) box([x,2.13+fin*.088,tz],[.206,.048,.206],'#d8caad','transformer',0,'round')
    box([x,2.589,tz],[.114,.088,.114],'#a68a61','transformer',0,'round')
  }
  box([tx+.55,1.35,tz+1.089],[.61,.67,.24],'#96a597','transformer')
  box([tx+.55,1.52,tz+1.217],[.26,.132,.021],C.rack,'transformer')
  box([tx+.55,1.52,tz+1.235],[.184,.072,.028],'#bdcdad','transformer')
  const [outX,outY,outZ]=technicalPorts.transformerExit
  box([outX-.175,outY,outZ],[.34,.32,.43],C.metal,'transformer')
  rod(box,[outX-.132,outY,outZ],[outX,outY,outZ],.13,'#b5aa90','transformer')
  const [entryX,entryY,entryZ]=technicalPorts.powerEntry
  box([entryX+.066,entryY,entryZ],[.13,.34,.41],C.metal,'switchgear')
  for(const id of ['ispA','ispB']){
    const [x,y,z]=technicalPorts[id]
    const width=.96,depth=.71,lidWidth=.78,lidDepth=.56,lidHeight=.036
    const sideWidth=(width-lidWidth)/2,endDepth=(depth-lidDepth)/2
    const baseHeight=.11-lidHeight,lidY=y-lidHeight/2
    box([x,y-lidHeight-baseHeight/2,z],[width,baseHeight,depth],C.concrete,id)
    // The concrete rim and steel lid share a height, but have separate footprints.
    for(const side of [-1,1]){
      box([x+side*(lidWidth+sideWidth)/2,lidY,z],[sideWidth,lidHeight,depth],C.concrete,id)
      box([x,lidY,z+side*(lidDepth+endDepth)/2],[lidWidth,lidHeight,endDepth],C.concrete,id)
    }
    box([x,lidY,z],[lidWidth,lidHeight,lidDepth],'#596861',id)
    for(let i=0;i<5;i++) box([x,y+.008,z+.07*(i-2)],[.67,.017,.021],'#8b998b',id)
  }
  const [gx,,gz]=point('generator')
  for(let i=0;i<cap.generators;i++){
    const z=gz-2.05+i*2.1
    box([gx,.12,z],[5.3,.23,1.9],C.trim,'generator')
    box([gx,.27,z],[4.5,.21,1.54],C.rack,'generator')
    box([gx,1.104,z],[4.4,1.61,1.48],i%2?'#b6a075':'#c2ac73','generator')
    box([gx,1.93,z],[4.52,.1,1.54],C.metal,'generator')
    for(const side of [-1,1]){
      const face=z+side*.751
      box([gx-1.625,1.14,face],[.87,1.17,.028],C.rack,'generator')
      for(let slat=0;slat<11;slat++) box([gx-1.625,.642+slat*.1,face+side*.022],[.76,.041,.024],'#78877a','generator')
      for(const offset of [-.57,.581,1.73]){
        box([gx+offset,1.111,face],[.019,1.39,.025],'#7c785f','generator')
        for(const y of [.61,1.62]) box([gx+offset+.06,y,face+side*.017],[.095,.067,.031],C.metal,'generator')
      }
      for(const handle of [.421,1.562]) box([gx+handle,1.07,face+side*.03],[.048,.145,.058],C.rack,'generator')
      box([gx+.94,1.451,face],[.39,.26,.039],C.rack,'generator')
      box([gx+.94,1.502,face+side*.025],[.253,.088,.019],'#a8ba98','generator')
    }
    box([gx+1.53,2.187,z],[.128,.49,.128],C.metal,'generator',0,'round')
    box([gx+1.53,2.446,z],[.196,.043,.196],C.rack,'generator',0,'round')
    box([gx+2.224,1.16,z],[.116,.31,.44],C.metal,'generator')
    rod(box,[gx+2.24,1.16,z],[gx+2.34,1.16,z],.13,C.rack,'generator')
  }
  const [fx,,fz]=point('fuel')
  fuelTank(box,fx,fz)
  for(const hall of hallInfrastructure) for(let i=0;i<cap.coolingUnits/2;i++){
    const id=hall.suffix==='A'?'condenser':'condenser-b'
    const columns=hall.suffix==='A'?6:4
    const x=hall.condenser[0]+i%columns*2.36,z=hall.condenser[2]+Math.floor(i/columns)*2.42
    box([x,.13,z],[2.29,.24,1.56],C.trim,id)
    box([x,.75,z],[2.14,1.11,1.26],C.metal,id)
    box([x,1.32,z],[2.18,.08,1.3],C.white,id)
    for(const side of [-1,1]){
      box([x,.815,z+side*.643],[1.97,.86,.033],C.rack,id)
      for(let fin=0;fin<8;fin++) box([x,.47+fin*.093,z+side*.669],[1.86,.034,.027],'#85978a',id)
      box([x,.815,z+side*.68],[.07,.83,.05],C.white,id)
    }
    for(const f of [-.52,.52]){
      box([x+f,1.38,z],[.92,.09,.92],C.rack,id,0,'round')
      box([x+f,1.435,z],[.59,.035,.59],'#718982',id,0,'round')
      for(const rot of [0,1.05,2.1]) box([x+f,1.46,z],[.09,.03,.78],C.rack,id,rot)
    }
    box([x+1.08,.79,z],[.04,.6,.98],C.metal,id)
    for(const [y,offset] of [[.94,-.30],[.62,.30]]){
      rod(box,[x+1.075,y,z+offset],[x+1.19,y,z+offset],.135,'#b0a280',id)
      rod(box,[x+1.132,y,z+offset],[x+1.173,y,z+offset],.19,C.rack,id)
    }
  }
  finish(group)
  return group
}

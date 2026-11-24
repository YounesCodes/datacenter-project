import * as T from 'three'
import { equipment, hallInfrastructure,property,type Phase,type Point } from './model'
import type { Capacity } from './engineering'
import { batch, colors as C, flooring, segment, type Place } from './geometryTools'

function terrain(group:T.Group){
  const shape=new T.Shape(property.boundary.map(([x,z])=>new T.Vector2(x,-z)))
  const geometry=new T.ExtrudeGeometry(shape,{depth:.78,bevelEnabled:false})
  geometry.rotateX(-Math.PI/2);geometry.translate(0,-.8,0)
  const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({color:C.stone,roughness:.98}))
  mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh)
}
function tree(box:Place,x:number,z:number,s:number){
  box([x+.25,.012,z+.26],[s*1.3,.019,s*.99],'#4a6a55',undefined,0,'sphere','ghost')
  box([x,s*.55,z],[s*.14,s*1.12,s*.14],'#78654b',undefined,0,'round')
  box([x,s*1.28,z],[s*1.1,s*1.05,s*1.05],'#788e63',undefined,.24,'tree')
  box([x-s*.34,s*1.12,z+s*.16],[s*.75,s*.75,s*.7],'#8f9c70',undefined,.45,'tree')
  box([x+s*.31,s*1.44,z-s*.08],[s*.65,s*.66,s*.74],'#a1ae83',undefined,-.4,'tree')
}
function car(box:Place,x:number,z:number,color:string){
  box([x,.32,z],[1.74,.46,4],color)
  box([x,.72,z-.07],[1.59,.42,2.36],C.screen)
  box([x,.956,z-.09],[1.51,.07,1.59],color)
  for(const s of [-1,1]){
    for(const e of [-1,1]) box([x+s*.83,.2,z+e*1.23],[.42,.27,.62],C.rack)
    box([x+s*.54,.41,z+2],[.38,.12,.045],C.white)
    box([x+s*.58,.41,z-2],[.29,.1,.045],'#a75048')
  }
}
export function outdoor(cap:Capacity,phase:Phase){
  const group=new T.Group()
  terrain(group)
  const {box,finish}=batch()
  flooring(box,[-28,12.9,54,7.4],.035,C.asphalt)
  flooring(box,[20.5,-12.5,6.5,32],.04,C.asphalt)
  flooring(box,[-28,-12.85,7.6,25.65],.045,'#b7b6a8')
  flooring(box,[-21,-19.9,25.4,6.6],.05,'#bfc6b8')
  flooring(box,[2.1,11.9,7,7.9],.06,'#a8ada2')
  flooring(box,[11,12,8,2.1],.062,'#deded0')
  flooring(box,[17,13.7,2.1,6.5],.065,C.trim)
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
  for(let i=0;i<10;i++){
    const x=-18+i*2.52
    box([x,.065,16.65],[.075,.024,5.12],C.white)
    if([0,2,4,5,6].includes(i)) car(box,x+1.2,16.65,['#dbded0','#6d8082','#ad8260','#f4eddb','#778674'][i%5])
  }
  box([-5.4,.065,14.11],[25.3,.025,.082],C.white)
  for(let i=0;i<10;i++) box([18.05,.081,14+i*.56],[1.83,.027,.2],C.white)
  for(const [x,z,s] of [[-26.5,-18.2,1.38],[-23.3,-18.6,1.12],[-3,-18.4,1.36],[2.2,-18.7,1.05],[24.2,-17,1.52],[26.5,-16.4,1.3],[28,-8,1.13],[28.2,-4.4,1.35],[28.2,4.7,1.34],[-26.5,10.8,1.5],[-25.2,16.3,1.4],[-27,18.6,1.45],[-20,19.8,1.24],[-14,19.8,.82],[-8,19.8,.86],[2.7,19.7,1.1],[14,19.54,1.18],[27.8,18.75,1.25]] as Point[]) tree(box,x,z,s)
  box([25.9,1.32,14.7],[2.36,2.64,2.5],C.trim,'security')
  box([25.9,2.69,14.7],[2.67,.14,2.78],C.fence,'security')
  box([24.69,1.58,14.7],[.08,.9,1.57],C.screen,'security')
  box([23.1,.56,19.8],[.37,1.12,.4],C.white,'security')
  for(let i=0;i<9;i++) box([23.1+i*.47,1.05,19.8],[.49,.12,.12],i%2?'#b8644d':C.white,'security')
  box([27.3,1.72,11.5],[.11,3.45,.11],C.fence,'camera')
  box([27.17,3.33,11.33],[.26,.19,.48],C.white,'camera',.64)
  const point=(id:string)=>equipment.find(item=>item.id===id)!.position
  const [tx,,tz]=point('transformer')
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
  }
  const [fx,,fz]=point('fuel')
  box([fx,.17,fz],[5,.34,2.07],C.trim,'fuel')
  box([fx,.86,fz],[1.29,3.55,1.29],'#768c81','fuel',Math.PI/2,'round','solid',Math.PI/2)
  for(const x of [-2.33,2.33]) box([fx+x,.27,fz],[.16,.45,2.05],C.concrete,'fuel')
  for(const z of [-.99,.99]) box([fx,.27,fz+z],[4.51,.45,.15],C.concrete,'fuel')
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
  }
  finish(group)
  return group
}

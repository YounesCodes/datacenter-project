import * as T from 'three'
import { equipment,hallInfrastructure,property,rooms,stairs,upperSlabs,type Point } from './model'
import type { Capacity } from './engineering'
import { batch,colors as C,flooring,segment,slab,type Place } from './geometryTools'

export type Collision={x:number;z:number;w:number;d:number}
type Wall={vertical:boolean;line:number;a:number;b:number;door?:[number,number];badge?:boolean}
const doors:Record<string,{edge:'n'|'e'|'s'|'w';at:number;width?:number;badge?:boolean}>={
  'hall-a':{edge:'s',at:-17.4,width:1.75,badge:true},'hall-b':{edge:'s',at:7.6,width:1.75,badge:true},
  power:{edge:'n',at:-9.2,width:1.35,badge:true},cooling:{edge:'n',at:-4.5,width:1.35},delivery:{edge:'n',at:5.5,width:2.15},
  network:{edge:'s',at:18.15,width:1.25,badge:true},noc:{edge:'e',at:-8.2},reception:{edge:'n',at:15.2,width:1.35,badge:true},
  utility:{edge:'s',at:14.15},offices:{edge:'s',at:13.1},meeting:{edge:'s',at:17.4},shared:{edge:'e',at:7.4},
  break:{edge:'n',at:11.1},restroom:{edge:'e',at:11},
}
export function walls(box:Place,floor:'ground'|'upper',full:boolean) {
  const base=floor==='ground'?slab:property.technicalHeight+slab
  const max=floor==='ground'?property.technicalHeight-slab:property.upperHeight-slab
  const buckets=new Map<string,Wall[]>()
  const add=(vertical:boolean,line:number,a:number,b:number,door?:[number,number],badge?:boolean)=>{
    const key=String(vertical)+','+line
    const bucket=buckets.get(key)??[]
    bucket.push({vertical,line,a,b,door,badge});buckets.set(key,bucket)
  }
  const [x,z,w,d]=floor==='ground'?property.building:property.upper
  add(false,z,x,x+w)
  add(false,z+d,x,x+w,floor==='ground'?[5.5,3.15]:undefined)
  add(true,x,z,z+d,floor==='ground'?[-.95,1.65]:undefined)
  add(true,x+w,z,z+d,floor==='ground'?[3.2,1.7]:undefined)
  if(floor==='ground'){
    add(true,x+w,z,z+d,[-8.6,1.2])
    add(true,x+w,z,z+d,[11.2,1.2])
  }
  if(floor==='ground') add(false,10.5,2,9,[5.5,3.15])
  for(const room of rooms.filter(room=>room.floor===floor)){
    const [rx,rz,rw,rd]=room.rect
    const move=doors[room.id]
    for(const [edge,v,line,a,b] of [['n',false,rz,rx,rx+rw],['s',false,rz+rd,rx,rx+rw],['w',true,rx,rz,rz+rd],['e',true,rx+rw,rz,rz+rd]] as const){
      const door:Wall['door']=move?.edge===edge?[move.at,move.width??1.02]:undefined
      add(v,line,a,b,door,move?.badge&&Boolean(door))
    }
  }
  const collisions:Collision[]=[]
  for(const edges of buckets.values()){
    const {vertical,line}=edges[0]
    const spans=edges.flatMap(edge=>edge.door?[edge.door]:[])
    const stops=[...new Set(edges.flatMap(e=>[e.a,e.b,...(e.door?[e.door[0]-e.door[1]/2,e.door[0]+e.door[1]/2]:[])]))].sort((a,b)=>a-b)
    const h=full?max:(!vertical&&line<-10?2.04:1.08)
    const at=(t:number,y:number,offset=0):Point=>vertical?[line+offset,y,t]:[t,y,line+offset]
    stops.slice(0,-1).forEach((a,i)=>{
      const b=stops[i+1],mid=(a+b)/2
      if(!edges.some(e=>mid>e.a&&mid<e.b)||spans.some(([p,w])=>Math.abs(mid-p)<w/2)) return
      segment(box,at(a,base+h/2),at(b,base+h/2),property.wall,full?'#dfded1':'#eae5d5',h)
      if(!full) segment(box,at(a,base+h+.024),at(b,base+h+.024),.21,'#f9f5e9',.047)
      const [x,,z]=at(mid,0)
      collisions.push({x,z,w:vertical?property.wall:b-a,d:vertical?b-a:property.wall})
    })
    for(const edge of edges){
      if(!edge.door) continue
      const [p,w]=edge.door
      for(const end of [-1,1]) box(at(p+end*(w/2-.045),base+(full?1.05:.54)),[.115,full?2.10:1.08,.115],C.door)
      if(full){
        segment(box,at(p-w/2,base+2.14),at(p+w/2,base+2.14),.23,C.door,.13)
        if(max>2.2) segment(box,at(p-w/2,base+(max+2.2)/2),at(p+w/2,base+(max+2.2)/2),.18,'#dfded1',max-2.2)
      } else if(edge.badge){
        box(at(p+w/2+.22,base+1.03,.12),[.14,.21,.1],C.rack)
        box(at(p+w/2+.22,base+1.075,.18),[.05,.036,.03],'#92ba7d')
      }
      segment(box,at(p-w/2,base+.016),at(p+w/2,base+.016),.23,C.door,.025)
    }
  }
  return collisions
}
function chair(box:Place,x:number,z:number,y:number,id:string,yaw=0,visitor=false){
  const cos=Math.cos(yaw),sin=Math.sin(yaw)
  const place=(dx:number,dy:number,dz:number,size:Point,color:string,turn=0,shape:'box'|'round'='box')=>
    box([x+dx*cos+dz*sin,y+dy,z-dx*sin+dz*cos],size,color,id,yaw+turn,shape)
  const fabric=visitor?'#789085':'#546b61'
  place(0,.43,0,[.48,.077,.49],C.rack)
  place(0,.477,-.02,[.46,.065,.45],fabric)
  place(0,.715,.214,[.455,.37,.075],C.rack)
  place(0,.718,.172,[.412,.313,.042],fabric)
  for(const side of [-1,1]){
    place(side*.165,.55,.214,[.044,.24,.055],C.rack)
    if(visitor){
      for(const foot of [-1,1]) place(side*.185,.21,foot*.161,[.042,.42,.041],C.metal)
    }else{
      place(side*.252,.512,.053,[.041,.19,.041],C.metal)
      place(side*.252,.605,.009,[.068,.045,.31],C.rack)
    }
  }
  if(visitor) return
  place(0,.235,0,[.084,.326,.084],C.metal,0,'round')
  for(const spoke of [0,1.257,2.513,3.77,5.027]){
    const dx=Math.sin(spoke),dz=Math.cos(spoke)
    place(dx*.112,.095,dz*.112,[.045,.04,.237],C.rack,spoke)
    place(dx*.215,.049,dz*.215,[.073,.061,.073],C.rack,0,'round')
  }
}
function monitor(box:Place,x:number,y:number,z:number,w:number,id:string,screen:string){
  box([x,y+.019,z],[.25,.038,.19],C.rack,id)
  box([x,y+.1,z],[.072,.17,.062],C.metal,id)
  box([x,y+.28,z-.018],[w,.32,.064],C.screen,id)
  box([x,y+.282,z+.021],[w-.05,.264,.014],screen,id)
  box([x-w*.3,y+.326,z+.032],[w*.23,.019,.01],'#c7d8c1',id)
  box([x-w*.15,y+.264,z+.032],[w*.53,.014,.01],'#add0c7',id)
  box([x,y+.017,z+.24],[.37,.034,.16],C.metal,id)
  box([x+.28,y+.022,z+.24],[.072,.044,.115],C.rack,id,0,'sphere')
}
function desk(box:Place,x:number,z:number,y:number,id:string,w=1.35,noc=false){
  box([x,y+.71,z],[w,.13,.7],'#b39670',id)
  for(const a of [-1,1]) for(const b of [-1,1]) box([x+a*(w/2-.1),y+.33,z+b*.25],[.06,.65,.06],C.rack,id)
  monitor(box,x,y+.775,z-.16,w*.55,id,noc?'#6ca79d':'#8ba1a4')
  chair(box,x,z+.79,y,id)
}
function cabinet(box:Place,x:number,z:number,w:number,h:number,d:number,id:string,color:string,slots=5){
  const face=z+d/2
  const part=(dx:number,dy:number,size:Point,tint:string,depth=.043)=>
    box([x+dx,slab+dy,face+depth],size,tint,id)
  box([x,h/2+slab,z],[w,h,d],color,id)
  part(0,h*.5,[w*.9,h*.92,.04],'#3b5149',.015)
  part(0,.095,[w*.82,.125,.042],C.metal)
  part(0,h*.83,[w*.8,h*.22,.035],color)
  part(w*.336,h*.62,[.027,.18,.047],C.trim,.069)
  part(-w*.405,h*.26,[.044,.104,.04],C.metal,.066)
  part(-w*.405,h*.72,[.044,.104,.04],C.metal,.066)
  if(id.startsWith('router')){
    for(let row=0;row<6;row++){
      const y=.4+row*.207
      part(0,y,[w*.74,.13,.036],color)
      for(let port=0;port<5;port++) part(w*(port*.105-.27),y,[.046,.04,.02],C.screen,.071)
      part(w*.282,y,[.026,.025,.02],row%3?'#a8c39a':'#e1b779',.071)
    }
  }else{
    const ventHeight=slots*.077+.087
    part(0,.23+ventHeight/2,[w*.72,ventHeight,.021],'#334940')
    for(let j=0;j<slots;j++) part(0,.292+j*.077,[w*.66,.026,.027],'#82978b',.059)
    part(0,h*.58,[w*.74,.025,.02],color)
  }
  part(-w*.14,h*.83,[w*.34,.128,.032],C.screen,.07)
  part(-w*.16,h*.833,[w*.22,.064,.015],'#9bbfa2',.091)
  for(let i=0;i<3;i++) part(w*(.097+i*.074),h*.833,[.02,.022,.013],i===2?'#d5ab71':'#a8c39a',.078)
}
export function staircase(){
  const group=new T.Group(),{box,finish}=batch()
  const {steps,run,x,lowZ,width}=stairs,rise=property.technicalHeight/steps
  const slant=Math.atan2(rise,run),length=Math.hypot((steps-1)*run,(steps-1)*rise)
  const centerZ=lowZ-(steps-1)*run/2,centerY=slab+(steps+1)*rise/2
  for(let i=0;i<steps;i++){
    const h=slab+(i+1)*rise,depth=lowZ-i*run
    box([x,h-.036,depth],[width,.072,run+.018],'#d8ceba')
    box([x,h-rise/2,depth-.084],[width-.13,rise-.035,.061],'#b9b2a1')
    box([x,h-.007,depth+run/2],[width,.019,.039],'#a29c8a')
  }
  for(const side of [-1,1]){
    box([x+side*.73,centerY-.138,centerZ],[.081,.21,length],C.metal,undefined,0,'box','solid',slant)
    for(const i of [0,4,8,12,16,19]) box([x+side*.793,slab+(i+1)*rise+.46,lowZ-i*run],[.041,.92,.041],C.door)
    box([x+side*.793,centerY+.93,centerZ],[.057,.057,length+.1],C.door,undefined,0,'box','solid',slant)
  }
  finish(group)
  return group
}
export function interior(floor:'ground'|'upper',cap:Capacity){
  const group=new T.Group(),{box,finish}=batch()
  const level=floor==='ground'?slab:property.technicalHeight+slab
  for(const rect of floor==='ground'?[property.building]:upperSlabs) flooring(box,rect,level,'#dfdacb',undefined,slab)
  for(const room of rooms.filter(room=>room.floor===floor)){
    const [x,z,w,d]=room.rect
    flooring(box,[x+.06,z+.06,w-.12,d-.12],level+.012,room.color,room.id,.04)
    if(room.id.startsWith('hall')){
      for(let i=1;i<w;i++) box([x+i,level+.018,z+d/2],[.012,.008,d-.2],'#aebcb4',room.id)
      for(let i=1;i<d;i++) box([x+w/2,level+.018,z+i],[w-.2,.008,.013],'#aebcb4',room.id)
      const installed=cap.racks.filter(rack=>rack.hall===room.id)
      const activeEdge=Math.max(x+2.67,...installed.map(rack=>rack.position[0]+.38))
      for(const offset of [2.7,7.55]){
        flooring(box,[x+2.67,z+offset-.58,6.42,1.16],level+.024,'#a7c8bf',room.id,.035)
        for(let i=0;i<13;i++) box([x+2.85+i*.47,level+.027,z+offset],[.32,.013,.52],'#98b9ae',room.id)
        if(installed.length){
          const start=x+2.68
          box([(start+activeEdge)/2,2.31,z+offset],[activeEdge-start,.043,1.29],'#b9d8cf',room.id,0,'box','glass')
          for(const end of [start,activeEdge]) for(const side of [-1,1]){
            box([end,1.27,z+offset+side*.64],[.061,2.19,.061],C.door,room.id)
          }
        }
      }
      for(const offset of [1.45,3.95,6.35,8.75]){
        const trayZ=z+offset
        for(const side of [-1,1]) box([x+5.775,2.58,trayZ+side*.107],[6.45,.06,.033],C.metal,room.id)
        for(let i=0;i<19;i++) box([x+2.65+i*.339,2.556,trayZ],[.04,.026,.208],'#789087',room.id)
        for(const cable of [-.034,.03]) box([x+5.775,2.582,trayZ+cable],[6.39,.027,.024],'#455d54',room.id)
      }
      const hall=hallInfrastructure.find(item=>item.id===room.id)!
      const suffix=hall.suffix==='B'?'-b':''
      for(let i=0;i<cap.coolingUnits/2;i++) cabinet(box,hall.crac[0],hall.crac[2]+i*1.21,.96,2.25,.68,'crac'+suffix,'#78948c',8)
      box([hall.temperature[0],.37,hall.temperature[2]],[.15,.34,.15],C.door,'temperature'+suffix)
      if(cap.racks.length) for(const offset of [0,.7]) cabinet(box,hall.pdu[0]+offset,hall.pdu[2],.47,1.65,.51,'pdus'+suffix,offset?'#a19067':'#718671',6)
    }
    if(room.id==='power'){
      for(let i=0;i<cap.upsModules;i++){
        cabinet(box,x+1.3+i%3*1.47,z+6.3+Math.floor(i/3)*2.45,1.03,2.23,.94,'ups','#779087')
        cabinet(box,x+6.5+i%3*1.12,z+6.3+Math.floor(i/3)*2.45,.8,2.13,.92,'ups','#5b7066',8)
      }
      for(let i=0;i<6;i++) cabinet(box,x+1.2+i*1.17,z+1.5,.93,2.23,.84,'switchgear',i%2?C.metal:'#708379')
      const [inverterX,,inverterZ]=equipment.find(item=>item.id==='inverter')!.position
      cabinet(box,inverterX,inverterZ,.51,1.55,.48,'inverter','#78876b',5)
      for(const dz of [3.12,5.07]) flooring(box,[x+.5,z+dz,w-2.1,.14],level+.025,'#c4a570',room.id)
    }
    if(room.id==='cooling'){
      for(let i=0;i<4;i++){
        cabinet(box,x+1.2+i*1.63,z+2,1.03,1.88,.83,room.id,'#7c9591',8)
        box([x+1.2+i*1.63,1.71,z+6.31],[.42,2.56,.42],'#a0aea6',room.id,0,'round')
        box([x+1.2+i*1.63,1.72,z+6.31],[.77,.16,.77],'#587e77',room.id,0,'round')
      }
      segment(box,[x+.9,2.85,z+6.31],[x+7.4,2.85,z+6.31],.23,'#5e8a83',.2)
      box([-5.8,.24,5],[.35,.10,.23],'#568b81','leak')
    }
    if(room.id==='network'){
      for(const asset of equipment.filter(asset=>asset.kind==='router')){
        const [px,,pz]=asset.position;cabinet(box,px,pz,.78,2.08,1.07,asset.id,C.metal,10)
      }
      segment(box,[x+.75,2.4,z+.75],[x+w-1.3,2.4,z+.75],.25,'#5d6d68',.14)
    }
    if(room.id==='noc'){
      for(let i=0;i<3;i++) desk(box,x+1.52+i*1.79,z+4.05,level,room.id,1.47,true)
      for(let i=0;i<4;i++){
        const screenX=x+.96+i*1.54
        box([screenX,1.68,z+.52],[1.39,.81,.13],C.rack,room.id)
        box([screenX,1.68,z+.6],[1.29,.7,.035],i%2?'#73949c':'#527b77',room.id)
        for(let row=0;row<3;row++){
          box([screenX-.29,1.49+row*.17,z+.624],[.45,.085,.014],'#9bb6ac',room.id)
          box([screenX+.28,1.49+row*.17,z+.624],[.5,.029,.015],'#c0d1b4',room.id)
        }
      }
    }
    if(room.id==='reception'){
      const id=room.id
      box([x+2.65,level+.56,z+2.66],[3.54,1.04,.63],'#ad8b63',id)
      box([x+2.65,level+1.12,z+2.57],[3.7,.106,.59],C.trim,id)
      box([x+2.65,level+.82,z+2.95],[3.47,.09,.51],'#d4c3a4',id)
      box([x+2.65,level+.13,z+2.315],[3.42,.22,.068],C.door,id)
      for(let i=0;i<14;i++) box([x+1.02+i*.238,level+.59,z+2.33],[.034,.69,.028],'#ccb08a',id)
      monitor(box,x+2.44,level+.87,z+2.96,.57,id,'#86a69d')
      chair(box,x+2.44,z+3.66,level,id)
      for(const dx of [1,1.9,2.8]) chair(box,x+dx,z+.93,level,id,Math.PI,true)
      for(const dx of [1.43,2.43]) box([x+dx,level+.21,z+1.68],[.057,.405,.32],C.metal,id)
      box([x+1.93,level+.42,z+1.68],[1.19,.077,.47],'#b59872',id)
      box([x+1.83,level+.47,z+1.67],[.26,.023,.17],'#dedecb',id,-.2)
      box([x+4.25,level+.205,z+.8],[.34,.408,.34],'#a98f73',id,0,'round')
      box([x+4.25,level+.56,z+.8],[.47,.53,.45],'#789268',id,.31,'tree')
      for(const dx of [7.35,8.75]){
        const px=x+dx,aisle=z+2.7,hinge=aisle+.62
        for(const edge of [aisle-.62,hinge]) box([px,level+1.05,edge],[.07,2.1,.066],C.door,id)
        for(const side of [-1,1]){
          const panelZ=aisle+side*.93
          box([px,level+1.05,panelZ],[.049,2.04,.6],'#9cbbb6',id,0,'box','glass')
          for(const y of [.045,2.07]) box([px,level+y,panelZ],[.069,.05,.62],C.door,id)
        }
        box([px,level+2.1,aisle],[.08,.07,2.52],C.door,id)
        box([px+.6,level+1.04,hinge],[1.2,1.96,.049],'#9cbbb6',id,0,'box','glass')
        for(const y of [.065,2.017]) box([px+.6,level+y,hinge],[1.2,.052,.066],C.door,id)
        box([px+1.179,level+1.04,hinge],[.046,1.96,.066],C.door,id)
        box([px+1.04,level+1.02,hinge+.046],[.06,.185,.055],C.rack,id)
        box([px+.08,level+1.07,aisle-.63],[.09,.14,.086],C.rack,id)
        box([px+.13,level+1.109,aisle-.63],[.017,.022,.024],'#9cc58e',id)
      }
    }
    if(room.id==='delivery'){
      for(let i=0;i<3;i++){
        box([x+1.23,.94,z+2.9+i*1.51],[.84,1.52,.99],'#9c835b',room.id)
        box([x+1.23,1.72,z+2.9+i*1.51],[.09,.035,1],'#dfca9f',room.id)
      }
      box([x+5.56,.75,z+6.9],[1.35,1.13,3.25],C.metal,room.id)
      box([x+5.56,1.37,z+6.9],[1.42,.13,3.32],'#c8a77c',room.id)
    }
    if(room.id==='utility') for(let i=0;i<3;i++) cabinet(box,x+1.16+i*1.1,z+1.5,.82,1.6,.75,room.id,'#91a499',1)
    if(room.id==='offices'){desk(box,x+1.65,z+1.5,level,room.id);desk(box,x+3.75,z+1.5,level,room.id)}
    if(room.id==='shared') for(const dx of [1.45,3.45,5.45]) desk(box,x+dx,z+1.55,level,room.id)
    if(room.id==='meeting'){
      box([x+2.4,level+.78,z+2.08],[2.38,.13,1.05],'#b0956b',room.id)
      for(const dx of [1.53,3.27]) box([x+dx,level+.365,z+2.08],[.10,.73,.66],C.metal,room.id)
      box([x+2.4,level+.854,z+2.08],[.31,.018,.12],C.door,room.id)
      for(const dx of [1.54,2.41,3.28]){
        chair(box,x+dx,z+1.13,level,room.id,Math.PI,true)
        chair(box,x+dx,z+2.99,level,room.id,0,true)
      }
    }
    if(room.id==='break'){
      box([x+1.9,level+.69,z+1.59],[1.56,.105,.92],'#ac946f',room.id)
      box([x+1.9,level+.32,z+1.59],[.107,.64,.107],C.metal,room.id,0,'round')
      box([x+1.9,level+.035,z+1.59],[.59,.069,.59],C.metal,room.id,0,'round')
      for(const dx of [1.2,2.6]) chair(box,x+dx,z+2.3,level,room.id,0,true)
    }
    if(room.id==='restroom') for(const dx of [.63,1.93]) box([x+dx,level+.56,z+.55],[.67,.24,.52],C.white)
  }
  if(floor==='ground'){
    for(const x of [-19.3,-18.92,-18.54]) box([x,.77,-3.55],[.29,1.16,.29],'#a65047','fire',0,'round')
    for(let i=0;i<7;i++) box([-17.4-i*.37,slab+.024,-.95],[.19,.019,.15],'#80a897')
    for(let i=0;i<6;i++) box([5.5,slab+.024,10.45+i*.27],[.22,.019,.15],'#80a897')
  }else{
    const [x,z,w,d]=stairs.opening
    const edges=[[x,z,x,z+d],[x+w,z,x+w,z+d],[x,z+d,x+w,z+d]]
    for(const [ax,az,bx,bz] of edges){
      segment(box,[ax,level+.99,az],[bx,level+.99,bz],.065,C.door,.062)
      segment(box,[ax,level+.47,az],[bx,level+.47,bz],.045,C.door,.044)
      const posts=Math.ceil(Math.hypot(bx-ax,bz-az)/1.3)
      for(let i=0;i<=posts;i++) box([T.MathUtils.lerp(ax,bx,i/posts),level+.49,T.MathUtils.lerp(az,bz,i/posts)],[.058,.98,.058],C.door)
    }
  }
  const cut=batch(),cutWalls=new T.Group()
  const collision=walls(cut.box,floor,false)
  cut.finish(cutWalls);finish(group);group.add(cutWalls)
  return {group,collision,cutWalls}
}

import * as T from 'three'
import { accessVestibule,coolingCircuitSuffixes,eastGroundDoors,equipment,hallInfrastructure,loadingDoor,property,rooms,secureEntrances,secureSas,serviceEntry,stairSideDoors,stairs,technicalPorts,upperSlabs,utilityDoor,type Point } from './model'
import type { Capacity } from './engineering'
import { batch,cableGland,colors as C,flooring,rod,segment,slab,type Place } from './geometryTools'

export type Collision={x:number;z:number;w:number;d:number}
type Wall={vertical:boolean;line:number;a:number;b:number;door?:readonly [number,number];badge?:boolean;room?:string;loading?:boolean}
const doors:Record<string,{edge:'n'|'e'|'s'|'w';at:number;width?:number;badge?:boolean}>={
  delivery:{edge:'n',at:5.5,width:2.15},noc:{edge:'e',at:-8.2},reception:{edge:'n',at:15.2,width:1.35,badge:true},
  utility:utilityDoor,offices:{edge:'s',at:13.1},meeting:{edge:'s',at:17.4},
  break:{edge:'n',at:11.1},...stairSideDoors,
}
export function walls(box:Place,floor:'ground'|'upper',full:boolean,visibleIds?:ReadonlySet<string>) {
  const base=floor==='ground'?slab:property.technicalHeight+slab
  const max=floor==='ground'?property.technicalHeight-slab:property.upperHeight-slab
  const buckets=new Map<string,Wall[]>()
  const add=(vertical:boolean,line:number,a:number,b:number,door?:Wall['door'],badge?:boolean,room?:string,loading=false)=>{
    const key=String(vertical)+','+line
    const bucket=buckets.get(key)??[]
    bucket.push({vertical,line,a,b,door,badge,room,loading});buckets.set(key,bucket)
  }
  const [x,z,w,d]=floor==='ground'?property.building:property.upper
  add(false,z,x,x+w)
  add(false,z+d,x,x+w,floor==='ground'?loadingDoor.opening:undefined,undefined,undefined,floor==='ground')
  add(true,x,z,z+d,floor==='ground'?serviceEntry:undefined)
  add(true,x+w,z,z+d,floor==='ground'?eastGroundDoors.reception:undefined)
  if(floor==='ground'){
    add(true,x+w,z,z+d,eastGroundDoors.network)
    add(true,x+w,z,z+d,eastGroundDoors.stairs)
    const {rect:[west,north,width,depth],axis,innerDoor}=accessVestibule
    add(true,west,north,north+depth,[axis,innerDoor])
    for(const edge of [north,north+depth]) add(false,edge,west,west+width)
    if(full){
      flooring(box,accessVestibule.rect,base+2.68,'#e3e5d9',undefined,.08)
      box([west+width/2,base+2.585,axis],[1.55,.055,.25],C.white,undefined,0,'box','light')
    }
  }
  for(const room of rooms.filter(room=>room.floor===floor)){
    const [rx,rz,rw,rd]=room.rect
    const move=doors[room.id]??secureEntrances[room.id]
    for(const [edge,v,line,a,b] of [['n',false,rz,rx,rx+rw],['s',false,rz+rd,rx,rx+rw],['w',true,rx,rz,rz+rd],['e',true,rx+rw,rz,rz+rd]] as const){
      const door:Wall['door']=move?.edge===edge?[move.at,move.width??1.02]:undefined
      add(v,line,a,b,door,doors[room.id]?.badge&&Boolean(door),room.id)
    }
  }
  if(floor==='ground') for(const {inner,rect:[left,near,width,depth]} of secureSas){
    for(const edge of [left,left+width]) add(true,edge,near,near+depth,undefined,false,inner.room.id)
    add(false,inner.z,left,left+width,[inner.x,inner.width],false,inner.room.id)
    flooring(box,[left+.1,near+.1,width-.2,depth-.2],base+.035,'#b4c2b8',inner.room.id,.029)
  }
  const collisions:Collision[]=[]
  const visible=(edge:Wall)=>!visibleIds||Boolean(edge.room&&visibleIds.has(edge.room))
  for(const edges of buckets.values()){
    const {vertical,line}=edges[0]
    const spans=edges.flatMap(edge=>edge.door?[edge.door]:[])
    const stops=[...new Set(edges.flatMap(e=>[e.a,e.b,...(e.door?[e.door[0]-e.door[1]/2,e.door[0]+e.door[1]/2]:[])]))].sort((a,b)=>a-b)
    const h=full?max:(!vertical&&line<-10?2.04:1.08)
    const at=(t:number,y:number,offset=0):Point=>vertical?[line+offset,y,t]:[t,y,line+offset]
    stops.slice(0,-1).forEach((a,i)=>{
      const b=stops[i+1],mid=(a+b)/2
      if(!edges.some(e=>mid>e.a&&mid<e.b&&visible(e))||spans.some(([p,w])=>Math.abs(mid-p)<w/2)) return
      segment(box,at(a,base+h/2),at(b,base+h/2),property.wall,full?'#dfded1':'#eae5d5',h)
      if(!full) segment(box,at(a,base+h+.024),at(b,base+h+.024),.21,'#f9f5e9',.047)
      const [x,,z]=at(mid,0)
      collisions.push({x,z,w:vertical?property.wall:b-a,d:vertical?b-a:property.wall})
    })
    for(const edge of edges){
      if(!edge.door||!visible(edge)) continue
      const [p,w]=edge.door
      if(edge.loading){
        const lintel=max-loadingDoor.height
        if(full&&lintel>0) segment(box,at(p-w/2,base+loadingDoor.height+lintel/2),at(p+w/2,base+loadingDoor.height+lintel/2),property.wall,'#dfded1',lintel)
        continue
      }
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
  place(0,.477,-.02,[.46,.065,.44],fabric)
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
    place(dx*.132,.095,dz*.132,[.045,.04,.197],C.rack,spoke)
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
// Places parts given in coordinates local to (x,z), turned by yaw like a Three.js rotation.y.
function turn(box:Place,x:number,z:number,yaw:number):Place{
  const cos=Math.cos(yaw),sin=Math.sin(yaw)
  return ([dx,y,dz],size,color,id,rotation=0,...rest)=>
    box([x+dx*cos+dz*sin,y,z-dx*sin+dz*cos],size,color,id,rotation+yaw,...rest)
}
// With yaw 0 the user sits on the +z side facing -z; yaw π puts the desk against a south wall.
function desk(box:Place,obstacles:Collision[],x:number,z:number,y:number,id:string,w=1.35,noc=false,yaw=0){
  obstacles.push({x,z,w,d:.7})
  const place=turn(box,x,z,yaw)
  place([0,y+.71,0],[w,.13,.7],'#b39670',id)
  for(const a of [-1,1]) for(const b of [-1,1]) place([a*(w/2-.1),y+.33,b*.25],[.06,.65,.06],C.rack,id)
  monitor(place,0,y+.775,-.16,w*.55,id,noc?'#6ca79d':'#8ba1a4')
  chair(place,0,.79,y,id)
}
function bookcase(place:Place,y:number,w:number,h:number,depth:number,id:string){
  // Butt the boards together so their visible faces don't overlap.
  const board=.03,insideDepth=depth-board,insideZ=board/2,insideWidth=w-2*board
  place([0,y+h/2,-insideDepth/2],[w,h,board],'#6b543d',id)
  for(const side of [-1,1]) place([side*(w-board)/2,y+(h-board)/2,insideZ],[board,h-board,insideDepth],'#7b6248',id)
  place([0,y+h-board/2,insideZ],[w,board,insideDepth],'#7b6248',id)
  place([0,y+.04,insideZ],[insideWidth,.08,insideDepth],'#6b543d',id)
  const shelves=Math.round(h/.38)
  for(let i=1;i<shelves;i++){
    const shelfY=y+.06+i*h/shelves
    place([0,shelfY,insideZ],[insideWidth,.025,insideDepth],'#9b7d5a',id)
    let at=-w/2+.08
    for(let book=0;at<w/2-.1;book++){
      const width=.035+(book*7%5)*.012,height=.2+(book*3%4)*.03
      if(book%6!==5) place([at+width/2,shelfY+.013+height/2,.04],[width,height,.24],['#40564f','#8c6c4f','#58708a','#b59b6b','#6e4b45'][book%5],id)
      at+=width+.006
    }
  }
}
// One executive office: desk facing the door, visitor chairs, credenza and a small lounge corner.
function directorOffice(box:Place,obstacles:Collision[],x:number,z:number,w:number,d:number,y:number,id:string){
  flooring(box,[x+.55,z+2.55,2.9,1.45],y+.02,'#8d7b62',id,.012)
  const deskX=x+1.95,deskZ=z+1.75,deskW=1.9,deskD=.88
  obstacles.push({x:deskX,z:deskZ,w:deskW,d:deskD})
  box([deskX,y+.745,deskZ],[deskW,.06,deskD],'#5e4636',id)
  box([deskX,y+.776,deskZ],[deskW-.16,.004,deskD-.2],'#3f4f49',id)
  for(const side of [-1,1]) box([deskX+side*(deskW/2-.04),y+.36,deskZ],[.06,.72,deskD-.04],'#4b382b',id)
  box([deskX,y+.44,deskZ+.38],[deskW-.1,.5,.03],'#4b382b',id)
  box([deskX+.55,y+.36,deskZ-.05],[.45,.7,.7],'#56412f',id)
  const top=y+.78
  box([deskX-.05,top+.012,deskZ-.2],[.36,.016,.25],'#2b3a37',id)
  box([deskX-.05,top+.13,deskZ-.04],[.36,.23,.012],'#2b3a37',id,0,'box','solid',.28)
  box([deskX-.05,top+.13,deskZ-.05],[.33,.2,.006],'#6f9590',id,0,'box','solid',.28)
  box([deskX+.62,top+.012,deskZ+.05],[.24,.03,.32],C.white,id)
  box([deskX+.62,top+.032,deskZ+.05],[.22,.01,.3],'#e9e4d4',id)
  box([deskX-.72,top+.01,deskZ-.18],[.13,.02,.13],C.metal,id,0,'round')
  box([deskX-.72,top+.2,deskZ-.18],[.016,.38,.016],C.metal,id)
  box([deskX-.67,top+.38,deskZ-.18],[.11,.016,.024],C.metal,id)
  box([deskX-.6,top+.35,deskZ-.18],[.13,.07,.13],'#e8d8a8',id,0,'round','light')
  box([deskX-.3,top+.03,deskZ+.32],[.36,.06,.05],'#b59b6b',id,0,'box','solid',-.5)
  // High-back chair behind the desk, two visitor chairs facing it.
  chair(box,deskX,deskZ-.82,y,id,Math.PI)
  box([deskX,y+.98,deskZ-1.05],[.46,.34,.07],C.rack,id)
  for(const dx of [-.45,.45]) chair(box,deskX+dx,deskZ+1.05,y,id,0,true)
  obstacles.push({x:deskX,z:deskZ+1.08,w:1.4,d:.5})
  // Credenza and bookcase along the back wall behind the director.
  const credenzaDepth=.44,credenzaZ=z+(property.wall+credenzaDepth)/2+.02
  const credenza=turn(box,deskX,credenzaZ,0)
  obstacles.push({x:deskX,z:credenzaZ,w:2.2,d:credenzaDepth})
  credenza([0,y+.36,0],[2.2,.7,credenzaDepth],'#5e4636',id)
  for(const dx of [-.55,0,.55]) credenza([dx,y+.36,.225],[.52,.62,.012],'#6f5441',id)
  for(const dx of [-.55,0,.55]) credenza([dx+.18,y+.4,.235],[.018,.12,.02],C.metal,id)
  credenza([-.7,y+.97,0],[.48,.5,.03],'#a9b8a6',id)
  credenza([-.7,y+.97,.02],[.42,.43,.01],'#6d8f7f',id)
  credenza([.6,y+.82,0],[.18,.24,.18],'#d7cdb8',id,0,'round')
  const shelfDepth=.36,shelfX=x+w-(property.wall+shelfDepth)/2-.02,shelfZ=z+1.25
  const shelf=turn(box,shelfX,shelfZ,-Math.PI/2)
  obstacles.push({x:shelfX,z:shelfZ,w:.4,d:1.5})
  bookcase(shelf,y,1.45,2.05,shelfDepth,id)
  // Lounge corner: armchair, side table and plant clear of the door path.
  const lounge=turn(box,x+w-.55,z+d-.95,Math.PI/2)
  obstacles.push({x:x+w-.55,z:z+d-.95,w:.8,d:.8})
  lounge([0,y+.22,0],[.78,.3,.78],'#506a62',id)
  lounge([0,y+.425,0],[.5,.11,.5],'#6a857b',id)
  lounge([0,y+.615,.33],[.78,.49,.16],'#506a62',id)
  for(const side of [-1,1]) lounge([side*.32,y+.495,-.07],[.14,.25,.64],'#506a62',id)
  box([x+w-.5,y+.27,z+2.4],[.42,.54,.42],'#5e4636',id,0,'round')
  obstacles.push({x:x+w-.5,z:z+2.4,w:.42,d:.42})
  box([x+.4,y+.22,z+d-.42],[.36,.44,.36],'#8a7462',id,0,'round')
  for(const [dx,dy,dz,s] of [[0,.66,0,.5],[.09,.86,-.05,.36],[-.08,.8,.08,.34]]) box([x+.4+dx,y+dy,z+d-.42+dz],[s,s,s],'#577c58',id,0,'leaf')
  obstacles.push({x:x+.4,z:z+d-.42,w:.42,d:.42})
  for(const [dz,tint] of [[1.05,'#6f8fa0'],[2.45,'#b99a6a']] as const){
    box([x+.105,y+1.62,z+dz],[.03,.62,.86],'#4b382b',id)
    box([x+.122,y+1.62,z+dz],[.008,.54,.78],tint,id)
  }
}
// Open-plan workspace: desk rows against the long walls leave a 1.9 m aisle between them,
// and the south row stops short of the break-room door.
function workspace(box:Place,obstacles:Collision[],x:number,z:number,w:number,d:number,y:number,id:string){
  for(const dx of [.9,2.6]) desk(box,obstacles,x+dx,z+.47,y,id)
  for(const dx of [2.6,4.3]) desk(box,obstacles,x+dx,z+d-.47,y,id,1.35,false,Math.PI)
  const storageDepth=.46,storageX=x+(property.wall+storageDepth)/2+.02,storageZ=z+d/2
  const storage=turn(box,storageX,storageZ,Math.PI/2)
  obstacles.push({x:storageX,z:storageZ,w:storageDepth,d:1.1})
  storage([0,y+.52,0],[1.1,1.04,storageDepth],'#c7c3b4',id)
  for(const dx of [-.27,.27]) storage([dx,y+.52,.235],[.52,.98,.012],'#d8d4c5',id)
  for(const dx of [-.06,.06]) storage([dx,y+.75,.245],[.018,.12,.02],C.metal,id)
  box([x+.105,y+1.62,z+d/2],[.03,.9,1.6],C.white,id)
  box([x+.122,y+1.62,z+d/2],[.008,.84,1.54],'#f4f4ee',id)
  box([x+.135,y+1.18,z+d/2],[.05,.03,1.2],C.metal,id)
  box([x+w-.4,y+.22,z+2.4],[.36,.44,.36],'#8a7462',id,0,'round')
  for(const [dx,dy,dz,s] of [[0,.66,0,.5],[.08,.86,.05,.36]]) box([x+w-.4+dx,y+dy,z+2.4+dz],[s,s,s],'#577c58',id,0,'leaf')
  obstacles.push({x:x+w-.4,z:z+2.4,w:.42,d:.42})
}
export function glazedDoor(box:Place,level:number,wallX:number,axis:number,width:number,badge:boolean,id?:string):Collision{
  const opening=width-.14
  const hinge=axis+width/2-.08
  const panelX=wallX+opening/2,tip=wallX+opening-.03
  for(const side of [-1,1]){
    box([wallX-.013,level+1.055,axis+side*(width/2-.06)],[.19,2.11,.095],C.door,id)
  }
  box([wallX-.014,level+2.135,axis],[.19,.095,width+.032],C.door,id)
  box([wallX,level+.018,axis],[.34,.022,width-.08],C.metal,id)
  box([panelX,level+.462,hinge],[opening-.02,.853,.061],'#5f786d',id)
  box([panelX,level+1.47,hinge],[opening-.09,1.157,.054],'#a9c7c1',id,0,'box','glass')
  for(const edge of [wallX+.028,tip]) box([edge,level+1.06,hinge],[.053,2.04,.084],C.door,id)
  for(const y of [.042,.908,2.083]) box([panelX,level+y,hinge],[opening,.058,.086],C.door,id)
  for(const side of [-1,1]){
    box([tip-.047,level+1.043,hinge+side*.061],[.065,.22,.044],C.metal,id)
    if(badge){
      box([wallX+side*.143,level+1.075,axis-width/2-.14],[.075,.16,.092],C.rack,id)
      box([wallX+side*.187,level+1.111,axis-width/2-.14],[.017,.023,.031],'#a0c98f',id,0,'box','light')
    }
  }
  return {x:panelX,z:hinge,w:opening,d:.086}
}
function vestibule(box:Place,obstacles:Collision[],level:number,id:string){
  const {rect:[x,z,w,d],axis,innerDoor,outerDoor}=accessVestibule
  flooring(box,[x+.09,z+.09,w-.18,d-.18],level+.017,'#c0cabf',id,.025)
  flooring(box,[x+.85,axis-.64,1.47,1.28],level+.025,'#65796e',id,.018)
  for(let line=0;line<12;line++) box([x+.91+line*.121,level+.028,axis],[.02,.006,1.16],'#8b9c8e',id)
  obstacles.push(glazedDoor(box,level,x,axis,innerDoor,true,id),glazedDoor(box,level,x+w-.035,axis,outerDoor,true,id))
}
function coolingPipeRack(box:Place,obstacles:Collision[],x:number,z:number,floor:number,id:string){
  const span=6.68,depth=1.14,base=floor+.14,centerX=x+span/2
  const headers=[
    {z:z+.28,y:base+1.76,color:'#507e74'},
    {z:z-.28,y:base+1.48,color:'#718d87'},
  ]
  const [supply,returnLine]=headers
  box([centerX,floor+.07,z],[span,.14,depth],'#a6b6af',id)
  obstacles.push({x:centerX,z,w:span,d:depth})

  for(const support of [.35,3.34,6.33]){
    const px=x+support
    for(const side of [-1,1]){
      const footZ=z+side*.43
      box([px,base+.023,footZ],[.26,.046,.22],C.metal,id)
      box([px,base+.85,footZ],[.095,1.7,.095],C.rack,id)
      for(const bolt of [-.09,.09]) box([px+bolt,base+.054,footZ],[.044,.027,.044],'#c4cfc4',id,0,'round')
    }
    for(const header of headers){
      box([px,header.y-.122,z],[.105,.076,.94],C.metal,id)
      box([px,header.y,header.z],[.06,.218,.218],'#9daea3',id,0,'pipe')
    }
  }
  for(const header of headers){
    box([centerX,header.y,header.z],[span-.26,.178,.178],header.color,id,0,'pipe')
    for(const end of [.16,span-.16]){
      box([x+end,header.y,header.z],[.079,.268,.268],C.metal,id,0,'pipe')
      box([x+end,header.y,header.z],[.105,.191,.191],'#acb9ad',id,0,'pipe')
    }
  }

  for(let index=0;index<4;index++){
    const px=x+.91+index*1.58
    const vesselZ=z+.22
    box([px,base+.068,vesselZ],[.46,.136,.43],C.metal,id)
    box([px,base+.525,vesselZ],[.32,.8,.32],'#9faea9',id,0,'round')
    for(const height of [.17,.885]){
      box([px,base+height,vesselZ],[.372,.065,.372],'#5d796e',id,0,'round')
    }
    box([px,base+.943,vesselZ],[.235,.075,.235],'#b6c5bc',id,0,'round')
    box([px,(base+.96+supply.y)/2,supply.z],[.105,supply.y-(base+.96),.105],supply.color,id,0,'round')

    const branchY=base+.49
    box([px,branchY,(vesselZ+returnLine.z)/2],[.096,vesselZ-returnLine.z,.096],returnLine.color,id,0,'round','solid',Math.PI/2)
    box([px,(branchY+returnLine.y)/2,returnLine.z],[.096,returnLine.y-branchY,.096],returnLine.color,id,0,'round')
    box([px,branchY,returnLine.z],[.104,.104,.104],returnLine.color,id,0,'sphere')
    for(const y of [base+1.12,base+1.26]){
      box([px,y,supply.z],[.205,.057,.205],C.metal,id,0,'round')
    }
    box([px,base+1.19,supply.z],[.162,.142,.162],C.door,id,0,'round')
    box([px,base+1.19,supply.z+.116],[.118,.075,.115],'#8d9d8b',id)
    box([px,base+1.19,supply.z+.179],[.215,.045,.215],'#426c60',id,0,'round','solid',Math.PI/2)
    box([px+.09,base+1.46,supply.z+.045],[.2,.038,.038],C.metal,id,0,'pipe')
    box([px+.19,base+1.52,supply.z+.068],[.048,.14,.05],C.metal,id)
    box([px+.19,base+1.625,supply.z+.086],[.16,.052,.16],C.rack,id,0,'round','solid',Math.PI/2)
    box([px+.19,base+1.625,supply.z+.116],[.135,.016,.135],C.white,id,0,'round','solid',Math.PI/2)
    box([px+.208,base+1.64,supply.z+.126],[.044,.013,.009],'#63736a',id)
  }
}
function cabinet(box:Place,obstacles:Collision[],x:number,z:number,w:number,h:number,d:number,id:string,color:string,slots=5){
  obstacles.push({x,z,w,d})
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
function workshop(box:Place,obstacles:Collision[],x:number,z:number,south:number,level:number){
  const id='delivery',rackX=x+1.02,rackZ=z+4.66,depth=5.15
  const place=(px:number,y:number,pz:number,size:Point,color:string)=>
    box([px,level+y,pz],size,color,id)
  obstacles.push({x:rackX,z:rackZ,w:.96,d:depth})
  for(const dz of [-2.56,-.86,.86,2.56]){
    for(const side of [-1,1]){
      place(rackX+side*.45,.044,rackZ+dz,[.166,.087,.135],C.rack)
      place(rackX+side*.45,1.14,rackZ+dz,[.07,2.28,.065],C.door)
    }
  }
  for(const height of [.19,.93,1.67,2.19]){
    const support=height===2.19?'#698078':'#a2855b'
    for(const side of [-1,1]) place(rackX+side*.423,height,rackZ,[.072,.096,depth],support)
    if(height<2.19) place(rackX,height+.046,rackZ,[.83,.058,depth-.06],'#909d92')
  }
  for(const [dz,shelf,w,h,d,tint] of [
    [-1.95,.19,.66,.49,.71,'#ad925d'],[-1.18,.19,.59,.34,.64,'#b9a477'],
    [.05,.19,.69,.57,1.07,'#8b8f7e'],[1.77,.19,.69,.48,.97,'#a08f72'],
    [-1.67,.93,.54,.33,.83,'#c1a675'],[-.41,.93,.57,.40,.57,'#ab9166'],
    [.35,.93,.57,.28,.7,'#a98d60'],[1.71,.93,.63,.40,.8,'#bd9f71'],
    [-1.7,1.67,.61,.26,.83,'#6d847b'],[-.49,1.67,.56,.25,.58,'#829183'],
    [.41,1.67,.54,.28,.63,'#768a80'],[1.78,1.67,.65,.29,.87,'#6f8274'],
  ] as [number,number,number,number,number,string][]){
    const bottom=shelf+.078,pz=rackZ+dz
    place(rackX,bottom+h/2,pz,[w,h,d],tint)
    place(rackX+w/2+.006,bottom+h*.65,pz-.08,[.018,.10,.23],'#ece6cf')
    place(rackX+.04,bottom+h+.011,pz,[.072,.019,d],shelf<1.1?'#d5c29b':'#60766b')
  }
  const benchX=x+5.78,benchZ=z+6.54
  obstacles.push({x:benchX,z:benchZ,w:.91,d:2.78})
  for(const edge of [-1,1]) for(const side of [-1,1]){
    place(benchX+side*.35,.44,benchZ+edge*1.26,[.077,.88,.075],C.rack)
  }
  place(benchX,.91,benchZ,[.94,.095,2.78],'#ab9470')
  place(benchX,.39,benchZ+.92,[.71,.70,.69],C.metal)
  for(const height of [.22,.43,.64]){
    place(benchX-.374,height,benchZ+.92,[.046,.17,.62],'#81958a')
    place(benchX-.408,height+.036,benchZ+.92,[.055,.034,.29],C.rack)
  }
  place(benchX+.35,1.33,benchZ,[.094,.72,2.57],'#708077')
  for(let column=0;column<14;column++) for(const row of [0,1,2]){
    place(benchX+.295,1.10+row*.18,benchZ-1.08+column*.165,[.019,.024,.023],C.rack)
  }
  place(benchX-.10,.969,benchZ-.45,[.51,.022,1.01],'#526c61')
  place(benchX-.09,1.017,benchZ-.62,[.32,.077,.32],'#607c74')
  place(benchX-.17,1.078,benchZ-.62,[.14,.08,.21],C.metal)
  place(benchX+.01,1.27,benchZ+.45,[.25,.28,.36],C.metal)
  place(benchX-.127,1.302,benchZ+.45,[.032,.123,.202],C.screen)
  for(const dz of [-1.02,-.57,.03,.78,1.01]){
    place(benchX+.261,1.41,benchZ+dz,[.054,.31,.046],C.trim)
    place(benchX+.251,1.29,benchZ+dz,[.073,.12,.071],'#bd9d55')
  }
  const cartZ=z+3.38
  obstacles.push({x:benchX,z:cartZ,w:.66,d:.93})
  for(const side of [-1,1]) for(const end of [-1,1]){
    const wheelX=benchX+side*.243,wheelZ=cartZ+end*.365
    box([wheelX,level+.068,wheelZ],[.065,.137,.137],C.rack,id,0,'pipe')
    place(wheelX,.446,wheelZ,[.046,.65,.046],C.metal)
  }
  for(const y of [.22,.78]){
    place(benchX,y,cartZ,[.63,.07,.91],C.metal)
    for(const side of [-1,1]) place(benchX+side*.292,y+.06,cartZ,[.039,.078,.88],'#81948b')
  }
  place(benchX-.06,.861,cartZ-.236,[.288,.101,.32],'#b59462')
  place(benchX-.06,.92,cartZ-.236,[.136,.036,.054],C.rack)
  place(benchX+.09,.89,cartZ+.217,[.23,.153,.31],'#668276')
  // Mark the loading bay at the side, clear of the aisle between the two doors.
  const stagingZ=south-1.73,stagingWidth=1.47,stagingDepth=1.195,stripe=.055
  for(const side of [-1,1]){
    place(x+1.02,.024,stagingZ+side*(stagingDepth-stripe)/2,[stagingWidth,.009,stripe],'#b99b52')
    place(x+1.02+side*(stagingWidth-stripe)/2,.024,stagingZ,[stripe,.009,stagingDepth-2*stripe],'#b99b52')
  }
  for(const dz of [-.36,0,.36]){
    place(x+1.02,.081,stagingZ+dz,[1.14,.085,.103],'#906d4d')
  }
  for(let i=0;i<5;i++) place(x+.59+i*.215,.145,stagingZ,[.174,.047,.9],'#c0a579')
  place(x+1.02,.412,stagingZ,[.85,.49,.69],'#a39b81')
  place(x+1.02,.665,stagingZ,[.084,.019,.68],'#545e54')
  obstacles.push({x:x+1.02,z:stagingZ,w:1.14,d:.9})
  for(let i=0;i<6;i++) place(loadingDoor.opening[0],.024,south-2.05+i*.27,[.22,.019,.15],'#80a897')
}
function fireSuppression(box:Place,obstacles:Collision[],floor:number){
  const id='fire',red='#aa4339',frame='#495953',metal='#9ca59a',brass='#ba9661'
  const [x,,z]=equipment.find(asset=>asset.id===id)!.position
  const at=(dx:number,y:number,dz:number):Point=>[x+dx,floor+y,z+dz]
  const place=(dx:number,y:number,dz:number,size:Point,tint:string,shape:'box'|'round'|'sphere'='box',pitch=0)=>
    box(at(dx,y,dz),size,tint,id,0,shape,'solid',pitch)
  obstacles.push({x,z,w:1.46,d:.67})
  place(0,.055,0,[1.52,.11,.59],frame)
  for(const side of [-1,1]){
    place(side*.67,.91,-.224,[.061,1.73,.063],frame)
    place(side*.64,.129,.243,[.105,.063,.12],metal)
  }
  place(0,.91,-.235,[1.38,.123,.077],frame)
  rod(box,at(-.67,1.76,-.235),at(.68,1.76,-.235),.104,metal,id)
  rod(box,at(-.67,1.76,-.235),at(-.67,2.05,-.235),.104,metal,id)
  rod(box,at(-.67,2.05,-.235),at(-.99,2.05,-.235),.104,metal,id)
  for(const dx of [-.43,0,.43]){
    place(dx,.144,0,[.357,.079,.357],frame,'round')
    place(dx,.763,0,[.307,1.182,.307],red,'round')
    place(dx,1.333,0,[.305,.248,.305],red,'sphere')
    place(dx,1.47,0,[.118,.154,.118],brass,'round')
    place(dx,1.542,0,[.174,.075,.135],frame)
    rod(box,at(dx,1.56,0),at(dx,1.76,-.235),.071,frame,id)
    place(dx,1.506,.092,[.109,.049,.109],frame,'round',Math.PI/2)
    place(dx,1.506,.124,[.081,.021,.081],C.white,'round',Math.PI/2)
    place(dx+.008,1.514,.139,[.028,.015,.01],red)
    place(dx,.937,.153,[.119,.173,.024],C.white)
    place(dx,.963,.168,[.095,.043,.012],red)
    for(const y of [.465,1.094]) place(dx,y,0,[.335,.042,.335],'#743e35','round')
  }
  place(.61,1.55,-.14,[.23,.27,.16],frame)
  place(.61,1.60,-.054,[.11,.04,.018],'#d9ba77')
}
export function interior(floor:'ground'|'upper',cap:Capacity,visibleIds?:ReadonlySet<string>){
  const group=new T.Group(),{box,finish}=batch(visibleIds)
  const obstacles:Collision[]=[]
  const level=floor==='ground'?slab:property.technicalHeight+slab
  for(const rect of floor==='ground'?[property.building]:upperSlabs) flooring(box,rect,level,'#dfdacb',undefined,slab)
  for(const room of rooms.filter(room=>room.floor===floor&&(!visibleIds||visibleIds.has(room.id)))){
    const [x,z,w,d]=room.rect
    flooring(box,[x+.06,z+.06,w-.12,d-.12],level+.012,room.color,room.id,visibleIds?slab:.04)
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
      for(let i=0;i<cap.coolingUnits/2;i++){
        const [cx,,originZ]=hall.crac,cz=originZ+i*1.21,id='crac'+suffix
        cabinet(box,obstacles,cx,cz,.96,2.25,.68,id,'#78948c',8)
        for(const y of [.36,2.12]){
          box([cx,y,cz+.353],[.67,.118,.026],'#364f49',id)
          for(const offset of [-.031,0,.031]) box([cx,y+offset,cz+.37],[.58,.012,.015],'#829b90',id)
        }
        if(i===0) cableGland(box,technicalPorts['cracFeed'+hall.suffix],id)
        if(i<coolingCircuitSuffixes.length) for(const name of ['cracRefrigerant','cracLiquid']){
          cableGland(box,technicalPorts[name+hall.suffix+coolingCircuitSuffixes[i]],id)
        }
      }
      box([hall.temperature[0],.37,hall.temperature[2]],[.15,.34,.15],C.door,'temperature'+suffix)
      if(cap.racks.length) for(const [feed,offset] of [['A',0],['B',.7]] as const){
        const id='pdus'+suffix
        cabinet(box,obstacles,hall.pdu[0]+offset,hall.pdu[2],.47,1.65,.51,id,offset?'#a19067':'#718671',6)
        cableGland(box,technicalPorts['pdu'+hall.suffix+feed],id)
        cableGland(box,technicalPorts['pduOut'+hall.suffix+feed],id)
      }
    }
    if(room.id==='power'){
      for(let i=0;i<cap.upsModules;i++){
        cabinet(box,obstacles,x+1.3+i%3*1.47,z+6.3+Math.floor(i/3)*2.45,1.03,2.23,.94,'ups','#779087')
        cabinet(box,obstacles,x+6.5+i%3*1.12,z+6.3+Math.floor(i/3)*2.45,.8,2.13,.92,'ups','#5b7066',8)
      }
      for(let i=0;i<6;i++) cabinet(box,obstacles,x+1.2+i*1.17,z+1.5,.93,2.23,.84,'switchgear',i%2?C.metal:'#708379')
      const [inverterX,,inverterZ]=equipment.find(item=>item.id==='inverter')!.position
      cabinet(box,obstacles,inverterX,inverterZ,.51,1.55,.48,'inverter','#78876b',5)
      for(const name of ['transfer','switchgear','coolingBoard']) cableGland(box,technicalPorts[name],'switchgear')
      if(cap.upsModules) for(const name of ['ups','upsInput','battery']) cableGland(box,technicalPorts[name],'ups')
      cableGland(box,technicalPorts.inverter,'inverter')
      for(const dz of [3.12,5.07]) flooring(box,[x+.5,z+dz,w-2.1,.14],level+.025,'#c4a570',room.id)
    }
    if(room.id==='cooling'){
      for(const offset of [1.13,3.62,5.18,6.74]) cabinet(box,obstacles,x+offset,z+2,1.03,1.88,.83,room.id,'#7c9591',8)
      coolingPipeRack(box,obstacles,x+.73,z+6.31,level+.012,room.id)
      box([-5.8,level+.062,5],[.35,.10,.23],'#568b81','leak')
    }
    if(room.id==='network'){
      for(const asset of equipment.filter(asset=>asset.kind==='router')){
        const [px,,pz]=asset.position;cabinet(box,obstacles,px,pz,.78,2.08,1.07,asset.id,C.metal,10)
        cableGland(box,technicalPorts[asset.id],asset.id)
      }
      cableGland(box,technicalPorts.fiberJackB,'fiber')
      cableGland(box,technicalPorts.routerOut,'router')
      segment(box,[x+.75,2.4,z+.75],[x+w-1.3,2.4,z+.75],.25,'#5d6d68',.14,room.id)
    }
    if(room.id==='noc'){
      for(let i=0;i<3;i++) desk(box,obstacles,x+1.2+i*1.79,z+4.05,level,room.id,1.47,true)
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
      obstacles.push({x:x+2.65,z:z+2.74,w:3.7,d:.92})
      box([x+2.65,level+.56,z+2.66],[3.54,1.04,.63],'#ad8b63',id)
      box([x+2.65,level+1.12,z+2.57],[3.7,.106,.59],C.trim,id)
      box([x+2.65,level+.82,z+2.95],[3.47,.09,.51],'#d4c3a4',id)
      box([x+2.65,level+.13,z+2.315],[3.42,.22,.068],C.door,id)
      for(let i=0;i<14;i++) box([x+1.02+i*.238,level+.59,z+2.33],[.034,.69,.028],'#ccb08a',id)
      monitor(box,x+2.44,level+.87,z+2.96,.57,id,'#86a69d')
      chair(box,x+2.44,z+3.66,level,id)
      obstacles.push({x:x+1.9,z:z+.52,w:2.32,d:.51},{x:x+1.93,z:z+1.29,w:1.19,d:.47})
      for(const dx of [1,1.9,2.8]) chair(box,x+dx,z+.52,level,id,Math.PI,true)
      for(const dx of [1.43,2.43]) box([x+dx,level+.21,z+1.29],[.057,.405,.32],C.metal,id)
      box([x+1.93,level+.42,z+1.29],[1.19,.077,.47],'#b59872',id)
      box([x+1.83,level+.47,z+1.28],[.26,.023,.17],'#dedecb',id,-.2)
      vestibule(box,obstacles,level,id)
    }
    if(room.id==='delivery') workshop(box,obstacles,x,z,z+d,level)
    if(room.id==='utility') for(let i=0;i<3;i++) cabinet(box,obstacles,x+1.16+i*1.1,z+1.5,.82,1.6,.75,room.id,'#91a499',1)
    if(room.id==='offices') directorOffice(box,obstacles,x,z,w,d,level,room.id)
    if(room.id==='shared') workspace(box,obstacles,x,z,w,d,level,room.id)
    if(room.id==='meeting'){
      const tableZ=z+1.6
      obstacles.push({x:x+2.4,z:tableZ,w:2.38,d:1.05})
      box([x+2.4,level+.78,tableZ],[2.38,.13,1.05],'#b0956b',room.id)
      for(const dx of [1.53,3.27]) box([x+dx,level+.365,tableZ],[.10,.73,.66],C.metal,room.id)
      box([x+2.4,level+.854,tableZ],[.31,.018,.12],C.door,room.id)
      for(const dx of [1.54,2.41,3.28]){
        chair(box,x+dx,tableZ-.93,level,room.id,Math.PI,true)
      }
      for(const dx of [1.54,3.28]){
        chair(box,x+dx,tableZ+.93,level,room.id,0,true)
        obstacles.push({x:x+dx,z:tableZ+1,w:.48,d:.52})
      }
      chair(box,x+.65,tableZ,level,room.id,-Math.PI/2,true)
    }
    if(room.id==='break'){
      const tableX=x+2.04,tableZ=z+1.59,tableW=1.36
      obstacles.push({x:tableX,z:tableZ,w:tableW,d:.92})
      box([tableX,level+.69,tableZ],[tableW,.105,.92],'#ac946f',room.id)
      box([tableX,level+.32,tableZ],[.107,.64,.107],C.metal,room.id,0,'round')
      box([tableX,level+.035,tableZ],[.59,.069,.59],C.metal,room.id,0,'round')
      for(const dx of [-.57,.57]) chair(box,tableX+dx,z+2.3,level,room.id,0,true)
    }
    if(room.id==='restroom'){
      const vanityX=x+w/2,vanityW=w-.28
      obstacles.push({x:vanityX,z:z+.46,w:vanityW,d:.62})
      box([vanityX,level+.41,z+.46],[vanityW-.06,.8,.58],'#729087',room.id)
      box([vanityX,level+.838,z+.46],[vanityW,.064,.62],C.trim,room.id)
      for(const dx of [w*.27,w*.73]){
        box([x+dx,level+.879,z+.49],[.48,.045,.337],C.white,room.id,0,'sphere')
        box([x+dx,level+.898,z+.51],[.34,.021,.21],'#bbc7bd',room.id,0,'sphere')
        box([x+dx,level+.965,z+.31],[.06,.18,.06],C.metal,room.id)
        box([x+dx,level+1.038,z+.355],[.052,.04,.12],C.metal,room.id)
        box([x+dx,level+1.44,z+.115],[.66,.67,.037],'#9fbbb5',room.id)
      }
      box([x+.62,level+.405,z+2.64],[.4,.76,.158],C.white,room.id)
      box([x+.62,level+.272,z+2.39],[.39,.42,.53],C.white,room.id,0,'sphere')
      box([x+.62,level+.475,z+2.39],[.42,.052,.55],C.white,room.id,0,'sphere')
      const dividerDepth=1.13,dividerZ=z+d-(property.wall+dividerDepth)/2-.02
      box([x+1.13,level+.95,dividerZ],[.079,1.9,dividerDepth],'#a8b8ab',room.id)
    }
  }
  if(floor==='ground'){
    fireSuppression(box,obstacles,level)
    for(let i=0;i<7;i++) box([-17.4-i*.37,slab+.024,-.95],[.19,.019,.15],'#80a897')
  }else{
    const [x,z,w,d]=stairs.opening
    const edges=[[x,z,x,z+d],[x+w,z,x+w,z+d],[x,z+d,x+w,z+d]]
    for(const [ax,az,bx,bz] of edges){
      segment(box,[ax,level+.99,az],[bx,level+.99,bz],stairs.railWidth,C.door,.062)
      segment(box,[ax,level+.47,az],[bx,level+.47,bz],.045,C.door,.044)
      const posts=Math.ceil(Math.hypot(bx-ax,bz-az)/1.3)
      for(let i=0;i<=posts;i++) box([T.MathUtils.lerp(ax,bx,i/posts),level+.49,T.MathUtils.lerp(az,bz,i/posts)],[.058,.98,.058],C.door)
    }
  }
  const cut=batch(),cutWalls=new T.Group()
  const collision=[...walls(cut.box,floor,false,visibleIds),...obstacles]
  cut.finish(cutWalls);finish(group);group.add(cutWalls)
  return {group,collision,cutWalls}
}

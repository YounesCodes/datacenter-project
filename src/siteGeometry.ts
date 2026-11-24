import * as T from 'three'
import { center,equipment,property,rackPositions,rooms,specs,upperSlabs,type Floor,type Phase,type Point,type Rect } from './model'
import type { Capacity,Inputs,PopulatedRack } from './engineering'
import { batch,colors as C,disposeGroup,flooring,slab,type Place } from './geometryTools'
import { interior,staircase,walls } from './roomsGeometry'
import { outdoor } from './outdoorGeometry'

function rackShell(box:Place,rack:PopulatedRack){
  const [x,,z]=rack.position,{width:w,depth:d,height:h}=specs.rack
  const {id,front}=rack
  box([x,slab+h/2,z],[w,h,d],C.rack,id)
  box([x,slab+h+.042,z],[w+.026,.086,d+.022],C.metal,id)
  const rear=z-front*(d/2+.024)
  box([x,slab+h*.5,rear],[w*.8,h*.9,.055],C.metal,id)
  for(let vent=0;vent<12;vent++){
    const y=slab+.31+vent*.136
    for(const side of [-1,1]) box([x+side*w*.168,y,rear-front*.032],[w*.26,.064,.014],'#2f4640',id)
  }
  box([x+w*.32,slab+1.22,rear-front*.038],[.034,.159,.043],'#a9b9ae',id)
  const face=z+front*(d/2+.034)
  box([x,slab+h*.51,face],[w*.82,h*.88,.045],'#405952',id)
  const unit=rack.purpose==='Calcul'?specs.compute.units:rack.purpose==='Sauvegarde'?specs.backup.units:specs.hdd.units
  for(let slot=0;slot<rack.count;slot++){
    const y=slab+1.79-slot*unit*.046
    box([x,y,face+front*.026],[w*.75,unit*.041,.041],slot%2?'#80978c':'#6b8275',id)
    box([x+w*.27,y,face+front*.052],[.033,.018,.018],slot%4?'#adc58c':'#d6ad6c',id)
    const drives=rack.purpose==='Calcul'?4:8
    for(let drive=0;drive<drives;drive++){
      const spacing=w*.55/drives
      box([x-w*.31+drive*spacing,y,face+front*.053],[spacing*.74,unit*.028,.014],'#415b53',id)
    }
  }
  for(let port=0;port<rack.networkU;port++){
    const y=slab+1.91+port*.046
    box([x,y,face+front*.027],[w*.72,.039,.042],'#99aea2',id)
    for(let index=0;index<6;index++) box([x+w*(index*.084-.268),y,face+front*.052],[.039,.024,.012],'#334b44',id)
    box([x+w*.273,y,face+front*.052],[.035,.017,.012],'#abc88d',id)
  }
  const lowest=1.79-rack.count*unit*.046
  for(let y=.21;y<lowest;y+=.091) box([x,slab+y,face+front*.026],[w*.72,.076,.02],'#4d645c',id)
  for(const side of [-1,1]) box([x+side*w*.46,slab+h*.5,face],[.048,h*.99,.057],'#9baaa0',id)
  box([x,slab+.12,face],[w*.83,.131,.045],C.metal,id)
}
function racks(group:T.Group,cap:Capacity,previous?:Capacity){
  const {box,finish}=batch(),newParts=batch(),incoming=new T.Group()
  const active=new Set(cap.racks.map(rack=>rack.id)),installed=previous&&new Set(previous.racks.map(rack=>rack.id))
  for(const rack of rackPositions){
    if(active.has(rack.id)) continue
    const [x,,z]=rack.position
    box([x,slab+.042,z],[.64,.065,1.24],'#7d9e90',rack.id,0,'box','ghost')
    for(const dz of [-.56,.56]) box([x,slab+.092,z+dz],[.61,.023,.037],'#88aa9c',rack.id)
    for(const dx of [-.282,.282]) box([x+dx,slab+.092,z],[.031,.023,1.12],'#88aa9c',rack.id)
  }
  cap.racks.forEach(rack=>rackShell(installed&&!installed.has(rack.id)?newParts.box:box,rack))
  finish(group);newParts.finish(incoming);group.add(incoming)
  return incoming
}
function roof(solar:number){
  const group=new T.Group(),{box,finish}=batch()
  walls(box,'ground',true);walls(box,'upper',true)
  const [x,z,,d]=property.building,[ux,uz,uw]=property.upper
  const roofs:{rect:Rect;level:number}[]=[
    {rect:[x,z,ux-x,d],level:property.technicalHeight},
    {rect:[ux,z,uw,uz-z],level:property.technicalHeight},
    {rect:property.upper,level:property.technicalHeight+property.upperHeight},
  ]
  for(const {rect,level} of roofs){
    flooring(box,rect,level+.17,C.concrete,undefined,.22)
    const [x,z,w,d]=rect,y=level+.29
    for(const dx of [0,w]) box([x+dx,y,z+d/2],[.22,.31,d+.18],C.white)
    for(const dz of [0,d]) box([x+w/2,y,z+dz],[w,.31,.22],C.white)
  }
  const n=Math.min(240,Math.round(solar*1000/specs.solar.moduleWatts))
  for(let i=0;i<n;i++){
    const x=-18.9+i%22*1.27,z=-11.2+Math.floor(i/22)*2.13,y=property.technicalHeight+.46
    box([x,y-.15,z],[.92,.25,.10],'#778c82','solar')
    box([x,y,z],[specs.solar.moduleWidth,.075,specs.solar.moduleDepth],C.solar,'solar',0,'box','solid',.23)
    box([x,y+.04,z],[.027,.013,specs.solar.moduleDepth],'#6f8b9a','solar',0,'box','solid',.23)
  }
  for(const x of [11.7,14.1,16.5,18.9]) for(const y of [2.31,5.87]){
    box([x,y,12.602],[1.84,1.12,.067],'#79918b')
    box([x,y,12.645],[.057,1.12,.045],C.trim)
  }
  finish(group)
  return group
}
export function geometry(cap:Capacity,inputs:Inputs,phase:Phase,previous?:Capacity){
  const exterior=outdoor(cap,phase)
  const stairs=staircase()
  const ground=interior('ground',cap),upper=interior('upper',cap)
  const incoming=racks(ground.group,cap,previous)
  const roofGroup=roof(inputs.solar)
  const plinth=batch(),upperBase=new T.Group()
  const [x,z,w,d]=property.upper
  for(const [px,pz,pw,pd] of upperSlabs) plinth.box([px+pw/2,property.technicalHeight/2,pz+pd/2],[pw,property.technicalHeight,pd],'#d5d6ca')
  for(let i=0;i<4;i++) plinth.box([x+w*(i+.5)/4,2.32,z+d+.04],[w*.17,1.12,.075],'#859b93')
  plinth.finish(upperBase);upper.group.add(upperBase)
  const walkWalls=new T.Group(),walkBatch=batch()
  walls(walkBatch.box,'ground',true);walkBatch.finish(walkWalls);ground.group.add(walkWalls);walkWalls.visible=false
  const upperWalkWalls=new T.Group(),upperWalkBatch=batch()
  walls(upperWalkBatch.box,'upper',true);upperWalkBatch.finish(upperWalkWalls);upper.group.add(upperWalkWalls);upperWalkWalls.visible=false
  const rackObstacles=cap.racks.map(rack=>({x:rack.position[0],z:rack.position[2],w:specs.rack.width,d:specs.rack.depth}))
  return {exterior,stairs,ground:ground.group,upper:upper.group,roof:roofGroup,incoming,cutWalls:ground.cutWalls,walkWalls,
    upperBase,upperCutWalls:upper.cutWalls,upperWalkWalls,upperCollision:upper.collision,collision:[...ground.collision,...rackObstacles]}
}
export type Geometry=ReturnType<typeof geometry>
export function visibleFloor(building:Geometry,level:Floor){
  building.ground.visible=level==='ground'
  building.upper.visible=level==='upper'
  building.roof.visible=level==='roof'
  building.stairs.visible=level!=='roof'
}
export function disposeGeometry(building:Geometry){
  for(const group of [building.exterior,building.stairs,building.ground,building.upper,building.roof]) disposeGroup(group)
}
export function bounds(id:string):{at:Point;size:Point;floor?:Floor;radius:number}|undefined{
  const room=rooms.find(room=>room.id===id)
  if(room){
    const [x,,z]=center(room.rect)
    const y=room.floor==='ground'?.20:property.technicalHeight+.20
    return {at:[x,y,z],size:[room.rect[2]-.28,.024,room.rect[3]-.28],floor:room.floor,radius:Math.max(room.rect[2],room.rect[3])*1.98}
  }
  const rack=rackPositions.find(rack=>rack.id===id)
  if(rack) return {at:[rack.position[0],.23,rack.position[2]],size:[.76,.024,1.36],floor:'ground',radius:5.1}
  const asset=equipment.find(item=>item.id===id)
  if(asset){
    const outside=['generator','transformer','fuel','condenser','security','camera'].includes(asset.kind)
    const size:Record<string,[number,number]>={generator:[5,5],transformer:[4.6,4.7],fuel:[4.85,2.25],condenser:[5.2,2.4],solar:[24,13],security:[3,3],camera:[.7,.7]}
    const [w,d]=size[asset.kind]??[1.72,1.52]
    return {at:[asset.position[0],outside?.09:asset.kind==='solar'?4.46:.24,asset.position[2]],size:[w,.026,d],floor:outside?undefined:asset.kind==='solar'?'roof':'ground',radius:Math.max(7,Math.max(w,d)*1.65)}
  }
  if(id==='reserve'){
    const [x,,z]=center(property.reserve)
    return {at:[x,.11,z],size:[property.reserve[2],.024,property.reserve[3]],radius:33}
  }
}

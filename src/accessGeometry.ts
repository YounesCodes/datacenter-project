import * as T from 'three'
import { batch,colors as C,slab,type Place } from './geometryTools'
import { loadingDoor,secureDoors,type SecureDoor } from './model'

const doorHeight=2.1
const openingAngle=Math.PI/2

function garage(width:number,frame:Place,red:Place,green:Place){
  const half=width/2,height=loadingDoor.height
  frame([0,slab+height+.055,.135],[width*2+.22,.125,.17],C.metal)
  frame([0,slab+.006,.04],[width*2+.06,.012,.24],'#83978c')
  for(const side of [-1,1]){
    frame([side*(half+.042),slab+height/2,.08],[.095,height,.23],C.metal)
    frame([side*(width+.045),slab+height/2,.105],[.102,height,.16],C.metal)
  }
  const control=half+.24
  frame([control,slab+1.2,.15],[.18,.25,.09],C.rack)
  red([control,slab+1.26,.2],[.065,.031,.02],'#efa17a',undefined,0,'box','light')
  green([control,slab+1.26,.2],[.065,.031,.02],'#a6f1bc',undefined,0,'box','light')
  return [-1,1].map(side=>{
    const panel=new T.Group(),parts=batch()
    const x=side*half/2
    for(let i=0;i<11;i++){
      const y=slab+(i+.5)*height/11
      parts.box([x,y,.155],[half-.018,height/11-.013,.078],i%2?'#819189':'#8b9b93')
    }
    for(const offset of [.032,half-.032]) parts.box([side*offset,slab+height/2,.19],[.058,height,.037],C.metal)
    parts.box([side*.088,slab+1.05,.216],[.065,.22,.06],C.rack)
    parts.finish(panel)
    return {panel,travel:side*half}
  })
}

export function accessGeometry(specs:readonly SecureDoor[]=secureDoors){
  const group=new T.Group()
  const doors=specs.map(spec=>{
    const {width,inner,method}=spec
    const {x,z}=spec,assembly=new T.Group()
    assembly.position.set(x,0,z)
    assembly.rotation.y=spec.yaw??0
    const frame=batch(),red=batch(),green=batch()
    const leafWidth=width-.13
    const panel=new T.Group(),locked=new T.Group(),released=new T.Group()
    const slides=method==='delivery'?garage(width,frame.box,red.box,green.box):undefined
    if(slides) for(const slide of slides) assembly.add(slide.panel)
    else{
      const leaf=batch()
      const panelColor=spec.room.id==='power'?'#646c61':'#647b75'
      const glass=Boolean(spec.companion)||spec.id==='staff-stairs'
      panel.position.set(-leafWidth/2,slab,0)
      for(const side of [-1,1]) frame.box([side*(width/2-.035),slab+doorHeight/2,0],[.085,doorHeight,.23],C.metal)
      frame.box([0,slab+doorHeight+.035,0],[width,.09,.23],C.metal)
      frame.box([0,slab+.012,0],[width,.024,.26],'#a2aaa1')

      const vision=.21,visionBottom=1.03,visionTop=1.78
      if(glass){
        const left=(leafWidth-vision)/2
        for(const offset of [left/2,leafWidth-left/2]) leaf.box([offset,doorHeight/2,0],[left,doorHeight,.071],panelColor)
        leaf.box([leafWidth/2,visionBottom/2,0],[vision,visionBottom,.071],panelColor)
        leaf.box([leafWidth/2,(visionTop+doorHeight)/2,0],[vision,doorHeight-visionTop,.071],panelColor)
        leaf.box([leafWidth/2,(visionBottom+visionTop)/2,0],[vision,visionTop-visionBottom,.046],'#adc7be',undefined,0,'box','glass')
        for(const side of [-1,1]){
          leaf.box([leafWidth/2+side*vision/2,(visionBottom+visionTop)/2,0],[.033,visionTop-visionBottom+.045,.084],C.rack)
          leaf.box([leafWidth/2,(visionBottom+visionTop+side*(visionTop-visionBottom))/2,0],[vision,.035,.084],C.rack)
        }
      }else leaf.box([leafWidth/2,doorHeight/2,0],[leafWidth,doorHeight,.071],panelColor)

      for(const side of [-1,1]){
        const dz=side*.061
        leaf.box([leafWidth-.10,1.04,dz],[.09,.24,.018],'#a7b7ae')
        leaf.box([leafWidth-.16,1.06,side*.083],[.17,.036,.063],C.metal)
        leaf.box([.045,1.84,dz],[.062,.14,.04],'#9daea8')
        leaf.box([.045,.26,dz],[.062,.14,.04],'#9daea8')
        if(method==='code'){
          leaf.box([leafWidth/2,1.62,side*.044],[.17,.17,.016],'#d8b666')
          leaf.box([leafWidth/2,1.64,side*.055],[.024,.074,.01],C.rack)
          leaf.box([leafWidth/2,1.585,side*.055],[.024,.024,.01],C.rack)
        }
        const reader=side===spec.outside&&!inner
        const rx=width/2+(inner?.14:.23),ry=slab+(reader&&method==='iris'?1.57:1.18)
        frame.box([rx,ry,side*.128],[.16,.26,.09],C.rack)
        frame.box([rx,ry+.034,side*.179],[.106,.113,.018],reader?C.screen:'#91a99a')
        red.box([rx,ry+.098,side*.181],[.062,.019,.018],'#ed9a72',undefined,0,'box','light')
        green.box([rx,ry+.098,side*.181],[.062,.019,.018],'#9eecc0',undefined,0,'box','light')
        if(reader&&method==='code') for(const dx of [-.033,0,.033]) for(const dy of [-.063,-.026,.011])
          frame.box([rx+dx,ry+dy,side*.188],[.019,.016,.012],'#97aaa2')
      }
      leaf.finish(panel)
      assembly.add(panel)
    }
    frame.finish(assembly);red.finish(locked);green.finish(released)
    released.visible=false
    assembly.add(locked,released)
    group.add(assembly)
    return {spec,panel,locked,released,slides,hinge:-leafWidth/2,leafWidth,progress:0,openUntil:0,openedFrom:1}
  })
  return {group,doors}
}

export type WalkDoor=ReturnType<typeof accessGeometry>['doors'][number]

export function setDoorOpening(door:WalkDoor,progress:number){
  door.progress=progress
  if(door.slides) for(const {panel,travel} of door.slides) panel.position.x=travel*progress
  else door.panel.rotation.y=door.spec.outside*openingAngle*progress
  door.locked.visible=progress===0
  door.released.visible=progress>0
}

export function doorLocal(spec:SecureDoor,x:number,z:number):[number,number]{
  const dx=x-spec.x,dz=z-spec.z,yaw=spec.yaw??0
  return [dx*Math.cos(yaw)-dz*Math.sin(yaw),dx*Math.sin(yaw)+dz*Math.cos(yaw)]
}

export function doorBlocks(door:WalkDoor,x:number,z:number){
  const [spanFromCenter,dz]=doorLocal(door.spec,x,z)
  if(door.slides){
    const span=Math.abs(spanFromCenter),half=door.spec.width/2
    return Math.abs(dz)<.32&&span<half+.25&&span>half*door.progress-.25
  }
  const dx=spanFromCenter-door.hinge
  const angle=door.panel.rotation.y,cos=Math.cos(angle),sin=Math.sin(angle)
  const span=dx*cos-dz*sin,normal=dx*sin+dz*cos
  return span>-.25&&span<door.leafWidth+.25&&Math.abs(normal)<.29
}

export function inDoorSwing(door:WalkDoor,x:number,z:number){
  const [span,dz]=doorLocal(door.spec,x,z)
  if(door.slides) return Math.abs(dz)<.35&&Math.abs(span)<door.spec.width/2+.25
  const dx=span-door.hinge
  return dz*door.spec.outside<.29&&dx>-.25&&Math.hypot(dx,dz)<door.leafWidth+.21
}

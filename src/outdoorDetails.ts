import { colors as C,rod,type Place } from './geometryTools'
import type { Point } from './model'

export function oliveTree(box:Place,x:number,z:number,size:number){
  let seed=Math.round((x+30)*733+(z+23)*1597)
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
  const local=(dx:number,y:number,dz:number):Point=>[x+dx*size,.035+y*size,z+dz*size]
  const bark='#736352',foliage=['#52664c','#657957','#718661','#819371','#97a585']
  const fork=local(.04,1.01,-.05)
  rod(box,local(0,0,0),local(-.07,.56,.035),.155*size,bark,undefined,'branch')
  rod(box,local(-.07,.5,.035),fork,.125*size,bark,undefined,'branch')
  const heading=random()*Math.PI*2
  for(let branch=0;branch<5;branch++){
    const angle=heading+branch*Math.PI*2/5
    const dx=Math.cos(angle),dz=Math.sin(angle)
    const reach=.35+random()*.18
    const top=1.40+random()*.35
    const elbow=local(dx*reach*.52,1.24,dz*reach*.52)
    rod(box,fork,elbow,.073*size,bark,undefined,'branch')
    for(const side of [-1,1]){
      const crownX=dx*reach-side*dz*.19,crownZ=dz*reach+side*dx*.19
      const crownHeight=top+(side>0?.14:0)
      const tip=local(crownX,crownHeight,crownZ)
      rod(box,elbow,tip,.044*size,'#80705a',undefined,'branch')
      for(let i=0;i<5;i++){
        const leafAngle=random()*Math.PI*2
        const radius=.06+random()*.22
        const px=crownX+Math.cos(leafAngle)*radius,pz=crownZ+Math.sin(leafAngle)*radius
        const breadth=(.18+random()*.19)*size
        box(local(px,crownHeight+(random()-.38)*.37,pz),
          [breadth,breadth*(.52+random()*.5),breadth*.88],foliage[Math.floor(random()*foliage.length)],undefined,leafAngle,'tree')
        box(local(px,crownHeight+.15+random()*.15,pz),
          [breadth*.7,breadth*.34,breadth*.66],foliage[3+(i%2)],undefined,leafAngle*.6,'leaf')
      }
    }
  }
}

const fuelScale=.74
export const fuelTankFootprint:[number,number]=[5.2*fuelScale,2.86*fuelScale]
export function fuelTank(place:Place,x:number,z:number){
  const box:Place=([px,py,pz],[w,h,d],...style)=>place(
    [x+(px-x)*fuelScale,py*fuelScale,z+(pz-z)*fuelScale],
    [w*fuelScale,h*fuelScale,d*fuelScale],...style,
  )
  const id='fuel',span=5.2,depth=2.86
  const barrel=3.6,radius=.66,axis=1.19
  const finish='#84978d',steel='#516860'
  box([x,.12,z],[span,.22,depth],C.concrete,id)
  box([x,.231,z],[span-.38,.026,depth-.38],'#b3b8a8',id)
  for(const edge of [-1,1]){
    box([x+edge*(span/2-.09),.321,z],[.18,.36,depth],C.trim,id)
    box([x,.321,z+edge*(depth/2-.09)],[span-.36,.36,.18],C.trim,id)
  }
  for(const dx of [-1.21,1.21]){
    box([x+dx,.29,z],[.49,.11,1.45],steel,id)
    for(const side of [-1,1]){
      const footZ=z+side*.48
      rod(box,[x+dx,.335,footZ],[x+dx,.78,z+side*.38],.144,steel,id)
      for(const bolt of [-.17,.17]) box([x+dx+bolt,.355,footZ],[.065,.032,.065],C.trim,id,0,'round')
    }
    box([x+dx,axis,z],[.096,1.36,1.36],'#657c70',id,0,'pipe','paint')
  }
  box([x,axis,z],[barrel,2*radius,2*radius],finish,id,0,'pipe','paint')
  for(const side of [-1,1]){
    box([x+side*barrel/2,axis,z],[.56,2*radius,2*radius],finish,id,0,'sphere','paint')
    box([x+side*(barrel/2-.074),axis,z],[.045,1.344,1.344],'#97a79e',id,0,'pipe')
  }
  box([x+.35,axis+radius+.055,z],[.48,.12,.48],steel,id,0,'round')
  box([x+.35,axis+radius+.127,z],[.395,.043,.395],C.trim,id,0,'round')
  for(let i=0;i<8;i++){
    const angle=i*Math.PI/4
    box([x+.35+Math.cos(angle)*.167,axis+radius+.159,z+Math.sin(angle)*.167],[.041,.025,.041],steel,id,0,'round')
  }
  rod(box,[x-1.23,axis+radius-.025,z],[x-1.23,2.21,z],.082,steel,id)
  rod(box,[x-1.23,2.21,z],[x-1.00,2.21,z],.082,steel,id)
  rod(box,[x-1.00,2.21,z],[x-1.00,2.105,z],.082,steel,id)
  box([x+1.45,axis+radius-.007,z+.23],[.18,.192,.18],steel,id,0,'round')
  box([x+1.45,axis+radius+.103,z+.23],[.214,.045,.214],'#b2a06b',id,0,'round')
  rod(box,[x-1.58,.85,z+.48],[x-1.58,.85,z+.92],.10,steel,id)
  rod(box,[x-1.58,.85,z+.92],[x-1.58,.43,z+.92],.10,steel,id)
  box([x-1.29,.41,z+.91],[.64,.28,.36],steel,id)
  box([x-1.01,.43,z+.91],[.299,.243,.243],'#354d46',id,0,'pipe')
  box([x-.53,axis+.032,z+.661],[.58,.22,.018],C.white,id)
  box([x-.53,axis+.087,z+.675],[.47,.035,.013],'#a49264',id)
}

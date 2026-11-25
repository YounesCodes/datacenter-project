import { expect,it } from 'vitest'
import { doorBlocks,setDoorOpening } from '../src/accessGeometry'
import { capacity,defaults } from '../src/engineering'
import { rooms,staffStairLobby,stairSideDoors,utilityDoor } from '../src/model'
import { disposeGeometry,geometry } from '../src/siteGeometry'

it('bloque les accès sécurisés puis libère le passage lorsque la porte s’ouvre',()=>{
  const inputs=defaults(3)
  const site=geometry(capacity(3,inputs),inputs,3)
  try{
    const doors=site.access!.doors
    expect(doors).toHaveLength(10)
    for(const door of doors){
      const {x,z,id,outside,inner,companion}=door.spec
      expect(doorBlocks(door,x,z),id).toBe(true)
      setDoorOpening(door,1)
      const depth=companion&&!inner?.8:2.6
      const cos=Math.cos(door.spec.yaw??0),sin=Math.sin(door.spec.yaw??0)
      for(const across of [-.12,0,.12]){
        for(let distance=-.4;distance<=depth+.001;distance+=.2){
          const walkX=x+across*cos-distance*outside*sin
          const walkZ=z-across*sin-distance*outside*cos
          expect(doorBlocks(door,walkX,walkZ),id).toBe(false)
          const blockers=site.collision.filter(rect=>Math.abs(walkX-rect.x)<rect.w/2+.25&&Math.abs(walkZ-rect.z)<rect.d/2+.25)
          expect(blockers,id+' · '+distance.toFixed(1)).toEqual([])
        }
      }
    }
  }finally{
    disposeGeometry(site)
  }
})

it('laisse un dégagement de 1,5 m devant les entrées réaménagées',()=>{
  const inputs=defaults(3)
  const site=geometry(capacity(3,inputs),inputs,3)
  try{
    const entries=[
      {name:'Supervision',x:17.5,z:-8.2,dx:-1,dz:0,obstacles:site.collision},
      {name:'Salle de réunion',x:17.4,z:4.5,dx:0,dz:-1,obstacles:site.upperCollision},
      {name:'Salle de pause',x:11.1,z:9.6,dx:0,dz:1,obstacles:site.upperCollision},
      {name:'Locaux de service',x:staffStairLobby[0],z:utilityDoor.at,dx:-1,dz:0,obstacles:site.collision},
      ...Object.entries(stairSideDoors).map(([id,door])=>{
        const {name,rect:[x,,width]}=rooms.find(room=>room.id===id)!
        return {name,x:x+width,z:door.at,dx:-1,dz:0,obstacles:site.upperCollision}
      }),
    ]
    for(const {name,x,z,dx,dz,obstacles} of entries){
      for(let step=0;step<=15;step++){
        const walkX=x+dx*step/10,walkZ=z+dz*step/10
        expect(obstacles.filter(rect=>Math.abs(walkX-rect.x)<rect.w/2+.25&&Math.abs(walkZ-rect.z)<rect.d/2+.25),name).toEqual([])
      }
    }
  }finally{
    disposeGeometry(site)
  }
})

it('garde une allée praticable dans l’espace de travail et le bureau de direction',()=>{
  const inputs=defaults(3)
  const site=geometry(capacity(3,inputs),inputs,3)
  const clear=(x:number,z:number)=>site.upperCollision.filter(rect=>Math.abs(x-rect.x)<rect.w/2+.25&&Math.abs(z-rect.z)<rect.d/2+.25)
  try{
    const [sx,sz,sw,sd]=rooms.find(room=>room.id==='shared')!.rect
    const aisle=sz+sd/2
    for(let x=sx+.85;x<=sx+sw-.35;x+=.1) expect(clear(x,aisle),'allée '+x.toFixed(1)).toEqual([])
    for(let z=stairSideDoors.shared.at;z<=aisle;z+=.1) expect(clear(sx+sw-.4,z),'entrée '+z.toFixed(1)).toEqual([])
    for(let z=aisle;z<=sz+sd;z+=.1) expect(clear(11.1,z),'salle de pause '+z.toFixed(1)).toEqual([])
    const [ox,oz,ow,od]=rooms.find(room=>room.id==='offices')!.rect
    // From the door to the visitor chairs, then along the lounge side.
    for(let z=oz+od;z>=oz+2.75;z-=.1) expect(clear(13.1,z),'bureau '+z.toFixed(1)).toEqual([])
    for(let x=ox+1;x<=13.1;x+=.1) expect(clear(x,oz+od-.4),'tapis '+x.toFixed(1)).toEqual([])
    expect(ow).toBe(5)
  }finally{
    disposeGeometry(site)
  }
})

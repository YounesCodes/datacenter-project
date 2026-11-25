// Routes that share a cable tray are drawn side by side instead of on top of each other.
type Point3=readonly [number,number,number]
export type LaneInput={route:string;kind:string;points:readonly Point3[]}
type Run={route:string;kind:string;lo:number;hi:number}

const snap=(value:number)=>Math.round(value*20)/20
const overlap=.15

// Index of the axis a segment runs along, or -1 when it is diagonal.
function axisOf(a:Point3,b:Point3){
  const moved=[0,1,2].filter(axis=>Math.abs(a[axis]-b[axis])>.02)
  return moved.length===1?moved[0]:-1
}

/** Assigns a lane to each route: 0 stays on the real cable, then +1, -1, +2… beside it. */
export function assignLanes(paths:readonly LaneInput[]):Map<string,number>{
  const lines=new Map<string,Run[]>()
  for(const path of paths){
    for(let i=1;i<path.points.length;i++){
      const a=path.points[i-1],b=path.points[i],axis=axisOf(a,b)
      if(axis<0) continue
      const key=axis+':'+[0,1,2].filter(other=>other!==axis).map(other=>snap(a[other])).join(',')
      const runs=lines.get(key)??[]
      runs.push({route:path.route,kind:path.kind,lo:Math.min(a[axis],b[axis]),hi:Math.max(a[axis],b[axis])})
      lines.set(key,runs)
    }
  }
  // Routes of the same kind look identical, so sharing a line is harmless for them.
  const conflicts=new Map<string,Set<string>>()
  for(const runs of lines.values()){
    for(let i=0;i<runs.length;i++) for(let j=i+1;j<runs.length;j++){
      const a=runs[i],b=runs[j]
      if(a.route===b.route||a.kind===b.kind) continue
      if(Math.min(a.hi,b.hi)-Math.max(a.lo,b.lo)<overlap) continue
      if(!conflicts.has(a.route)) conflicts.set(a.route,new Set())
      if(!conflicts.has(b.route)) conflicts.set(b.route,new Set())
      conflicts.get(a.route)!.add(b.route);conflicts.get(b.route)!.add(a.route)
    }
  }
  const slots=new Map<string,number>()
  for(const route of new Set(paths.map(path=>path.route))){
    const taken=new Set([...(conflicts.get(route)??[])].map(other=>slots.get(other)).filter(slot=>slot!==undefined))
    let slot=0
    while(taken.has(slot)) slot++
    slots.set(route,slot)
  }
  return new Map([...slots].map(([route,slot])=>[route,slot===0?0:slot%2?(slot+1)/2:-slot/2]))
}

type Point2={x:number;y:number}
// The normal points the same way whatever the travel direction, so lanes keep their side.
function normal(a:Point2,b:Point2){
  const length=Math.hypot(b.x-a.x,b.y-a.y)
  let x=-(b.y-a.y)/length,y=(b.x-a.x)/length
  if(y<-1e-6||(Math.abs(y)<=1e-6&&x<0)){x=-x;y=-y}
  return {x,y}
}

/** Shifts a screen polyline sideways by `offset` pixels, keeping corners mitred. */
export function offsetPolyline(points:readonly Point2[],offset:number):Point2[]{
  const clean=points.filter((point,index)=>index===0||Math.hypot(point.x-points[index-1].x,point.y-points[index-1].y)>1.2)
  if(!offset||clean.length<2) return clean
  const normals=clean.slice(1).map((point,index)=>normal(clean[index],point))
  return clean.map((point,index)=>{
    const before=normals[index-1],after=normals[index]
    if(!before||!after){
      const n=before??after
      return {x:point.x+n.x*offset,y:point.y+n.y*offset}
    }
    // Intersect the two shifted segments; fall back to one normal when they are nearly parallel.
    const det=before.x*after.y-before.y*after.x
    let x=before.x*offset,y=before.y*offset
    if(Math.abs(det)>.15){
      x=offset*(after.y-before.y)/det
      y=offset*(before.x-after.x)/det
      const length=Math.hypot(x,y),limit=Math.abs(offset)*3
      if(length>limit){x*=limit/length;y*=limit/length}
    }
    return {x:point.x+x,y:point.y+y}
  })
}

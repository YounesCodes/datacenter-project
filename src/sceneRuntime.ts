import * as T from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { center,coordinates,equipment,normalRoutes,property,rackPositions,rooms,topology,visitorArrival,walkHeight,walkZoneAt,type AuthenticatedDoor,type Floor,type Layer,type Point,type SecureDoor,type WalkZone } from './model'
import { bounds,disposeGeometry,geometry,visibleFloor,type Geometry } from './siteGeometry'
import { disposeGroup,type Picks } from './geometryTools'
import type { Capacity,Inputs } from './engineering'
import type { Phase } from './model'
import { assignLanes,offsetPolyline } from './flowLanes'
import { flowMotion,lineDashes,routeStyle,type FlowFocus,type LineStyle } from './flowPresentation'
import { doorBlocks,doorLocal,inDoorSwing,setDoorOpening,type WalkDoor } from './accessGeometry'
import { deliveryPose,truckBlocks } from './deliveryMotion'

import type { CameraAction,ModelSnapshot } from './viewState'
type Trace={route:string;sequence:number}
export type SceneState={cap:Capacity;inputs:Inputs;phase:Phase;floor:Floor;target:string|null;labels:boolean;isolated:boolean;layer:Layer|null;focus:FlowFocus|null;routes:string[]|null;emphasis:string[]|null;trace:Trace|null;hour:number;walk:boolean;economy:boolean;tool:'select'|'pan';anchor:string|null;active?:boolean}
export type AccessPrompt={door:SecureDoor;action:'verify'|'open'|'wait'|'moving'|'pass'|'call-delivery'|'truck-arriving'}
const traceDuration=1700
const overviewDirection:Point=[.77,.85,1]
const labelsByRoom:Record<string,Point>={
  'hall-a':[-14,2.8,-8.25],'hall-b':[.35,2.8,-8.25],power:[-13.55,2.52,5.7],
  cooling:[-2.5,2.42,6.6],network:[15,2.59,-4.45],reception:[15,2.45,3],
  delivery:[5.35,2.35,7.6],noc:[13.5,2.34,-9.6],
}
export const labelAnchor=(id:string):Point|undefined=>{
  if(labelsByRoom[id]) return labelsByRoom[id]
  const room=rooms.find(room=>room.id===id)
  if(room){const [x,,z]=center(room.rect);return [x,room.floor==='upper'?6.25:2.15,z]}
  const asset=equipment.find(asset=>asset.id===id)
  if(asset) return [asset.position[0],asset.id==='solar'?5.45:2.5,asset.position[2]]
  const rack=rackPositions.find(rack=>rack.id===id)
  if(rack) return [rack.position[0],2.55,rack.position[2]]
  if(id==='reserve'){const [x,,z]=center(property.reserve);return [x,.9,z]}
}

function lineFor(route:string,keys:string[],style:LineStyle){
  return {route,points:keys.map(key=>new T.Vector3(...coordinates[key])),style,lane:0}
}
type Path=ReturnType<typeof lineFor>
const motion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches

export function createScene(host:HTMLDivElement,labelHost:HTMLDivElement,eventHost:HTMLDivElement,onPick:(id:string)=>void,onWalkExit:()=>void,onWalkZone:(zone:WalkZone|null)=>void,
  onAccessPrompt:(prompt:AccessPrompt|null)=>void,onAccessRequest:(door:AuthenticatedDoor|null)=>void){
  const hud=host.closest('.board-stage')?.querySelector('.board-hud')
  const world=new T.Scene()
  const camera=new T.OrthographicCamera()
  const eye=new T.PerspectiveCamera(67,1,.07,160)
  eye.rotation.order='YXZ'
  const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'})
  const gl=renderer.getContext()
  const debug=gl.getExtension('WEBGL_debug_renderer_info')
  const software=debug!==null&&/swiftshader|llvmpipe|software rasterizer/i.test(String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)))
  renderer.outputColorSpace=T.SRGBColorSpace
  renderer.toneMapping=T.ACESFilmicToneMapping
  renderer.toneMappingExposure=1.26
  renderer.shadowMap.enabled=true
  renderer.shadowMap.type=T.PCFShadowMap
  renderer.shadowMap.autoUpdate=false
  renderer.domElement.tabIndex=0
  renderer.domElement.setAttribute('aria-label','Maquette 3D interactive du centre de données')
  renderer.domElement.setAttribute('role','img')
  const flowCanvas=document.createElement('canvas')
  flowCanvas.className='flow-overlay'
  flowCanvas.setAttribute('aria-hidden','true')
  const flowContext=flowCanvas.getContext('2d')
  host.append(renderer.domElement,flowCanvas)
  const hemi=new T.HemisphereLight('#e7f1ff','#b7a88e',2.35)
  const walkFill=new T.AmbientLight('#fff8e6',0)
  const sun=new T.DirectionalLight('#fff0d6',2.1)
  sun.position.set(-31,52,38)
  sun.castShadow=true
  sun.shadow.mapSize.set(1536,1536)
  Object.assign(sun.shadow.camera,{left:-36,right:36,top:31,bottom:-32,near:1,far:115})
  sun.shadow.normalBias=.055
  world.add(hemi,sun,walkFill)
  const backdrop=new T.Mesh(new T.PlaneGeometry(260,260),new T.ShadowMaterial({opacity:.18}))
  backdrop.rotation.x=-Math.PI/2;backdrop.position.y=-.84;backdrop.receiveShadow=true;world.add(backdrop)
  const control=new OrbitControls(camera,renderer.domElement)
  control.enableDamping=!motion();control.dampingFactor=.15
  control.minZoom=.47;control.maxZoom=13;control.maxPolarAngle=Math.PI*.49
  control.mouseButtons={LEFT:T.MOUSE.ROTATE,MIDDLE:T.MOUSE.DOLLY,RIGHT:T.MOUSE.PAN}
  control.touches={ONE:T.TOUCH.ROTATE,TWO:T.TOUCH.DOLLY_PAN}
  const selection=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({color:'#5b9a75',transparent:true,opacity:.28,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-8}))
  selection.rotation.x=-Math.PI/2;selection.visible=false;world.add(selection)
  const test=new T.Vector3(),projected=new T.Vector3()
  const ray=new T.Raycaster(),pointer=new T.Vector2()
  const keys=new Set<string>()
  let state:SceneState|undefined,building:Geometry|undefined,parked:T.Group|undefined
  let routes:Path[]=[]
  let highlighted:Path[]=[]
  let contextRoutes:Path[]=[]
  let aspect=1,height=54,width=72,frame=0,last=0,renders=0,flowRenders=0,disposed=false,dirty=true
  let move:{from:T.Vector3;to:T.Vector3;fromTarget:T.Vector3;toTarget:T.Vector3;fromZoom:number;toZoom:number;start:number}|null=null
  let floorFade:Animation|undefined
  let lighting:{from:number;to:number;start:number}|null=null
  let currentHour=12,flowTime=0,wasTracing=false,flowClock=0,lastFlowDraw=0,revealAt=0
  let routeLayer:Layer|null=null
  let installationStart=0,interacting=false,settleTimer=0
  let down:{x:number;y:number}|null=null
  let drag:{x:number;y:number}|null=null
  camera.position.set(74,82,98)
  control.update()
  function requestFrame(){
    if(!frame&&!disposed&&state?.active!==false) frame=requestAnimationFrame(render)
  }
  function invalidate(){dirty=true;requestFrame()}
  void import('./parkingVehicles').then(module=>module.parkedVehicles()).then(group=>{
    if(disposed){disposeGroup(group);return}
    parked=group;world.add(group)
    parked.visible=!state?.focus
    renderer.shadowMap.needsUpdate=true
    invalidate()
  }).catch(error=>console.warn('Impossible de charger les véhicules stationnés',error))
  function fit(){
    aspect=Math.max(.25,host.clientWidth/Math.max(host.clientHeight,1))
    height=Math.max(48,(host.clientWidth<500?79:76)/aspect);width=height*aspect
    camera.left=-width/2;camera.right=width/2;camera.top=height/2;camera.bottom=-height/2
    camera.near=.1;camera.far=400;camera.updateProjectionMatrix()
    eye.aspect=aspect;eye.updateProjectionMatrix()
    renderer.setSize(host.clientWidth,host.clientHeight,false)
    flowCanvas.width=host.clientWidth;flowCanvas.height=host.clientHeight
    invalidate()
  }
  const observer=new ResizeObserver(fit);observer.observe(host)
  const inWalk=()=>Boolean(state?.walk)
  const activeCamera=()=>inWalk()?eye:camera
  function setResolution(economy:boolean,temporary:boolean){
    const standard=economy?.82:Math.min(devicePixelRatio,1.45)
    const ratio=temporary&&software?Math.min(.54,standard):standard
    if(renderer.getPixelRatio()!==ratio) renderer.setPixelRatio(ratio)
  }
  function configureQuality(economy:boolean){
    renderer.shadowMap.enabled=!economy
    setResolution(economy,false)
    renderer.shadowMap.needsUpdate=true
    fit()
  }
  const walkingEye=1.77
  let walkZoneId:string|null=null
  let accessPrompt:AccessPrompt|null=null,pendingAccess:WalkDoor|null=null
  let resumeMouseLook=false
  let deliveryRequested=false,deliveryProgress=0
  function placeTruck(){
    const truck=building?.truck
    if(!truck) return
    const [x,z,yaw]=deliveryPose(inWalk()?deliveryProgress:1)
    truck.position.set(x,0,z)
    truck.rotation.y=yaw
    truck.visible=!inWalk()||deliveryRequested
    renderer.shadowMap.needsUpdate=true
  }
  function stepDelivery(elapsed:number){
    if(!deliveryRequested||deliveryProgress===1||!building?.truck) return false
    const reduced=motion(),next=reduced?1:Math.min(1,deliveryProgress+Math.min(elapsed,.16)/8.5)
    const {x,y,z}=eye.position
    if(y<walkingEye+.22&&(truckBlocks(deliveryPose(next),x,z)||!reduced&&truckBlocks(deliveryPose((deliveryProgress+next)/2),x,z))) return false
    deliveryProgress=next
    placeTruck();dirty=true
    return next<1
  }
  function doorPresent(){
    if(!inWalk()||eye.position.y>walkingEye+.22) return
    const {x,z}=eye.position
    let nearest:WalkDoor|undefined,range=1.55
    for(const door of building?.access?.doors??[]){
      const [along,across]=doorLocal(door.spec,x,z)
      const distance=Math.hypot(along*1.3,across)
      if(distance<range){range=distance;nearest=door}
    }
    return nearest
  }
  function openOrMoving(door:WalkDoor){return door.openUntil>0||door.progress>0}
  function companionOf(door:WalkDoor){return building?.access?.doors.find(other=>other.spec.id===door.spec.companion)}
  function doorAction(door:WalkDoor):AccessPrompt['action']{
    if(openOrMoving(door)) return door.progress===1?'pass':'moving'
    if(door.spec.method==='delivery') return deliveryProgress===1&&building?.truck?.visible?'open':deliveryRequested?'truck-arriving':'call-delivery'
    const other=companionOf(door)
    if(other&&openOrMoving(other)) return 'wait'
    return !door.spec.inner&&doorLocal(door.spec,eye.position.x,eye.position.z)[1]*door.spec.outside>0?'verify':'open'
  }
  function updateAccessPrompt(){
    const door=doorPresent(),action=door&&doorAction(door)
    if(accessPrompt?.door===door?.spec&&accessPrompt?.action===action) return
    accessPrompt=door&&action?{door:door.spec,action}:null
    onAccessPrompt(accessPrompt)
  }
  function releaseDoor(door:WalkDoor){
    door.openedFrom=doorLocal(door.spec,eye.position.x,eye.position.z)[1]<0?-1:1
    // Start the hold timer only when the door has reached its open position.
    door.openUntil=Infinity
  }
  function lockWalkPointer(){
    const canvas=renderer.domElement
    if(document.pointerLockElement===canvas) return
    try{Promise.resolve(canvas.requestPointerLock?.()).catch(()=>{})}catch{/* dragging still works */}
  }
  function restoreAccessPointer(){
    if(pendingAccess&&resumeMouseLook&&inWalk()) lockWalkPointer()
  }
  function startAccess(){
    const door=doorPresent()
    if(!door||pendingAccess) return
    const action=doorAction(door)
    if(action==='call-delivery'){deliveryRequested=true;placeTruck()}
    if(action==='open') releaseDoor(door)
    if(action==='wait'){
      const other=companionOf(door)
      if(other?.progress===1&&!inDoorSwing(other,eye.position.x,eye.position.z)) other.openUntil=0
    }
    if(action==='verify'&&door.spec.method!=='delivery'){
      pendingAccess=door;keys.clear();down=null;drag=null
      resumeMouseLook=document.pointerLockElement===renderer.domElement
      if(resumeMouseLook) document.exitPointerLock()
      onAccessRequest(door.spec)
    }
    invalidate()
  }
  function finishAccess(approved:boolean){
    const door=pendingAccess
    if(!door) return
    pendingAccess=null
    resumeMouseLook=false
    onAccessRequest(null)
    if(approved&&door===doorPresent()&&doorAction(door)==='verify') releaseDoor(door)
    requestAnimationFrame(()=>{if(inWalk()&&!pendingAccess) renderer.domElement.focus()})
    invalidate()
  }
  function stepDoors(now:number,dt:number){
    let active=false
    for(const door of building?.access?.doors??[]){
      if(!openOrMoving(door)) continue
      if(door.openUntil<=now) door.openUntil=0
      const {x,z}=eye.position
      const [along,across]=doorLocal(door.spec,x,z)
      const approach=across*door.openedFrom
      const nearThreshold=approach>=0&&approach<1.25&&Math.abs(along)<door.spec.width/2
      const hold=door.progress===1&&(nearThreshold||inDoorSwing(door,x,z))
      const goal=door.openUntil||hold?1:0
      const step=motion()?1:dt*(door.slides?1.2:2.7)
      const progress=goal?Math.min(1,door.progress+step):Math.max(0,door.progress-step)
      if(progress!==door.progress){setDoorOpening(door,progress);dirty=true;renderer.shadowMap.needsUpdate=true}
      if(progress===1&&door.openUntil===Infinity) door.openUntil=now+(door.slides?7200:2800)
      active||=door.openUntil>0||progress!==goal
    }
    return active
  }
  function updateWalkZone(){
    const {x,y,z}=eye.position
    const zone=walkZoneAt(x,z,y-walkingEye)
    if(zone.id===walkZoneId) return
    walkZoneId=zone.id
    onWalkZone(zone)
  }
  function walkTo(x:number,z:number){
    const current=eye.position.y-walkingEye
    const level=walkHeight(x,z,current)
    if(level===null||Math.abs(level-current)>.24||Math.abs(x)>28.55||Math.abs(z)>20.82) return
    const obstacles=level>=property.technicalHeight-.06?building?.upperCollision:building?.collision
    if(obstacles?.some(rect=>Math.abs(x-rect.x)<rect.w/2+.25&&Math.abs(z-rect.z)<rect.d/2+.25)) return
    if(level<.22&&building?.access?.doors.some(door=>doorBlocks(door,x,z))) return
    if(level<.22&&building?.truck?.visible&&truckBlocks(deliveryPose(deliveryProgress),x,z)) return
    eye.position.set(x,level+walkingEye,z)
  }
  function walk(dt:number){
    const horizontal=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('q')||keys.has('arrowleft'))
    const vertical=Number(keys.has('w')||keys.has('z')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown'))
    if(!horizontal&&!vertical) return
    const speed=dt*4/Math.hypot(horizontal,vertical),yaw=eye.rotation.y
    const x=eye.position.x+(horizontal*Math.cos(yaw)-vertical*Math.sin(yaw))*speed
    const z=eye.position.z+(-horizontal*Math.sin(yaw)-vertical*Math.cos(yaw))*speed
    walkTo(x,eye.position.z)
    walkTo(eye.position.x,z)
    updateWalkZone()
  }
  function updateLabels(){
    const cameraInUse=activeCamera()
    const used:{x:number;y:number;half:number}[]=[]
    const view=host.getBoundingClientRect()
    const {width,height}=view
    const compact=width<500,clearance=compact?19:24
    const showLabels=state?.labels&&!state.walk&&!state.anchor
    const covers=showLabels&&hud?Array.from(hud.querySelectorAll(
      '.board-title, .board-actions, .board-tools, .inspector, .camera-options, .stage-toolbar, .board-bottom',
    ),node=>node.getBoundingClientRect()).filter(rect=>rect.width>0&&rect.height>0):[]
    for(const element of labelHost.querySelectorAll<HTMLButtonElement>('[data-marker]')){
      const id=element.dataset.marker!
      const at=labelAnchor(id),selected=state?.target===id
      const floor=bounds(id)?.floor
      const rack=rackPositions.find(item=>item.id===id)
      const hallRack=rack?.hall===state?.target&&Boolean(rack)
      const eligible=showLabels&&(!floor||floor===state?.floor)&&(!state?.focus||state.focus.ids.has(id))
      if(!at||!eligible||!selected&&!(hallRack||!state?.target&&camera.zoom<2.6)){element.hidden=true;continue}
      test.set(...at).project(cameraInUse)
      const x=(test.x*.5+.5)*width,anchorY=(-test.y*.5+.5)*height
      const half=(element.textContent?.length??0)*(compact?2.65:3.1)+(compact?7:10)
      if(x<half||x>width-half||anchorY<0||anchorY>height||test.z< -1||test.z>1){element.hidden=true;continue}
      const offsets=!state?.target?[0,clearance,-clearance,clearance*2]:[0]
      const gap=5
      const bands=covers.filter(rect=>rect.left-view.left<x+half+gap&&rect.right-view.left>x-half-gap)
      for(const rect of bands){
        offsets.push(anchorY-(rect.top-view.top-gap),anchorY-(rect.bottom-view.top+clearance+gap))
      }
      offsets.sort((a,b)=>Math.abs(a)-Math.abs(b))
      const offset=offsets.find(candidate=>{
        const y=anchorY-candidate
        if(y<clearance+gap||y>height-gap||!selected&&Math.abs(candidate)>clearance*3) return false
        if(bands.some(rect=>y+view.top>rect.top-gap&&y+view.top-clearance<rect.bottom+gap)) return false
        return selected||!used.some(p=>Math.abs(p.x-x)<p.half+half+4&&Math.abs(p.y-y)<clearance)
      })
      if(offset===undefined){element.hidden=true;continue}
      const y=anchorY-offset
      used.push({x,y,half})
      element.hidden=false
      element.style.setProperty('--marker-stem-below',Math.max(0,offset)+'px')
      element.style.setProperty('--marker-stem-above',Math.max(0,-offset-clearance)+'px')
      element.style.transform='translate3d('+x.toFixed(1)+'px,'+y.toFixed(1)+'px,0) translate(-50%, -100%)'
    }
    const reservePort=state?.trace?.route==='supplyAReserve'?coordinates.cracRefrigerantAReserve:undefined
    const at=reservePort??(state?.anchor?labelAnchor(state.anchor):undefined)
    if(!at){eventHost.dataset.visible='false';return}
    test.set(...at).project(cameraInUse)
    const x=(test.x*.5+.5)*width,y=(-test.y*.5+.5)*height
    eventHost.style.setProperty('--event-point-x',x.toFixed(1)+'px')
    eventHost.style.setProperty('--event-point-y',y.toFixed(1)+'px')
    eventHost.dataset.visible=String(x>=7&&x<=width-7&&y>=7&&y<=height-7&&test.z>=-1&&test.z<=1)
  }
  function setLight(hour:number){
    currentHour=hour
    const sunFactor=Math.max(0,Math.sin(Math.PI*(hour-6)/12))
    hemi.intensity=.66+1.69*Math.sqrt(sunFactor)
    sun.intensity=2.12*sunFactor
    sun.color.set(hour<9||hour>16?'#ffdbad':'#fff0d6')
  }
  function render(now:number){
    frame=0
    const start=performance.now()
    const delta=now-last
    const dt=Math.min(.05,delta/1000)
    last=now
    if(inWalk()&&keys.size){walk(dt);dirty=true}
    const doorsActive=inWalk()&&stepDoors(now,dt)
    const truckActive=inWalk()&&stepDelivery(delta/1000)
    if(inWalk()) updateAccessPrompt()
    if(move){
      const t=Math.min(1,(now-move.start)/(motion()?1:640))
      const k=1-Math.pow(1-t,3)
      camera.position.lerpVectors(move.from,move.to,k)
      control.target.lerpVectors(move.fromTarget,move.toTarget,k)
      camera.zoom=T.MathUtils.lerp(move.fromZoom,move.toZoom,k)
      camera.updateProjectionMatrix()
      dirty=true
      if(t===1) move=null
    }
    if(lighting){
      const t=Math.min(1,(now-lighting.start)/520)
      setLight(T.MathUtils.lerp(lighting.from,lighting.to,t))
      dirty=true
      if(t===1) lighting=null
    }
    if(installationStart&&building){
      const progress=Math.min(1,(now-installationStart)/440)
      building.incoming.scale.y=.04+.96*(1-(1-progress)**3)
      renderer.shadowMap.needsUpdate=true;dirty=true
      if(progress===1) installationStart=0
    }
    if(!inWalk()&&control.update()) dirty=true
    const redraw=Boolean(dirty||move||lighting||installationStart||(inWalk()&&keys.size))
    if(redraw){
      setResolution(Boolean(state?.economy),interacting||truckActive||Boolean(move||(inWalk()&&keys.size)))
      renderer.render(world,activeCamera())
      updateLabels()
      const metrics=renderer.info.render
      host.dataset.drawCalls=String(metrics.calls)
      host.dataset.triangles=String(metrics.triangles)
      host.dataset.renderMs=(performance.now()-start).toFixed(2)
      host.dataset.frameCount=String(++renders)
      if(building) host.dataset.renderedFloor=building.roof.visible?'roof':building.ground.visible?'ground':'upper'
      if(inWalk()) host.dataset.walkPosition=JSON.stringify(eye.position.toArray())
      host.dataset.modelView=JSON.stringify(snapshot())
      dirty=false
    }
    const tracing=Boolean(state?.trace&&highlighted.length&&!motion()&&flowTime<traceDuration)
    if(tracing&&wasTracing) flowTime=Math.min(traceDuration,flowTime+Math.min(80,delta))
    const flowing=Boolean(routes.length&&!motion())
    if(flowing) flowClock+=Math.min(80,delta)
    // The 2D flow overlay is cheap, but cap it so idle scenes stay light.
    const flowDue=flowing&&now-lastFlowDraw>=(state?.economy?66:33)
    if(redraw||tracing||wasTracing||flowDue){drawFlow();lastFlowDraw=now}
    wasTracing=tracing&&flowTime<traceDuration
    if(move||lighting||installationStart||doorsActive||truckActive||(inWalk()&&keys.size)||wasTracing||flowing) requestFrame()
  }
  function drawFlow(){
    const ctx=flowContext
    if(!ctx) return
    const width=flowCanvas.width,height=flowCanvas.height
    ctx.clearRect(0,0,width,height)
    if(!routes.length) return
    const drawingStart=performance.now()
    const cameraInUse=activeCamera()
    const progress=state?.trace&&highlighted.length?(motion()?1:flowTime/traceDuration):highlighted.length?1:0
    type ScreenPoint={x:number;y:number}
    function project(point:T.Vector3){
      if(renderer.clippingPlanes.some(plane=>plane.distanceToPoint(point)<0)) return null
      projected.copy(point).project(cameraInUse)
      if(projected.z< -1||projected.z>1) return null
      return {x:(projected.x*.5+.5)*width,y:(-projected.y*.5+.5)*height}
    }
    // Project each path once per frame, then shift it into its lane in screen pixels.
    const lanePx=6.5
    const screen=new Map<Path,ScreenPoint[][]>()
    for(const path of routes){
      const runs:ScreenPoint[][]=[]
      let run:ScreenPoint[]=[]
      for(const point of path.points){
        const p=project(point)
        if(p) run.push(p)
        else{if(run.length>1) runs.push(run);run=[]}
      }
      if(run.length>1) runs.push(run)
      screen.set(path,path.lane?runs.map(points=>offsetPolyline(points,path.lane*lanePx)):runs)
    }
    const ease=(t:number)=>1-Math.pow(1-Math.min(1,Math.max(0,t)),3)
    // A new parcours draws itself from its sources; a simulation step redraws only the route it follows.
    const layerReveal=motion()?1:ease((flowClock-revealAt)/900)
    const traceReveal=motion()?1:ease(progress*1.8)
    const traced=new Set(state?.trace?highlighted:[])
    const reveal=(path:Path)=>traced.has(path)?traceReveal:layerReveal
    const append=(path:Path,fraction=reveal(path))=>{
      const runs=screen.get(path)??[]
      let budget=Infinity
      if(fraction<1){
        let total=0
        for(const points of runs) for(let i=1;i<points.length;i++) total+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y)
        budget=total*fraction
      }
      for(const points of runs){
        if(budget<=0) break
        ctx.moveTo(points[0].x,points[0].y)
        for(let i=1;i<points.length&&budget>0;i++){
          const a=points[i-1],b=points[i],length=Math.hypot(b.x-a.x,b.y-a.y)
          if(length<=budget){ctx.lineTo(b.x,b.y);budget-=length;continue}
          const k=budget/length
          ctx.lineTo(a.x+(b.x-a.x)*k,a.y+(b.y-a.y)*k)
          budget=0
        }
      }
    }

    ctx.lineJoin='round';ctx.lineCap='round'
    const paper='#fffdf1'
    const stroke=(paths:Path[],opacity:number,weight:number,outline:number)=>{
      // Stroke shared segments together to keep junctions the same intensity as the path.
      for(const style of new Set(paths.map(path=>path.style))){
        ctx.beginPath()
        for(const path of paths) if(path.style===style) append(path)
        ctx.setLineDash(lineDashes[style.pattern])
        ctx.globalAlpha=opacity;ctx.strokeStyle=paper;ctx.lineWidth=weight+outline;ctx.stroke()
        ctx.strokeStyle=style.color;ctx.lineWidth=weight;ctx.stroke()
      }
    }
    if(highlighted.length){
      stroke(contextRoutes,state?.trace?.57:.34,1.9,1.55)
      const emphasis=state?.trace?Math.sin(Math.PI*progress):0
      stroke(highlighted,1,3.05+.55*emphasis,2.4+1.2*emphasis)
    }else{
      stroke(routes,1,2.65,2.2)
    }
    // Moving marks show direction and medium: sparks for current, slow streaks for air, packets for data.
    if(routeLayer&&!motion()){
      const moving=highlighted.length?highlighted:routes
      for(const style of new Set(moving.map(path=>path.style))){
        const group=moving.filter(path=>path.style===style)
        const flow=flowMotion(routeLayer,group[0].route)
        const period=flow.dash[0]+flow.dash[1]
        ctx.beginPath()
        for(const path of group) append(path)
        ctx.setLineDash(flow.dash)
        ctx.lineDashOffset=-((flowClock/1000*flow.speed)%period)
        ctx.strokeStyle=paper
        ctx.lineWidth=flow.width*(highlighted.length?1.25:1)
        ctx.globalAlpha=flow.alpha
        ctx.stroke()
      }
      ctx.lineDashOffset=0
      host.dataset.flowClock=flowClock.toFixed(0)
    }
    ctx.globalAlpha=1
    ctx.setLineDash([])
    if(highlighted.length){
      const marked:ScreenPoint[]=[]
      for(const path of highlighted){
        const runs=screen.get(path)
        if(!runs?.length) continue
        const first=runs[0][0],lastRun=runs[runs.length-1],end=lastRun[lastRun.length-1]
        for(const [p,source] of [[first,true],[end,false]] as const){
          if(!source&&reveal(path)<.98) continue
          if(marked.some(other=>Math.hypot(other.x-p.x,other.y-p.y)<8)) continue
          marked.push(p)
          ctx.beginPath();ctx.arc(p.x,p.y,3.3,0,Math.PI*2)
          ctx.fillStyle=source?path.style.color:paper;ctx.fill()
          ctx.strokeStyle=source?paper:path.style.color;ctx.lineWidth=1.45;ctx.stroke()
        }
      }
    }
    host.dataset.flowTime=flowTime.toFixed(1)
    host.dataset.flowProgress=progress.toFixed(3)
    host.dataset.flowFrames=String(++flowRenders)
    host.dataset.flowMs=(performance.now()-drawingStart).toFixed(2)
  }
  function setRoutes(layer:Layer|null,active:string[]|null,highlight:string[]){
    if(layer!==routeLayer) revealAt=flowClock
    routes=[]
    highlighted=[]
    contextRoutes=[]
    routeLayer=layer
    delete host.dataset.flowHighlight
    delete host.dataset.flowProgress
    if(!layer){delete host.dataset.flowRoutes;return}
    routes=(active??normalRoutes[layer]).flatMap(id=>{
      const route=topology[layer][id]
      return route?.paths.map(path=>lineFor(id,path,routeStyle(layer,id)))??[]
    })
    const lanes=assignLanes(routes.map(path=>({route:path.route,kind:path.style.label,points:path.points.map(point=>point.toArray())})))
    for(const path of routes) path.lane=lanes.get(path.route)??0
    host.dataset.flowLanes=routes.some(path=>path.lane)?[...lanes].filter(([,lane])=>lane).map(([route,lane])=>route+':'+lane).join(' '):''
    highlighted=routes.filter(path=>highlight.includes(path.route))
    contextRoutes=routes.filter(path=>!highlight.includes(path.route))
    if(highlighted.length) host.dataset.flowHighlight=highlighted[0].route
    host.dataset.flowRoutes=(active??normalRoutes[layer]).join(' ')
  }
  function apply(next:SceneState){
    const old=state
    state=next
    if(!building||old?.cap!==next.cap||old.inputs.solar!==next.inputs.solar||old.phase!==next.phase||old.focus!==next.focus){
      if(building) disposeGeometry(building)
      const animate=old&&next.cap.racks.length>old.cap.racks.length&&next.floor==='ground'&&!motion()
      building=geometry(next.cap,next.inputs,next.phase,animate?old.cap:undefined,next.focus)
      installationStart=animate?performance.now():0
      if(installationStart) building.incoming.scale.y=.04
      world.add(building.exterior,building.stairs,building.ceilings,building.ground,building.upper,building.roof)
      placeTruck()
      renderer.shadowMap.needsUpdate=true
    }
    visibleFloor(building,next.floor)
    if(next.focus){
      building.stairs.visible=false
      if(next.layer==='solar'&&next.floor==='roof') building.ground.visible=true
    }
    backdrop.position.y=next.focus&&!next.focus.ids.has('reserve')?-.026:-.84
    if(parked) parked.visible=!next.focus
    building.ceilings.visible=next.walk
    walkFill.intensity=next.walk?.55:0
    building.upper.visible=next.walk||next.floor==='upper'
    building.upperBase.visible=!next.walk
    building.upperCutWalls.visible=!next.walk
    building.upperWalkWalls.visible=next.walk
    if(old?.floor!==next.floor){
      floorFade?.cancel()
      if(old&&!motion()&&!next.walk) floorFade=renderer.domElement.animate([{opacity:.57},{opacity:1}],{duration:220,easing:'ease-out'})
      renderer.shadowMap.needsUpdate=true
    }
    building.cutWalls.visible=!next.walk
    building.walkWalls.visible=next.walk
    if(old?.walk!==next.walk) renderer.shadowMap.needsUpdate=true
    const activeElement=next.target??next.anchor
    const selected=activeElement?bounds(activeElement):undefined
    selection.visible=Boolean(selected&&(!selected.floor||selected.floor===next.floor))
    if(selected){
      selection.material.color.set(next.anchor&&next.layer?routeStyle(next.layer,next.trace?.route??'').color:'#5b9a75')
      selection.position.set(...selected.at)
      selection.scale.set(selected.size[0],selected.size[2],1)
    }
    if(old?.target!==next.target||old.isolated!==next.isolated){
      const room=next.isolated?rooms.find(room=>room.id===next.target):undefined
      if(room){
        const [x,z,w,d]=room.rect,m=.19
        renderer.clippingPlanes=[
          new T.Plane(new T.Vector3(1,0,0),-x+m),new T.Plane(new T.Vector3(-1,0,0),x+w+m),
          new T.Plane(new T.Vector3(0,0,1),-z+m),new T.Plane(new T.Vector3(0,0,-1),z+d+m),
        ]
      } else renderer.clippingPlanes=[]
      backdrop.visible=!next.isolated
      renderer.shadowMap.needsUpdate=true
    }
    const traceChanged=old?.trace?.route!==next.trace?.route||old?.trace?.sequence!==next.trace?.sequence
    if(!old||old.layer!==next.layer||old.routes!==next.routes||old.emphasis!==next.emphasis||traceChanged)
      setRoutes(next.layer,next.routes,next.trace?[next.trace.route]:next.emphasis??[])
    if(traceChanged){
      flowTime=0
      wasTracing=false
    }
    if(!old||old.hour!==next.hour){
      lighting=old&&!motion()?{from:currentHour,to:next.hour,start:performance.now()}:null
      if(!lighting) setLight(next.hour)
    }
    if(old?.tool!==next.tool){
      control.mouseButtons.LEFT=next.tool==='pan'?T.MOUSE.PAN:T.MOUSE.ROTATE
      control.touches.ONE=next.tool==='pan'?T.TOUCH.PAN:T.TOUCH.ROTATE
    }
    if(next.active===false){
      cancelAnimationFrame(frame);frame=0;wasTracing=false
    }
    if(!old||old.economy!==next.economy) configureQuality(next.economy)
    if(next.walk!==old?.walk){
      control.enabled=!next.walk
      deliveryRequested=false;deliveryProgress=0;placeTruck()
      if(next.walk){
        eye.position.set(visitorArrival.x,walkingEye,visitorArrival.z)
        eye.rotation.set(visitorArrival.pitch,visitorArrival.yaw,0)
        renderer.domElement.focus()
        updateWalkZone()
      }else{
        if(walkZoneId!==null){walkZoneId=null;onWalkZone(null)}
        if(accessPrompt){accessPrompt=null;onAccessPrompt(null)}
        if(pendingAccess){pendingAccess=null;onAccessRequest(null)}
        resumeMouseLook=false
        for(const door of building.access?.doors??[]){door.openUntil=0;setDoorOpening(door,0)}
        delete host.dataset.walkPosition;keys.clear()
        if(document.pointerLockElement===renderer.domElement) document.exitPointerLock()
      }
    }
    invalidate()
  }
  function snapshot():ModelSnapshot{
    return {position:camera.position.toArray(),target:control.target.toArray(),zoom:camera.zoom}
  }
  function moveTo(aim:T.Vector3,target:T.Vector3,zoom:number){
    const from=camera.position.clone(),fromTarget=control.target.clone(),fromZoom=camera.zoom
    if(control.enableDamping){
      // Consume pending gesture inertia before applying the requested camera pose.
      control.enableDamping=false
      control.update()
      camera.position.copy(from);control.target.copy(fromTarget);camera.zoom=fromZoom
      control.enableDamping=true
    }
    if(motion()){
      move=null
      camera.position.copy(aim);control.target.copy(target);camera.zoom=zoom;camera.updateProjectionMatrix()
    }else move={from,to:aim,fromTarget,toTarget:target,fromZoom,toZoom:zoom,start:performance.now()}
    invalidate()
  }
  function action(action:CameraAction){
    if(action.kind==='zoom'){
      camera.zoom=T.MathUtils.clamp(camera.zoom*(action.value==='in'?1.24:1/1.24),control.minZoom,control.maxZoom)
      camera.updateProjectionMatrix();invalidate();return
    }
    if(action.kind==='simulation'){
      const box=new T.Box3()
      if(action.value==='overview'&&building){
        for(const group of [building.ground,building.exterior]){
          group.updateMatrixWorld(true)
          group.traverseVisible(object=>{
            if(!(object instanceof T.Mesh)) return
            const source=object instanceof T.InstancedMesh?object:object.geometry
            if(!source.boundingBox) source.computeBoundingBox()
            const local=source.boundingBox
            if(local&&!local.isEmpty()) box.union(local.clone().applyMatrix4(object.matrixWorld))
          })
        }
      }else{
        if(action.value!=='equipment') for(const path of highlighted) for(const point of path.points) box.expandByPoint(point)
        const event=state?.anchor?bounds(state.anchor):undefined
        if(event){
          const [x,y,z]=event.at,[w,,d]=event.size
          box.expandByPoint(new T.Vector3(x-w/2,y,z-d/2))
          box.expandByPoint(new T.Vector3(x+w/2,y+3,z+d/2))
        }
      }
      if(box.isEmpty()) return
      const direction=action.value==='overview'?new T.Vector3(...overviewDirection).normalize():camera.position.clone().sub(control.target).normalize()
      const right=new T.Vector3(0,1,0).cross(direction).normalize()
      const up=direction.clone().cross(right)
      const size=box.getSize(new T.Vector3())
      const extent=(axis:T.Vector3)=>Math.abs(axis.x)*size.x+Math.abs(axis.y)*size.y+Math.abs(axis.z)*size.z
      const target=box.getCenter(new T.Vector3())
      const zoom=T.MathUtils.clamp(Math.min(width*.73/Math.max(12,extent(right)),height*.60/Math.max(8,extent(up))),.75,4.6)
      target.addScaledVector(right,-width*.035/zoom).addScaledVector(up,-height*.035/zoom)
      moveTo(direction.multiplyScalar(143).add(target),target,zoom)
      return
    }
    const selected=action.kind==='focus'&&action.value?bounds(action.value):undefined
    if(action.kind==='focus'&&!selected) return
    const target=selected?new T.Vector3(selected.at[0],selected.at[1]+.64,selected.at[2]):
      state?.floor==='upper'?new T.Vector3(15,4.74,7):new T.Vector3(0,0,0)
    const zoom=selected?Math.min(10.5,width/selected.radius):state?.floor==='upper'?Math.min(4.3,width/24):1
    const aim=new T.Vector3(...overviewDirection).normalize().multiplyScalar(143).add(target)
    moveTo(aim,target,zoom)
  }
  function pick(event:PointerEvent){
    if(!building||inWalk()||state?.tool==='pan') return
    const rect=renderer.domElement.getBoundingClientRect()
    pointer.set((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2)
    ray.setFromCamera(pointer,camera)
    const groups=[building.exterior,building.ground,building.upper,building.roof].filter(group=>group.visible)
    const candidates=ray.intersectObjects(groups,true)
    for(const hit of candidates){
      if(!(hit.object instanceof T.InstancedMesh)||hit.instanceId===undefined||renderer.clippingPlanes.some(plane=>plane.distanceToPoint(hit.point)<0)) continue
      const id=(hit.object as Picks).userData.ids?.[hit.instanceId]
      if(id===false) return
      if(id&&bounds(id)){onPick(id);return}
    }
  }
  function pointerDown(event:PointerEvent){
    if(event.button!==0||pendingAccess) return
    down={x:event.clientX,y:event.clientY}
    if(inWalk()) drag={x:event.clientX,y:event.clientY}
    else move=null
  }
  function pointerUp(event:PointerEvent){
    if(down&&Math.hypot(event.clientX-down.x,event.clientY-down.y)<6){
      if(inWalk()){
        if(!pendingAccess&&!document.pointerLockElement) lockWalkPointer()
      }else pick(event)
    }
    down=null;drag=null
  }
  function pointerMove(event:PointerEvent){
    if(!inWalk()||pendingAccess||(!drag&&document.pointerLockElement!==renderer.domElement)) return
    const dx=drag?event.clientX-drag.x:event.movementX,dy=drag?event.clientY-drag.y:event.movementY
    eye.rotation.y-=dx*.0034;eye.rotation.x=T.MathUtils.clamp(eye.rotation.x-dy*.0034,-1.3,1.3)
    if(drag) drag={x:event.clientX,y:event.clientY}
    invalidate()
  }
  function keyDown(event:KeyboardEvent){
    if(!inWalk()||pendingAccess) return
    const key=event.key.toLowerCase()
    if(key==='escape'){onWalkExit();return}
    if(key==='e'){
      event.preventDefault()
      if(!event.repeat) startAccess()
      return
    }
    if(!['w','a','s','d','z','q','arrowup','arrowdown','arrowleft','arrowright'].includes(key)) return
    event.preventDefault();keys.add(key);requestFrame()
  }
  function keyUp(event:KeyboardEvent){keys.delete(event.key.toLowerCase())}
  function blur(){keys.clear();drag=null;down=null}
  function contextLost(event:Event){event.preventDefault();host.dispatchEvent(new Event('sceneerror'))}
  const canvas=renderer.domElement
  control.addEventListener('change',invalidate)
  control.addEventListener('start',()=>{
    move=null;interacting=true;clearTimeout(settleTimer);invalidate()
  })
  control.addEventListener('end',()=>{
    settleTimer=window.setTimeout(()=>{interacting=false;invalidate()},180)
  })
  canvas.addEventListener('pointerdown',pointerDown)
  canvas.addEventListener('webglcontextlost',contextLost)
  hud?.addEventListener('toggle',invalidate,true)
  window.addEventListener('pointerup',pointerUp);window.addEventListener('pointermove',pointerMove)
  window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);window.addEventListener('blur',blur)
  fit()
  return {apply,action,startAccess,restoreAccessPointer,finishAccess,dispose(){
    disposed=true;cancelAnimationFrame(frame);clearTimeout(settleTimer);floorFade?.cancel();observer.disconnect();control.dispose();setRoutes(null,null,[])
    hud?.removeEventListener('toggle',invalidate,true)
    if(document.pointerLockElement===canvas) document.exitPointerLock()
    window.removeEventListener('pointerup',pointerUp);window.removeEventListener('pointermove',pointerMove)
    window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);window.removeEventListener('blur',blur)
    if(building) disposeGeometry(building)
    if(parked) disposeGroup(parked)
    selection.geometry.dispose();selection.material.dispose()
    backdrop.geometry.dispose();backdrop.material.dispose();sun.shadow.dispose()
    renderer.dispose();renderer.forceContextLoss();canvas.remove();flowCanvas.remove()
  }}
}

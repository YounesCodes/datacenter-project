import * as T from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { center,coordinates,equipment,normalRoutes,property,rackPositions,rooms,topology,walkHeight,type Floor,type Layer,type Point } from './model'
import { bounds,disposeGeometry,geometry,visibleFloor,type Geometry } from './siteGeometry'
import type { Picks } from './geometryTools'
import type { Capacity,Inputs } from './engineering'
import type { Phase } from './model'

import type { Angle,CameraAction,ModelSnapshot } from './viewState'
export const routeColors:Record<Layer,string>={power:'#ce8e28',air:'#3386a2',network:'#7463b0',compute:'#4975a6',storage:'#9a683d',solar:'#8b9838'}
export type SceneState={cap:Capacity;inputs:Inputs;phase:Phase;floor:Floor;target:string|null;labels:boolean;isolated:boolean;layer:Layer|null;routes:string[]|null;playing:boolean;hour:number;walk:boolean;economy:boolean;tool:'select'|'pan';anchor:string|null;active?:boolean}
const angles:Record<Angle,Point>={iso:[.77,.85,1],top:[0,1,.001],front:[0,.13,1],rear:[0,.13,-1],left:[-1,.13,0],right:[1,.13,0]}
const labelsByRoom:Record<string,Point>={
  'hall-a':[-14,2.8,-8.25],'hall-b':[.35,2.8,-8.25],power:[-13.55,2.52,5.7],
  cooling:[-2.5,2.42,6.6],network:[15,2.59,-4.45],reception:[15,2.45,3],
  delivery:[5.2,2.2,7.1],noc:[13.5,2.34,-9.6],
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

function lineFor(keys:string[],color:string){
  const points=keys.map(key=>{
    const p=coordinates[key]
    const y=p[1]===0?1.65:p[1]
    return new T.Vector3(p[0],y,p[2])
  })
  const curve=new T.CurvePath<T.Vector3>()
  for(let i=1;i<points.length;i++) curve.add(new T.LineCurve3(points[i-1],points[i]))
  return {curve,points:curve.getPoints(keys.length*10),color,dots:Math.min(9,keys.length+3)}
}
type Path=ReturnType<typeof lineFor>
const motion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches

export function createScene(host:HTMLDivElement,labelHost:HTMLDivElement,eventHost:HTMLDivElement,onPick:(id:string)=>void,onWalkExit:()=>void){
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
  flowCanvas.className='flow-particles'
  flowCanvas.setAttribute('aria-hidden','true')
  const flowContext=flowCanvas.getContext('2d')
  host.append(renderer.domElement,flowCanvas)
  const hemi=new T.HemisphereLight('#e7f1ff','#b7a88e',2.35)
  const sun=new T.DirectionalLight('#fff0d6',2.1)
  sun.position.set(-31,52,38)
  sun.castShadow=true
  sun.shadow.mapSize.set(1536,1536)
  Object.assign(sun.shadow.camera,{left:-36,right:36,top:31,bottom:-32,near:1,far:115})
  sun.shadow.normalBias=.055
  world.add(hemi,sun)
  const backdrop=new T.Mesh(new T.PlaneGeometry(260,260),new T.ShadowMaterial({opacity:.18}))
  backdrop.rotation.x=-Math.PI/2;backdrop.position.y=-.84;backdrop.receiveShadow=true;world.add(backdrop)
  const control=new OrbitControls(camera,renderer.domElement)
  control.enableDamping=!motion();control.dampingFactor=.15
  control.minZoom=.47;control.maxZoom=13;control.maxPolarAngle=Math.PI*.49
  control.mouseButtons={LEFT:T.MOUSE.ROTATE,MIDDLE:T.MOUSE.DOLLY,RIGHT:T.MOUSE.PAN}
  control.touches={ONE:T.TOUCH.ROTATE,TWO:T.TOUCH.DOLLY_PAN}
  const selection=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({color:'#5b9a75',transparent:true,opacity:.28,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-8}))
  selection.rotation.x=-Math.PI/2;selection.visible=false;world.add(selection)
  const test=new T.Vector3(),dot=new T.Vector3()
  const ray=new T.Raycaster(),pointer=new T.Vector2()
  const keys=new Set<string>()
  let state:SceneState|undefined,building:Geometry|undefined
  let routes:Path[]=[]
  let aspect=1,height=54,width=72,frame=0,last=0,angle:Angle='iso',renders=0,flowRenders=0,disposed=false,dirty=true
  let move:{from:T.Vector3;to:T.Vector3;fromTarget:T.Vector3;toTarget:T.Vector3;fromZoom:number;toZoom:number;start:number}|null=null
  let floorFade:Animation|undefined
  let lighting:{from:number;to:number;start:number}|null=null
  let currentHour=12,flowTime=0,wasPlaying=false
  let installationStart=0,interacting=false,settleTimer=0
  let down:{x:number;y:number}|null=null
  let drag:{x:number;y:number}|null=null
  camera.position.set(74,82,98)
  control.update()
  function requestFrame(){
    if(!frame&&!disposed&&state?.active!==false) frame=requestAnimationFrame(render)
  }
  function invalidate(){dirty=true;requestFrame()}
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
  function walkTo(x:number,z:number){
    const current=eye.position.y-walkingEye
    const level=walkHeight(x,z,current)
    if(level===null||Math.abs(level-current)>.24||Math.abs(x)>28.55||Math.abs(z)>20.82) return
    const obstacles=level>=property.technicalHeight-.06?building?.upperCollision:building?.collision
    if(obstacles?.some(rect=>Math.abs(x-rect.x)<rect.w/2+.25&&Math.abs(z-rect.z)<rect.d/2+.25)) return
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
  }
  function updateLabels(){
    const cameraInUse=activeCamera()
    const used:{x:number;y:number;half:number}[]=[]
    const view=host.getBoundingClientRect()
    const {width,height}=view
    const compact=width<500,clearance=compact?19:24
    const showLabels=state?.labels&&!state.walk&&!state.anchor
    const covers=showLabels&&hud?Array.from(hud.querySelectorAll(
      '.board-title, .board-actions, .board-tools, .inspector, .camera-options, .stage-toolbar, .board-bottom, .board-sheet',
    ),node=>node.getBoundingClientRect()).filter(rect=>rect.width>0&&rect.height>0):[]
    for(const element of labelHost.querySelectorAll<HTMLButtonElement>('[data-marker]')){
      const id=element.dataset.marker!
      const at=labelAnchor(id),selected=state?.target===id
      const floor=bounds(id)?.floor
      const rack=rackPositions.find(item=>item.id===id)
      const hallRack=rack?.hall===state?.target&&Boolean(rack)
      const eligible=showLabels&&(!floor||floor===state?.floor)
      if(!at||!eligible||!selected&&!(hallRack||!state?.target&&camera.zoom<2.6)){element.hidden=true;continue}
      test.set(...at).project(cameraInUse)
      const x=(test.x*.5+.5)*width,anchorY=(-test.y*.5+.5)*height
      const half=(element.textContent?.length??0)*(compact?2.65:3.1)+(compact?7:10)
      if(x<half||x>width-half||anchorY<0||anchorY>height||test.z< -1||test.z>1){element.hidden=true;continue}
      const offsets=compact&&!state?.target?[0,clearance,-clearance*2,clearance*2]:[0]
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
    const at=state?.anchor?labelAnchor(state.anchor):undefined
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
    if(dirty||move||lighting||installationStart||(inWalk()&&keys.size)){
      setResolution(Boolean(state?.economy),interacting||Boolean(move||(inWalk()&&keys.size)))
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
    const pulse=Boolean(state?.playing&&!motion()&&routes.length)
    if(pulse&&wasPlaying) flowTime+=Math.min(80,delta)
    wasPlaying=pulse
    drawFlow(flowTime)
    if(move||lighting||installationStart||(inWalk()&&keys.size)||(pulse&&routes.length)) requestFrame()
  }
  function drawFlow(time:number){
    if(!flowContext) return
    const width=flowCanvas.width,height=flowCanvas.height
    flowContext.clearRect(0,0,width,height)
    if(!routes.length) return
    const drawingStart=performance.now()
    const cameraInUse=activeCamera()
    function project(point:T.Vector3){
      if(renderer.clippingPlanes.some(plane=>plane.distanceToPoint(point)<0)) return null
      dot.copy(point).project(cameraInUse)
      if(dot.z< -1||dot.z>1) return null
      return {x:(dot.x*.5+.5)*width,y:(-dot.y*.5+.5)*height}
    }
    for(const [index,path] of routes.entries()){
      flowContext.beginPath()
      flowContext.lineJoin='round';flowContext.lineCap='round'
      let started=false
      for(const point of path.points){
        const p=project(point)
        if(!p){started=false;continue}
        if(started) flowContext.lineTo(p.x,p.y)
        else{flowContext.moveTo(p.x,p.y);started=true}
      }
      flowContext.strokeStyle='#f8fbf7';flowContext.lineWidth=3.8;flowContext.stroke()
      flowContext.strokeStyle=path.color;flowContext.lineWidth=1.8;flowContext.stroke()
      flowContext.fillStyle=path.color
      flowContext.strokeStyle='#fcfdf8';flowContext.lineWidth=1.1
      flowContext.beginPath()
      for(let i=0;i<path.dots;i++){
        const point=path.curve.getPointAt((time*.00025+i/path.dots+index*.17)%1)
        const p=project(point)
        if(!p) continue
        flowContext.moveTo(p.x+3.2,p.y);flowContext.arc(p.x,p.y,3.2,0,Math.PI*2)
      }
      flowContext.fill();flowContext.stroke()
    }
    host.dataset.flowTime=flowTime.toFixed(1)
    host.dataset.flowFrames=String(++flowRenders)
    host.dataset.flowMs=(performance.now()-drawingStart).toFixed(2)
  }
  function setRoutes(layer:Layer|null,active:string[]|null){
    routes=[]
    if(!layer){delete host.dataset.flowRoutes;return}
    const tones={warm:'#c37150',refrigerant:'#7b6090',grid:routeColors.power,reduced:'#79a5ad'}
    routes=(active??normalRoutes[layer]).flatMap(id=>{
      const route=topology[layer][id]
      return route?.paths.map(path=>lineFor(path,route.tone?tones[route.tone]:routeColors[layer]))??[]
    })
    host.dataset.flowRoutes=(active??normalRoutes[layer]).join(' ')
  }
  function apply(next:SceneState){
    const old=state
    state=next
    if(!building||old?.cap!==next.cap||old.inputs.solar!==next.inputs.solar||old.phase!==next.phase){
      if(building) disposeGeometry(building)
      const animate=old&&next.cap.racks.length>old.cap.racks.length&&next.floor==='ground'&&!motion()
      building=geometry(next.cap,next.inputs,next.phase,animate?old.cap:undefined)
      installationStart=animate?performance.now():0
      if(installationStart) building.incoming.scale.y=.04
      world.add(building.exterior,building.stairs,building.ground,building.upper,building.roof)
      renderer.shadowMap.needsUpdate=true
    }
    visibleFloor(building,next.floor)
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
      selection.material.color.set(next.anchor&&next.layer?routeColors[next.layer]:'#5b9a75')
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
    if(old?.layer!==next.layer||old.routes!==next.routes) setRoutes(next.layer,next.routes)
    if(!old||old.hour!==next.hour){
      lighting=old&&!motion()?{from:currentHour,to:next.hour,start:performance.now()}:null
      if(!lighting) setLight(next.hour)
    }
    if(old?.tool!==next.tool){
      control.mouseButtons.LEFT=next.tool==='pan'?T.MOUSE.PAN:T.MOUSE.ROTATE
      control.touches.ONE=next.tool==='pan'?T.TOUCH.PAN:T.TOUCH.ROTATE
    }
    if(next.active===false){
      cancelAnimationFrame(frame);frame=0;wasPlaying=false
    }
    if(!old||old.economy!==next.economy) configureQuality(next.economy)
    if(next.walk!==old?.walk){
      control.enabled=!next.walk
      if(next.walk){eye.position.set(13.65,walkingEye,-.98);eye.rotation.set(0,Math.PI/2,0);renderer.domElement.focus()}
      else{delete host.dataset.walkPosition;keys.clear();if(document.pointerLockElement===renderer.domElement) document.exitPointerLock()}
    }
    invalidate()
  }
  function snapshot():ModelSnapshot{
    return {position:camera.position.toArray(),target:control.target.toArray(),angle,zoom:camera.zoom}
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
    if(action.kind==='angle') angle=action.value as Angle
    if(action.kind==='reset') angle='iso'
    const selected=action.kind==='focus'&&action.value?bounds(action.value):undefined
    if(action.kind==='focus'&&!selected) return
    const target=selected?new T.Vector3(selected.at[0],selected.at[1]+.64,selected.at[2]):
      action.kind==='angle'?control.target.clone():state?.floor==='upper'?new T.Vector3(15,4.74,7):new T.Vector3(0,0,0)
    const zoom=selected?Math.min(10.5,width/selected.radius):action.kind==='angle'?camera.zoom:state?.floor==='upper'?Math.min(4.3,width/24):1
    const aim=new T.Vector3(...angles[angle]).normalize().multiplyScalar(143).add(target)
    moveTo(aim,target,zoom)
  }
  function pick(event:PointerEvent){
    if(!building||inWalk()||state?.tool==='pan') return
    const bounds=renderer.domElement.getBoundingClientRect()
    pointer.set((event.clientX-bounds.left)/bounds.width*2-1,1-(event.clientY-bounds.top)/bounds.height*2)
    ray.setFromCamera(pointer,camera)
    const groups=[building.exterior,building.ground,building.upper,building.roof].filter(group=>group.visible)
    const candidates=ray.intersectObjects(groups,true)
    for(const hit of candidates){
      if(!(hit.object instanceof T.InstancedMesh)||hit.instanceId===undefined||renderer.clippingPlanes.some(plane=>plane.distanceToPoint(hit.point)<0)) continue
      const id=(hit.object as Picks).userData.ids?.[hit.instanceId]
      if(id){onPick(id);return}
    }
  }
  function pointerDown(event:PointerEvent){
    if(event.button!==0) return
    down={x:event.clientX,y:event.clientY}
    if(inWalk()) drag={x:event.clientX,y:event.clientY}
    else move=null
  }
  function pointerUp(event:PointerEvent){
    if(down&&Math.hypot(event.clientX-down.x,event.clientY-down.y)<6){
      if(inWalk()){
        if(!document.pointerLockElement) {
          try{Promise.resolve(renderer.domElement.requestPointerLock?.()).catch(()=>{})}catch{/* dragging still works */}
        }
      } else pick(event)
    }
    down=null;drag=null
  }
  function pointerMove(event:PointerEvent){
    if(!inWalk()||(!drag&&document.pointerLockElement!==renderer.domElement)) return
    const dx=drag?event.clientX-drag.x:event.movementX,dy=drag?event.clientY-drag.y:event.movementY
    eye.rotation.y-=dx*.0034;eye.rotation.x=T.MathUtils.clamp(eye.rotation.x-dy*.0034,-1.3,1.3)
    if(drag) drag={x:event.clientX,y:event.clientY}
    invalidate()
  }
  function keyDown(event:KeyboardEvent){
    if(!inWalk()) return
    const key=event.key.toLowerCase()
    if(key==='escape'){onWalkExit();return}
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
  return {apply,action,dispose(){
    disposed=true;cancelAnimationFrame(frame);clearTimeout(settleTimer);floorFade?.cancel();observer.disconnect();control.dispose();setRoutes(null,null)
    hud?.removeEventListener('toggle',invalidate,true)
    if(document.pointerLockElement===canvas) document.exitPointerLock()
    window.removeEventListener('pointerup',pointerUp);window.removeEventListener('pointermove',pointerMove)
    window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);window.removeEventListener('blur',blur)
    if(building) disposeGeometry(building)
    selection.geometry.dispose();selection.material.dispose()
    backdrop.geometry.dispose();backdrop.material.dispose();sun.shadow.dispose()
    renderer.dispose();renderer.forceContextLoss();canvas.remove();flowCanvas.remove()
  }}
}

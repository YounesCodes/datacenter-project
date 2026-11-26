import { useEffect,useMemo,useRef,useState,type CSSProperties } from 'react'
import { ArrowRight, CircleHelp, Compass, X } from 'lucide-react'
import { capacity,defaults,energy,solarProfile } from './engineering'
import { BoardTools,Stage,type BoardMenu,type Tool } from './Explorer'
import Inspector,{ nameFor,RouteSample,SimulationPanel } from './Inspector'
import { equipment,normalRoutes,rackPositions,rooms,type Floor,type Layer,type Phase } from './model'
import { flowFocus,routeStyle } from './flowPresentation'
import type { CameraAction,Scale } from './viewState'
import { simulations } from './simulations'

const layerAnchor:Record<Layer,string>={power:'switchgear',air:'crac',network:'fiber',compute:'hall-a',storage:'hall-b',solar:'solar'}
type SimulationStep={id:string;step:number;sequence:number}

export default function App(){
  const [menu,setMenu]=useState<BoardMenu>(null)
  const [phase,setPhase]=useState<Phase>(1)
  const [scale,setScale]=useState<Scale>('site')
  const [floor,setFloor]=useState<Floor>('ground')
  const [tool,setTool]=useState<Tool>('select')
  const [target,setTarget]=useState<string|null>(null)
  const [layer,setLayer]=useState<Layer|null>(null)
  const [command,setCommand]=useState<CameraAction>({kind:'reset',token:0})
  const [labels,setLabels]=useState(true)
  const [isolated,setIsolated]=useState(false)
  const [walk,setWalk]=useState(false)
  const [economy,setEconomy]=useState(()=>matchMedia('(max-width: 650px)').matches||(navigator.hardwareConcurrency??8)<4)
  const [simulationStep,setSimulationStep]=useState<SimulationStep|null>(null)
  const [legendHover,setLegendHover]=useState<string|null>(null)
  const [legendPin,setLegendPin]=useState<string|null>(null)
  const [fullscreenError,setFullscreenError]=useState(false)
  const help=useRef<HTMLDialogElement>(null)
  const sequence=useRef(0)
  const currentSim=simulations.find(item=>item.id===simulationStep?.id)
  const focus=useMemo(()=>flowFocus(layer,currentSim?.id),[layer,currentSim?.id])
  const frame=simulationStep&&currentSim?currentSim.frames[simulationStep.step]:undefined
  const inputs=useMemo(()=>defaults(phase),[phase])
  const cap=useMemo(()=>capacity(phase,inputs),[phase,inputs])
  const camera=(kind:CameraAction['kind'],value?:string)=>setCommand(previous=>({kind,value,token:previous.token+1}))
  function choosePhase(next:Phase){
    if(next===phase) return
    setPhase(next)
  }
  function reset(level:Floor=floor){
    setTarget(null);setIsolated(false);setFloor(level);camera('reset')
  }
  function goScale(next:Scale){
    setScale(next);setWalk(false);setMenu(null)
  }
  function chooseFloor(next:Floor){
    setSimulationStep(null);setWalk(false);setScale('site')
    if(next!==floor) {
      if(layer==='solar'&&next!=='roof'||layer&&layer!=='solar'&&next!=='ground') setLayer(null)
      reset(next)
    }
  }
  function select(id:string){
    const room=rooms.find(room=>room.id===id),asset=equipment.find(item=>item.id===id)
    const rack=rackPositions.some(item=>item.id===id)
    const exterior=asset&&['generator','transformer','condenser','fuel','security','camera'].includes(asset.kind)
    const next=room?.floor??(id==='solar'?'roof':rack||asset&&!exterior?'ground':floor)
    setScale('site');setFloor(next);setTarget(id);setIsolated(false);setWalk(false)
    camera('focus',id)
  }
  function chooseTarget(id:string){
    if(simulationStep) return
    if(id===target){
      if(layer==='solar') setLayer(null)
      reset('ground')
      return
    }
    select(id)
  }
  function chooseLayer(next:Layer|null){
    setSimulationStep(null);setWalk(false);setScale('site');setLayer(next)
    if(!next) return
    const level=next==='solar'?'roof':'ground'
    if(level!==floor||target) reset(level)
  }
  function focusFrame(id:string,index:number){
    const sim=simulations.find(item=>item.id===id)
    const event=sim?.frames[index]
    if(!sim||!event) return
    setScale('site');setWalk(false);setLayer(sim.view)
    setTarget(null);setIsolated(false);setFloor('ground')
    setSimulationStep({id,step:index,sequence:++sequence.current})
    camera('simulation',index===0?'overview':event.frameEquipment?'equipment':undefined)
  }
  function startSimulation(id:string){
    focusFrame(id,0)
  }
  function leaveSimulation(){
    setSimulationStep(null);setLayer(null);reset('ground')
  }
  function fullscreen(){
    if(document.fullscreenElement){void document.exitFullscreen();return}
    if(document.documentElement.requestFullscreen) void document.documentElement.requestFullscreen().catch(()=>setFullscreenError(true))
    else setFullscreenError(true)
  }
  useEffect(()=>{
    if(!fullscreenError) return
    const timer=setTimeout(()=>setFullscreenError(false),4000)
    return ()=>clearTimeout(timer)
  },[fullscreenError])
  useEffect(()=>{setLegendHover(null);setLegendPin(null)},[layer])
  useEffect(()=>{
    if(!simulationStep||menu) return
    const step=simulationStep
    // Arrow keys walk through the scenario; Escape leaves it.
    function keys(event:KeyboardEvent){
      if(event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey) return
      if(event.target instanceof HTMLElement&&event.target.closest('input,textarea,select,[contenteditable=true]')) return
      const total=simulations.find(item=>item.id===step.id)?.frames.length??0
      if(event.key==='ArrowRight'&&step.step<total-1){event.preventDefault();focusFrame(step.id,step.step+1)}
      else if(event.key==='ArrowLeft'&&step.step>0){event.preventDefault();focusFrame(step.id,step.step-1)}
      else if(event.key==='Escape'){event.preventDefault();leaveSimulation()}
    }
    document.addEventListener('keydown',keys)
    return ()=>document.removeEventListener('keydown',keys)
  })
  useEffect(()=>{
    if(!menu) return
    function outside(event:PointerEvent){
      if(event.target instanceof Element&&!event.target.closest('[data-board-menu]')) setMenu(null)
    }
    function escape(event:KeyboardEvent){if(event.key==='Escape') setMenu(null)}
    document.addEventListener('pointerdown',outside)
    document.addEventListener('keydown',escape)
    return ()=>{
      document.removeEventListener('pointerdown',outside)
      document.removeEventListener('keydown',escape)
    }
  },[menu])
  const showTimeline=scale==='site'&&Boolean(simulationStep&&frame)
  const eventAnchor=frame&&currentSim?(frame.focus??layerAnchor[currentSim.view]):null
  const sceneHour=12
  const frameRoutes=frame?.routes??null
  const activeRoutes=useMemo(()=>{
    if(layer!=='solar') return frameRoutes
    const facility=energy(phase,inputs,cap).facility
    const power=solarProfile(sceneHour,inputs.solar,facility)
    return (frameRoutes??normalRoutes.solar).filter(route=>
      route==='panels'?power.selfUse>0:route==='grid'?power.grid>0:facility>0,
    )
  },[layer,frameRoutes,sceneHour,phase,inputs,cap])
  const cue=frame?.cue
  const legendFocus=legendHover??legendPin
  const emphasis=useMemo(()=>{
    if(!layer||simulationStep||!legendFocus) return null
    return (activeRoutes??normalRoutes[layer]).filter(route=>routeStyle(layer,route).label===legendFocus)
  },[layer,simulationStep,legendFocus,activeRoutes])
  const toolbar=scale==='site'&&!walk&&<BoardTools tool={tool} floor={floor} phase={phase} layer={layer} simulation={simulationStep?.id??null} menu={menu} onMenu={setMenu} onTool={setTool} onFloor={chooseFloor}
    onPhase={next=>{setSimulationStep(null);choosePhase(next)}} onLayer={chooseLayer} onSimulation={startSimulation}/>
  const info=showTimeline&&frame&&eventAnchor?
    <aside className="scene-event" data-anchor={eventAnchor} aria-label="Événement sur la maquette"
      style={cue&&layer?{'--tone':routeStyle(layer,cue.route).color} as CSSProperties:undefined}>
      <div className="event-narration" aria-live="polite" aria-atomic="true">
        <div className="event-details" key={simulationStep?.sequence}>
          <span className="event-location"><b>Étape {(simulationStep?.step??0)+1}</b>{nameFor(eventAnchor)}</span>
          <h3>{frame.title}</h3><p>{frame.description}</p>
          {cue&&layer&&<div className="event-route">
            <RouteSample line={routeStyle(layer,cue.route)}/>
            <strong>{cue.label}</strong>
          </div>}
        </div>
      </div>
    </aside>:scale==='site'&&(target||layer)?
      <Inspector target={target} phase={phase} cap={cap} inputs={inputs} layer={layer} routes={activeRoutes}
        isolated={isolated} onIsolate={()=>setIsolated(!isolated)} onClear={()=>chooseLayer(null)} onSimulate={startSimulation}
        legend={{hover:legendHover,pinned:legendPin,onHover:setLegendHover,onPin:setLegendPin}}/>:null
  return <>
    <a href="#main-content" className="skip-link">Aller au contenu</a>
    <main className="board-app" id="main-content" aria-labelledby="project-title">
      <h1 className="visually-hidden" id="project-title">Centre de données de Benguerir</h1>
      <Stage cap={cap} inputs={inputs} phase={phase} scale={scale} floor={floor} target={target} layer={layer} action={command}
        toolbar={toolbar} info={info} menu={menu} onMenu={setMenu}
        routes={activeRoutes} emphasis={emphasis} hour={sceneHour} focus={focus}
        trace={simulationStep&&cue?{route:cue.route,sequence:simulationStep.sequence}:null}
        anchor={showTimeline?eventAnchor:null}
        labels={labels} isolated={isolated} walk={walk} economy={economy} tool={tool}
        onLocation={()=>goScale(scale==='city'?'site':'city')} onSelect={chooseTarget}
        onZoom={direction=>{camera('zoom',direction)}} onReset={()=>{reset()}}
        onLabels={()=>setLabels(!labels)} onWalk={()=>{setSimulationStep(null);setLayer(null);reset('ground');setWalk(true)}} onWalkExit={()=>setWalk(false)}
        onQuality={()=>setEconomy(!economy)} onFullscreen={fullscreen} onHelp={()=>help.current?.showModal()}>
        {showTimeline&&frame&&simulationStep&&<SimulationPanel id={simulationStep.id} step={simulationStep.step} frame={frame}
          onStep={index=>focusFrame(simulationStep.id,index)}
          onExit={leaveSimulation}/>}
        {fullscreenError&&<p className="toast" role="status">Le plein écran est indisponible dans ce navigateur.</p>}
      </Stage>
    </main>
    <dialog className="help-dialog" ref={help} aria-labelledby="help-title">
      <form method="dialog">
        <header><Compass size={21}/><h2 id="help-title">Commandes de la maquette</h2><button className="icon-button" aria-label="Fermer l’aide"><X size={19}/></button></header>
        <dl className="fact-list">
          <div><dt>Tourner</dt><dd>Glisser avec l’outil de sélection</dd></div>
          <div><dt>Déplacer</dt><dd>Glisser avec la main ou le clic droit</dd></div>
          <div><dt>Agrandir ou réduire</dt><dd>Molette, pincement ou boutons + et −</dd></div>
          <div><dt>Inspecter</dt><dd>Cliquer sur un objet ou son repère</dd></div>
          <div><dt>Revenir à la vue d’ensemble</dt><dd>Cliquer à nouveau sur l’objet sélectionné ou son repère</dd></div>
        </dl>
        <div className="info-note"><CircleHelp size={17}/><p>Les fiches des salles restent accessibles si le navigateur ne peut pas afficher la 3D.</p></div>
        <button className="primary-button">Fermer<ArrowRight size={15}/></button>
      </form>
    </dialog>
  </>
}

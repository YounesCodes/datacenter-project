import { lazy,Suspense,useEffect,useMemo,useRef,useState } from 'react'
import { ArrowRight, BarChart3, ChevronDown, CircleHelp, Compass, Map, MapPin, X } from 'lucide-react'
import { capacity,defaults,energy,solarProfile,type Inputs } from './engineering'
import { BoardTools,Stage,type BoardMenu,type Tool } from './Explorer'
import Inspector,{ nameFor,SimulationPanel } from './Inspector'
import { equipment,normalRoutes,phases,rackPositions,rooms,type Floor,type Layer,type Phase } from './model'
import type { Angle,CameraAction,Scale } from './viewState'
import { simulations } from './simulations'

const CostsPanel=lazy(()=>import('./Dashboards').then(module=>({default:module.CostsPanel})))
const EnergyPanel=lazy(()=>import('./Dashboards').then(module=>({default:module.EnergyPanel})))
const ExpansionPanel=lazy(()=>import('./Dashboards').then(module=>({default:module.ExpansionPanel})))
const dataPages={energy:'Énergie',costs:'Coûts',expansion:'Extension'} as const
const layerAnchor:Record<Layer,string>={power:'switchgear',air:'crac',network:'fiber',compute:'hall-a',storage:'hall-b',solar:'solar'}
type Sheet=keyof typeof dataPages
type Playback={id:string;step:number;playing:boolean;remainingMs:number}

export default function App(){
  const [sheet,setSheet]=useState<Sheet|null>(null)
  const [menu,setMenu]=useState<BoardMenu>(null)
  const [phase,setPhase]=useState<Phase>(1)
  const [inputs,setInputs]=useState(()=>defaults(1))
  const [scale,setScale]=useState<Scale>('site')
  const [floor,setFloor]=useState<Floor>('ground')
  const [angle,setAngle]=useState<Angle>('iso')
  const [tool,setTool]=useState<Tool>('select')
  const [target,setTarget]=useState<string|null>(null)
  const [layer,setLayer]=useState<Layer|null>(null)
  const [command,setCommand]=useState<CameraAction>({kind:'reset',token:0})
  const [labels,setLabels]=useState(true)
  const [isolated,setIsolated]=useState(false)
  const [walk,setWalk]=useState(false)
  const [economy,setEconomy]=useState(()=>matchMedia('(max-width: 650px)').matches||(navigator.hardwareConcurrency??8)<4)
  const [hour,setHour]=useState(12)
  const [playback,setPlayback]=useState<Playback|null>(null)
  const [fullscreenError,setFullscreenError]=useState(false)
  const help=useRef<HTMLDialogElement>(null)
  const deadline=useRef(0)
  const currentSim=simulations.find(item=>item.id===playback?.id)
  const frame=playback&&currentSim?currentSim.frames[playback.step]:undefined
  const cap=useMemo(()=>capacity(phase,inputs),[phase,inputs.racks,inputs.servers])
  const input=(patch:Partial<Inputs>)=>setInputs(previous=>({...previous,...patch}))
  const camera=(kind:CameraAction['kind'],value?:string)=>setCommand(previous=>({kind,value,token:previous.token+1}))
  function choosePhase(next:Phase){
    if(next===phase) return
    setPhase(next)
    input({racks:phases[next].racks,servers:phases[next].servers})
  }
  function pausedPlayback(){
    if(!playback?.playing) return playback
    const remaining=deadline.current?deadline.current-performance.now():playback.remainingMs
    return {...playback,playing:false,remainingMs:Math.max(1,Math.min(playback.remainingMs,remaining))}
  }
  function openData(destination:Sheet){
    setWalk(false)
    setMenu(null)
    setSheet(destination);setPlayback(pausedPlayback())
  }
  function reset(level:Floor=floor){
    setAngle('iso');setTarget(null);setIsolated(false);setFloor(level);camera('reset')
  }
  function goScale(next:Scale){
    setScale(next);setWalk(false);setSheet(null);setMenu(null)
    if(next==='city') setPlayback(pausedPlayback())
  }
  function chooseFloor(next:Floor){
    setPlayback(null);setWalk(false);setScale('site')
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
    setPlayback(null)
    if(id===target){
      if(layer==='solar') setLayer(null)
      reset('ground')
      return
    }
    select(id)
  }
  function chooseLayer(next:Layer|null){
    setPlayback(null);setSheet(null);setWalk(false);setScale('site');setLayer(next)
    if(!next) return
    const level=next==='solar'?'roof':'ground'
    if(level!==floor||target) reset(level)
  }
  function focusFrame(id:string,index:number,playing:boolean,reframe=false){
    const sim=simulations.find(item=>item.id===id)
    const event=sim?.frames[index]
    if(!sim||!event) return
    deadline.current=0
    setScale('site');setSheet(null);setWalk(false);setLayer(sim.view)
    setPlayback({id,step:index,playing,remainingMs:event.seconds*1000})
    if(reframe) reset(id==='solar'?'roof':'ground')
    if(id==='expansion') choosePhase(event.phase??1)
  }
  function startSimulation(id:string){
    focusFrame(id,0,true,true)
  }
  function toggleSimulation(){
    if(!playback) return
    if(playback.remainingMs===0) focusFrame(playback.id,0,true,true)
    else if(playback.playing) setPlayback(pausedPlayback())
    else setPlayback({...playback,playing:true})
  }
  function leaveSimulation(){
    setPlayback(null);setLayer(null)
  }
  useEffect(()=>{
    if(!playback?.playing||!frame||!currentSim) return
    deadline.current=performance.now()+playback.remainingMs
    const timer=window.setTimeout(()=>{
      if(playback.step===currentSim.frames.length-1) setPlayback({...playback,playing:false,remainingMs:0})
      else focusFrame(playback.id,playback.step+1,true)
    },playback.remainingMs)
    return ()=>clearTimeout(timer)
  },[playback])
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
  const dashboardProps={phase,inputs,cap,onInput:input,onReset:()=>setInputs(defaults(phase))}
  const showTimeline=scale==='site'&&Boolean(playback&&frame)&&!sheet
  const eventAnchor=frame&&currentSim?(frame.focus||(currentSim.id==='expansion'?'reserve':layerAnchor[currentSim.view])):null
  const sceneHour=frame?.hour??hour
  const frameRoutes=frame?.routes??null
  const activeRoutes=useMemo(()=>{
    if(layer!=='solar') return frameRoutes
    const facility=energy(phase,inputs,cap).facility
    const power=solarProfile(sceneHour,inputs.solar,facility)
    return (frameRoutes??normalRoutes.solar).filter(route=>
      route==='panels'?power.selfUse>0:route==='grid'?power.grid>0:facility>0,
    )
  },[layer,frameRoutes,sceneHour,phase,inputs,cap])
  const header=<>
    <header className="board-heading">
      <div className="board-title"><div className="location"><MapPin size={13}/> BENGUERIR · MAROC</div><h1>Projet de centre de données</h1></div>
      <nav className="board-actions" aria-label="Navigation principale">
        <button className="soft-button" aria-pressed={scale==='city'} onClick={()=>goScale(scale==='city'?'site':'city')} title={scale==='city'?'Fermer la carte':'Carte de Benguerir'}><Map size={16}/><span>{scale==='city'?'Fermer la carte':'Carte de Benguerir'}</span></button>
        <details className="board-data-menu" data-board-menu open={menu==='data'}>
          <summary className="soft-button" title="Données" onClick={event=>{event.preventDefault();setMenu(menu==='data'?null:'data')}}><BarChart3 size={16}/><span>Données</span><ChevronDown size={12}/></summary>
          <div className="board-menu">{(Object.keys(dataPages) as Sheet[]).map(key=><button key={key} onClick={()=>openData(key)}>{dataPages[key]}</button>)}</div>
        </details>
      </nav>
    </header>
    {scale==='site'&&!sheet&&<BoardTools tool={tool} floor={floor} phase={phase} layer={layer} simulation={playback?.id??null} menu={menu} onMenu={setMenu} onTool={setTool} onFloor={chooseFloor}
      onPhase={next=>{setPlayback(null);choosePhase(next)}} onLayer={chooseLayer} onSimulation={startSimulation}/>}
  </>
  const info=showTimeline&&frame&&eventAnchor?
    <aside className="scene-event" data-anchor={eventAnchor} aria-label="Événement sur la maquette">
      <div className="event-narration" aria-live="polite" aria-atomic="true">
        <span className="event-location">{nameFor(eventAnchor)}</span>
        <h3>{frame.title}</h3><p>{frame.description}</p>
      </div>
    </aside>:scale==='site'&&!sheet&&(target||layer)?
      <Inspector target={target} phase={phase} cap={cap} inputs={inputs} layer={layer}
        isolated={isolated} onIsolate={()=>setIsolated(!isolated)} onClear={()=>chooseLayer(null)}/>:null
  const dataSheet=sheet&&<section className="board-sheet" aria-label={dataPages[sheet]}>
    <div className="sheet-header"><button className="icon-button sheet-close" onClick={()=>setSheet(null)} aria-label="Fermer les données"><X size={19}/></button></div>
    <Suspense fallback={<p className="dashboard-loading" role="status">Ouverture du tableau…</p>}>
      {sheet==='energy'&&<EnergyPanel phase={phase} inputs={inputs} cap={cap} onInput={input} hour={hour} onHour={setHour} onScene={()=>chooseLayer('solar')}/>}
      {sheet==='costs'&&<CostsPanel {...dashboardProps}/>}
      {sheet==='expansion'&&<ExpansionPanel {...dashboardProps}/>}
    </Suspense>
  </section>
  return <>
    <a href="#main-content" className="skip-link">Aller au contenu</a>
    <main className="board-app" id="main-content" aria-label="Visite de la maquette">
      <Stage cap={cap} inputs={inputs} phase={phase} scale={scale} floor={floor} target={target} layer={layer} angle={angle} action={command}
        header={header} info={info} sheet={dataSheet} menu={menu} onMenu={setMenu}
        playing={scale==='site'&&!sheet&&Boolean(layer&&(!playback||playback.playing))} routes={activeRoutes} hour={sceneHour}
        anchor={showTimeline?eventAnchor:null}
        labels={labels} isolated={isolated} walk={walk} economy={economy} tool={tool}
        onSelect={chooseTarget} onAngle={next=>{setAngle(next);camera('angle',next)}}
        onZoom={direction=>{camera('zoom',direction)}} onReset={()=>{reset()}}
        onLabels={()=>setLabels(!labels)} onWalk={()=>{setPlayback(null);setLayer(null);reset('ground');setWalk(true)}} onWalkExit={()=>setWalk(false)}
        onQuality={()=>setEconomy(!economy)} onFullscreen={fullscreen} onHelp={()=>help.current?.showModal()}>
        {showTimeline&&frame&&playback&&<SimulationPanel id={playback.id} step={playback.step} playing={playback.playing} finished={playback.remainingMs===0} frame={frame} phase={phase} cap={cap} inputs={inputs}
          onToggle={toggleSimulation} onStep={index=>focusFrame(playback.id,index,false)}
          onRestart={()=>focusFrame(playback.id,0,true,true)} onExit={leaveSimulation}/>}
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
        <div className="info-note"><CircleHelp size={17}/><p>Les données du projet restent accessibles si le navigateur ne peut pas afficher la 3D.</p></div>
        <button className="primary-button">Fermer<ArrowRight size={15}/></button>
      </form>
    </dialog>
  </>
}

import { lazy,Suspense,useEffect,useLayoutEffect,useRef,useState,type CSSProperties,type ReactNode } from 'react'
import { ArrowUpRight, Box, Check, ChevronDown, Hand, Layers3, LocateFixed, Map, MapPin, Maximize, Minus, MousePointer2, Play, Plus, Settings, Video, X, Zap } from 'lucide-react'
import { layers } from './content'
import { phases,property,type Floor,type Layer,type Phase,type WalkZone } from './model'
import type { SceneState } from './sceneRuntime'
import type { CameraAction, Scale } from './viewState'
import { simulations } from './simulations'
import { layerIcons,nameFor } from './Inspector'

const Scene=lazy(()=>import('./Scene'))
const MapView=lazy(()=>import('./MapView'))
export type Tool='select'|'pan'
export type BoardMenu='camera'|'floors'|'layers'|'simulations'|'phases'|null
type MenuProps={menu:BoardMenu;onMenu:(menu:BoardMenu)=>void}

type ToolProps=MenuProps&{
  tool:Tool;floor:Floor;phase:Phase;layer:Layer|null;simulation:string|null;
  onTool:(tool:Tool)=>void;onFloor:(floor:Floor)=>void;onPhase:(phase:Phase)=>void;onLayer:(layer:Layer|null)=>void;onSimulation:(id:string)=>void;
}
export function BoardTools({tool,floor,phase,layer,simulation,menu,onMenu,onTool,onFloor,onPhase,onLayer,onSimulation}:ToolProps){
  function open(next:BoardMenu){onMenu(menu===next?null:next)}
  const tools=useRef<HTMLDivElement>(null)
  // Each menu opens under the button that controls it and stays inside the window.
  useLayoutEffect(()=>{
    const host=tools.current
    if(!host||!menu) return
    function place(){
      const popup=host!.querySelector<HTMLElement>(':scope > .board-menu')
      const trigger=popup&&host!.querySelector<HTMLElement>('[aria-controls="'+popup.id+'"]')
      if(!popup||!trigger) return
      const margin=12,gap=8,button=trigger.getBoundingClientRect(),center=button.left+button.width/2
      // Side panels and the narration card keep their place: the menu uses the free column between them.
      let low=margin,high=innerWidth-margin
      for(const panel of document.querySelectorAll<HTMLElement>('.board-main > .inspector, .board-main > .scene-event')){
        const box=panel.getBoundingClientRect()
        if(!box.width) continue
        if(box.left+box.width/2<innerWidth/2) low=Math.max(low,box.right+gap)
        else high=Math.min(high,box.left-gap)
      }
      if(high-low<240){low=margin;high=innerWidth-margin}
      popup.style.width='';popup.dataset.compact='false'
      const natural=popup.offsetWidth
      popup.dataset.compact=String(natural>high-low)
      const width=Math.min(popup.offsetWidth,high-low)
      popup.style.width=width<popup.offsetWidth?width+'px':''
      const left=Math.min(Math.max(center-width/2,low),high-width)
      popup.style.left=(left-host!.getBoundingClientRect().left).toFixed(1)+'px'
    }
    place()
    const observer=new ResizeObserver(place)
    observer.observe(host)
    addEventListener('resize',place)
    return ()=>{observer.disconnect();removeEventListener('resize',place)}
  },[menu,layer,simulation,phase])
  return <div className="board-tools" ref={tools} data-board-menu>
    <div className="board-toolbar" aria-label="Outils de la maquette">
    <div className="board-tool-group">
      <button className="tool-button icon-tool" title="Sélectionner et tourner" aria-label="Sélectionner et tourner" aria-pressed={tool==='select'} onClick={()=>{onTool('select');onMenu(null)}}><MousePointer2 size={18}/></button>
      <button className="tool-button icon-tool" title="Déplacer la vue" aria-label="Déplacer la vue" aria-pressed={tool==='pan'} onClick={()=>{onTool('pan');onMenu(null)}}><Hand size={18}/></button>
    </div>
    <div className="board-tool-group">
      <button className="tool-button" title="Étages" aria-label="Étages" aria-controls="board-floors" aria-expanded={menu==='floors'} onClick={()=>open('floors')}><Layers3 size={17}/><span>Étages</span><ChevronDown className="tool-chevron" size={12}/></button>
      <button className="tool-button" title="Parcours" aria-label="Parcours" aria-controls="board-layers" aria-expanded={menu==='layers'} data-active={Boolean(layer&&!simulation)} onClick={()=>open('layers')}
        style={layer&&!simulation?{'--tone':layers[layer].color} as CSSProperties:undefined}>
        <Zap size={17}/><span>Parcours</span>{layer&&!simulation&&<span className="tool-current" key={layer}>{layers[layer].short}</span>}<ChevronDown className="tool-chevron" size={12}/>
      </button>
      <button className="tool-button" title="Simulations" aria-label="Simulations" aria-controls="board-simulations" aria-expanded={menu==='simulations'} data-active={Boolean(simulation)} onClick={()=>open('simulations')}><Play size={17}/><span>Simulations</span><ChevronDown className="tool-chevron" size={12}/></button>
    </div>
    <button className="tool-button phase-tool" aria-controls="board-phases" aria-expanded={menu==='phases'} onClick={()=>open('phases')}>Phase {phase}<ChevronDown size={12}/></button>
    </div>
    {menu==='floors'&&<div className="board-menu" id="board-floors" aria-label="Étages et toiture">
      {([['ground','Rez-de-chaussée'],['upper','Étage 1'],['roof','Toiture']] as const).map(([value,label])=><button key={value} aria-pressed={floor===value} onClick={()=>{onFloor(value);onMenu(null)}}>{label}</button>)}
    </div>}
    {menu==='layers'&&<div className="board-menu flow-menu" id="board-layers" aria-label="Parcours techniques">
      <p className="menu-caption">Suivre un parcours technique</p>
      <div className="flow-grid">{(Object.keys(layers) as Layer[]).map((key,index)=>{
        const Icon=layerIcons[key],item=layers[key],active=layer===key&&!simulation
        return <button key={key} aria-label={item.name} aria-pressed={active} style={{'--tone':item.color,'--i':index} as CSSProperties}
          title={active?'Cliquer à nouveau pour masquer le parcours':undefined} onClick={()=>{onLayer(active?null:key);onMenu(null)}}>
          <span className="flow-chip"><Icon size={16}/></span>
          <span className="flow-copy"><strong>{item.name}</strong><small>{item.steps[0]} → {item.steps[item.steps.length-1]}</small></span>
          {active&&<Check size={15} className="flow-check" aria-hidden="true"/>}
        </button>
      })}</div>
    </div>}
    {menu==='simulations'&&<div className="board-menu flow-menu simulation-menu" id="board-simulations" aria-label="Scénarios de simulation">
      <p className="menu-caption">Simuler une panne</p>
      {simulations.map((item,index)=>{
        const Icon=layerIcons[item.view],active=simulation===item.id
        return <button key={item.id} aria-label={item.name} aria-pressed={active} style={{'--tone':layers[item.view].color,'--i':index} as CSSProperties}
          onClick={()=>{onSimulation(item.id);onMenu(null)}}>
          <span className="flow-chip"><Icon size={16}/></span>
          <span className="flow-copy"><strong>{item.name}</strong><small>{item.summary}</small></span>
          <span className="flow-steps">{item.frames.length} étapes<Play size={11}/></span>
        </button>
      })}
    </div>}
    {menu==='phases'&&<div className="board-menu" id="board-phases" aria-label="Phase de déploiement">
      {([1,2,3] as const).map(value=><button key={value} aria-pressed={phase===value} onClick={()=>{onPhase(value);onMenu(null)}}><span>Phase {value}</span><small>{phases[value].name}</small></button>)}
    </div>}
  </div>
}

type StageProps=SceneState&MenuProps&{
  scale:Scale;action:CameraAction;header:ReactNode;info:ReactNode;sheet:ReactNode;children:ReactNode;
  onSelect:(id:string)=>void;onZoom:(direction:'in'|'out')=>void;
  onReset:()=>void;onLabels:()=>void;onWalk:()=>void;onWalkExit:()=>void;onQuality:()=>void;onFullscreen:()=>void;onHelp:()=>void;
}
export function Stage(props:StageProps){
  const {scale,phase,floor,target,walk,labels,economy,hour}=props
  const [mapOpened,setMapOpened]=useState(false)
  const [walkZone,setWalkZone]=useState<WalkZone|null>(null)
  const ground=scale==='site'
  const settings=props.menu==='camera'
  useEffect(()=>{if(!ground) setMapOpened(true)},[ground])
  return <div className="stage board-stage" data-testid="stage" data-floor={floor} data-phase={phase} data-scale={scale} data-tool={props.tool} data-theme={hour<6||hour>=18?'night':'day'}>
    <div className="view-paper" inert={Boolean(props.sheet)}>
      <div className="model-surface" data-inactive={!ground} aria-hidden={!ground}>
        <Suspense fallback={<div className="scene-loading"><Box size={26}/><span>Ouverture de la maquette…</span></div>}>
          <Scene {...props} active={ground} targetLabel={target?nameFor(target):''} onWalkZone={setWalkZone}/>
        </Suspense>
      </div>
    </div>
    <div className="board-hud">
      <div className="board-top">{props.header}</div>
      <div className="board-main">
        {(mapOpened||!ground)&&<div className="map-surface" data-inactive={ground} aria-hidden={ground}>
          <Suspense fallback={<div className="scene-loading"><Map size={26}/><span>Ouverture de la carte…</span></div>}>
            <MapView active={!ground}/>
          </Suspense>
        </div>}
        {props.sheet||props.info}
      </div>
      <div className="board-bottom">
        {props.children}
        {walk&&<div className="walk-hint">
          <div className="walk-location" role="status" aria-label="Position dans la maquette" aria-atomic="true">
            <span className="walk-location-icon"><MapPin size={19} aria-hidden="true"/></span>
            {walkZone&&<div className="walk-location-copy" key={walkZone.id} data-walk-zone={walkZone.id}>
              <span>{walkZone.level}</span><strong>{walkZone.name}</strong>
            </div>}
          </div>
          <p className="walk-keys">ZQSD ou flèches pour marcher. <span>Souris pour regarder · E pour ouvrir · Échap pour sortir.</span></p>
        </div>}
        {ground&&!walk&&property.parcelAnchor&&<div className="geo-pin"><MapPin size={13}/><span>{property.parcelAnchor[0].toFixed(5)}°, {property.parcelAnchor[1].toFixed(5)}°</span></div>}
      </div>
      {ground&&!props.sheet&&<div className="camera-dock">
        {settings&&!walk&&<div className="camera-options" id="board-camera-options" data-board-menu>
          <span className="eyebrow">PARAMÈTRES</span>
          <button aria-pressed={labels} onClick={props.onLabels}>Repères <span>{labels?'Activés':'Masqués'}</span></button>
          <button aria-pressed={economy} onClick={props.onQuality}>Qualité <span>{economy?'Économie':'Détaillée'}</span></button>
          <button onClick={()=>{props.onMenu(null);props.onHelp()}}>Aide aux commandes<ArrowUpRight size={13}/></button>
        </div>}
        <div className="stage-toolbar" aria-label="Commandes de la caméra">
        {!walk&&<>
          <button className="icon-button" aria-label="Agrandir la maquette" title="Agrandir" onClick={()=>props.onZoom('in')}><Plus size={19}/></button>
          <button className="icon-button" aria-label="Réduire la maquette" title="Réduire" onClick={()=>props.onZoom('out')}><Minus size={19}/></button>
          <span/>
          <button className="icon-button" aria-label="Recentrer la caméra" title="Recentrer" onClick={props.onReset}><LocateFixed size={18}/></button>
          <button className={'icon-button'+(settings?' active':'')} aria-expanded={settings} aria-controls="board-camera-options" data-board-menu aria-label="Paramètres de la maquette" title="Paramètres" onClick={()=>props.onMenu(settings?null:'camera')}><Settings size={17} aria-hidden="true"/></button>
          <button className="icon-button" aria-label="Passer en visite à pied" title="Visite à pied" onClick={props.onWalk}><Video size={17}/></button>
          <button className="icon-button" aria-label="Plein écran" title="Plein écran" onClick={props.onFullscreen}><Maximize size={16}/></button>
        </>}
        {walk&&<button className="icon-button active" aria-label="Quitter la visite à pied" title="Quitter la visite à pied" onClick={props.onWalkExit}><X size={18}/></button>}
        </div>
      </div>}
    </div>
  </div>
}

import { lazy,Suspense,useEffect,useState,type ReactNode } from 'react'
import { ArrowUpRight, Box, ChevronDown, Cpu, Database, Hand, Layers3, LocateFixed, Map, MapPin, Maximize, Minus, MousePointer2, Network, Play, Plus, ScanLine, Sun, Video, Wind, X, Zap } from 'lucide-react'
import { layers } from './content'
import { phases,property,type Floor,type Layer,type Phase } from './model'
import type { SceneState } from './sceneRuntime'
import type { Angle, CameraAction, Scale } from './viewState'
import { simulations } from './simulations'
import { nameFor } from './Inspector'

const Scene=lazy(()=>import('./Scene'))
const MapView=lazy(()=>import('./MapView'))
const layerIcons={power:Zap,air:Wind,network:Network,compute:Cpu,storage:Database,solar:Sun}
const orientations:Record<Angle,string>={iso:'Isométrique',top:'Vue de dessus',front:'Vue de face',rear:'Vue arrière',left:'Côté gauche',right:'Côté droit'}
export type Tool='select'|'pan'
export type BoardMenu='data'|'camera'|'floors'|'layers'|'simulations'|'phases'|null
type MenuProps={menu:BoardMenu;onMenu:(menu:BoardMenu)=>void}

type ToolProps=MenuProps&{
  tool:Tool;floor:Floor;phase:Phase;layer:Layer|null;simulation:string|null;
  onTool:(tool:Tool)=>void;onFloor:(floor:Floor)=>void;onPhase:(phase:Phase)=>void;onLayer:(layer:Layer|null)=>void;onSimulation:(id:string)=>void;
}
export function BoardTools({tool,floor,phase,layer,simulation,menu,onMenu,onTool,onFloor,onPhase,onLayer,onSimulation}:ToolProps){
  function open(next:BoardMenu){onMenu(menu===next?null:next)}
  return <div className="board-tools" data-board-menu>
    <div className="board-toolbar" aria-label="Outils de la maquette">
    <div className="board-tool-group">
      <button className="tool-button icon-tool" title="Sélectionner et tourner" aria-label="Sélectionner et tourner" aria-pressed={tool==='select'} onClick={()=>{onTool('select');onMenu(null)}}><MousePointer2 size={18}/></button>
      <button className="tool-button icon-tool" title="Déplacer la vue" aria-label="Déplacer la vue" aria-pressed={tool==='pan'} onClick={()=>{onTool('pan');onMenu(null)}}><Hand size={18}/></button>
    </div>
    <div className="board-tool-group">
      <button className="tool-button" title="Étages" aria-label="Étages" aria-controls="board-floors" aria-expanded={menu==='floors'} onClick={()=>open('floors')}><Layers3 size={17}/><span>Étages</span><ChevronDown className="tool-chevron" size={12}/></button>
      <button className="tool-button" title="Parcours" aria-label="Parcours" aria-controls="board-layers" aria-expanded={menu==='layers'} data-active={Boolean(layer&&!simulation)} onClick={()=>open('layers')}><Zap size={17}/><span>Parcours</span><ChevronDown className="tool-chevron" size={12}/></button>
      <button className="tool-button" title="Simulations" aria-label="Simulations" aria-controls="board-simulations" aria-expanded={menu==='simulations'} data-active={Boolean(simulation)} onClick={()=>open('simulations')}><Play size={17}/><span>Simulations</span><ChevronDown className="tool-chevron" size={12}/></button>
    </div>
    <button className="tool-button phase-tool" aria-controls="board-phases" aria-expanded={menu==='phases'} onClick={()=>open('phases')}>Phase {phase}<ChevronDown size={12}/></button>
    </div>
    {menu==='floors'&&<div className="board-menu" id="board-floors" aria-label="Étages et toiture">
      {([['ground','Rez-de-chaussée'],['upper','Étage 1'],['roof','Toiture']] as const).map(([value,label])=><button key={value} aria-pressed={floor===value} onClick={()=>{onFloor(value);onMenu(null)}}>{label}</button>)}
    </div>}
    {menu==='layers'&&<div className="board-menu" id="board-layers" aria-label="Parcours techniques">
      <button aria-pressed={!layer} onClick={()=>{onLayer(null);onMenu(null)}}>Aucun parcours</button>
      {(Object.keys(layers) as Layer[]).map(key=>{
        const Icon=layerIcons[key]
        return <button key={key} aria-pressed={layer===key&&!simulation} onClick={()=>{onLayer(key);onMenu(null)}}><Icon size={16} style={{color:layers[key].color}}/>{layers[key].name}</button>
      })}
    </div>}
    {menu==='simulations'&&<div className="board-menu simulation-menu" id="board-simulations" aria-label="Scénarios de simulation">
      {simulations.map(item=>{
        const Icon=layerIcons[item.view]
        return <button key={item.id} onClick={()=>{onSimulation(item.id);onMenu(null)}}><Icon size={16}/><span>{item.name}</span><Play size={13} className="menu-play"/></button>
      })}
    </div>}
    {menu==='phases'&&<div className="board-menu" id="board-phases" aria-label="Phase de déploiement">
      {([1,2,3] as const).map(value=><button key={value} aria-pressed={phase===value} onClick={()=>{onPhase(value);onMenu(null)}}><span>Phase {value}</span><small>{phases[value].name}</small></button>)}
    </div>}
  </div>
}

type StageProps=SceneState&MenuProps&{
  scale:Scale;angle:Angle;action:CameraAction;header:ReactNode;info:ReactNode;sheet:ReactNode;children:ReactNode;
  onSelect:(id:string)=>void;onAngle:(angle:Angle)=>void;onZoom:(direction:'in'|'out')=>void;
  onReset:()=>void;onLabels:()=>void;onWalk:()=>void;onWalkExit:()=>void;onQuality:()=>void;onFullscreen:()=>void;onHelp:()=>void;
}
export function Stage(props:StageProps){
  const {scale,phase,floor,target,angle,walk,labels,economy,hour}=props
  const [mapOpened,setMapOpened]=useState(false)
  const ground=scale==='site'
  const settings=props.menu==='camera'
  useEffect(()=>{if(!ground) setMapOpened(true)},[ground])
  return <div className="stage board-stage" data-testid="stage" data-floor={floor} data-phase={phase} data-angle={angle} data-scale={scale} data-tool={props.tool} data-theme={hour<6||hour>=18?'night':'day'}>
    <div className="view-paper" inert={Boolean(props.sheet)}>
      <div className="model-surface" data-inactive={!ground} aria-hidden={!ground}>
        <Suspense fallback={<div className="scene-loading"><Box size={26}/><span>Ouverture de la maquette…</span></div>}>
          <Scene {...props} active={ground} targetLabel={target?nameFor(target):''}/>
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
        {ground&&settings&&!walk&&!props.sheet&&<div className="camera-options" id="board-camera-options" data-board-menu>
          <span className="eyebrow">CAMÉRA</span>
          {Object.entries(orientations).map(([id,label])=><button key={id} aria-pressed={angle===id} onClick={()=>{props.onAngle(id as Angle);props.onMenu(null)}}>{label}</button>)}
          <hr/><button aria-pressed={labels} onClick={props.onLabels}>Repères <span>{labels?'Activés':'Masqués'}</span></button>
          <button aria-pressed={economy} onClick={props.onQuality}>Qualité <span>{economy?'Économie':'Détaillée'}</span></button>
          <button onClick={()=>{props.onMenu(null);props.onHelp()}}>Aide aux commandes<ArrowUpRight size={13}/></button>
        </div>}
      </div>
      <div className="board-bottom">
        {props.children}
        {walk&&<div className="walk-hint">ZQSD ou flèches pour marcher. Échap pour sortir.</div>}
        {ground&&!walk&&property.parcelAnchor&&<div className="geo-pin"><MapPin size={13}/><span>{property.parcelAnchor[0].toFixed(5)}°, {property.parcelAnchor[1].toFixed(5)}°</span></div>}
      </div>
      {ground&&!props.sheet&&
      <div className="stage-toolbar" aria-label="Commandes de la caméra">
        {!walk&&<>
          <button className="icon-button" aria-label="Agrandir la maquette" title="Agrandir" onClick={()=>props.onZoom('in')}><Plus size={19}/></button>
          <button className="icon-button" aria-label="Réduire la maquette" title="Réduire" onClick={()=>props.onZoom('out')}><Minus size={19}/></button>
          <span/>
          <button className="icon-button" aria-label="Recentrer la caméra" title="Recentrer" onClick={props.onReset}><LocateFixed size={18}/></button>
          <button className={'icon-button'+(settings?' active':'')} aria-expanded={settings} aria-controls="board-camera-options" data-board-menu aria-label="Vues et options de la maquette" title="Vues et options" onClick={()=>props.onMenu(settings?null:'camera')}><ScanLine size={17}/></button>
          <button className="icon-button" aria-label="Passer en visite à pied" title="Visite à pied" onClick={props.onWalk}><Video size={17}/></button>
          <button className="icon-button" aria-label="Plein écran" title="Plein écran" onClick={props.onFullscreen}><Maximize size={16}/></button>
        </>}
        {walk&&<button className="icon-button active" aria-label="Quitter la visite à pied" title="Quitter la visite à pied" onClick={props.onWalkExit}><X size={18}/></button>}
      </div>}
    </div>
  </div>
}

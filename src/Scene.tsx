import { useEffect,useRef,useState } from 'react'
import { Building2, ChevronRight, RefreshCw, TriangleAlert } from 'lucide-react'
import { createScene,type SceneState } from './sceneRuntime'
import { rooms,type WalkZone } from './model'
import type { CameraAction } from './viewState'

const siteMarkers=[['hall-a','Salle A'],['hall-b','Salle B'],['power','Électricité'],['cooling','Refroidissement'],['network','Réseau'],['reception','Accueil'],['delivery','Livraison'],['reserve','Réserve'],['generator','Groupes']] as const
type Props=SceneState&{action:CameraAction;onSelect:(id:string)=>void;onWalkExit:()=>void;onWalkZone:(zone:WalkZone|null)=>void;targetLabel:string}
export default function Scene(props:Props){
  const host=useRef<HTMLDivElement>(null),labelHost=useRef<HTMLDivElement>(null),eventHost=useRef<HTMLDivElement>(null)
  const handler=useRef(props)
  handler.current=props
  const scene=useRef<ReturnType<typeof createScene>|null>(null)
  const [error,setError]=useState(false)
  const [attempt,retry]=useState(0)
  useEffect(()=>{
    if(!host.current||!labelHost.current||!eventHost.current) return
    const node=host.current
    const fail=()=>setError(true)
    node.addEventListener('sceneerror',fail)
    try{
      scene.current=createScene(node,labelHost.current,eventHost.current,id=>handler.current.onSelect(id),
        ()=>handler.current.onWalkExit(),zone=>handler.current.onWalkZone(zone))
      scene.current.apply(handler.current)
      scene.current.action(handler.current.action)
    }catch{fail()}
    return ()=>{
      node.removeEventListener('sceneerror',fail)
      scene.current?.dispose();scene.current=null
    }
  },[attempt])
  useEffect(()=>scene.current?.apply(props),[props])
  useEffect(()=>scene.current?.action(props.action),[props.action])
  useEffect(()=>{if(error) {scene.current?.dispose();scene.current=null}},[error])
  const list=props.floor==='upper'?rooms.filter(room=>room.floor==='upper').map(room=>[room.id,room.short] as const):
    props.floor==='roof'?[['solar','Toiture solaire'],['reserve','Réserve']] as const:siteMarkers
  const installed=props.cap.racks.filter(rack=>rack.hall===props.target).map(rack=>[rack.id,rack.label] as const)
  const markers=props.target?[[props.target,props.targetLabel] as const,...installed]:list
  return <>
    <div className="canvas-host" ref={host} data-testid="canvas-host" aria-hidden={error}/>
    <div className="scene-labels" ref={labelHost} aria-label="Repères de la maquette">
      {!error&&markers.map(([id,name])=><button hidden className={'scene-marker'+(props.target===id?' selected':'')} key={id} data-marker={id}
        aria-pressed={props.target===id} title={props.target===id?'Cliquer à nouveau pour revenir à la vue d’ensemble':undefined} onClick={()=>props.onSelect(id)}>
        <span/>{name}
      </button>)}
    </div>
    <span className="event-pin" ref={eventHost} hidden={error||!props.anchor} aria-hidden="true"/>
    {error&&<div className="scene-fallback" role="status">
      <TriangleAlert size={28}/><h3>La vue 3D est indisponible</h3>
      <p>Ouvrez une salle pour consulter ses équipements et ses caractéristiques.</p>
      <div className="fallback-rooms">{rooms.filter(room=>room.floor=== (props.floor==='upper'?'upper':'ground')).map(room=><button key={room.id} onClick={()=>props.onSelect(room.id)}><Building2 size={14}/>{room.short}<ChevronRight size={13}/></button>)}</div>
      <button className="soft-button" onClick={()=>{setError(false);retry(attempt+1)}}><RefreshCw size={15}/>Réessayer la 3D</button>
    </div>}
  </>
}

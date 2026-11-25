import type { CSSProperties } from 'react'
import { Check, ChevronLeft, ChevronRight, Cpu, Database, Focus, Network, Play, Sun, Wind, X, Zap } from 'lucide-react'
import { equipmentFacts,layers } from './content'
import { costs,energy,type Capacity,type Inputs } from './engineering'
import { area,equipment,property,rackPositions,rooms,specs,type Layer,type Phase } from './model'
import { compactMAD,mad,number } from './format'
import { simulations,type Frame } from './simulations'
import { lineDashes,routeLegend,type LineStyle } from './flowPresentation'

export function nameFor(id:string|null){
  if(!id) return ''
  return rooms.find(item=>item.id===id)?.name??equipment.find(item=>item.id===id)?.name??rackPositions.find(item=>item.id===id)?.label??'Réserve d’extension'
}
type ItemInfo={title:string;tag:string;description:string;details?:string;facts:{label:string;value:string}[]}
function info(id:string,cap:Capacity,phase:Phase,inputs:Inputs):ItemInfo {
  const facts=[...(equipmentFacts[id.replace(/-b$/,'')]??[])]
  const room=rooms.find(item=>item.id===id),asset=equipment.find(item=>item.id===id),rack=rackPositions.find(item=>item.id===id)
  const cost=room?.cost??asset?.cost??(rack?'rack':undefined)
  if(cost&&(asset||rack)){
    const row=costs(phase,inputs,cap).rows.find(row=>row.id===cost)
    if(row) facts.push({label:'Estimation centrale par '+row.unit,value:mad(row.unitCost[1])})
  }
  if(room){
    facts.unshift({label:'Surface de la zone',value:number(area(room.rect),1)+' m²'})
    if(room.id.startsWith('hall')){
      const hallRacks=cap.racks.filter(rack=>rack.hall===room.id)
      facts.push({label:'Baies installées',value:hallRacks.length+' / '+rackPositions.filter(rack=>rack.hall===room.id).length},{label:'Puissance informatique prévue',value:hallRacks.length*specs.rack.kW+' kW'})
    }
    return {title:room.name,tag:room.floor==='ground'?'REZ-DE-CHAUSSÉE':'PREMIER ÉTAGE',description:room.description,details:room.details,facts}
  }
  if(asset){
    if(id==='generator') facts.push({label:'Groupes dans la phase',value:String(cap.generators)})
    if(id==='ups') facts.push({label:'Modules dans la phase',value:String(cap.upsModules)},{label:'Batteries, énergie nominale de calcul',value:number(cap.batteryKWh,1)+' kWh'})
    if(asset.kind==='crac'||asset.kind==='condenser') facts.push({label:'Unités par salle',value:cap.coolingUnits?cap.coolingUnits/2+' dont une en réserve':'0'})
    if(id==='solar') facts.push({label:'Puissance de crête',value:number(inputs.solar,1)+' kWc'})
    if(id==='fuel') facts.push({label:'Volume utile de la cuve',value:number(cap.fuelL)+' L'})
    if(id==='transformer') facts.push({label:'Puissance apparente cible',value:specs.electrical.transformer[phase-1]+' kVA'})
    return {title:asset.name,tag:'ÉQUIPEMENT',description:asset.description,facts}
  }
  if(rack){
    const installed=cap.racks.find(item=>item.id===id)
    facts.unshift({label:'Affectation prévue',value:rack.purpose},{label:'Phase prévue',value:String(rack.phase)},{label:'Largeur × profondeur × hauteur',value:[specs.rack.width,specs.rack.depth,specs.rack.height].map(x=>number(x,2)).join(' × ')+' m'})
    if(installed) facts.push({label:'Équipements informatiques',value:String(installed.count)},{label:'Unités occupées',value:installed.units+' / '+specs.rack.u+' U'},{label:'Unités libres',value:specs.rack.u-installed.units+' U'},{label:'Puissance prévue',value:specs.rack.kW+' kW'})
    if(installed&&rack.purpose==='Calcul') facts.push({label:'Serveur de référence',value:specs.compute.model},{label:'Mémoire par serveur',value:specs.compute.ram+' Gio'},{label:'Cœurs physiques par serveur',value:String(specs.compute.cores)})
    return {title:(installed?'Baie ':'Emplacement ')+rack.label,tag:installed?'BAIE INSTALLÉE':'EMPLACEMENT PRÉVU',description:installed?'L’armoire accueille des équipements au format 42U. Les serveurs à double alimentation utilisent les voies A et B.':'Cet espace est réservé à une baie. La capacité d’alimentation et de refroidissement évolue à chaque phase.',facts}
  }
  return {title:'Réserve d’extension',tag:'ESPACE EXTÉRIEUR',description:'La réserve d’extension occupe une zone dédiée du terrain.',facts:[{label:'Zone réservée dans la maquette',value:number(area(property.reserve),1)+' m²'}]}
}
export function RouteSample({line}:{line:LineStyle}){
  const [dash,gap]=lineDashes[line.pattern]
  const background=dash===undefined?line.color:
    'repeating-linear-gradient(90deg, '+line.color+' 0 '+dash+'px, transparent '+dash+'px '+(dash+gap)+'px)'
  return <span className="route-swatch" data-pattern={line.pattern} aria-hidden="true"
    style={{background,'--period':dash===undefined?'28px':(dash+gap)+'px'} as CSSProperties}/>
}
export const layerIcons={power:Zap,air:Wind,network:Network,compute:Cpu,storage:Database,solar:Sun}
export type Legend={hover:string|null;pinned:string|null;onHover:(label:string|null)=>void;onPin:(label:string|null)=>void}
type Props={target:string|null;cap:Capacity;phase:Phase;inputs:Inputs;layer:Layer|null;routes:string[]|null;isolated:boolean;legend:Legend;
  onIsolate:()=>void;onClear:()=>void;onSimulate:(id:string)=>void}
export default function Inspector({target,cap,phase,inputs,layer,routes,isolated,legend,onIsolate,onClear,onSimulate}:Props){
  if(!target) return layer?<LayerPanel layer={layer} routes={routes} cap={cap} phase={phase} inputs={inputs} legend={legend} onClose={onClear} onSimulate={onSimulate}/>:null
  const item=info(target,cap,phase,inputs)
  return <aside className="inspector" aria-label="Informations de sélection">
    <header className="inspector-bar"><span className="eyebrow">{item.tag}</span></header>
    <div className="inspector-content by-selection">
      <h2>{item.title}</h2><p>{item.description}</p>
      <dl className="fact-list">{item.facts.map(fact=><div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
      {item.details&&<details className="details-box"><summary>Détails techniques</summary><p>{item.details}</p></details>}
      {rooms.some(room=>room.id===target)&&<button className="soft-button panel-action" aria-pressed={isolated} onClick={onIsolate}><Focus size={15}/>{isolated?'Afficher les salles voisines':'Isoler la salle'}</button>}
    </div>
  </aside>
}
function StorageExample(){
  return <div className="storage-example">
    <h3>Un même fichier, deux méthodes</h3>
    <p>Trois copies complètes sur des hôtes distincts.</p>
    <div className="fragments" aria-label="Trois copies identiques"><b>Fichier</b><b>Copie</b><b>Copie</b></div>
    <p>Trois fragments de données et deux de secours.</p>
    <div className="fragments" aria-label="Trois fragments de données et deux de parité"><b>D1</b><b>D2</b><b>D3</b><b className="parity">P1</b><b className="parity">P2</b></div>
  </div>
}
function LayerPanel({layer,routes,cap,phase,inputs,legend:focus,onClose,onSimulate}:{layer:Layer;routes:string[]|null;cap:Capacity;phase:Phase;inputs:Inputs;legend:Legend;onClose:()=>void;onSimulate:(id:string)=>void}){
  const item=layers[layer],e=energy(phase,inputs,cap)
  const legend=routeLegend(layer,routes)
  const scenario=simulations.find(simulation=>simulation.view===layer)
  const features:Record<Layer,[string,string][]>={
    power:[['Puissance IT prévue',number(cap.designIT)+' kW'],['Modules d’onduleurs',String(cap.upsModules)],['Groupes diesel',String(cap.generators)]],
    air:[['Besoin thermique par salle',number(cap.perHallDesign,1)+' kW'],['Climatiseurs de précision',String(cap.coolingUnits)],['Soufflage / retour de calcul',specs.thermal.supply+' / '+specs.thermal.return+' °C']],
    network:[['Deux accès opérateurs',specs.network.internetMin+'–'+specs.network.internetMax+' Gbit/s'],['Liens de stockage',specs.network.storage+' Gbit/s par lien']],
    compute:[['Serveurs physiques',String(cap.servers)],['Cœurs physiques',number(cap.cpu)],['Mémoire installée',number(cap.ram/1024,2)+' Tio'],['Capacité virtuelle calculée',number(cap.vmSlots)+' VM équivalentes']],
    storage:[['Brut cumulé',number(cap.raw,2)+' To'],['Après redondance',number(cap.usable,2)+' To'],['Allouable après réserve',number(cap.allocatable,2)+' To'],['Sauvegarde utile',number(cap.backupUsable,1)+' To'],['Besoin de sauvegarde',number(cap.backupDemand,1)+' To']],
    solar:[['Puissance solaire',number(inputs.solar,1)+' kWc'],['Production annuelle',number(e.production/1000,1)+' MWh'],['Économies variables',compactMAD(e.savings)+'/an']],
  }
  const Icon=layerIcons[layer]
  const active=focus.hover??focus.pinned
  return <aside className="inspector layer-panel" key={layer} data-layer={layer} aria-label="Parcours d’infrastructure" style={{'--tone':item.color} as CSSProperties}>
    <header className="inspector-bar"><span className="eyebrow"><span className="layer-chip"><Icon size={13}/></span>PARCOURS TECHNIQUE</span><button className="icon-button" aria-label="Masquer le parcours" onClick={onClose}><X size={16}/></button></header>
    <div className="inspector-content">
      <h2>{item.name}</h2><p>{item.summary}</p>
      <ol className="system-path" aria-label="Étapes du parcours">{item.steps.map((step,index)=><li key={step} style={{'--i':index} as CSSProperties}>
        {index>0&&<ChevronRight size={11} aria-hidden="true"/>}<span>{step}</span>
      </li>)}</ol>
      {legend.length>0&&<div className="route-legend" data-focused={Boolean(active)}>
        <h3>Légende des tracés</h3>
        <ul aria-label="Légende des tracés" onMouseLeave={()=>focus.onHover(null)}>{legend.map(line=><li key={line.label}>
          <button aria-pressed={focus.pinned===line.label} data-active={active===line.label}
            onMouseEnter={()=>focus.onHover(line.label)} onFocus={()=>focus.onHover(line.label)} onBlur={()=>focus.onHover(null)}
            onClick={()=>focus.onPin(focus.pinned===line.label?null:line.label)}>
            <RouteSample line={line}/><span>{line.label}</span>{focus.pinned===line.label&&<Check size={13} aria-hidden="true"/>}
          </button>
        </li>)}</ul>
        <p className="legend-hint">{focus.pinned?'Cliquez à nouveau pour afficher toutes les lignes.':'Survolez une ligne pour la suivre sur la maquette, cliquez pour la garder.'}</p>
      </div>}
      {scenario&&<button className="flow-cta" onClick={()=>onSimulate(scenario.id)}>
        <span className="flow-cta-icon"><Play size={14}/></span>
        <span><small>Simuler une panne</small><strong>{scenario.name}</strong></span>
        <ChevronRight size={16} aria-hidden="true"/>
      </button>}
      <dl className="fact-list compact">{features[layer].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <details className="details-box"><summary>Comment ça marche</summary><p>{item.details}</p>{layer==='storage'&&<StorageExample/>}</details>
    </div>
  </aside>
}
export function SimulationPanel({id,step,onStep,onExit,frame}:{id:string;step:number;onStep:(i:number)=>void;onExit:()=>void;frame:Frame}){
  const simulation=simulations.find(item=>item.id===id)!
  const total=simulation.frames.length,last=step===total-1
  const Icon=layerIcons[simulation.view]
  return <section className="board-timeline" aria-label="Simulation en cours" style={{'--tone':layers[simulation.view].color} as CSSProperties}>
    <header>
      <span className="timeline-chip"><Icon size={15}/></span>
      <strong>{simulation.name}</strong>
      <span className="timeline-step">Étape {step+1} / {total}</span>
      <button className="icon-button" aria-label="Quitter la simulation" title="Quitter (Échap)" onClick={onExit}><X size={17}/></button>
    </header>
    <ol className="timeline-track" aria-hidden="true">{simulation.frames.map((item,index)=>
      <li key={item.title} title={item.title} data-state={index<step?'done':index===step?'current':'next'}><span/></li>)}</ol>
    <div className="timeline-content">
      <button className="timeline-control timeline-previous" aria-label="Étape précédente" title="Étape précédente (←)" disabled={step===0} onClick={()=>onStep(step-1)}><ChevronLeft size={17}/>Précédent</button>
      <div className="timeline-metric" key={step}><strong>{frame.metric}</strong>{!last&&<small>Ensuite · {simulation.frames[step+1].title}</small>}</div>
      {last
        ?<button className="timeline-control timeline-next" aria-label="Terminer la simulation" onClick={onExit}>Terminer<Check size={16}/></button>
        :<button className="timeline-control timeline-next" aria-label="Étape suivante" title="Étape suivante (→)" onClick={()=>onStep(step+1)}>Suivant<ChevronRight size={17}/></button>}
    </div>
  </section>
}

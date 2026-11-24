import { Box, ChevronLeft, ChevronRight, Cpu, Database, Focus, Pause, Play, RotateCcw, Sun, X, Zap } from 'lucide-react'
import { equipmentFacts,layers } from './content'
import { costs,energy,solarProfile,type Capacity,type Inputs } from './engineering'
import { area,equipment,property,rackPositions,rooms,specs,type Layer,type Phase } from './model'
import { compactMAD,mad,number } from './format'
import { simulations,type Frame } from './simulations'

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
    if(row) facts.push({label:'Provision centrale par '+row.unit,value:mad(row.unitCost[1])})
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
    if(id==='fuel') facts.push({label:'Volume utile indicatif',value:number(cap.fuelL)+' L'})
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
  return {title:'Réserve d’extension',tag:'ESPACE EXTÉRIEUR',description:'Une partie du terrain reste disponible pour étudier un module futur. Les accès, les reculs et la circulation des secours limitent la surface exploitable.',facts:[{label:'Zone réservée dans la maquette',value:number(area(property.reserve),1)+' m²'}]}
}
type Props={target:string|null;cap:Capacity;phase:Phase;inputs:Inputs;layer:Layer|null;isolated:boolean;onIsolate:()=>void;onClear:()=>void}
export default function Inspector({target,cap,phase,inputs,layer,isolated,onIsolate,onClear}:Props){
  if(!target) return layer?<LayerPanel layer={layer} cap={cap} phase={phase} inputs={inputs} onClose={onClear}/>:null
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
function LayerPanel({layer,cap,phase,inputs,onClose}:{layer:Layer;cap:Capacity;phase:Phase;inputs:Inputs;onClose:()=>void}){
  const item=layers[layer],e=energy(phase,inputs,cap)
  const features:Record<Layer,[string,string][]>={
    power:[['Puissance IT prévue',number(cap.designIT)+' kW'],['Modules d’onduleurs',String(cap.upsModules)],['Groupes diesel',String(cap.generators)]],
    air:[['Besoin thermique par salle',number(cap.perHallDesign,1)+' kW'],['Climatiseurs de précision',String(cap.coolingUnits)],['Soufflage / retour de calcul',specs.thermal.supply+' / '+specs.thermal.return+' °C']],
    network:[['Deux accès à confirmer',specs.network.internetMin+'–'+specs.network.internetMax+' Gbit/s'],['Liens de stockage',specs.network.storage+' Gbit/s par lien']],
    compute:[['Serveurs physiques',String(cap.servers)],['Cœurs physiques',number(cap.cpu)],['Mémoire installée',number(cap.ram/1024,2)+' Tio'],['Capacité virtuelle calculée',number(cap.vmSlots)+' VM équivalentes']],
    storage:[['Brut cumulé',number(cap.raw,2)+' To'],['Après redondance',number(cap.usable,2)+' To'],['Allouable après réserve',number(cap.allocatable,2)+' To'],['Sauvegarde utile',number(cap.backupUsable,1)+' To'],['Besoin de sauvegarde',number(cap.backupDemand,1)+' To']],
    solar:[['Puissance solaire',number(inputs.solar,1)+' kWc'],['Production annuelle',number(e.production/1000,1)+' MWh'],['Économies variables',compactMAD(e.savings)+'/an']],
  }
  const Icon=layer==='power'?Zap:layer==='compute'?Cpu:layer==='storage'?Database:layer==='solar'?Sun:Box
  return <aside className="inspector" aria-label="Parcours d’infrastructure">
    <header className="inspector-bar"><span className="eyebrow"><Icon size={14}/> PARCOURS TECHNIQUE</span><button className="icon-button" aria-label="Masquer le parcours" onClick={onClose}><X size={16}/></button></header>
    <div className="inspector-content">
      <h2>{item.name}</h2><p>{item.summary}</p>
      <ol className="system-path" style={{'--route':item.color} as React.CSSProperties}>{item.steps.map(step=><li key={step}>{step}</li>)}</ol>
      <dl className="fact-list compact">{features[layer].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {layer==='air'&&<p className="flow-note">Bleu · soufflage froid. Cuivre · retour chaud. Violet · Circuit frigorifique.</p>}
      <details className="details-box"><summary>Comment ça marche</summary><p>{item.details}</p>{layer==='storage'&&<StorageExample/>}</details>
    </div>
  </aside>
}
export function SimulationPanel({id,step,playing,finished,onToggle,onRestart,onStep,onExit,frame,phase,cap,inputs}:{id:string;step:number;playing:boolean;finished:boolean;onToggle:()=>void;onRestart:()=>void;onStep:(i:number)=>void;onExit:()=>void;frame:Frame;phase:Phase;cap:Capacity;inputs:Inputs}){
  const simulation=simulations.find(item=>item.id===id)!
  const instant=frame.hour!==undefined?solarProfile(frame.hour,inputs.solar,energy(phase,inputs,cap).facility):null
  return <section className="board-timeline" aria-label="Simulation en cours">
    <header><strong>{simulation.name}</strong><button className="icon-button" aria-label="Quitter la simulation" onClick={onExit}><X size={17}/></button></header>
    <div className="sim-progress">{simulation.frames.map((item,index)=><button key={item.title} aria-label={'Étape '+(index+1)+' · '+item.title}
      aria-current={index===step?'step':undefined} className={index<=step?'filled':''} onClick={()=>onStep(index)}/>)}</div>
    <div className="timeline-content">
      <div className="timeline-metrics"><strong>{frame.metric}</strong>
        {instant&&<small>{number(instant.production,1)} kW solaires · {number(instant.grid,1)} kW réseau</small>}
        {id==='expansion'&&<small>{cap.racks.length} baies · {cap.designIT} kW · {compactMAD(costs(phase,inputs,cap).central)}</small>}
      </div>
      <div className="sim-buttons">
        <button className="icon-button" title="Étape précédente" aria-label="Étape précédente" disabled={step===0} onClick={()=>onStep(step-1)}><ChevronLeft size={16}/></button>
        <button className="primary-button" onClick={onToggle}>{playing?<Pause size={15}/>:<Play size={15}/>} {playing?'Pause':finished?'Relire':'Reprendre'}</button>
        <button className="icon-button" title="Étape suivante" aria-label="Étape suivante" disabled={step>=simulation.frames.length-1} onClick={()=>onStep(step+1)}><ChevronRight size={16}/></button>
        <button className="icon-button" title="Recommencer" aria-label="Recommencer la simulation" onClick={onRestart}><RotateCcw size={15}/></button>
      </div>
    </div>
  </section>
}

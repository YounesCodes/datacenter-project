import { normalRoutes,rackPositions,topology,type Layer } from './model'

export type LineStyle={label:string;color:string;pattern:'solid'|'dashed'|'dotted'}
const style=(label:string,color:string,pattern:LineStyle['pattern']='solid'):LineStyle=>({label,color,pattern})
const grid=style('Arrivée du réseau public','#925016')
const racks=style('Distribution aux baies par les voies A et B','#b77509','dashed')
const cooling=style('Alimentation des climatiseurs','#246451')
const networkRooms=style('Distribution vers les salles A et B','#4c53a0','dotted')
const access=style('Accès au stockage NVMe','#865019')
const replica=style('Réplication entre les salles','#246b67','dashed')
const styles:Record<Layer,Record<string,LineStyle>>={
  power:{grid,racks,cooling,generator:style('Relais des groupes diesel','#a45a16','dotted'),battery:style('Secours sur batteries','#77468b')},
  air:{
    supply:style('Soufflage d’air froid','#126c91'),
    warm:style('Retour d’air chaud','#b64e29'),
    refrigerant:style('Circuit frigorifique aller et retour','#794b97','dashed'),
    reduced:style('Soufflage à débit réduit','#366575','dotted'),
  },
  network:{
    ispA:style('Fibre de l’opérateur A','#713d91'),ispB:style('Fibre de l’opérateur B','#1c7186','dashed'),
    core:style('Raccordement du cœur réseau','#434c64'),hallA:networkRooms,hallB:networkRooms,
  },
  storage:{
    accessA:access,accessB:access,remoteB:access,replica,rebuild:replica,
    hdd:style('Échanges entre baies HDD','#784794','dotted'),
    backup:style('Flux de sauvegarde','#3c5987','dashed'),
  },
  compute:{hallA:style('Trafic de la salle A','#315d94'),hallB:style('Trafic de la salle B','#277260','dashed')},
  solar:{panels:style('Production photovoltaïque','#517322'),grid,racks,cooling},
}

export const lineDashes:Record<LineStyle['pattern'],number[]>={solid:[],dashed:[9,5],dotted:[2,5]}

// Moving marks drawn over each line, in screen pixels and pixels per second.
export type FlowMotion={kind:'current'|'air'|'reduced'|'refrigerant'|'data';dash:number[];speed:number;width:number;alpha:number}
const motions:Record<FlowMotion['kind'],FlowMotion>={
  current:{kind:'current',dash:[3,15],speed:68,width:1.7,alpha:.95},
  air:{kind:'air',dash:[13,17],speed:24,width:1.5,alpha:.72},
  reduced:{kind:'reduced',dash:[8,22],speed:11,width:1.3,alpha:.6},
  refrigerant:{kind:'refrigerant',dash:[6,8],speed:32,width:1.4,alpha:.85},
  data:{kind:'data',dash:[.5,12],speed:96,width:2.4,alpha:.95},
}
export function flowMotion(layer:Layer,route:string):FlowMotion{
  if(layer==='power'||layer==='solar') return motions.current
  if(layer==='air'){
    const tone=topology.air[route]?.tone
    return tone==='refrigerant'?motions.refrigerant:tone==='reduced'?motions.reduced:motions.air
  }
  return motions.data
}
export function routeStyle(layer:Layer,route:string):LineStyle{
  const key=layer==='air'?topology.air[route]?.tone??'supply':route
  return styles[layer][key]??styles[layer][Object.keys(styles[layer])[0]]
}
export function routeLegend(layer:Layer,active:readonly string[]|null){
  return [...new Set((active??normalRoutes[layer]).map(route=>routeStyle(layer,route)))]
}

export type FlowFocus={ids:ReadonlySet<string>}
const halls=['hall-a','hall-b']
const electrical=[...halls,'power','transformer','switchgear','ups','pdus','pdus-b','crac','crac-b']
const focusIds:Record<Layer,string[]>={
  power:electrical,
  air:[...halls,'crac','crac-b','condenser','condenser-b'],
  network:[...halls,'network','fiber','router','core','ispA','ispB'],
  storage:halls,
  compute:[...halls,'network','core'],
  solar:[...electrical,'solar','inverter'],
}
export function flowFocus(layer:Layer|null,simulation?:string):FlowFocus|null{
  if(!layer) return null
  const ids=new Set(focusIds[layer])
  for(const rack of rackPositions){
    if((layer!=='compute'&&layer!=='network')||rack.purpose==='Calcul') ids.add(rack.id)
  }
  if(simulation==='power') for(const id of ['generator','fuel']) ids.add(id)
  if(simulation==='air') for(const id of ['temperature','temperature-b']) ids.add(id)
  return {ids}
}

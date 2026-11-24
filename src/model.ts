export type Point = [number, number, number]
export type Rect = [number, number, number, number]
export type Phase = 1 | 2 | 3
export type Floor = 'ground' | 'upper' | 'roof'
export type Layer = 'power' | 'air' | 'network' | 'storage' | 'compute' | 'solar'

export const property = {
  location: 'Benguerir', region: 'Marrakech-Safi, Maroc',
  cityCenter: [32.24088, -7.95397] as [number, number],
  parcelAnchor: [32.25065, -7.93090] as [number, number] | null,
  confidence: 'probable' as 'ville' | 'probable' | 'parcelle',
  cadastralBoundary: null as [number, number][] | null,
  rotation: 0,
  boundary: [[-29,-21.25],[29,-21.25],[29,21.25],[-29,21.25]] as [number, number][],
  price: 800_000,
  listing: 'https://immo.mitula.ma/adclickdetail/mitula-MA-7130001778436167548',
  building: [-20,-12.5,40,25] as Rect,
  upper: [10,.5,10,12] as Rect,
  reserve: [6.5,-20,20.7,6.2] as Rect,
  technicalHeight: 4.2,
  upperHeight: 3.2,
  wall: .18,
}

export const parcelVerified=Boolean(property.confidence==='parcelle'&&property.parcelAnchor&&(property.cadastralBoundary?.length??0)>=3)
export const stairs={x:18.4,lowZ:11,run:.26,steps:20,width:1.72,opening:[17.4,5.94,2,5.28] as Rect}
const [upperX,upperZ,upperW,upperD]=property.upper
const [shaftX,shaftZ,shaftW,shaftD]=stairs.opening
export const upperSlabs:Rect[]=[
  [upperX,upperZ,upperW,shaftZ-upperZ],
  [upperX,shaftZ+shaftD,upperW,upperZ+upperD-shaftZ-shaftD],
  [upperX,shaftZ,shaftX-upperX,shaftD],
  [shaftX+shaftW,shaftZ,upperX+upperW-shaftX-shaftW,shaftD],
]
export function walkHeight(x:number,z:number,current:number){
  const progress=(stairs.lowZ+stairs.run/2-z)/(stairs.steps*stairs.run)
  if(Math.abs(x-stairs.x)<stairs.width/2&&progress>=0&&progress<=1) return progress*property.technicalHeight
  if(current<property.technicalHeight-.22) return 0
  const onSlab=upperSlabs.some(([left,front,width,depth])=>x>=left&&x<=left+width&&z>=front&&z<=front+depth)
  return onSlab?property.technicalHeight:null
}

export type Room = {
  id: string; name: string; short: string; rect: Rect; floor: 'ground'|'upper'
  color: string; description: string; details: string; layer?: Layer; cost?: string
}
export const rooms: Room[] = [
  {id:'hall-a',name:'Salle serveurs A',short:'Salle A',rect:[-20,-12.5,15,10],floor:'ground',color:'#d2ddd7',description:'Les serveurs de cette salle font tourner les machines virtuelles et conservent une partie des données. L’air froid arrive entre les rangées de baies et traverse les serveurs.',details:'24 emplacements prévus. Les baies installées sont raccordées à deux circuits électriques A/B et à deux chemins réseau.',layer:'compute',cost:'rack'},
  {id:'hall-b',name:'Salle serveurs B',short:'Salle B',rect:[-5,-12.5,15,10],floor:'ground',color:'#cdd9d7',description:'La deuxième salle sépare physiquement une partie du calcul et du stockage. Chaque salle dispose de sa propre distribution de refroidissement.',details:'La perte d’une salle entière reste un scénario à valider. Les groupes de disques sont répartis entre plusieurs serveurs.',layer:'storage',cost:'rack'},
  {id:'power',name:'Local électrique',short:'Électricité',rect:[-20,.5,13,10],floor:'ground',color:'#e5d9be',description:'Les armoires distribuent l’électricité aux baies. En cas de coupure, les onduleurs utilisent leurs batteries pendant le démarrage des groupes électrogènes.',details:'Deux voies A/B. L’arrivée publique, le transfert amont et le stockage de carburant communs restent des points de défaillance à étudier.',layer:'power',cost:'ups'},
  {id:'cooling',name:'Local de refroidissement',short:'Refroidissement',rect:[-7,.5,9,10],floor:'ground',color:'#c8dde0',description:'Depuis ce local, on surveille le refroidissement des salles. Les climatiseurs de précision en périphérie soufflent vers le plancher puis reprennent l’air chaud en hauteur.',details:'Climatisation à détente directe (DX). Des condenseurs extérieurs rejettent la chaleur. Une unité de réserve est prévue dans chaque salle.',layer:'air',cost:'crac'},
  {id:'delivery',name:'Livraison et maintenance',short:'Livraison',rect:[2,.5,7,10],floor:'ground',color:'#e4dbcb',description:'Les équipements arrivent par un accès distinct. Ils sont déballés, vérifiés et préparés avant d’entrer en salle informatique.',details:'Le couloir central relie l’atelier aux salles. Le rayon de manœuvre des véhicules lourds et la portance du sol restent à vérifier.'},
  {id:'network',name:'Local réseau et fibre',short:'Réseau',rect:[10,-6.5,10,4],floor:'ground',color:'#d7d3e4',description:'Les fibres des opérateurs arrivent dans cette salle. Les routeurs choisissent un chemin. Les pare-feu filtrent le trafic avant son arrivée aux serveurs.',details:'Deux armoires réseau distinctes des 48 emplacements informatiques. Deux opérateurs et deux parcours d’entrée à confirmer sur place.',layer:'network',cost:'network'},
  {id:'noc',name:'Supervision du réseau',short:'Supervision',rect:[10,-12.5,7.5,6],floor:'ground',color:'#cbd5dc',description:'Cette salle sert à surveiller les équipements et les alertes du site. Le NOC suit le réseau et le SOC suit les alertes de sécurité informatique.',details:'Consoles, écrans de supervision et suivi des alarmes techniques.'},
  {id:'reception',name:'Accueil et contrôle d’accès',short:'Accueil',rect:[10,.5,10,5],floor:'ground',color:'#e2d5bd',description:'Les visiteurs se présentent à l’accueil. Un sas à deux portes et des lecteurs de badge limitent l’accès aux zones techniques.',details:'Caméras, clôture et contrôle des véhicules complètent la protection du site.',cost:'security'},
  {id:'utility',name:'Locaux de service',short:'Services',rect:[10,5.5,7,5],floor:'ground',color:'#d8ddd4',description:'Ces locaux regroupent les services du bâtiment et le matériel d’intervention.',details:'La détection de fuite alerte avant que l’eau n’atteigne les équipements électriques.'},
  {id:'offices',name:'Bureaux de direction',short:'Bureaux',rect:[10,.5,5,4],floor:'upper',color:'#e8dabc',description:'Bureaux du premier étage de l’aile administrative.',details:'Surface de l’étage à confirmer avec l’architecte.'},
  {id:'meeting',name:'Salle de réunion',short:'Réunion',rect:[15,.5,5,4],floor:'upper',color:'#ded7be',description:'L’espace sert aux réunions de projet et aux interventions coordonnées.',details:'Accès par l’escalier de l’aile administrative.'},
  {id:'shared',name:'Espace de travail',short:'Espace de travail',rect:[10,5.8,7,3.8],floor:'upper',color:'#d3ddcf',description:'Postes de travail partagés dans l’aile administrative.',details:'Étage séparé des salles techniques.'},
  {id:'break',name:'Salle de pause',short:'Salle de pause',rect:[10,9.6,4,2.9],floor:'upper',color:'#dfd6c1',description:'Espace de pause du premier étage.',details:'Les sanitaires sont voisins du palier.'},
  {id:'restroom',name:'Sanitaires',short:'Sanitaires',rect:[14,9.6,3,2.9],floor:'upper',color:'#d3d9d3',description:'Sanitaires de l’étage administratif.',details:'Les réseaux d’eau sont tenus à l’écart des salles informatiques.'},
]
export const area = ([, , width, depth]: Rect) => width * depth
export const center = ([x,z,w,d]: Rect): Point => [x+w/2,0,z+d/2]
export const landArea = Math.abs(property.boundary.reduce((sum, [x,z], i, points) => {
  const [nextX,nextZ] = points[(i+1)%points.length]
  return sum + x * nextZ - nextX * z
},0))/2

export const specs = {
  rack: {u:42,width:.6,depth:1.2,height:2.05,kW:6},
  compute: {model:'Dell PowerEdge R640 ou équivalent reconditionné', cores:32, ram:256, units:1, cpuRatio:3, memoryReserve:.12, haReserve:.2, virtualCores:2, virtualRam:4, virtualTB:.04},
  nvme: {nodes:6, disks:8, diskTB:3.84, data:1, fragments:3, units:2},
  hdd: {nodes:6, disks:8, diskTB:12, data:3, fragments:5, units:2},
  storageReserve:.2,
  backup: {nodes:2, rawPerNode:144, arrayFactor:.75, protectedTB:90, dailyChange:.025, days:30, frequency:1, dedup:.7, compression:.8, reserve:.2, units:4},
  electrical: {transformer:[315,500,630], generatorKW:200, upsKW:120, minutes:10, fuelHours:12, fuelLPerHour:48, dieselMAD:12.5, exerciseHours:24, pduVoltage:230},
  thermal: {netUnitKW:32, designMultiplier:1.12, supply:24, return:34},
  network: {internetMin:1,internetMax:10,host:25,storage:25,uplink:100,cabinets:2},
  solar: {yield:1750, selfUse:.9, moduleWatts:500, moduleWidth:1.12, moduleDepth:2.1},
}

export const phases = {
  1:{name:'Mise en service',racks:16,servers:48,storageScale:1,avgIT:55,solar:80, networkScale:1},
  2:{name:'Extension interne',racks:32,servers:96,storageScale:2,avgIT:110,solar:80,networkScale:1.5},
  3:{name:'Capacité complète',racks:48,servers:144,storageScale:3,avgIT:165,solar:80,networkScale:2},
} satisfies Record<Phase,{name:string;racks:number;servers:number;storageScale:number;avgIT:number;solar:number;networkScale:number}>

export const hallInfrastructure=(['hall-a','hall-b'] as const).map((id,index)=>{
  const [x,z,w]=rooms.find(room=>room.id===id)!.rect
  const suffix=index===0?'A':'B'
  return {id,suffix,x,z,crac:[x+w-.71,0,z+1.02] as Point,pdu:[x+.65,0,z+6.6] as Point,
    condenser:[x+1.25,0,-17.75] as Point,temperature:[x+2.3,0,z+2.7] as Point}
})

export const equipment = [
  {id:'transformer',name:'Transformateur',position:[-24,0,-8],kind:'transformer',layer:'power',cost:'switchgear', description:'Abaisse la tension du réseau public avant sa distribution dans le site.'},
  {id:'generator',name:'Groupes électrogènes',position:[-24,0,-1.75],kind:'generator',layer:'power',cost:'generator',description:'En cas de coupure prolongée, les groupes diesel prennent le relais après les batteries. Un groupe reste disponible en réserve.'},
  {id:'fuel',name:'Réserve de carburant',position:[-24,0,4.3],kind:'fuel',layer:'power',cost:'generator',description:'Le carburant est stocké dans une cuve avec rétention. L’autonomie dépend de la charge et du ravitaillement.'},
  ...hallInfrastructure.flatMap(hall=>{
    const suffix=hall.suffix==='A'?'':'-b'
    const name=(label:string)=>label+' · salle '+hall.suffix
    return [
      {id:'condenser'+suffix,name:name('Condenseurs extérieurs'),position:hall.condenser,kind:'condenser',layer:'air' as const,cost:'crac',description:'Ces échangeurs rejettent dehors la chaleur extraite de la salle.'},
      {id:'pdus'+suffix,name:name('Distribution électrique en baie'),position:hall.pdu,kind:'pdu',layer:'power' as const,cost:'electrical',description:'Deux unités de distribution distinctes alimentent les serveurs par les voies A et B.'},
      {id:'crac'+suffix,name:name('Climatiseurs de précision'),position:hall.crac,kind:'crac',layer:'air' as const,cost:'crac',description:'Les climatiseurs soufflent sous le plancher et récupèrent l’air chaud en hauteur.'},
      {id:'temperature'+suffix,name:name('Sonde de température'),position:hall.temperature,kind:'sensor',layer:'air' as const,cost:'crac',description:'La sonde mesure l’air à l’entrée des serveurs et signale une hausse anormale.'},
    ]
  }),
  {id:'ups',name:'Onduleurs et batteries',position:[-15.8,0,6.8],kind:'ups',layer:'power',cost:'ups',description:'Les batteries maintiennent provisoirement l’alimentation pendant le démarrage des groupes électrogènes.'},
  {id:'switchgear',name:'Armoires de distribution',position:[-15.8,0,2],kind:'panel',layer:'power',cost:'switchgear',description:'Les armoires protègent les circuits et distribuent la puissance aux onduleurs et aux équipements essentiels.'},
  {id:'router',name:'Routeurs et pare-feu',position:[14.4,0,-5.5],kind:'router',layer:'network',cost:'network',description:'Les routeurs sélectionnent le chemin du trafic. Les pare-feu appliquent les règles d’accès aux services.'},
  {id:'fiber',name:'Tiroirs de raccordement fibre',position:[17.2,0,-5.5],kind:'router',layer:'network',cost:'cabling',description:'Les tiroirs connectent physiquement les fibres extérieures aux équipements du centre de données.'},
  {id:'core',name:'Commutation du cœur réseau',position:[12.25,0,-5.5],kind:'router',layer:'network',cost:'network',description:'Le cœur réseau dessert les baies des deux salles et transporte les échanges entre serveurs.'},
  {id:'solar',name:'Panneaux photovoltaïques',position:[-4,4.65,-.5],kind:'solar',layer:'solar',cost:'solar',description:'La production solaire alimente une partie des besoins en journée. Les batteries des onduleurs et les groupes ont une fonction de secours distincte.'},
  {id:'inverter',name:'Onduleur photovoltaïque',position:[-7.35,0,2],kind:'panel',layer:'solar',cost:'solar',description:'Convertit la production des panneaux en courant alternatif injecté dans le tableau du site.'},
  {id:'security',name:'Contrôle des véhicules',position:[25,0,16],kind:'security',cost:'security',description:'La barrière filtrée dirige les visiteurs vers l’accueil et les livraisons vers leur accès réservé.'},
  {id:'fire',name:'Détection et extinction incendie',position:[-19.3,0,-3.6],kind:'fire',cost:'fire',description:'Une détection précoce par aspiration surveille les salles. L’extinction à agent propre, la décompression et les procédures d’évacuation devront être étudiées ensemble.'},
  {id:'leak',name:'Détection de fuite',position:[-5.8,0,5],kind:'sensor',layer:'air',cost:'security',description:'Une sonde au sol signale une fuite près des équipements de froid.'},
  {id:'camera',name:'Caméra de périmètre',position:[27.3,0,11.5],kind:'camera',cost:'security',description:'Les caméras couvrent les accès avec un champ de vision à valider et des règles de conservation des images à définir.'},
] satisfies {id:string;name:string;position:Point;kind:string;layer?:Layer;cost:string;description:string}[]
export type Equipment = (typeof equipment)[number]

export type RackUse = 'Calcul'|'Stockage NVMe'|'Stockage HDD'|'Sauvegarde'
export const rackPositions = ['hall-a','hall-b'].flatMap((hall,h) => {
  const room = rooms.find(item => item.id===hall)!
  const [x,z] = room.rect
  const rowZ = [1.45,3.95,6.35,8.75]
  return Array.from({length:24},(_,i) => {
    const column = Math.floor(i/4)
    const row = i%4
    const purpose: RackUse = (['Calcul','Calcul','Calcul','Calcul','Calcul','Stockage NVMe','Stockage HDD','Sauvegarde'] as const)[i%8]
    return {
      id:'rack-' + (h===0?'a':'b') + String(i+1).padStart(2,'0'),
      label:(h===0?'A':'B') + String(i+1).padStart(2,'0'),
      hall, purpose, phase:(Math.floor(i/8)+1) as Phase,
      position:[x+[3.05,3.88,4.71,6.95,7.78,8.61][column],0,z+rowZ[row]] as Point,
      front:row%2===0?1:-1,
    }
  })
})
export type Rack = (typeof rackPositions)[number]


export const services = [
  {id:'vps',name:'Serveur virtuel (VPS)',unit:'machine / mois',price:159,example:'Mettre en ligne un site ou une petite application.', future:false},
  {id:'dedicated',name:'Serveur dédié',unit:'serveur / mois',price:2400,example:'Réserver une machine physique à une seule entreprise.',future:false},
  {id:'object',name:'Stockage objet S3',unit:'To / mois',price:180,example:'Archiver des images et des documents accessibles à la demande.',future:false},
  {id:'backup',name:'Sauvegarde à la demande',unit:'To / mois',price:230,example:'Restaurer des fichiers après un effacement ou une panne.',future:false},
  {id:'private',name:'Nuage privé',unit:'lot / mois',price:5200,example:'Séparer les applications internes d’une organisation.',future:false},
  {id:'db',name:'Bases de données gérées',unit:'',price:0,example:'Confier les mises à jour et la sauvegarde des bases.',future:true},
  {id:'colo',name:'Colocation',unit:'',price:0,example:'Installer son propre matériel dans des baies hébergées.',future:true},
  {id:'gpu',name:'Calcul accéléré (GPU)',unit:'',price:0,example:'Exécuter des traitements intensifs comme l’entraînement de modèles.',future:true},
  {id:'k8s',name:'Kubernetes géré',unit:'',price:0,example:'Déployer et mettre à jour des applications en conteneurs.',future:true},
]

export const coordinates:Record<string,Point>={
  ...Object.fromEntries(equipment.map(item=>[item.id,item.position])),
  grid:[-27,1.65,-12],gridEntry:[-24,1.65,-12],transformerExit:[-22.2,1.5,-8],
  powerEntry:[-20.15,2.7,2],transfer:[-19.1,1.5,2],upsInput:[-15.8,2.65,6.8],
  busA:[-15.8,2.65,-1.44],busB:[-15.8,2.65,-.38],battery:[-13.1,1.35,6.8],
  ispA:[25,1.65,-10],ispB:[25,1.65,1],fiberNorth:[22,2.7,-9.8],fiberSouth:[22,2.45,-2.15],
  fiberDropA:[17.2,2.7,-9.8],fiberDropB:[17.2,2.45,-2.15],
  coreTray:[12.25,2.58,-1.9],crossTray:[-1,2.58,-1.9],
  solarRoof:[-3,4.65,1.2],solarRiser:[-7.35,4.4,2],
  coolingBoard:[-9,2.85,2],
}
for(const hall of hallInfrastructure){
  const {id,suffix:s,x,z,crac,pdu,condenser}=hall
  const compute=rackPositions.find(rack=>rack.hall===id&&rack.purpose==='Calcul')!.position
  const storage=rackPositions.find(rack=>rack.hall===id&&rack.purpose==='Stockage NVMe')!.position
  const hdd=rackPositions.find(rack=>rack.hall===id&&rack.purpose==='Stockage HDD')!.position
  const backup=rackPositions.find(rack=>rack.hall===id&&rack.purpose==='Sauvegarde')!.position
  Object.assign(coordinates,{
    ['compute'+s]:[compute[0],1.35,compute[2]],['storage'+s]:[storage[0],1.35,storage[2]],
    ['hdd'+s]:[hdd[0],1.35,hdd[2]],['hddTray'+s]:[hdd[0],2.58,hdd[2]],
    ['backup'+s]:[backup[0],1.35,backup[2]],['backupTray'+s]:[backup[0],2.58,backup[2]],
    ['computeTray'+s]:[compute[0],2.58,compute[2]],['storageTray'+s]:[storage[0],2.58,storage[2]],
    ['networkEntry'+s]:[compute[0],2.58,-1.9],['networkBranch'+s]:[storage[0],2.58,-1.9],
    ['pdu'+s+'A']:[pdu[0],1.22,pdu[2]],['pdu'+s+'B']:[pdu[0]+.7,1.22,pdu[2]],
    ['riser'+s+'A']:[pdu[0],2.65,-1.44],['riser'+s+'B']:[pdu[0]+.7,2.65,-.38],
    ['tray'+s+'A']:[pdu[0],2.65,pdu[2]],['tray'+s+'B']:[pdu[0]+.7,2.65,pdu[2]],
    ['powerDrop'+s+'A']:[compute[0]-.15,2.65,compute[2]],['powerDrop'+s+'B']:[compute[0]+.15,2.65,compute[2]],
    ['crac'+s]:[crac[0],1.18,crac[2]],['plenum'+s]:[crac[0],.09,crac[2]],
    ['underfloor'+s]:[x+3.05,.09,z+2.7],['cold'+s]:[x+3.05,1.22,z+2.7],
    ['rackRear'+s]:[compute[0],1.49,compute[2]-.56],['warm'+s]:[compute[0],3.12,compute[2]-.76],
    ['return'+s]:[crac[0],3.12,crac[2]],['roofPipe'+s]:[crac[0],2.92,-15.8],
    ['condenser'+s]:[condenser[0],1.24,condenser[2]],['liquid'+s]:[condenser[0]+.33,1.24,condenser[2]],
    ['liquidPipe'+s]:[crac[0]+.33,2.76,-15.8],['liquidEntry'+s]:[crac[0]+.33,2.76,crac[2]],
    ['cracFeed'+s]:[crac[0],2.85,crac[2]],['coolingCross'+s]:[crac[0],2.85,2],
  })
}

type Route={paths:string[][];tone?:'warm'|'refrigerant'|'grid'|'reduced'}
const route=(...paths:string[][]):Route=>({paths})
const powerRoutes={
  grid:route(['grid','gridEntry','transformer','transformerExit','powerEntry','transfer','switchgear','upsInput','ups']),
  generator:route(['generator','powerEntry','transfer','switchgear','upsInput','ups']),
  battery:route(['battery','ups']),
  racks:route(...hallInfrastructure.flatMap(({suffix:s})=>['A','B'].map(feed=>
    ['ups','bus'+feed,'riser'+s+feed,'tray'+s+feed,'pdu'+s+feed,'tray'+s+feed,'powerDrop'+s+feed,'compute'+s],
  ))),
  cooling:route(['switchgear','coolingBoard'],...hallInfrastructure.map(({suffix:s})=>['coolingBoard','coolingCross'+s,'cracFeed'+s,'crac'+s])),
}
const coolingRoutes=Object.fromEntries(hallInfrastructure.flatMap(({suffix:s})=>[
  ['supply'+s,route(['crac'+s,'plenum'+s,'underfloor'+s,'cold'+s,'compute'+s])],
  ['return'+s,{paths:[['compute'+s,'rackRear'+s,'warm'+s,'return'+s,'crac'+s]],tone:'warm'}],
  ['refrigerant'+s,{paths:[['crac'+s,'return'+s,'roofPipe'+s,'condenser'+s],['liquid'+s,'liquidPipe'+s,'liquidEntry'+s,'crac'+s]],tone:'refrigerant'}],
  ['reduced'+s,{paths:[['crac'+s,'plenum'+s,'underfloor'+s,'cold'+s,'compute'+s]],tone:'reduced'}],
])) as Record<string,Route>
const distribution={
  hallA:route(['core','coreTray','crossTray','networkEntryA','computeTrayA','computeA']),
  hallB:route(['core','coreTray','networkEntryB','computeTrayB','computeB']),
}
export const topology:Record<Layer,Record<string,Route>>={
  power:powerRoutes,
  air:coolingRoutes,
  network:{
    ispA:route(['ispA','fiberNorth','fiberDropA','fiber']),
    ispB:route(['ispB','fiberSouth','fiberDropB','fiber']),
    core:route(['fiber','router','core']),
    ...distribution,
  },
  storage:{
    accessA:route(['computeA','computeTrayA','networkEntryA','networkBranchA','storageTrayA','storageA']),
    accessB:route(['computeB','computeTrayB','networkEntryB','networkBranchB','storageTrayB','storageB']),
    remoteB:route(['computeA','computeTrayA','networkEntryA','crossTray','networkBranchB','storageTrayB','storageB']),
    replica:route(['storageA','storageTrayA','networkBranchA','crossTray','networkBranchB','storageTrayB','storageB']),
    rebuild:route(['storageB','storageTrayB','networkBranchB','crossTray','networkBranchA','storageTrayA','storageA']),
    hdd:route(['hddA','hddTrayA','networkBranchA','crossTray','networkBranchB','hddTrayB','hddB']),
    backup:route(...hallInfrastructure.map(({suffix:s})=>['compute'+s,'computeTray'+s,'networkEntry'+s,'networkBranch'+s,'backupTray'+s,'backup'+s])),
  },
  compute:distribution,
  solar:{
    panels:route(['solar','solarRoof','solarRiser','inverter','switchgear','upsInput','ups']),
    grid:{...powerRoutes.grid,tone:'grid'},
    racks:powerRoutes.racks,cooling:powerRoutes.cooling,
  },
}
export const normalRoutes:Record<Layer,string[]>={
  power:['grid','racks','cooling'],air:['supplyA','returnA','refrigerantA','supplyB','returnB','refrigerantB'],
  network:['ispA','ispB','core','hallA','hallB'],storage:['accessA','accessB','replica','hdd','backup'],
  compute:['hallA','hallB'],solar:['panels','grid','racks','cooling'],
}

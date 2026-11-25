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
export const accessVestibule={
  rect:[17.32,2.14,2.68,2.12] as Rect,axis:3.2,innerDoor:1.38,outerDoor:1.7,
}
export const eastGroundDoors={
  network:[-8.6,1.2],reception:[accessVestibule.axis,accessVestibule.outerDoor],stairs:[11.2,1.2],
} as const
export const serviceEntry=[-.95,1.65] as const
export const loadingDoor={opening:[5.5,3.15] as const,height:2.72}
export const staffStairLobby:Rect=[17,5.5,3,7]
export const utilityDoor={edge:'e',at:11.72,width:1.1} as const
export const stairs={x:18.4,lowZ:11,run:.26,steps:20,width:1.72,opening:[17.4,5.94,2,5.28] as Rect,railWidth:.065}
const stairPassageWall=15.7
const restroomWest=13
export const stairSideDoors={
  shared:{edge:'e',at:6.65,width:1.10},restroom:{edge:'e',at:10.9,width:1.10},
} as const
const frontBoundary=21.25
const frontageStart=12.65
const visitorBay:Rect=[10.7,18,6.8,2.7]
export const siteAccess={
  surfaceY:.035,
  forecourt:[-28.7,frontageStart,57.4,frontBoundary-frontageStart] as Rect,
  westApron:[-28.7,6.6,8.15,frontageStart-6.6] as Rect,
  eastDrive:[20.55,-12.5,8.15,frontageStart+12.5] as Rect,
  entrance:[18.1,19.4,10.6,frontBoundary-19.4] as Rect,
  exit:[-28.7,19.4,11.4,frontBoundary-19.4] as Rect,
  booth:[28.02,0,18.65] as Point,
  boothSize:[1.6,2.04] as [number,number],
  camera:[27.9,0,6.9] as Point,
  loading:[-5.8,frontageStart,16.5,4.15] as Rect,
}
export const deliveryTruck={
  rearAxle:[3.5,0,15] as Point,
  length:8.2,width:2.55,rearOverhang:1.95,wheelbase:4.65,
}
export const parking={
  bays:[[-16.8,18,6.8,2.7],[-10,18,6.8,2.7],visitorBay] as Rect[],
  yaw:Math.PI/2,
}
export const visitorArrival={
  x:property.building[0]+property.building[2]+3.15,
  z:accessVestibule.axis,
  yaw:Math.PI/2,
  pitch:-.05,
}
const [upperX,upperZ,upperW,upperD]=property.upper
const [shaftX,shaftZ,shaftW,shaftD]=stairs.opening
export const upperSlabs:Rect[]=[
  [upperX,upperZ,upperW,shaftZ-upperZ],
  [upperX,shaftZ+shaftD,upperW,upperZ+upperD-shaftZ-shaftD],
  [upperX,shaftZ,shaftX-upperX,shaftD],
  [shaftX+shaftW,shaftZ,upperX+upperW-shaftX-shaftW,shaftD],
]
function contains(rect:Rect,x:number,z:number,inset=0){
  const [left,front,width,depth]=rect
  return x>=left+inset&&x<=left+width-inset&&z>=front+inset&&z<=front+depth-inset
}
function stairHeight(x:number,z:number){
  const progress=(stairs.lowZ+stairs.run/2-z)/(stairs.steps*stairs.run)
  return Math.abs(x-stairs.x)<stairs.width/2&&progress>=0&&progress<=1?progress*property.technicalHeight:null
}
export function walkHeight(x:number,z:number,current:number){
  const step=stairHeight(x,z)
  if(step!==null) return step
  if(current<property.technicalHeight-.22) return 0
  return upperSlabs.some(rect=>contains(rect,x,z))?property.technicalHeight:null
}

export type Room = {
  id: string; name: string; short: string; rect: Rect; floor: 'ground'|'upper'
  color: string; description: string; details: string; layer?: Layer; cost?: string
}
export const rooms: Room[] = [
  {id:'hall-a',name:'Salle serveurs A',short:'Salle A',rect:[-20,-12.5,15,10],floor:'ground',color:'#d2ddd7',description:'Les serveurs de cette salle font tourner les machines virtuelles et conservent une partie des données. L’air froid arrive entre les rangées de baies et traverse les serveurs.',details:'24 emplacements de baie. Les baies installées sont raccordées à deux circuits électriques A/B et à deux chemins réseau.',layer:'compute',cost:'rack'},
  {id:'hall-b',name:'Salle serveurs B',short:'Salle B',rect:[-5,-12.5,15,10],floor:'ground',color:'#cdd9d7',description:'La deuxième salle sépare physiquement une partie du calcul et du stockage. Chaque salle dispose de sa propre distribution de refroidissement.',details:'Le plan de haute disponibilité organise la reprise des machines virtuelles dans la salle qui reste en service. Le cluster utilise le quorum et les copies de données réparties entre les deux salles.',layer:'storage',cost:'rack'},
  {id:'power',name:'Local électrique',short:'Électricité',rect:[-20,.5,13,12],floor:'ground',color:'#e5d9be',description:'Les armoires distribuent l’électricité aux baies. En cas de coupure, les onduleurs utilisent leurs batteries pendant le démarrage des groupes électrogènes.',details:'Les voies A et B distribuent le courant séparément aux équipements à double alimentation.',layer:'power',cost:'ups'},
  {id:'cooling',name:'Local de refroidissement',short:'Refroidissement',rect:[-7,.5,9,12],floor:'ground',color:'#c8dde0',description:'Depuis ce local, on surveille le refroidissement des salles. Les climatiseurs de précision en périphérie soufflent vers le plancher puis reprennent l’air chaud en hauteur.',details:'Climatisation à détente directe (DX). Des condenseurs extérieurs rejettent la chaleur. Une unité de réserve par salle prend le relais en cas de panne.',layer:'air',cost:'crac'},
  {id:'delivery',name:'Livraison et maintenance',short:'Livraison',rect:[2,.5,8,12],floor:'ground',color:'#e4dbcb',description:'La porte coulissante du quai ouvre directement sur l’atelier. Les équipements sont déballés, vérifiés et préparés avant d’entrer en salle informatique.',details:'Une zone de dépose latérale laisse libre l’allée entre le quai et le couloir central.'},
  {id:'network',name:'Local réseau et fibre',short:'Réseau',rect:[10,-6.5,10,4],floor:'ground',color:'#d7d3e4',description:'Les fibres des opérateurs arrivent dans cette salle. Les routeurs choisissent un chemin. Les pare-feu filtrent le trafic avant son arrivée aux serveurs.',details:'Deux parcours de fibre relient les entrées des opérateurs au cœur réseau des salles A et B.',layer:'network',cost:'network'},
  {id:'noc',name:'Supervision du réseau',short:'Supervision',rect:[10,-12.5,7.5,6],floor:'ground',color:'#cbd5dc',description:'Cette salle sert à surveiller les équipements et les alertes du site. Le NOC suit le réseau et le SOC suit les alertes de sécurité informatique.',details:'Consoles, écrans de supervision et suivi des alarmes techniques.'},
  {id:'reception',name:'Accueil et contrôle d’accès',short:'Accueil',rect:[10,.5,10,5],floor:'ground',color:'#e2d5bd',description:'Les visiteurs se présentent à l’accueil. Un sas à deux portes et des lecteurs de badge limitent l’accès aux zones techniques.',details:'Caméras, clôture et contrôle des véhicules complètent la protection du site.',cost:'security'},
  {id:'utility',name:'Locaux de service',short:'Services',rect:[10,5.5,7,7],floor:'ground',color:'#d8ddd4',description:'Le palier du personnel donne accès au matériel d’intervention et aux équipements de service.',details:'La détection de fuite alerte avant que l’eau n’atteigne les équipements électriques.'},
  {id:'offices',name:'Bureau de direction',short:'Direction',rect:[10,.5,5,4],floor:'upper',color:'#e8dabc',description:'Bureau du directeur du site : poste de travail face à la porte, deux sièges visiteurs, rangements et coin salon.',details:'Le palier relie le bureau à la salle de réunion.'},
  {id:'meeting',name:'Salle de réunion',short:'Réunion',rect:[15,.5,5,4],floor:'upper',color:'#ded7be',description:'L’espace sert aux réunions de projet et aux interventions coordonnées.',details:'Accès par l’escalier de l’aile administrative.'},
  {id:'shared',name:'Espace de travail',short:'Espace de travail',rect:[10,6,stairPassageWall-10,3.6],floor:'upper',color:'#d3ddcf',description:'Quatre postes partagés en deux rangées le long des murs, de part et d’autre d’une allée centrale de 1,9 m qui mène à la salle de pause.',details:'Étage séparé des salles techniques.'},
  {id:'break',name:'Salle de pause',short:'Salle de pause',rect:[10,9.6,restroomWest-10,2.9],floor:'upper',color:'#dfd6c1',description:'Espace de pause du premier étage.',details:'Les sanitaires sont voisins du palier.'},
  {id:'restroom',name:'Sanitaires',short:'Sanitaires',rect:[restroomWest,9.6,stairPassageWall-restroomWest,2.9],floor:'upper',color:'#d3d9d3',description:'Sanitaires de l’étage administratif.',details:'Les réseaux d’eau sont tenus à l’écart des salles informatiques.'},
]

export type AccessMethod='code'|'fingerprint'|'iris'
type DoorSpec={id:string;room:Pick<Room,'name'|'id'|'short'>;x:number;z:number;width:number;outside:1|-1;yaw?:number;companion?:string;inner?:boolean}
export type AuthenticatedDoor=DoorSpec&{method:AccessMethod}
export type SecureDoor=AuthenticatedDoor|(DoorSpec&{method:'delivery'})
type SecureEntrance={edge:'n'|'s';at:number;width:number;method:AccessMethod;vestibule?:number}
export const secureEntrances:Record<string,SecureEntrance>={
  'hall-a':{edge:'s',at:-18.35,width:1.45,method:'iris',vestibule:2.05},
  'hall-b':{edge:'s',at:7.6,width:1.55,method:'fingerprint',vestibule:2.05},
  power:{edge:'n',at:-9.2,width:1.35,method:'code'},
  cooling:{edge:'n',at:-4.5,width:1.35,method:'code'},
  network:{edge:'s',at:18.15,width:1.25,method:'fingerprint'},
}
const roomDoors=Object.entries(secureEntrances).flatMap(([id,entry]):AuthenticatedDoor[]=>{
  const room=rooms.find(room=>room.id===id)!
  const [,z,,depth]=room.rect
  const outside=entry.edge==='s'?1:-1,wallZ=outside===1?z+depth:z
  const outer:AuthenticatedDoor={id,room,x:entry.at,z:wallZ,width:entry.width,outside,method:entry.method}
  if(!entry.vestibule) return [outer]
  const inner={...outer,id:id+'-inner',z:wallZ-outside*entry.vestibule,inner:true,companion:id}
  return [{...outer,companion:inner.id},inner]
})
const [westWall,northWall,buildingWidth,buildingDepth]=property.building
export const staffStairDoor:AuthenticatedDoor={
  id:'staff-stairs',room:{id:'staff-stairs',name:'Escalier du personnel',short:'Personnel'},
  x:westWall+buildingWidth,z:eastGroundDoors.stairs[0],width:eastGroundDoors.stairs[1],outside:1,yaw:Math.PI/2,method:'fingerprint',
}
export const facadeDoors:SecureDoor[]=[staffStairDoor,{
  id:'service-entry',room:{id:'service-entry',name:'Entrée de service',short:'Service'},
  x:westWall,z:serviceEntry[0],width:serviceEntry[1],outside:1,yaw:-Math.PI/2,method:'code',
},{
  id:'loading-door',room:{id:'delivery',name:'Quai de livraison',short:'Livraison'},
  x:loadingDoor.opening[0],z:northWall+buildingDepth,width:loadingDoor.opening[1],outside:1,method:'delivery',
}]
export const secureDoors:SecureDoor[]=[...roomDoors,...facadeDoors]
export const secureSas=secureDoors.filter(door=>door.inner).map(inner=>{
  const outer=secureDoors.find(door=>door.id===inner.companion)!
  const width=outer.width+.48
  return {outer,inner,rect:[outer.x-width/2,Math.min(outer.z,inner.z),width,Math.abs(outer.z-inner.z)] as Rect}
})

export type WalkZone={id:string;name:string;level:string}
const outsideZones:{id:string;name:string;rect:Rect}[]=[
  {id:'reserve',name:'Réserve d’extension',rect:property.reserve},
  {id:'entrance',name:'Entrée du site',rect:siteAccess.entrance},
  {id:'exit',name:'Sortie du site',rect:siteAccess.exit},
  {id:'visitor-entry',name:'Entrée des visiteurs',rect:[westWall+buildingWidth,accessVestibule.axis-1.35,3.6,2.7]},
  ...parking.bays.map(rect=>({id:'parking',name:'Stationnement',rect})),
  {id:'loading',name:'Aire de livraison',rect:siteAccess.loading},
  {id:'service-yard',name:'Cour des équipements',rect:[-28,-12.85,7.6,19.45]},
  {id:'cooling-yard',name:'Cour des condenseurs',rect:[-21,-19.9,26.1,6.6]},
]
export function walkZoneAt(x:number,z:number,elevation:number):WalkZone{
  const flight=stairHeight(x,z)
  if(flight!==null&&Math.abs(elevation-flight)<.22) return {id:'stairs',name:'Escalier',level:'Entre les deux niveaux'}
  const upper=elevation>=property.technicalHeight-.22
  const level=upper?'Premier étage':'Rez-de-chaussée'
  if(!upper&&contains(accessVestibule.rect,x,z,.08)) return {id:'vestibule',name:'Sas d’accès',level}
  if(!upper&&contains(staffStairLobby,x,z,.08)) return {id:'staff-lobby',name:'Palier du personnel',level}
  if(!upper){
    const sas=secureSas.find(({rect})=>contains(rect,x,z,.08))
    if(sas) return {id:sas.inner.id,name:'Sas · '+sas.inner.room.short,level}
  }
  const room=rooms.find(item=>item.floor===(upper?'upper':'ground')&&contains(item.rect,x,z,.1))
  if(room) return {id:room.id,name:room.name,level}
  if(upper) return {id:'upper-corridor',name:'Palier et circulation',level}
  if(contains(property.building,x,z)) return {id:'ground-corridor',name:'Couloir principal',level}
  const outside=outsideZones.find(item=>contains(item.rect,x,z))
  return {id:outside?.id??'site',name:outside?.name??'Circulation extérieure',level:'Extérieur'}
}
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
  solar: {yield:1738, selfUse:.9, moduleWatts:500, moduleWidth:1.12, moduleDepth:2.1},
}

export const phases = {
  1:{name:'Mise en service',racks:16,servers:48,storageScale:1,avgIT:55,solar:80, networkScale:1},
  2:{name:'Extension interne',racks:32,servers:96,storageScale:2,avgIT:110,solar:80,networkScale:1.5},
  3:{name:'Capacité complète',racks:48,servers:144,storageScale:3,avgIT:165,solar:80,networkScale:2},
} satisfies Record<Phase,{name:string;racks:number;servers:number;storageScale:number;avgIT:number;solar:number;networkScale:number}>

export const hallInfrastructure=(['hall-a','hall-b'] as const).map((id,index)=>{
  const [x,z,w]=rooms.find(room=>room.id===id)!.rect
  const suffix=index===0?'A':'B'
  return {id,suffix,x,z,crac:[x+w-.71,0,z+1.02] as Point,pdu:[x+.65,0,z+(suffix==='A'?1.15:6.6)] as Point,
    condenser:[x+1.25,0,-17.75] as Point,temperature:[x+2.3,0,z+2.7] as Point}
})
// The first three units exist in both halls from phase 1.
export const coolingCircuitSuffixes=['','Surviving','Reserve'] as const

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
  {id:'ups',name:'Onduleurs et batteries',position:[-18.7,0,6.8],kind:'ups',layer:'power',cost:'ups',description:'Les batteries maintiennent provisoirement l’alimentation pendant le démarrage des groupes électrogènes.'},
  {id:'switchgear',name:'Armoires de distribution',position:[-15.29,0,2],kind:'panel',layer:'power',cost:'switchgear',description:'Les armoires protègent les circuits et distribuent la puissance aux onduleurs et aux équipements essentiels.'},
  {id:'router',name:'Routeurs et pare-feu',position:[14.4,0,-5.5],kind:'router',layer:'network',cost:'network',description:'Les routeurs sélectionnent le chemin du trafic. Les pare-feu appliquent les règles d’accès aux services.'},
  {id:'fiber',name:'Tiroirs de raccordement fibre',position:[17.2,0,-5.5],kind:'router',layer:'network',cost:'cabling',description:'Les tiroirs connectent physiquement les fibres extérieures aux équipements du centre de données.'},
  {id:'core',name:'Commutation du cœur réseau',position:[12.25,0,-5.5],kind:'router',layer:'network',cost:'network',description:'Le cœur réseau dessert les baies des deux salles et transporte les échanges entre serveurs.'},
  {id:'solar',name:'Panneaux photovoltaïques',position:[-4,4.65,-.5],kind:'solar',layer:'solar',cost:'solar',description:'La production solaire alimente une partie des besoins en journée. Les batteries des onduleurs et les groupes ont une fonction de secours distincte.'},
  {id:'inverter',name:'Onduleur photovoltaïque',position:[-7.35,0,2],kind:'panel',layer:'solar',cost:'solar',description:'Convertit la production des panneaux en courant alternatif injecté dans le tableau du site.'},
  {id:'security',name:'Contrôle des véhicules',position:siteAccess.booth,kind:'security',cost:'security',description:'Les véhicules entrent par le portail est, longent le stationnement et l’aire de livraison, puis ressortent par le portail ouest.'},
  {id:'fire',name:'Détection et extinction incendie',position:[-18.92,0,-8.9],kind:'fire',cost:'fire',description:'La détection par aspiration surveille l’air des salles. Le système d’extinction diffuse un agent propre dans la zone protégée.'},
  {id:'leak',name:'Détection de fuite',position:[-5.8,0,5],kind:'sensor',layer:'air',cost:'security',description:'Une sonde au sol signale une fuite près des équipements de froid.'},
  {id:'camera',name:'Caméra de périmètre',position:siteAccess.camera,kind:'camera',cost:'security',description:'Les caméras surveillent les entrées du site et les accès au bâtiment.'},
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


// Each terminal is shared with its equipment mesh.
export const technicalPorts:Record<string,Point>={
  grid:[-26.45,1.42,-11.74],transformer:[-24.66,2.633,-8],transformerExit:[-22.58,1.12,-8],
  generator:[-21.66,1.16,-3.8],powerEntry:[-20.13,.54,2],
  transfer:[-18.8,2.49,2],switchgear:[-15.29,2.49,2],coolingBoard:[-14.12,2.49,2],
  upsInput:[-18.87,2.49,6.8],ups:[-18.54,2.49,6.8],battery:[-13.5,2.39,6.8],
  ispA:[22.8,.14,-10.9],ispB:[22.8,.14,1.02],
  fiber:[17.2,2.34,-5.5],fiberJackB:[17.2,2.34,-5.31],
  router:[14.4,2.34,-5.5],routerOut:[14.21,2.34,-5.5],core:[12.25,2.34,-5.5],
  solar:[-18.9,property.technicalHeight+.41,-12.32],inverter:[-7.35,1.81,2],
}

export const coordinates:Record<string,Point>={
  gridEntry:[-26.45,2.633,-11.74],gridCorner:[-24.66,2.633,-11.74],
  transformerDrop:[-22.58,.54,-8],generatorDrop:[-21.66,.54,-3.8],
  yardFeed:[-21.38,.54,-8],generatorJoin:[-21.38,.54,-3.8],yardTurn:[-21.38,.54,2],
  transferRiser:[-18.8,.54,2],upsOverhead:[-18.87,2.68,6.8],switchgearOverhead:[-15.29,2.68,2],
  // The UPS feed leaves the switchgear on its own tray so it never retraces the transfer cable.
  upsFeedTurn:[-15.29,2.68,5.6],upsFeedWest:[-19.4,2.68,5.6],upsFeedEntry:[-19.4,2.68,6.8],batteryRiser:[-13.5,2.66,6.8],upsBattery:[-18.87,2.66,6.8],
  upsMain:[-18.54,2.76,6.8],busA:[-18.54,2.76,-1.43],busB:[-18.54,2.76,-.68],
  fiberWallA:[20.16,.14,-10.9],fiberWallB:[20.16,.14,1.02],fiberRiserA:[20.16,2.72,-10.9],
  fiberRiserB:[20.16,2.57,1.02],fiberCornerA:[20.16,2.72,-5.5],fiberCornerB:[20.16,2.57,-5.31],
  fiberInA:[17.2,2.72,-5.5],fiberInB:[17.2,2.57,-5.31],
  fiberTray:[17.2,2.52,-5.5],edgeTray:[14.4,2.52,-5.5],edgeOut:[14.21,2.52,-5.5],coreTop:[12.25,2.52,-5.5],
  coreLift:[12.25,2.58,-5.5],coreTray:[12.25,2.58,-1.9],crossTray:[-1.56,2.58,-1.9],
  solarAlongRoof:[-7.35,property.technicalHeight+.41,-12.32],solarRiser:[-7.35,property.technicalHeight+.41,2],
  inverterLift:[-7.35,2.49,2],coolingLift:[-14.12,2.94,2],
}
for(const hall of hallInfrastructure){
  const {id,suffix:s,z,crac,pdu,condenser}=hall
  const rack=(use:RackUse)=>rackPositions.find(rack=>rack.hall===id&&rack.purpose===use)!
  const compute=rack('Calcul')
  const [rx,,rz]=compute.position,[cx,,cz]=crac,[px,,pz]=pdu,[kx,,kz]=condenser
  for(const [key,item] of [['compute',compute],['storage',rack('Stockage NVMe')],['hdd',rack('Stockage HDD')],['backup',rack('Sauvegarde')]] as const){
    const [x,,rackZ]=item.position
    technicalPorts[key+s]=[x,2.40,rackZ]
    coordinates[key+'Tray'+s]=[x,2.58,rackZ]
    coordinates[key+'Branch'+s]=[x,2.58,-1.9]
  }
  for(const [feed,offset,sign,busZ] of [['A',0,-1,-1.43],['B',.7,1,-.68]] as const){
    const x=px+offset,end=rx+sign*.183
    const trayZ=rz+sign*.08,pduSide=pz+sign*.124,height=feed==='A'?2.71:2.84
    technicalPorts['pdu'+s+feed]=[x,1.91,pduSide]
    technicalPorts['pduOut'+s+feed]=[x,1.91,pz]
    technicalPorts['powerDrop'+s+feed]=[end,2.40,rz]
    Object.assign(coordinates,{
      ['riser'+s+feed]:[x,2.76,busZ],['tray'+s+feed]:[x,2.76,pduSide],
      ['pduLift'+s+feed]:[x,height,pz],['powerTray'+s+feed]:[x,height,trayZ],
      ['powerBranch'+s+feed]:[end,height,trayZ],['powerEnd'+s+feed]:[end,height,rz],
    })
  }
  const front=specs.rack.depth/2
  const inletZ=rz+compute.front*(front+.061),exhaustZ=rz-compute.front*(front+.054)
  const coldZ=z+2.72,hotZ=exhaustZ-.31
  Object.assign(technicalPorts,{
    ['cracFeed'+s]:[cx,2.51,cz+.175],
    ['intake'+s]:[rx,1.20,inletZ],['rackRear'+s]:[rx,1.46,exhaustZ],
  })
  Object.assign(coordinates,{
    ['airAcross'+s]:[cx,.108,coldZ],['underfloor'+s]:[rx,.108,coldZ],['cold'+s]:[rx,1.20,coldZ],
    ['warmExit'+s]:[rx,1.46,hotZ],['warm'+s]:[rx,2.94,hotZ],
    ['return'+s]:[cx,2.94,hotZ],
    ['coolingCross'+s]:[cx,2.94,2],['coolingDrop'+s]:[cx,2.94,cz+.175],
  })
  coolingCircuitSuffixes.forEach((mode,index)=>{
    const unit=s+mode,vent=cz+index*1.21+.365,takeoff=vent-.555
    const condenserPort=kx+index*2.36+1.19,hotPipeX=cx+.19,liquidPipeX=cx-.19
    Object.assign(technicalPorts,{
      ['cracSupply'+unit]:[cx,.36,vent],['cracReturn'+unit]:[cx,2.12,vent],
      ['cracRefrigerant'+unit]:[hotPipeX,2.51,takeoff],['cracLiquid'+unit]:[liquidPipeX,2.51,takeoff],
      ['condenser'+unit]:[condenserPort,.94,kz-.30],['liquid'+unit]:[condenserPort,.62,kz+.30],
    })
    Object.assign(coordinates,{
      ['plenum'+unit]:[cx,.108,vent],['returnElbow'+unit]:[cx,2.94,vent],
      ['hotRiser'+unit]:[hotPipeX,2.68,takeoff],['roofPipe'+unit]:[hotPipeX,2.68,-14.05],
      ['hotAcross'+unit]:[condenserPort,2.68,-14.05],['hotDrop'+unit]:[condenserPort,.94,-14.05],
      ['liquidTurn'+unit]:[condenserPort,.62,-13.65],['liquidLift'+unit]:[condenserPort,2.48,-13.65],
      ['liquidPipe'+unit]:[liquidPipeX,2.48,-13.65],['liquidEntry'+unit]:[liquidPipeX,2.48,takeoff],
    })
  })
}
Object.assign(coordinates,technicalPorts)

type Route={paths:string[][];tone?:'warm'|'refrigerant'|'reduced'}
const route=(...paths:string[][]):Route=>({paths})
const switchgearToUps=['switchgear','switchgearOverhead','upsFeedTurn','upsFeedWest','upsFeedEntry','upsOverhead','upsInput']
const supplyToUps=['powerEntry','transferRiser','transfer',...switchgearToUps]
const powerRoutes={
  grid:route(
    ['grid','gridEntry','gridCorner','transformer'],
    ['transformerExit','transformerDrop','yardFeed','generatorJoin','yardTurn',...supplyToUps],
  ),
  generator:route(['generator','generatorDrop','generatorJoin','yardTurn',...supplyToUps]),
  battery:route(['battery','batteryRiser','upsBattery','upsInput']),
  racks:route(...hallInfrastructure.flatMap(({suffix:s})=>['A','B'].flatMap(feed=>[
    ['ups','upsMain','bus'+feed,'riser'+s+feed,'tray'+s+feed,'pdu'+s+feed],
    ['pduOut'+s+feed,'pduLift'+s+feed,'powerTray'+s+feed,'powerBranch'+s+feed,'powerEnd'+s+feed,'powerDrop'+s+feed],
  ]))),
  cooling:route(...hallInfrastructure.map(({suffix:s})=>['coolingBoard','coolingLift','coolingCross'+s,'coolingDrop'+s,'cracFeed'+s])),
}
const coolingRoutes=Object.fromEntries(hallInfrastructure.flatMap(({suffix:s})=>coolingCircuitSuffixes.flatMap(mode=>{
  const unit=s+mode
  const floorSupply=['airAcross'+s,'underfloor'+s,'cold'+s,'intake'+s]
  const supply=route(['cracSupply'+unit,'plenum'+unit,...floorSupply])
  if(mode==='Surviving') supply.tone='reduced'
  return [
    [mode==='Surviving'?'reduced'+s:'supply'+unit,supply],
    ['return'+unit,{paths:[['rackRear'+s,'warmExit'+s,'warm'+s,'return'+s,'returnElbow'+unit,'cracReturn'+unit]],tone:'warm'}],
    ['refrigerant'+unit,{paths:[
      ['cracRefrigerant'+unit,'hotRiser'+unit,'roofPipe'+unit,'hotAcross'+unit,'hotDrop'+unit,'condenser'+unit],
      ['liquid'+unit,'liquidTurn'+unit,'liquidLift'+unit,'liquidPipe'+unit,'liquidEntry'+unit,'cracLiquid'+unit],
    ],tone:'refrigerant'}],
  ]
}))) as Record<string,Route>
const distribution={
  hallA:route(['core','coreLift','coreTray','computeBranchA','computeTrayA','computeA']),
  hallB:route(['core','coreLift','coreTray','computeBranchB','computeTrayB','computeB']),
}
export const topology:Record<Layer,Record<string,Route>>={
  power:powerRoutes,
  air:coolingRoutes,
  network:{
    ispA:route(['ispA','fiberWallA','fiberRiserA','fiberCornerA','fiberInA','fiber']),
    ispB:route(['ispB','fiberWallB','fiberRiserB','fiberCornerB','fiberInB','fiberJackB']),
    core:route(['fiber','fiberTray','edgeTray','router'],['routerOut','edgeOut','coreTop','core']),
    ...distribution,
  },
  storage:{
    accessA:route(['computeA','computeTrayA','computeBranchA','storageBranchA','storageTrayA','storageA']),
    accessB:route(['computeB','computeTrayB','computeBranchB','storageBranchB','storageTrayB','storageB']),
    remoteB:route(['computeA','computeTrayA','computeBranchA','crossTray','storageBranchB','storageTrayB','storageB']),
    replica:route(['storageA','storageTrayA','storageBranchA','crossTray','storageBranchB','storageTrayB','storageB']),
    rebuild:route(['storageB','storageTrayB','storageBranchB','crossTray','storageBranchA','storageTrayA','storageA']),
    hdd:route(['hddA','hddTrayA','hddBranchA','crossTray','hddBranchB','hddTrayB','hddB']),
    backup:route(...hallInfrastructure.map(({suffix:s})=>['compute'+s,'computeTray'+s,'computeBranch'+s,'backupBranch'+s,'backupTray'+s,'backup'+s])),
  },
  compute:distribution,
  solar:{
    panels:route(['solar','solarAlongRoof','solarRiser','inverter','inverterLift',...switchgearToUps]),
    grid:powerRoutes.grid,
    racks:powerRoutes.racks,cooling:powerRoutes.cooling,
  },
}
export const normalRoutes:Record<Layer,string[]>={
  power:['grid','racks','cooling'],air:['supplyA','returnA','refrigerantA','supplyB','returnB','refrigerantB'],
  network:['ispA','ispB','core','hallA','hallB'],storage:['accessA','accessB','replica','hdd','backup'],
  compute:['hallA','hallB'],solar:['panels','grid','racks','cooling'],
}

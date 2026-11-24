import { area, landArea, phases, property, rackPositions, rooms, services, specs, type Phase } from './model'

export type Scenario = 'prudent' | 'équilibré' | 'soutenu'
export const scenarios: Record<Scenario,number[]> = {
  prudent:[.15,.25,.40,.55,.65], équilibré:[.25,.40,.60,.75,.85], soutenu:[.40,.60,.80,.90,.95],
}

export type Inputs = {
  occupancy:number; tariff:number; fixed:number; pue:number; solar:number; servers:number;
  racks:number; hardware:number; maintenance:number; growth:number; phase2Year:number; phase3Year:number;
  prices:Record<string,number>; scenario?:Scenario;
}
export function defaults(phase:Phase):Inputs {
  const model=phases[phase]
  return {occupancy:.25,tariff:1,fixed:60_000,pue:1.5,solar:model.solar,servers:model.servers,racks:model.racks,
    hardware:1,maintenance:1,growth:0,phase2Year:0,phase3Year:0,
    prices:Object.fromEntries(services.filter(service=>!service.future).map(service=>[service.id,service.price]))}
}
export function constrain(value:number,min:number,max:number) {
  return Math.min(max,Math.max(min,Number.isFinite(value)?value:min))
}
export function permittedRacks(value:number,phase:Phase) {
  return Math.floor(constrain(value,0,phases[phase].racks)/2)*2
}
export function activeRacks(phase:Phase,total=phases[phase].racks) {
  return rackPositions.filter((rack,index)=>rack.phase<=phase && index%24<permittedRacks(total,phase)/2)
}
function split(total:number,index:number,groups:number) {
  return Math.floor(total/groups)+(index<total%groups?1:0)
}
export function population(phase:Phase,inputs:Inputs) {
  const racks=activeRacks(phase,inputs.racks)
  const scale=racks.length/16
  const compute=racks.filter(rack=>rack.purpose==='Calcul')
  const servers=Math.floor(constrain(inputs.servers,0,Math.min(compute.length*8,phases[phase].servers)))
  const groups={
    'Calcul':{count:servers,units:specs.compute.units},
    'Stockage NVMe':{count:specs.nvme.nodes*Math.floor(scale),units:specs.nvme.units},
    'Stockage HDD':{count:specs.hdd.nodes*Math.floor(scale),units:specs.hdd.units},
    'Sauvegarde':{count:specs.backup.nodes*Math.floor(scale),units:specs.backup.units},
  }
  return racks.map(rack=>{
    const peers=racks.filter(peer=>peer.purpose===rack.purpose)
    const group=groups[rack.purpose]
    const count=split(group.count,peers.findIndex(peer=>peer.id===rack.id),peers.length)
    const isFirstCompute=rack.purpose==='Calcul'&&peers.find(peer=>peer.hall===rack.hall&&peer.phase===rack.phase)?.id===rack.id
    const networkU=isFirstCompute||rack.purpose==='Stockage NVMe'?2:0
    return {...rack,count,networkU,units:count*group.units+networkU}
  })
}
export type PopulatedRack = ReturnType<typeof population>[number]

function tier(nodes:number,spec:typeof specs.nvme) {
  const raw=nodes*spec.disks*spec.diskTB
  const usable=raw*spec.data/spec.fragments
  return {nodes,raw,usable,allocatable:usable*(1-specs.storageReserve)}
}
export function capacity(phase:Phase,inputs:Inputs=defaults(phase)) {
  const racks=population(phase,inputs)
  const count=(purpose:PopulatedRack['purpose'])=>racks.filter(rack=>rack.purpose===purpose).reduce((sum,rack)=>sum+rack.count,0)
  const servers=count('Calcul')
  const cpu=servers*specs.compute.cores
  const ram=servers*specs.compute.ram
  const designIT=racks.length*specs.rack.kW
  const idleShare=15/55
  const plan=phases[phase]
  const avgIT=Math.min(designIT,plan.avgIT*(idleShare*racks.length/plan.racks+(1-idleShare)*servers/plan.servers))
  const nvme=tier(count('Stockage NVMe'),specs.nvme),hdd=tier(count('Stockage HDD'),specs.hdd)
  const backupNodes=count('Sauvegarde')
  const backupRaw=backupNodes*specs.backup.rawPerNode
  const backupUsable=backupRaw*specs.backup.arrayFactor*(1-specs.backup.reserve)
  const protectedTB=backupNodes*specs.backup.protectedTB/specs.backup.nodes
  const backupDemand=protectedTB*(1+specs.backup.dailyChange*(specs.backup.days-1)*specs.backup.dedup)*specs.backup.compression
  const dedicated=Math.floor(servers*.15*(1-specs.compute.haReserve))
  const clusterHosts=servers-dedicated
  const vcpu=Math.floor(clusterHosts*specs.compute.cores*specs.compute.cpuRatio*(1-specs.compute.haReserve))
  const clusterRam=Math.floor(clusterHosts*specs.compute.ram*(1-specs.compute.memoryReserve)*(1-specs.compute.haReserve))
  const vmSlots=Math.floor(Math.min(vcpu/specs.compute.virtualCores,clusterRam/specs.compute.virtualRam,nvme.allocatable/specs.compute.virtualTB))
  const vm=Math.floor(vmSlots*.75)
  const privateLots=Math.floor((vmSlots-vm)/32)
  const backupCommercial=Math.max(0,Math.floor(backupUsable-backupDemand))
  const perHallDesign=designIT*specs.thermal.designMultiplier/2
  const activeCooling=Math.ceil(perHallDesign/specs.thermal.netUnitKW)
  const coolingUnits=activeCooling?2*(activeCooling+1):0
  const criticalFacility=designIT*1.5
  const generators=designIT?Math.ceil(criticalFacility/specs.electrical.generatorKW)+1:0
  const upsModules=2*Math.ceil(designIT/specs.electrical.upsKW)
  const batteryKWh=2*designIT*(specs.electrical.minutes/60)/.85
  return {racks,servers,cpu,ram,designIT,avgIT,nvme,hdd,backupNodes,backupRaw,backupUsable,backupDemand,protectedTB,
    vcpu,clusterRam,vmSlots,upsModules,batteryKWh,generators,coolingUnits,activeCooling,perHallDesign,
    fuelL:Math.max(0,generators-1)*specs.electrical.fuelHours*specs.electrical.fuelLPerHour,
    availableU:racks.length*specs.rack.u-racks.reduce((sum,rack)=>sum+rack.units,0),
    usable:nvme.usable+hdd.usable, raw:nvme.raw+hdd.raw, allocatable:nvme.allocatable+hdd.allocatable,
    products:{vps:vm,dedicated,object:Math.floor(hdd.allocatable),backup:backupCommercial,private:privateLots}}
}
export type Capacity=ReturnType<typeof capacity>

export function solarProfile(hour:number, solar:number, totalKW:number) {
  const elevation=Math.max(0,Math.sin(Math.PI*(hour-6)/12))*(hour>6&&hour<18?1:0)
  const production=constrain(solar,0,120)*elevation*.82
  const selfUse=Math.min(totalKW,production)
  return {production,selfUse,grid:totalKW-selfUse,elevation}
}
export function energy(phase:Phase,inputs:Inputs=defaults(phase),cap=capacity(phase,inputs)) {
  const facility=cap.avgIT*constrain(inputs.pue,1,3)
  const demand=facility*8760
  const production=constrain(inputs.solar,0,120)*specs.solar.yield
  const profile=Array.from({length:96},(_,i)=>solarProfile((i+.5)/4,inputs.solar,facility))
  const generationDay=profile.reduce((sum,item)=>sum+item.production/4,0)
  const consumedDay=profile.reduce((sum,item)=>sum+item.selfUse/4,0)
  const solarUse=Math.min(demand,production*Math.min(specs.solar.selfUse,generationDay?consumedDay/generationDay:0))
  const grid=demand-solarUse
  const tariff=constrain(inputs.tariff,0,5)
  return {facility,demand,production,solarUse,grid,cost:grid*tariff+constrain(inputs.fixed,0,1e6),savings:solarUse*tariff}
}
export const costRows = [
  {id:'land',name:'Terrain',group:'Bâtiment et site',unit:'parcelle',cost:[650_000,property.price,property.price],source:'Prix affiché et plafond retenu pour la parcelle. Frais d’acquisition exclus.'},
  {id:'site',name:'Terrassement, clôtures et voirie',group:'Bâtiment et site',unit:'m² hors emprise',cost:[180,300,490],source:'Provision travaux extérieurs selon emprise, réseaux et accès.'},
  {id:'shell',name:'Construction et aménagement ordinaire',group:'Bâtiment et site',unit:'m² de plancher',cost:[3200,4600,6500],source:'Repères hangar industriel marocain, majorés pour aile administrative, isolation et finitions.'},
  {id:'design',name:'Architecture et études techniques',group:'Bâtiment et site',unit:'forfait',cost:[330_000,560_000,810_000],source:'Provision études et suivi, hors construction.'},
  {id:'furniture',name:'Mobilier et équipement du bâtiment',group:'Bâtiment et site',unit:'lot',cost:[100_000,190_000,300_000],source:'Provision accueil, bureaux et supervision.'},
  {id:'electrical',name:'Installations électriques A/B',group:'Infrastructure spécialisée',unit:'lot de 16 baies',cost:[500_000,800_000,1_250_000],source:'Provision tableaux aval, protection, câbles et prises en baie.'},
  {id:'switchgear',name:'Transformateur et distribution amont',group:'Infrastructure spécialisée',unit:'kVA installé',cost:[2000,2850,4300],source:'Ratio estimatif pour poste, protections amont et transfert.'},
  {id:'ups',name:'Onduleurs et batteries',group:'Infrastructure spécialisée',unit:'module de 120 kW',cost:[260_000,430_000,650_000],source:'Provision par module et batteries. Référence Schneider Galaxy VS, sans devis.'},
  {id:'generator',name:'Groupes, rétention et carburant de secours',group:'Infrastructure spécialisée',unit:'groupe de 200 kW',cost:[360_000,540_000,770_000],source:'Provision groupes, échappement, insonorisation et rétention.'},
  {id:'crac',name:'Climatisation de précision DX',group:'Infrastructure spécialisée',unit:'unité de 32 kW nets',cost:[170_000,255_000,390_000],source:'Provision par climatiseur avec condenseur, tuyauterie et régulation.'},
  {id:'solar',name:'Installation photovoltaïque',group:'Infrastructure spécialisée',unit:'kWc',cost:[6800,8800,11800],source:'Fourchette pour une installation en autoconsommation commerciale, pose et onduleur inclus.'},
  {id:'rack',name:'Baies 42U',group:'Informatique et réseau',unit:'baie',cost:[5500,8500,13000],source:'Baie nue avec montants, panneaux et guidage.'},
  {id:'compute',name:'Serveurs de calcul reconditionnés',group:'Informatique et réseau',unit:'serveur',cost:[14000,21000,30000],source:'Provision configuration 32 cœurs et 256 Gio, pièces et garantie à confirmer.'},
  {id:'nvme',name:'Serveurs de stockage NVMe',group:'Informatique et réseau',unit:'nœud',cost:[44000,65000,95000],source:'Provision nœud, huit SSD entreprise, interfaces doubles et pièces.'},
  {id:'hdd',name:'Serveurs de stockage HDD',group:'Informatique et réseau',unit:'nœud',cost:[27000,40000,59000],source:'Provision nœud, huit disques entreprise et interfaces doubles.'},
  {id:'backup',name:'Serveurs de sauvegarde',group:'Informatique et réseau',unit:'nœud',cost:[50000,80000,115000],source:'Provision serveur 144 To bruts, interfaces et disques.'},
  {id:'network',name:'Réseau, pare-feu et armoires opérateurs',group:'Informatique et réseau',unit:'lot équivalent initial',cost:[430_000,750_000,1_210_000],source:'Provision paire de routeurs, pare-feu, agrégation et commutation par baie.'},
  {id:'cabling',name:'Câblage structuré et fibre',group:'Informatique et réseau',unit:'lot de 16 baies',cost:[95000,160000,260000],source:'Provision chemins, tiroirs et pose des câbles de données.'},
  {id:'security',name:'Contrôle d’accès et sûreté',group:'Infrastructure spécialisée',unit:'site',cost:[125000,215000,350000],source:'Provision lecteurs, sas, vidéosurveillance et détection de fuite. Clôture au lot voirie.'},
  {id:'fire',name:'Détection et extinction incendie',group:'Infrastructure spécialisée',unit:'site',cost:[270000,465000,780000],source:'Provision détection par aspiration, extincteurs et agent propre en zones techniques.'},
] as const
export type CostId=(typeof costRows)[number]['id']
export const costDate='novembre 2026'
export function costs(phase:Phase,inputs:Inputs=defaults(phase),cap=capacity(phase,inputs)) {
  const q:Record<CostId,number>={
    land:1,site:landArea-area(property.building),shell:area(property.building)+area(property.upper),design:1,furniture:1,
    electrical:cap.racks.length/16,switchgear:specs.electrical.transformer[phase-1],ups:cap.upsModules,generator:cap.generators,
    crac:cap.coolingUnits,solar:constrain(inputs.solar,0,120),rack:cap.racks.length,compute:cap.servers,nvme:cap.nvme.nodes,
    hdd:cap.hdd.nodes,backup:cap.backupNodes,network:phases[phase].networkScale,cabling:cap.racks.length/16,security:1,fire:1,
  }
  const rows=costRows.map(row=>{
    const multiplier=row.group==='Informatique et réseau'?constrain(inputs.hardware,.25,3):1
    const unit=row.cost.map(price=>price*multiplier)
    return {...row,quantity:q[row.id],unitCost:unit, totals:unit.map(price=>price*q[row.id])}
  })
  const subtotal=[0,1,2].map(column=>rows.reduce((sum,row)=>sum+row.totals[column],0))
  const contingency=subtotal.map(total=>total*.12)
  const totals=subtotal.map((total,index)=>total+contingency[index])
  return {rows,subtotal,totals,contingency,central:totals[1]}
}
export function operations(phase:Phase,inputs:Inputs=defaults(phase),cap=capacity(phase,inputs),power=energy(phase,inputs,cap),budget=costs(phase,inputs,cap)) {
  const asset=(id:CostId)=>budget.rows.find(row=>row.id===id)!.totals[1]
  const maintenance=constrain(inputs.maintenance,0,3)
  const itAssets=(['rack','compute','nvme','hdd','backup','network'] as CostId[]).reduce((sum,id)=>sum+asset(id),0)
  const rows=[
    {name:'Électricité et frais fixes',cost:power.cost},
    {name:'Connectivité des deux opérateurs',cost:240_000*phases[phase].networkScale},
    {name:'Maintenance informatique',cost:itAssets*.04*maintenance},
    {name:'Groupes et carburant des essais',cost:(asset('generator')*.035+Math.max(0,cap.generators-1)*specs.electrical.exerciseHours*specs.electrical.fuelLPerHour*specs.electrical.dieselMAD)*maintenance},
    {name:'Maintenance du refroidissement',cost:asset('crac')*.05*maintenance},
    {name:'Entretien solaire',cost:asset('solar')*.015*maintenance},
    {name:'Abonnements et logiciels',cost:(cap.servers*420+cap.backupNodes*2500)*maintenance},
    {name:'Réserve de remplacement',cost:itAssets*.07*maintenance},
    {name:'Assurance des installations',cost:budget.central*.005},
    {name:'Eau et services techniques',cost:56_000*maintenance},
  ]
  const annual=rows.reduce((sum,row)=>sum+row.cost,0)
  return {rows,annual,monthly:annual/12}
}
export function revenue(cap:Capacity,inputs:Inputs,occupancy=inputs.occupancy) {
  return Object.entries(cap.products).reduce((sum,[id,quantity])=>sum+quantity*constrain(inputs.prices[id]??0,0,100_000),0)*constrain(occupancy,0,1)
}
export function projections(phase:Phase,inputs:Inputs,scenario:Scenario) {
  let previousInvestment=0,cumulative=0
  return scenarios[scenario].map((baseline,index)=>{
    const year=index+1
    const phase2=phase>=2||(inputs.phase2Year>=2&&inputs.phase2Year<=year)
    const phase3=phase2&&inputs.phase3Year>(phase>=2?1:inputs.phase2Year)&&inputs.phase3Year<=year
    const deployment=Math.max(phase,phase3?3:phase2?2:1) as Phase
    const current=deployment===phase?inputs:{...inputs,servers:phases[deployment].servers,racks:phases[deployment].racks}
    const cap=capacity(deployment,current)
    const investment=costs(deployment,current,cap).central
    const opex=operations(deployment,current,cap).annual
    const occupancy=constrain(baseline+inputs.occupancy-.25+inputs.growth*index,0,1)
    const turnover=revenue(cap,current,occupancy)*12
    const capex=Math.max(0,investment-previousInvestment)
    previousInvestment=Math.max(investment,previousInvestment)
    const margin=turnover-opex
    cumulative+=margin-capex
    return {year,phase:deployment,occupancy,turnover,opex,capex,margin,cumulative}
  })
}
export const groundSupport=area(property.building)-rooms.filter(room=>room.floor==='ground').reduce((sum,room)=>sum+area(room.rect),0)

import { describe,expect,it } from 'vitest'
import { InstancedMesh,Raycaster,Vector3 } from 'three'
import { outdoor } from '../src/outdoorGeometry'
import { disposeGroup,type Picks } from '../src/geometryTools'
import { activeRacks,capacity,constrain,costs,defaults,energy,groundSupport,operations,solarProfile } from '../src/engineering'
import { area,landArea,phases,property,rackPositions,rooms,specs,topology,coordinates,normalRoutes,stairs,technicalPorts,walkHeight,walkZoneAt,type Rect } from '../src/model'
import { simulations } from '../src/simulations'

it('présente une seule surface visible entre les nervures des couvercles fibre',()=>{
  const scene=outdoor(capacity(1),1)
  try{
    for(const id of ['ispA','ispB']){
      const [x,,z]=technicalPorts[id]
      const ray=new Raycaster(new Vector3(x+.031,2,z+.035),new Vector3(0,-1,0))
      const hits=ray.intersectObject(scene,true).filter(hit=>
        hit.object instanceof InstancedMesh&&hit.instanceId!==undefined&&(hit.object as Picks).userData.ids[hit.instanceId]===id,
      )
      const front=hits[0]?.distance
      expect(front,id).toBeDefined()
      expect(hits.filter(hit=>Math.abs(hit.distance-front!)<.001),id).toHaveLength(1)
    }
  }finally{
    disposeGroup(scene)
  }
})
const phaseNumbers=[1,2,3] as const
function overlap([x,z,w,d]:Rect,[a,b,c,e]:Rect) {
  return Math.max(0,Math.min(x+w,a+c)-Math.max(x,a))*Math.max(0,Math.min(z+d,b+e)-Math.max(z,b))
}
describe('géométrie et population',()=>{
  it('respecte les surfaces et sépare les salles de chaque niveau',()=>{
    expect(landArea).toBe(2465);expect(area(property.building)).toBe(1000);expect(area(property.upper)).toBe(120)
    expect(groundSupport).toBe(240)
    for(const room of rooms){
      expect(overlap(room.rect,room.floor==='ground'?property.building:property.upper)).toBeCloseTo(area(room.rect))
      for(const other of rooms.filter(item=>item.floor===room.floor&&item.id!==room.id)) expect(overlap(room.rect,other.rect)).toBeCloseTo(0)
    }
  })
  it('place 24 baies distinctes par salle et conserve les allées',()=>{
    expect(rackPositions).toHaveLength(48)
    expect(new Set(rackPositions.map(rack=>rack.id)).size).toBe(48)
    for(const hall of ['hall-a','hall-b']){
      const r=rooms.find(room=>room.id===hall)!
      const racks=rackPositions.filter(rack=>rack.hall===hall)
      expect(racks).toHaveLength(24)
      const rects:Rect[]=racks.map(({position:[x,,z]})=>[x-specs.rack.width/2,z-specs.rack.depth/2,specs.rack.width,specs.rack.depth])
      rects.forEach((rect,i)=>{
        expect(overlap(rect,r.rect)).toBeCloseTo(area(rect))
        rects.slice(i+1).forEach(other=>expect(overlap(rect,other)).toBeCloseTo(0))
      })
      const rows=[...new Set(racks.map(rack=>rack.position[2]))].sort((a,b)=>a-b)
      for(let i=1;i<rows.length;i++) expect(rows[i]-rows[i-1]-specs.rack.depth).toBeGreaterThanOrEqual(1.15)
    }
  })
  it('reproduit 16 armoires dont 10 de calcul et 48 serveurs initiaux',()=>{
    const c=capacity(1)
    expect(c.racks).toHaveLength(16);expect(c.servers).toBe(48)
    expect(c.cpu).toBe(1536);expect(c.ram/1024).toBe(12);expect(c.availableU).toBeGreaterThan(0)
    expect(c.racks.filter(rack=>rack.purpose==='Calcul')).toHaveLength(10)
    for(const role of ['Stockage NVMe','Stockage HDD','Sauvegarde']) expect(c.racks.filter(rack=>rack.purpose===role)).toHaveLength(2)
    expect(c.racks.every(rack=>rack.units<=specs.rack.u)).toBe(true)
    expect(c.vmSlots).toBeLessThanOrEqual(c.nvme.allocatable/specs.compute.virtualTB)
    expect(c.allocatable).toBeLessThan(c.usable)
  })
  it('respecte le dimensionnement des modules et réserve une unité de secours par salle',()=>{
    for(const p of phaseNumbers){
      const c=capacity(p)
      expect(c.racks).toHaveLength(p*16);expect(c.servers).toBe(p*48);expect(c.designIT).toBe(p*96)
      expect(c.avgIT).toBeCloseTo(phases[p].avgIT)
      expect(c.coolingUnits/2-1).toBe(c.activeCooling)
      expect(c.activeCooling*specs.thermal.netUnitKW).toBeGreaterThanOrEqual(c.perHallDesign)
      expect((c.generators-1)*specs.electrical.generatorKW).toBeGreaterThanOrEqual(c.designIT*1.5)
      expect(c.upsModules/2*specs.electrical.upsKW).toBeGreaterThanOrEqual(c.designIT)
    }
  })
  it('borne les entrées invalides et ne crée aucune ressource à vide',()=>{
    expect(constrain(NaN,0,4)).toBe(0)
    expect(activeRacks(1,99)).toHaveLength(16)
    expect(activeRacks(1,7)).toHaveLength(6)
    const c=capacity(1,{...defaults(1),racks:-1,servers:9999})
    expect(c.servers).toBe(0);expect(c.designIT).toBe(0);expect(c.raw).toBe(0)
    expect(c.vmSlots).toBe(0)
    expect(capacity(1,{...defaults(1),servers:0}).avgIT).toBeGreaterThan(0)
  })
})
describe('stockage et énergie',()=>{
  it('calcule la réplication, les fragments, la réserve et la sauvegarde séparément',()=>{
    const c=capacity(1)
    expect(c.nvme.raw).toBeCloseTo(184.32)
    expect(c.nvme.usable).toBeCloseTo(61.44)
    expect(c.hdd.raw).toBeCloseTo(576)
    expect(c.hdd.usable).toBeCloseTo(345.6)
    expect(c.raw).toBeCloseTo(760.32)
    expect(c.usable).toBeCloseTo(407.04)
    expect(c.allocatable).toBeCloseTo(325.632)
    expect(c.backupDemand).toBeCloseTo(108.54)
    expect(c.backupUsable).toBeCloseTo(172.8)
    expect(c.backupDemand).toBeLessThanOrEqual(c.backupUsable)
  })
  it('recalcule la consommation, le solaire, le PUE et la facture',()=>{
    const e=energy(1)
    expect(e.facility).toBeCloseTo(82.5)
    expect(e.demand).toBeCloseTo(722700)
    expect(e.production).toBe(139040)
    expect(e.solarUse).toBeCloseTo(125136)
    expect(e.grid).toBeCloseTo(597564)
    const withoutSolar=energy(1,{...defaults(1),solar:0})
    const variableRate=(5*1.4157+10.5*1.0101+8.5*.7398)/24
    expect(withoutSolar.cost).toBeCloseTo(e.demand*variableRate+160*512.62)
    expect(withoutSolar.grid).toBe(e.demand)
    expect(e.cost+e.savings).toBeCloseTo(withoutSolar.cost)
    expect(e.savings).toBeGreaterThan(0)
  })
  it('plafonne le solaire instantané et annuel à la demande',()=>{
    expect(solarProfile(0,80,82.5)).toMatchObject({production:0,grid:82.5})
    expect(solarProfile(12,120,10)).toMatchObject({selfUse:10,grid:0})
    const capped=energy(1,{...defaults(1),solar:120,racks:2,servers:1})
    expect(capped.solarUse).toBeLessThan(capped.production*specs.solar.selfUse)
    expect(capped.solarUse).toBeLessThan(capped.demand)
    expect(energy(1,{...defaults(1),racks:0}).solarUse).toBe(0)
  })
})
describe('modèle financier',()=>{
  it('réconcilie le total des postes, les aléas et les dépenses',()=>{
    for(const p of phaseNumbers){
      const budget=costs(p),opex=operations(p)
      expect(budget.rows.find(row=>row.id==='land')?.totals).toEqual([650_000,800_000,800_000])
      expect(budget.central).toBeCloseTo(1.12*budget.rows.reduce((total,row)=>total+row.totals[1],0))
      expect(budget.totals[0]).toBeLessThan(budget.central)
      expect(budget.totals[2]).toBeGreaterThan(budget.central)
      expect(opex.annual).toBeCloseTo(opex.rows.reduce((total,row)=>total+row.cost,0))
      expect(opex.monthly).toBeCloseTo(opex.annual/12)
    }
  })
})
it('relie les parcours aux points et toutes les étapes à une route ou une panne explicite',()=>{
  expect(simulations.map(sim=>sim.id)).toEqual(['power','air','network','compute','storage'])
  for(const [layer,selected] of Object.entries(normalRoutes)){
    const paths=selected.flatMap(id=>topology[layer as keyof typeof topology][id].paths)
    const halls=layer==='air'?['intakeA','intakeB']:layer==='power'||layer==='solar'?['powerDropAA','powerDropBB']:['computeA','computeB']
    expect(paths.flat()).toEqual(expect.arrayContaining(halls))
    expect(paths.every(path=>path.length>1&&path.every(point=>coordinates[point]?.length===3))).toBe(true)
  }
  for(const sim of simulations) for(const frame of sim.frames){
    expect(frame.routes).toContain(frame.cue.route)
    for(const route of frame.routes) for(const path of topology[sim.view][route].paths){
      expect(path.every(point=>coordinates[point]?.every(Number.isFinite))).toBe(true)
      expect(technicalPorts[path[0]],path[0]).toBeDefined()
      const end=path.at(-1)!
      expect(technicalPorts[end],end).toBeDefined()
    }
  }
})
it('maintient les deux salles au fil des coupures et coupe les sources indisponibles',()=>{
  const power=simulations.find(item=>item.id==='power')!.frames
  expect(power.map(frame=>frame.routes)).toEqual([
    ['grid','racks','cooling'],['battery','racks'],['battery','racks'],
    ['generator','racks','cooling'],['grid','racks','cooling'],['grid','racks','cooling'],
  ])
  for(const prefix of ['powerDropA','powerDropB']){
    const feeds=topology.power.racks.paths.filter(path=>path.some(point=>point.startsWith(prefix)))
    expect(feeds.map(path=>path.find(point=>point.startsWith(prefix)))).toEqual([prefix+'A',prefix+'B'])
  }
  expect(topology.power.generator.paths[0][0]).toBe('generator')
  expect(topology.air.reducedA.paths[0][0]).toBe('cracSupplyASurviving')
  expect(topology.air.returnASurviving.paths[0].at(-1)).toBe('cracReturnASurviving')
  expect(topology.air.refrigerantAReserve.paths[0].at(-1)).toBe('condenserAReserve')
  expect(topology.air.returnB.paths[0].at(-1)).toBe('cracReturnB')
  expect(topology.network.ispA.paths[0].at(-1)).not.toBe(topology.network.ispB.paths[0].at(-1))
  const cooling=simulations.find(item=>item.id==='air')!.frames
  const network=simulations.find(item=>item.id==='network')!.frames
  expect(cooling[1].routes).toEqual(expect.arrayContaining(['reducedA','supplyB','returnB','refrigerantB']))
  expect(cooling[2].routes).toEqual(['supplyAReserve','returnAReserve','refrigerantAReserve','supplyB','returnB','refrigerantB'])
  expect(network[1].routes).toEqual(['ispB','core','hallA','hallB'])
})
it('relie le pied sud de l’escalier au palier nord et garde la trémie ouverte',()=>{
  const {x,lowZ,opening:[left,front]}=stairs
  expect(walkHeight(x,lowZ+.4,0)).toBe(0)
  expect(walkHeight(x,lowZ-2.6,1)).toBeGreaterThan(2)
  expect(walkHeight(x,front-.2,property.technicalHeight)).toBe(property.technicalHeight)
  expect(walkHeight(left+.03,front+1,property.technicalHeight)).toBeNull()
})
it('identifie les salles, le sas et les niveaux selon la position à pied',()=>{
  expect(walkZoneAt(13.65,-.98,0).id).toBe('ground-corridor')
  expect(walkZoneAt(16,3.2,0).id).toBe('reception')
  expect(walkZoneAt(18.5,3.2,0).id).toBe('vestibule')
  expect(walkZoneAt(18.5,1.3,0).id).toBe('reception')
  expect(walkZoneAt(18.4,8.45,walkHeight(18.4,8.45,2)!).id).toBe('stairs')
  expect(walkZoneAt(18.4,5.6,property.technicalHeight).id).toBe('upper-corridor')
  expect(walkZoneAt(16.8,3.8,property.technicalHeight).id).toBe('meeting')
  expect(walkZoneAt(22,3,0).level).toBe('Extérieur')
})
it('conserve les limites comme non vérifiées au point probable',()=>{
  expect(property.parcelAnchor).toEqual([32.25065,-7.93090])
  expect(property.confidence).toBe('probable');expect(property.cadastralBoundary).toBeNull()
})

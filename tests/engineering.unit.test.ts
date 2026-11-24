import { describe,expect,it } from 'vitest'
import { activeRacks,capacity,constrain,costs,defaults,energy,groundSupport,operations,projections,revenue,solarProfile } from '../src/engineering'
import { area,landArea,phases,property,rackPositions,rooms,specs,topology,coordinates,normalRoutes,stairs,walkHeight,type Phase, type Rect } from '../src/model'
import { simulations } from '../src/simulations'
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
    expect(c.products.vps+c.products.private*32).toBeLessThanOrEqual(c.vmSlots)
    expect(c.allocatable).toBeGreaterThan(c.products.object)
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
  it('borne les entrées invalides et évite les ressources vendables à vide',()=>{
    expect(constrain(NaN,0,4)).toBe(0)
    expect(activeRacks(1,99)).toHaveLength(16)
    expect(activeRacks(1,7)).toHaveLength(6)
    const c=capacity(1,{...defaults(1),racks:-1,servers:9999})
    expect(c.servers).toBe(0);expect(c.designIT).toBe(0);expect(c.raw).toBe(0)
    expect(c.products).toEqual({vps:0,dedicated:0,object:0,backup:0,private:0})
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
    expect(c.products.backup+c.backupDemand).toBeLessThanOrEqual(c.backupUsable)
  })
  it('recalcule la consommation, le solaire, le PUE et la facture',()=>{
    const e=energy(1)
    expect(e.facility).toBeCloseTo(82.5)
    expect(e.demand).toBeCloseTo(722700)
    expect(e.production).toBe(140000)
    expect(e.solarUse).toBeCloseTo(126000)
    expect(e.grid).toBeCloseTo(596700)
    expect(e.cost).toBeCloseTo(656700)
    expect(e.savings).toBeCloseTo(126000)
    expect(energy(1,{...defaults(1),solar:0}).grid).toBe(e.demand)
    expect(energy(1,{...defaults(1),tariff:0}).cost).toBe(defaults(1).fixed)
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
  it('garde les recettes nulles à vide et respecte les parts de capacité',()=>{
    const cap=capacity(1),input=defaults(1)
    expect(revenue(cap,input,0)).toBe(0)
    expect(revenue(cap,input,2)).toBe(revenue(cap,input,1))
    expect(revenue(cap,input,.5)*2).toBeCloseTo(revenue(cap,input,1))
    expect(costs(1,{...input,hardware:2}).rows.find(row=>row.id==='compute')!.quantity).toBe(48)
    expect(operations(1,{...input,maintenance:2}).annual).toBeGreaterThan(operations(1,input).annual)
  })
  it('n’ajoute des coûts d’extension que lorsque les phases se succèdent',()=>{
    const input={...defaults(1),phase2Year:3,phase3Year:5}
    const result=projections(1,input,'équilibré')
    expect(result.map(row=>row.phase)).toEqual([1,1,2,2,3])
    expect(result[1].capex).toBe(0)
    expect(result.reduce((total,row)=>total+row.capex,0)).toBeCloseTo(costs(3).central)
    expect(result[4].cumulative).toBeCloseTo(result.reduce((total,row)=>total+row.margin-row.capex,0))
    expect(projections(1,{...input,phase2Year:0},'prudent').every(row=>row.phase===1)).toBe(true)
    expect(projections(2,{...defaults(2),phase3Year:4},'soutenu').map(row=>row.phase)).toEqual([2,2,2,3,3])
  })
})
it('relie les parcours aux points et toutes les étapes à une route ou une panne explicite',()=>{
  expect(simulations).toHaveLength(7)
  for(const [layer,selected] of Object.entries(normalRoutes)){
    const paths=selected.flatMap(id=>topology[layer as keyof typeof topology][id].paths)
    expect(paths.flat()).toEqual(expect.arrayContaining(['computeA','computeB']))
    expect(paths.every(path=>path.length>1&&path.every(point=>coordinates[point]?.length===3))).toBe(true)
  }
  for(const sim of simulations) for(const frame of sim.frames){
    expect(frame.seconds).toBeGreaterThan(0)
    for(const route of frame.routes) expect(topology[sim.view][route].paths.every(path=>path.every(point=>coordinates[point]?.length===3))).toBe(true)
    if(frame.phase) expect([1,2,3]).toContain(frame.phase satisfies Phase)
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
  const cooling=simulations.find(item=>item.id==='air')!.frames
  const network=simulations.find(item=>item.id==='network')!.frames
  expect(cooling[1].routes).toEqual(expect.arrayContaining(['reducedA','supplyB','returnB','refrigerantB']))
  expect(network[1].routes).toEqual(['ispB','core','hallA','hallB'])
  expect(simulations.find(item=>item.id==='solar')!.frames.at(-1)?.routes).toEqual(['grid','racks','cooling'])
})
it('relie le pied sud de l’escalier au palier nord et garde la trémie ouverte',()=>{
  const {x,lowZ,opening:[left,front]}=stairs
  expect(walkHeight(x,lowZ+.4,0)).toBe(0)
  expect(walkHeight(x,lowZ-2.6,1)).toBeGreaterThan(2)
  expect(walkHeight(x,front-.2,property.technicalHeight)).toBe(property.technicalHeight)
  expect(walkHeight(left+.03,front+1,property.technicalHeight)).toBeNull()
})
it('conserve les limites comme non vérifiées au point probable',()=>{
  expect(property.parcelAnchor).toEqual([32.25065,-7.93090])
  expect(property.confidence).toBe('probable');expect(property.cadastralBoundary).toBeNull()
})

import { describe,expect,it } from 'vitest'
import { assignLanes,offsetPolyline } from '../src/flowLanes'
import { coordinates,normalRoutes,topology } from '../src/model'
import { routeStyle } from '../src/flowPresentation'

const lanesFor=(layer:keyof typeof topology,routes:string[])=>assignLanes(routes.flatMap(route=>
  topology[layer][route].paths.map(path=>({route,kind:routeStyle(layer,route).label,points:path.map(key=>coordinates[key])}))))

describe('voies des tracés',()=>{
  it('écarte les tracés différents qui partagent un même chemin',()=>{
    const lanes=assignLanes([
      {route:'a',kind:'x',points:[[0,0,0],[10,0,0]]},
      {route:'b',kind:'y',points:[[2,0,0],[8,0,0],[8,0,5]]},
      {route:'c',kind:'z',points:[[5,0,0],[12,0,0]]},
    ])
    expect(new Set(lanes.values()).size).toBe(3)
    expect(lanes.get('a')).toBe(0)
  })
  it('laisse en place les tracés qui se croisent ou ne font que se toucher',()=>{
    const lanes=assignLanes([
      {route:'a',kind:'x',points:[[0,0,0],[10,0,0]]},
      {route:'b',kind:'y',points:[[5,0,-5],[5,0,5]]},
      {route:'c',kind:'z',points:[[10,0,0],[20,0,0]]},
    ])
    expect([...lanes.values()]).toEqual([0,0,0])
  })
  it('ne sépare pas les tracés de même nature',()=>{
    const lanes=assignLanes([
      {route:'hallA',kind:'salles',points:[[0,0,0],[10,0,0]]},
      {route:'hallB',kind:'salles',points:[[0,0,0],[10,0,0]]},
    ])
    expect([...lanes.values()]).toEqual([0,0])
  })
  it('sépare chaque tracé du stockage le long du chemin entre les salles',()=>{
    const lanes=lanesFor('storage',normalRoutes.storage)
    expect(new Set(['replica','hdd','backup'].map(route=>lanes.get(route))).size).toBe(3)
  })
  it('garde la même voie quel que soit le sens de parcours',()=>{
    const there=offsetPolyline([{x:0,y:0},{x:100,y:0}],6)
    const back=offsetPolyline([{x:100,y:0},{x:0,y:0}],6)
    expect(there[0].y).toBeCloseTo(back[1].y)
  })
  it('décale les angles à l’intersection des deux segments',()=>{
    const [,corner]=offsetPolyline([{x:0,y:0},{x:100,y:0},{x:100,y:100}],6)
    expect(corner.x).toBeCloseTo(106)
    expect(corner.y).toBeCloseTo(6)
  })
})

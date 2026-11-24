import { test,expect,type Locator,type Page } from '@playwright/test'
import { OrthographicCamera,Vector3 } from 'three'
import { property } from '../src/model'
import type { ModelSnapshot } from '../src/viewState'

const nav=(page:Page)=>page.getByRole('navigation',{name:'Navigation principale'})
const draw=(page:Page)=>page.getByTestId('canvas-host')
const tools=(page:Page)=>page.locator('.board-tools')
const timeline=(page:Page)=>page.getByRole('region',{name:'Simulation en cours'})
const story=(page:Page)=>page.locator('.scene-event')
const marker=(page:Page,id:string)=>page.locator('[data-marker="'+id+'"]')
const selection=(page:Page)=>page.getByRole('complementary',{name:'Informations de sélection'})
const readView=async(page:Page)=>JSON.parse((await draw(page).getAttribute('data-model-view'))!) as ModelSnapshot
const distance=(a:ModelSnapshot,b:ModelSnapshot)=>Math.max(...[...a.position,...a.target,a.zoom].map((value,index)=>
  Math.abs(value-[...b.position,...b.target,b.zoom][index])))

async function open(page:Page){
  await page.goto('/')
  await expect(page.getByRole('heading',{name:'Projet de centre de données'})).toBeVisible()
  await expect(draw(page).locator('canvas[role=img]')).toBeVisible()
  await expect.poll(async()=>Number(await draw(page).getAttribute('data-draw-calls'))).toBeGreaterThan(0)
}
async function choose(page:Page,menu:string,option:string|RegExp){
  await tools(page).getByRole('button',{name:menu,exact:true}).click()
  await tools(page).getByRole('button',{name:option,exact:typeof option==='string'}).click()
}
async function openSheet(page:Page,option:string){
  await nav(page).locator('summary').click()
  await nav(page).getByRole('button',{name:option,exact:true}).click()
}
async function expectCardBesideCamera(page:Page){
  const card=(await selection(page).boundingBox())!
  const camera=(await page.getByLabel('Commandes de la caméra').boundingBox())!
  expect(card.x+card.width).toBeLessThanOrEqual(camera.x-8)
}
async function expectSeparate(page:Page,...panels:Locator[]){
  const {width,height}=page.viewportSize()!
  await expect.poll(async()=>{
    const stage=await page.getByTestId('stage').boundingBox()
    return [stage?.width,stage?.height]
  }).toEqual([width,height])
  const boxes=await Promise.all(panels.map(async panel=>{
    await expect(panel).toBeVisible()
    return (await panel.boundingBox())!
  }))
  for(const [index,box] of boxes.entries()){
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.x+box.width).toBeLessThanOrEqual(width+.5)
    expect(box.y+box.height,String(panels[index])).toBeLessThanOrEqual(height+.5)
    for(const [offset,other] of boxes.slice(index+1).entries()){
      expect(box.x+box.width<=other.x||other.x+other.width<=box.x||
        box.y+box.height<=other.y||other.y+other.height<=box.y,
        String(panels[index])+' / '+String(panels[index+offset+1])).toBe(true)
    }
  }
}

test('la maquette remplit l’écran et les éléments se sélectionnent dans la scène',async({page})=>{
  const errors:string[]=[]
  page.on('pageerror',error=>errors.push(error.message))
  await open(page)
  const box=(await page.getByTestId('stage').boundingBox())!
  expect(box.width).toBe(page.viewportSize()!.width)
  expect(box.height).toBe(page.viewportSize()!.height)
  await expect(page.getByRole('complementary')).toHaveCount(0)
  await expect(page.getByText('Les espaces',{exact:true})).toHaveCount(0)
  await marker(page,'hall-a').click()
  await expect(page.getByRole('heading',{name:'Salle serveurs A'})).toBeVisible()
  await expect(page.getByText('Éléments associés')).toHaveCount(0)
  await page.getByRole('button',{name:'Isoler la salle'}).click()
  await expect(page.getByRole('button',{name:'Afficher les salles voisines'})).toHaveAttribute('aria-pressed','true')
  await marker(page,'rack-a01').click()
  await expect(page.getByRole('heading',{name:'Baie A01'})).toBeVisible()
  await expect(page.getByText('Unités occupées')).toBeVisible()
  await expect(page.getByRole('button',{name:/Retour/})).toHaveCount(0)
  await expect(marker(page,'rack-a01')).toHaveAttribute('aria-pressed','true')
  await marker(page,'rack-a01').click()
  await expect(page.getByRole('complementary')).toHaveCount(0)
  await expect.poll(async()=>(await readView(page)).zoom).toBe(1)
  expect(errors).toEqual([])
})

test('un deuxième clic sur la parcelle remet toute la maquette à l’écran',async({page})=>{
  await open(page)
  const overview=await readView(page)
  await page.getByRole('button',{name:'Agrandir la maquette'}).click()
  await expect.poll(async()=>(await readView(page)).zoom).toBeGreaterThan(1.2)
  const canvas=(await draw(page).boundingBox())!
  const x=canvas.x+canvas.width*.45,y=canvas.y+canvas.height*.81
  await page.mouse.move(x,y)
  await page.mouse.down({button:'right'})
  await page.mouse.move(x+45,y-18,{steps:4})
  await page.mouse.up({button:'right'})
  await expect.poll(async()=>Math.abs((await readView(page)).target[0])).toBeGreaterThan(.2)
  await marker(page,'reserve').click()
  await expect(selection(page).getByRole('heading',{name:'Réserve d’extension'})).toBeVisible()
  const aspect=canvas.width/canvas.height
  const height=Math.max(48,(canvas.width<500?79:76)/aspect),width=height*aspect
  await expect.poll(async()=>(await readView(page)).zoom).toBeCloseTo(width/33,2)
  const selected=await readView(page)
  const camera=new OrthographicCamera(-width/2,width/2,height/2,-height/2,.1,400)
  camera.position.set(...selected.position)
  camera.lookAt(...selected.target)
  camera.zoom=selected.zoom
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()
  const [rx,rz,rw,rd]=property.reserve
  const point=new Vector3(rx+rw/2,.055,rz+rd*.65).project(camera)
  await page.mouse.click(canvas.x+(point.x+1)*canvas.width/2,canvas.y+(1-point.y)*canvas.height/2)
  await expect(selection(page)).toHaveCount(0)
  await expect.poll(async()=>distance(await readView(page),overview)).toBeLessThan(.001)
})

test('la fiche de l’accueil laisse le repère et les commandes de caméra accessibles',async({page})=>{
  await open(page)
  await marker(page,'reception').click()
  await expect(selection(page).getByRole('heading',{name:'Accueil et contrôle d’accès'})).toBeVisible()
  await expectCardBesideCamera(page)
  await page.getByRole('button',{name:'Vues et options de la maquette'}).click()
  await expect(page.getByRole('button',{name:'Vue de dessus'})).toBeVisible()
  await page.getByRole('button',{name:'Vues et options de la maquette'}).click()
  await marker(page,'reception').click()
  await expect(selection(page)).toHaveCount(0)
})

test('les parcours gardent le cadrage et les étages rapides correspondent au rendu',async({page})=>{
  await open(page)
  await page.getByRole('button',{name:'Agrandir la maquette'}).click()
  await expect.poll(async()=>(await readView(page)).zoom).toBeGreaterThan(1.2)
  const original=await readView(page)
  await choose(page,'Parcours','Alimentation électrique')
  await expect(page.getByRole('complementary',{name:'Parcours d’infrastructure'})).toBeVisible()
  await expect.poll(async()=>distance(await readView(page),original)).toBeLessThan(.001)
  await choose(page,'Parcours','Calcul et virtualisation')
  await expect.poll(async()=>distance(await readView(page),original)).toBeLessThan(.001)
  await choose(page,'Étages','Toiture')
  await expect(draw(page)).toHaveAttribute('data-rendered-floor','roof')
  await choose(page,'Étages','Étage 1')
  await choose(page,'Étages','Rez-de-chaussée')
  await expect(draw(page)).toHaveAttribute('data-rendered-floor','ground')
  await page.getByRole('button',{name:'Vues et options de la maquette'}).click()
  await page.getByRole('button',{name:'Vue de dessus',exact:true}).click()
  await expect(page.getByTestId('stage')).toHaveAttribute('data-angle','top')
  await page.getByRole('button',{name:'Passer en visite à pied'}).click()
  await expect(page.getByText('ZQSD ou flèches pour marcher.',{exact:false})).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByText('ZQSD ou flèches pour marcher.',{exact:false})).toBeHidden()
})

test('la visite à pied monte et redescend par le palier de l’escalier',async({page})=>{
  test.setTimeout(65_000)
  await page.setViewportSize({width:1024,height:560})
  await open(page)
  await page.getByRole('button',{name:'Passer en visite à pied'}).click()
  await expect(draw(page)).toHaveAttribute('data-walk-position',/\[13\.65,1\.77,/)
  async function walkUntil(key:string,axis:0|2,limit:number,direction:1|-1){
    await page.keyboard.down(key)
    try{
      await page.waitForFunction(({axis,limit,direction})=>{
        const value=document.querySelector<HTMLElement>('[data-walk-position]')?.dataset.walkPosition
        return value&&(JSON.parse(value)[axis]-limit)*direction>=0
      },{axis,limit,direction},{timeout:12_000})
    }finally{await page.keyboard.up(key)}
  }
  await walkUntil('s',0,15.11,1)
  await walkUntil('a',2,3.15,1)
  await walkUntil('s',0,21.08,1)
  await walkUntil('a',2,11.2,1)
  await walkUntil('w',0,18.47,-1)
  await walkUntil('d',2,5.65,-1)
  const upper=JSON.parse((await draw(page).getAttribute('data-walk-position'))!)
  expect(upper[1]).toBeCloseTo(1.77+property.technicalHeight,2)
  await walkUntil('a',2,11.3,1)
  const ground=JSON.parse((await draw(page).getAttribute('data-walk-position'))!)
  expect(ground[1]).toBeCloseTo(1.77,2)
  await page.keyboard.press('Escape')
  await expect(draw(page)).not.toHaveAttribute('data-walk-position',/.+/)
})

test('une simulation démarre au clic et explique chaque événement sur la maquette',async({page})=>{
  await open(page)
  await choose(page,'Simulations','Coupure du réseau électrique')
  await expect(story(page).getByRole('heading',{name:'Réseau disponible'})).toBeVisible()
  await expect(story(page)).toHaveAttribute('data-anchor','transformer')
  await expect(draw(page)).toHaveAttribute('data-flow-routes','grid racks cooling')
  await expect(timeline(page).getByRole('button',{name:'Pause',exact:true})).toBeVisible()
  await expect(story(page).getByRole('heading',{name:'Perte de l’arrivée publique'})).toBeVisible({timeout:9000})
  await expect(story(page)).toHaveAttribute('data-anchor','ups')
  await expect(timeline(page).getByText('Source · batteries')).toBeVisible()
  await expect(draw(page)).toHaveAttribute('data-flow-routes','battery racks')
  await timeline(page).getByRole('button',{name:'Pause',exact:true}).click()
  await timeline(page).getByRole('button',{name:'Étape suivante',exact:true}).click()
  await expect(story(page).getByRole('heading',{name:'Démarrage des groupes'})).toBeVisible()
  await expect(draw(page)).toHaveAttribute('data-flow-routes','battery racks')
  await timeline(page).getByRole('button',{name:'Étape suivante',exact:true}).click()
  await expect(story(page).getByRole('heading',{name:'Relais des groupes'})).toBeVisible()
  await expect(draw(page)).toHaveAttribute('data-flow-routes','generator racks cooling')
  await timeline(page).getByRole('button',{name:'Recommencer la simulation'}).click()
  await expect(story(page).getByRole('heading',{name:'Réseau disponible'})).toBeVisible()
  await timeline(page).getByRole('button',{name:'Quitter la simulation'}).click()
  await expect(story(page)).toBeHidden()
})

test('les cartes et les commandes restent séparées pendant une simulation',async({page})=>{
  await page.route('https://tile.openstreetmap.org/**',route=>route.abort())
  await page.setViewportSize({width:1024,height:560})
  await open(page)
  await choose(page,'Simulations','Coupure du réseau électrique')
  await expect(story(page).getByRole('heading',{name:'Réseau disponible'})).toBeVisible()
  await timeline(page).getByRole('button',{name:'Pause',exact:true}).click()
  const note=story(page)
  const camera=page.getByLabel('Commandes de la caméra')
  const title=page.getByRole('heading',{name:'Projet de centre de données'})
  await expectSeparate(page,title,nav(page),note,tools(page),timeline(page),camera)
  for(const viewport of [{width:1440,height:900},{width:1280,height:720},{width:1920,height:1080},{width:960,height:540}]){
    await page.setViewportSize(viewport)
    await expectSeparate(page,title,nav(page),note,tools(page),timeline(page),camera)
    await tools(page).getByRole('button',{name:'Simulations',exact:true}).click()
    const menu=tools(page).getByLabel('Scénarios de simulation')
    await expectSeparate(page,note,menu,timeline(page),camera)
    await page.keyboard.press('Escape')
    await page.getByRole('button',{name:'Vues et options de la maquette'}).click()
    await expectSeparate(page,note,page.locator('.camera-options'),timeline(page),camera)
    await page.getByRole('button',{name:'Vues et options de la maquette'}).click()
  }
  await nav(page).locator('summary').click()
  await expectSeparate(page,nav(page),tools(page),note,timeline(page),camera)
  await nav(page).getByRole('button',{name:'Coûts',exact:true}).click()
  const sheet=page.getByRole('region',{name:'Coûts',exact:true})
  await expectSeparate(page,nav(page),sheet)
  await expect(camera).toBeHidden()
  await page.getByRole('button',{name:'Fermer les données'}).click()
  await expect(timeline(page)).toBeVisible()
  await nav(page).getByRole('button',{name:'Carte de Benguerir'}).click()
  await expectSeparate(page,nav(page),page.locator('.geography:visible').last())
})

test('le flux se fige en pause sans sauter puis reprend au même point',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'})
  await open(page)
  await choose(page,'Simulations','Coupure du réseau électrique')
  const clock=async()=>Number(await draw(page).getAttribute('data-flow-time'))
  await expect.poll(clock).toBeGreaterThan(260)
  const running=await clock()
  await timeline(page).getByRole('button',{name:'Pause',exact:true}).click()
  await expect(timeline(page).getByRole('button',{name:'Reprendre',exact:true})).toBeVisible()
  await page.waitForTimeout(140)
  const paused=await clock()
  expect(paused).toBeGreaterThanOrEqual(running)
  await page.waitForTimeout(290)
  expect(await clock()).toBe(paused)
  await timeline(page).getByRole('button',{name:'Reprendre',exact:true}).click()
  await expect.poll(clock).toBeGreaterThan(paused+100)
})

test('la carte reste locale et la caméra de la maquette est conservée',async({page})=>{
  await page.route('https://tile.openstreetmap.org/**',route=>route.abort())
  await open(page)
  await page.getByRole('button',{name:'Agrandir la maquette'}).click()
  await expect.poll(async()=>(await readView(page)).zoom).toBeGreaterThan(1.2)
  const before=await readView(page)
  await nav(page).getByRole('button',{name:'Carte de Benguerir'}).click()
  const map=page.getByRole('region',{name:'Carte interactive de Benguerir'})
  await expect(map.locator('.leaflet-tooltip').getByText('Site du projet')).toBeVisible()
  await expect(map.locator('.leaflet-tooltip').getByText('Benguerir')).toBeVisible()
  const zoomOut=map.getByRole('button',{name:'Réduire',exact:true})
  await expect(zoomOut).toHaveClass(/leaflet-disabled/)
  await map.getByRole('button',{name:'Agrandir',exact:true}).click()
  await expect(zoomOut).not.toHaveClass(/leaflet-disabled/)
  await expect(page.getByText('32,25065 / -7,93090')).toBeVisible()
  await expect(page.getByText('Fond de carte indisponible.',{exact:false})).toBeVisible()
  await expect(draw(page).locator('canvas[role=img]')).toBeHidden()
  await nav(page).getByRole('button',{name:'Fermer la carte'}).click()
  await expect(draw(page).locator('canvas[role=img]')).toBeVisible()
  await expect.poll(async()=>distance(await readView(page),before)).toBeLessThan(.001)
  await nav(page).getByRole('button',{name:'Carte de Benguerir'}).click()
  await expect(zoomOut).not.toHaveClass(/leaflet-disabled/)
})

test('les données et les phases restent sur le même espace',async({page})=>{
  await open(page)
  await choose(page,'Phase 1',/^Phase 2/)
  await expect(page.getByTestId('stage')).toHaveAttribute('data-phase','2')
  await openSheet(page,'Coûts')
  const investment=page.getByText('Investissement central',{exact:true}).locator('..')
  const before=await investment.innerText()
  await page.getByRole('slider',{name:'Prix du matériel informatique'}).focus()
  await page.keyboard.press('End')
  await expect(investment).not.toHaveText(before)
  await page.getByRole('button',{name:'Réinitialiser'}).click()
  await expect(page.getByRole('slider',{name:'Nombre de serveurs déployés'})).toHaveValue('96')
  await expect(page.getByRole('table',{name:'Projection financière à cinq ans'}).locator('tbody tr')).toHaveCount(5)
  await openSheet(page,'Énergie')
  await page.getByRole('slider',{name:'Heure de la simulation'}).focus()
  await page.keyboard.press('End')
  await page.getByRole('button',{name:'Voir la toiture'}).click()
  await expect(page.getByTestId('stage')).toHaveAttribute('data-theme','night')
  await expect(draw(page)).toHaveAttribute('data-rendered-floor','roof')
  await expect(nav(page).getByRole('button',{name:'Visite guidée'})).toHaveCount(0)
})

test('le téléphone affiche le cadre complet et les commandes restent utilisables',async({page})=>{
  await page.setViewportSize({width:390,height:844})
  await open(page)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await marker(page,'reception').click()
  await expect(selection(page).getByRole('heading',{name:'Accueil et contrôle d’accès'})).toBeVisible()
  await expectCardBesideCamera(page)
  const panel=selection(page).locator('.inspector-content')
  expect(await panel.evaluate(node=>node.scrollHeight-node.clientHeight)).toBeLessThanOrEqual(1)
  await marker(page,'reception').click()
  await expect.poll(async()=>(await readView(page)).zoom).toBe(1)
  await choose(page,'Étages','Toiture')
  await expect(draw(page)).toHaveAttribute('data-rendered-floor','roof')
  await openSheet(page,'Coûts')
  await expect(page.getByRole('heading',{name:'Investissement et fonctionnement'})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.getByRole('button',{name:'Fermer les données'}).click()
  await page.setViewportSize({width:320,height:420})
  await choose(page,'Étages','Rez-de-chaussée')
  const reserve=marker(page,'reserve')
  await reserve.click()
  await expect(selection(page).getByRole('heading',{name:'Réserve d’extension'})).toBeVisible()
  await reserve.click({timeout:4000})
  await expect(selection(page)).toHaveCount(0)
})

test('les données restent disponibles sans WebGL',async({page})=>{
  await page.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,type:string,...options:unknown[]){
      if(type.startsWith('webgl')) return null
      return Reflect.apply(original,this,[type,...options])
    } as typeof original
  })
  await page.goto('/')
  await expect(page.getByText('La vue 3D est indisponible')).toBeVisible()
  await page.locator('.fallback-rooms').getByRole('button',{name:'Salle A',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Salle serveurs A'})).toBeVisible()
  await openSheet(page,'Coûts')
  await expect(page.getByRole('heading',{name:'Investissement et fonctionnement'})).toBeVisible()
})

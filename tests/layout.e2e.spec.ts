import { test,expect,type Page } from '@playwright/test'

// Floating interface parts must never cover each other or leave the window, whatever is open.
const parts:Record<string,string>={
  titre:'.board-title h1',actions:'.board-actions',barre:'.board-toolbar',menu:'.board-tools > .board-menu',
  données:'.data-switch',fiche:'.inspector',récit:'.scene-event',simulation:'.board-timeline',
  caméra:'.stage-toolbar',réglages:'.camera-options',coordonnées:'.geo-pin',visite:'.walk-hint',tableau:'.board-sheet',
}
const viewports=[[1920,1080],[1440,900],[1400,800],[1366,768],[1280,720],[1024,768],[960,540]] as const

async function problems(page:Page,state:string){
  return page.evaluate(({parts,state})=>{
    const boxes=Object.entries(parts).flatMap(([name,selector])=>[...document.querySelectorAll<HTMLElement>(selector)]
      .filter(element=>element.checkVisibility({visibilityProperty:true,opacityProperty:false}))
      .map(element=>({name,element,box:element.getBoundingClientRect()})))
    const found:string[]=[]
    for(const {name,box} of boxes){
      if(box.left< -1||box.top< -1||box.right>innerWidth+1||box.bottom>innerHeight+1)
        found.push(state+' · '+name+' sort de la fenêtre '+JSON.stringify([box.left,box.top,box.right,box.bottom].map(Math.round)))
    }
    for(let i=0;i<boxes.length;i++) for(let j=i+1;j<boxes.length;j++){
      if(boxes[i].element.contains(boxes[j].element)||boxes[j].element.contains(boxes[i].element)) continue
      const a=boxes[i].box,b=boxes[j].box
      const x=Math.min(a.right,b.right)-Math.max(a.left,b.left),y=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)
      if(x>1&&y>1) found.push(state+' · '+boxes[i].name+' chevauche '+boxes[j].name+' ('+Math.round(x)+'×'+Math.round(y)+')')
    }
    return found
  },{parts,state})
}

for(const [width,height] of viewports){
  test(`aucun panneau ne se chevauche en ${width}×${height}`,async({page})=>{
    test.setTimeout(120_000)
    await page.route('https://tile.openstreetmap.org/**',route=>route.abort())
    await page.setViewportSize({width,height})
    await page.goto('/')
    await expect(page.getByTestId('canvas-host').locator('canvas[role=img]')).toBeVisible()
    const tools=page.locator('.board-tools'),nav=page.getByRole('navigation',{name:'Navigation principale'})
    const found:string[]=[]
    const check=async(state:string)=>{
      await page.waitForFunction(()=>document.getAnimations().every(animation=>!(animation instanceof CSSTransition)||animation.playState!=='running'))
      const list=await problems(page,state);for(const item of list) console.log('LAYOUT '+width+'×'+height+' '+item);found.push(...list)}
    const menus=async(state:string)=>{
      await check(state)
      for(const menu of ['Étages','Parcours','Simulations',/^Phase/]){
        await tools.getByRole('button',{name:menu,exact:typeof menu==='string'}).click()
        await check(state+' + menu '+menu)
        await page.keyboard.press('Escape')
      }
      await page.getByRole('button',{name:'Paramètres de la maquette'}).click()
      await check(state+' + réglages')
      await page.getByRole('button',{name:'Paramètres de la maquette'}).click()
    }
    await menus('accueil')
    for(const layer of ['Alimentation électrique','Réseau et fibre','Énergie solaire']){
      await tools.getByRole('button',{name:'Parcours',exact:true}).click()
      await tools.getByRole('button',{name:layer,exact:true}).click()
      await menus('parcours '+layer)
    }
    await page.getByRole('button',{name:'Masquer le parcours'}).click()
    await tools.getByRole('button',{name:'Étages',exact:true}).click()
    await tools.getByRole('button',{name:'Rez-de-chaussée',exact:true}).click()
    await page.locator('[data-marker="hall-a"]').click()
    await menus('salle A')
    await page.locator('[data-marker="hall-a"]').click()
    await tools.getByRole('button',{name:'Simulations',exact:true}).click()
    await tools.getByRole('button',{name:'Coupure du réseau électrique',exact:true}).click()
    await menus('simulation')
    await page.keyboard.press('ArrowRight')
    await check('simulation étape 2')
    await page.getByRole('button',{name:'Quitter la simulation'}).click()
    for(const sheet of ['Énergie','Coûts','Extension']){
      await nav.getByRole('button',{name:sheet,exact:true}).click()
      await check('tableau '+sheet)
    }
    await page.getByRole('button',{name:'Fermer les données'}).click()
    await nav.getByRole('button',{name:'Carte de Benguerir'}).click()
    await check('carte')
    await nav.getByRole('button',{name:'Fermer la carte'}).click()
    await page.getByRole('button',{name:'Passer en visite à pied'}).click()
    await check('visite à pied')
    expect(found).toEqual([])
  })
}

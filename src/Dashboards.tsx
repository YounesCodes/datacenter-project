import Metric from './Metric'
import { ArrowUpRight, Coins, Sun, Zap } from 'lucide-react'
import { capacity,costs,energy,operations,type Capacity,type Inputs } from './engineering'
import { compactMAD,mad,number } from './format'
import { phases,type Phase } from './model'

type DashboardProps={phase:Phase;inputs:Inputs;cap:Capacity}
export function EnergyPanel({phase,inputs,cap,onScene}:DashboardProps&{onScene:()=>void}){
  const annual=energy(phase,inputs,cap)
  const solarShare=annual.demand?100*annual.solarUse/annual.demand:0
  return <section className="dashboard" aria-label="Énergie">
    <header className="dashboard-heading"><div><h2>Électricité à Benguerir</h2>
      <p>Phase {phase} · {cap.servers} serveurs · {number(inputs.solar)} kWc en toiture</p></div>
      <button className="soft-button" onClick={onScene}><Sun size={16}/>Voir la toiture<ArrowUpRight size={15}/></button>
    </header>
    <div className="metrics-grid wide">
      <Metric name="Consommation du site" value={number(annual.demand/1000)+' MWh/an'} icon={<Zap size={17}/>}/>
      <Metric name="Solaire utilisé sur place" value={number(annual.solarUse/1000)+' MWh/an'} note={number(solarShare)+' % de la consommation'} icon={<Sun size={17}/>}/>
      <Metric name="Électricité achetée" value={number(annual.grid/1000)+' MWh/an'} icon={<Zap size={17}/>}/>
      <Metric name="Facture électrique estimée" value={compactMAD(annual.cost)+'/an'} note="Redevance de puissance incluse" icon={<Coins size={17}/>}/>
    </div>
    <p className="small-copy">Production en toiture de {number(annual.production/1000)} MWh/an. Estimation de la facture TTC au tarif général moyenne tension de l’ONEE. <a href="https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?lat=32.25065&lon=-7.9309&peakpower=1&loss=14&angle=13&aspect=0&outputformat=json" target="_blank" rel="noreferrer">Calcul solaire PVGIS</a> · <a href="https://www.one.org.ma/FR/pages/interne.asp?id1=14&id2=114&t2=1" target="_blank" rel="noreferrer">Barème ONEE</a></p>
  </section>
}

const estimates=['Estimation basse','Estimation centrale','Estimation haute']
export function CostsPanel({phase,inputs,cap}:DashboardProps){
  const budget=costs(phase,inputs,cap)
  const opex=operations(phase,inputs,cap,undefined,budget)
  const groups=[...new Set(budget.rows.map(row=>row.group))]
  return <section className="dashboard" aria-label="Budget du site">
    <header className="dashboard-heading"><div><h2>Investissement et fonctionnement</h2>
      <p>Phase {phase} · {cap.racks.length} baies · {cap.servers} serveurs · Montants en MAD</p></div>
    </header>
    <div className="metrics-grid cost-estimates">
      {estimates.map((label,index)=><Metric key={label} name={label} value={compactMAD(budget.totals[index])}/>)}
    </div>
    <article className="surface"><h3>Détail de l’investissement</h3>
      <p>Investissement hors taxes et droits d’importation.</p>
      <div className="table-scroll"><table aria-label="Estimation détaillée des investissements"><thead><tr><th>Poste</th><th>Quantité</th><th>Basse</th><th>Centrale</th><th>Haute</th></tr></thead>
        <tbody>{groups.map(group=><GroupRows key={group} group={group} rows={budget.rows.filter(row=>row.group===group)}/>)}
          <tr><th scope="row">Réserve budgétaire · 12 %</th><td/>{budget.contingency.map((value,index)=><td key={estimates[index]}>{mad(value)}</td>)}</tr>
        </tbody>
      </table></div>
    </article>
    <article className="surface"><h3>Dépenses techniques annuelles</h3><p>{compactMAD(opex.annual)}/an · Estimation centrale</p>
      <dl className="fact-list">{opex.rows.map(row=><div key={row.name}><dt>{row.name}</dt><dd>{mad(row.cost)}</dd></div>)}</dl>
    </article>
  </section>
}
function GroupRows({group,rows}:{group:string;rows:ReturnType<typeof costs>['rows']}){
  return <><tr className="table-group"><th colSpan={5}>{group}</th></tr>{rows.map(row=><tr key={row.id}>
    <th scope="row"><details><summary>{row.name}</summary><small>{row.source}</small></details></th>
    <td>{number(row.quantity,2)}<small>{row.unit}</small></td>
    {row.totals.map((value,index)=><td key={estimates[index]}>{mad(value)}</td>)}
  </tr>)}</>
}
export function ExpansionPanel({phase}:DashboardProps){
  return <section className="dashboard" aria-label="Déploiement du site">
    <header className="dashboard-heading"><div><h2>Équiper le site par étapes</h2>
      <p>Les deux salles sont construites dès la première phase. Les phases suivantes ajoutent des baies et renforcent les équipements techniques.</p></div>
    </header>
    <div className="phase-cards">{([1,2,3] as const).map(n=>{
      const c=capacity(n)
      return <article className={'phase-card'+(n===phase?' current':'')} key={n} aria-current={n===phase?'true':undefined}>
        <span className="eyebrow">PHASE {n}</span><h3>{phases[n].name}</h3>
        <span className="phase-bar"><i style={{width:c.racks.length/phases[3].racks*100+'%'}}/></span>
        <strong>{c.racks.length} baies</strong>
        <span>{number(c.servers)} serveurs · {number(c.designIT)} kW IT</span>
        <span>{number(c.allocatable,1)} To de stockage allouable</span>
        <span>{c.upsModules} onduleurs · {c.coolingUnits} climatiseurs · {c.generators} groupes électrogènes</span>
        <span>{compactMAD(costs(n).central)} d’investissement cumulé</span>
      </article>
    })}</div>
  </section>
}

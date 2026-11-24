import Metric from './Metric'
import { ArrowDownRight, ArrowUpRight, BarChart3, Building2, CircleHelp, Coins, RotateCcw, Server, Sun, Zap } from 'lucide-react'
import { capacity,costDate,costs,energy,operations,projections,revenue,scenarios,solarProfile,type Capacity,type Inputs,type Scenario } from './engineering'
import { compactMAD,mad,number } from './format'
import { phases,services,specs,type Phase } from './model'

export function Range({label,value,min,max,step,suffix,onChange,hint}:{label:string;value:number;min:number;max:number;step:number;suffix:string;onChange:(n:number)=>void;hint?:string}){
  return <label className="field range-field">
    <span>{label}<output>{number(value,2)}{suffix&&' '+suffix}</output></span>
    <input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={event=>onChange(event.currentTarget.valueAsNumber)}/>
    {hint&&<small>{hint}</small>}
  </label>
}
function Numeric({label,value,min=0,max,step=1,onChange,suffix}:{label:string;value:number;min?:number;max:number;step?:number;onChange:(value:number)=>void;suffix?:string}){
  return <label className="field numeric-field"><span>{label}</span><div><input type="number" min={min} max={max} step={step} value={value}
    onChange={event=>{const n=event.currentTarget.valueAsNumber;if(Number.isFinite(n)) onChange(Math.max(min,Math.min(max,n)))}}/>{suffix&&<small>{suffix}</small>}</div></label>
}
type DashboardProps={phase:Phase;inputs:Inputs;cap:Capacity;onInput:(patch:Partial<Inputs>)=>void;onReset:()=>void}
export function EnergyPanel({phase,inputs,cap,onInput,hour,onHour,onScene}:{phase:Phase;inputs:Inputs;cap:Capacity;onInput:DashboardProps['onInput'];hour:number;onHour:(hour:number)=>void;onScene:()=>void}){
  const annual=energy(phase,inputs,cap),snapshot=solarProfile(hour,inputs.solar,annual.facility)
  const hours=Array.from({length:24},(_,i)=>solarProfile(i,inputs.solar,annual.facility))
  const peak=Math.max(1,...hours.map(h=>h.production),annual.facility)
  const expense=costs(phase,inputs,cap)
  return <section className="dashboard" aria-label="Énergie">
    <header className="dashboard-heading"><div><span className="eyebrow">ÉNERGIE</span><h2>Électricité et production solaire</h2><p>Estimation annuelle à charge moyenne constante, avec une journée type pour le solaire.</p></div>
      <button className="soft-button" onClick={onScene}><Sun size={16}/>Voir la toiture<ArrowUpRight size={15}/></button>
    </header>
    <div className="metrics-grid wide">
      <Metric name="Charge informatique moyenne" value={number(cap.avgIT,1)+' kW'} icon={<Server size={17}/>}/>
      <Metric name="Consommation du site" value={number(annual.demand/1000,1)+' MWh/an'} icon={<Zap size={17}/>}/>
      <Metric name="Solaire utilisé sur place" value={number(annual.solarUse/1000,1)+' MWh/an'} icon={<Sun size={17}/>}/>
      <Metric name="Coût annuel du réseau" value={compactMAD(annual.cost)} note="Énergie et frais fixes" icon={<Coins size={17}/>}/>
    </div>
    <div className="dashboard-columns">
      <article className="surface"><h3>Une journée type</h3><p>Les barres indiquent d’où vient l’électricité consommée par le site à chaque heure.</p>
        <div className="hour-chart" role="img" aria-label={'Profil journalier. À '+number(hour,1)+' h, '+number(snapshot.selfUse,1)+' kW solaires utilisés et '+number(snapshot.grid,1)+' kW tirés du réseau.'}>
          {hours.map((point,i)=><button key={i} aria-label={'Afficher '+i+' h'} title={i+' h'} className={Math.round(hour)===i?'active':''} onClick={()=>onHour(i)}>
            <i className="from-grid" style={{height:point.grid/peak*100+'%'}}/><i className="from-sun" style={{height:point.selfUse/peak*100+'%'}}/>
          </button>)}
        </div>
        <div className="chart-axis"><span>00 h</span><span>06 h</span><span>12 h</span><span>18 h</span><span>23 h</span></div>
        <div className="legend-row"><span><i className="swatch grid-swatch"/>Réseau</span><span><i className="swatch sun-swatch"/>Solaire utilisé</span></div>
        <Range label="Heure de la simulation" value={hour} min={0} max={23} step={1} suffix="h" onChange={onHour}/>
        <dl className="fact-list"><div><dt>Production photovoltaïque instantanée</dt><dd>{number(snapshot.production,1)} kW</dd></div><div><dt>Puissance tirée du réseau</dt><dd>{number(snapshot.grid,1)} kW</dd></div><div><dt>Demande totale du site</dt><dd>{number(annual.facility,1)} kW</dd></div></dl>
      </article>
      <article className="surface">
        <h3>Hypothèses d’énergie</h3>
        <Range label="Puissance solaire" value={inputs.solar} min={0} max={120} step={.5} suffix="kWc" onChange={solar=>onInput({solar})}/>
        <Range label="PUE" value={inputs.pue} min={1} max={3} step={.05} suffix="" onChange={pue=>onInput({pue})} hint="Le PUE rapporte la puissance totale du site à celle des équipements informatiques."/>
        <Range label="Tarif variable" value={inputs.tariff} min={0} max={5} step={.05} suffix="MAD/kWh" onChange={tariff=>onInput({tariff})}/>
        <Numeric label="Frais fixes annuels" value={inputs.fixed} max={1e6} step={1000} onChange={fixed=>onInput({fixed})} suffix="MAD"/>
        <dl className="fact-list">
          <div><dt>Production estimée</dt><dd>{number(annual.production/1000,1)} MWh/an</dd></div>
          <div><dt>Électricité achetée</dt><dd>{number(annual.grid/1000,1)} MWh/an</dd></div>
          <div><dt>Économies variables</dt><dd>{mad(annual.savings)}/an</dd></div>
          <div><dt>Installation des panneaux</dt><dd>{mad(expense.rows.find(row=>row.id==='solar')!.totals[1])}</dd></div>
          <div><dt>Entretien des panneaux</dt><dd>{mad(expense.rows.find(row=>row.id==='solar')!.totals[1]*.015*inputs.maintenance)}/an</dd></div>
        </dl>
      </article>
    </div>
    <aside className="info-note"><CircleHelp size={17}/><p>Rendement de calcul de {number(specs.solar.yield)} kWh/kWc/an. La consommation solaire est plafonnée par la demande aux heures de production. Une étude de toiture, de structure et d’ombrage reste nécessaire.</p></aside>
  </section>
}
export function CostsPanel({phase,inputs,cap,onInput,onReset}:DashboardProps){
  const [low,central,high]=costs(phase,inputs,cap).totals
  const budget=costs(phase,inputs,cap),opex=operations(phase,inputs,cap)
  const monthly=revenue(cap,inputs)
  const projection=projections(phase,inputs,scenarioValue(inputs))
  const payback=projection.find(row=>row.cumulative>=0)?.year
  const scenario=scenarioValue(inputs)
  const scenarioKeys=Object.keys(scenarios) as Scenario[]
  return <section className="dashboard" aria-label="Coûts">
    <header className="dashboard-heading"><div><span className="eyebrow">COÛTS</span><h2>Investissement et fonctionnement</h2><p>Modèle indicatif en dirhams marocains. Les prix sont des provisions de {costDate}.</p></div>
      <button className="soft-button" onClick={onReset}><RotateCcw size={15}/>Réinitialiser</button>
    </header>
    <div className="metrics-grid wide">
      <Metric name="Investissement central" value={compactMAD(central)} note={compactMAD(low)+' à '+compactMAD(high)} icon={<Building2 size={17}/>}/>
      <Metric name="Dépenses techniques mensuelles" value={compactMAD(opex.monthly)} note={compactMAD(opex.annual)+' par an'} icon={<Coins size={17}/>}/>
      <Metric name="Recettes mensuelles estimées" value={compactMAD(monthly)} note="Occupation commerciale sélectionnée" icon={<BarChart3 size={17}/>}/>
      <Metric name="Marge mensuelle d’infrastructure" value={compactMAD(monthly-opex.monthly)} note={payback?'Récupération indicative en année '+payback:'Récupération au-delà de la période étudiée'} icon={monthly>=opex.monthly?<ArrowUpRight size={17}/>:<ArrowDownRight size={17}/>}/>
    </div>
    <div className="dashboard-columns cost-columns">
      <aside className="surface cost-settings"><h3>Hypothèses modifiables</h3>
        <Range label="Occupation commerciale" value={inputs.occupancy*100} min={0} max={100} step={1} suffix="%" onChange={value=>onInput({occupancy:value/100})} hint="Part de la capacité vendable réservée par les clients."/>
        <Range label="Nombre de baies installées" value={inputs.racks} min={0} max={phases[phase].racks} step={2} suffix="baies" onChange={racks=>onInput({racks})}/>
        <Range label="Nombre de serveurs déployés" value={Math.min(inputs.servers,cap.servers)} min={0} max={Math.min(phases[phase].servers,cap.racks.filter(r=>r.purpose==='Calcul').length*8)} step={1} suffix="" onChange={servers=>onInput({servers})}/>
        <Range label="Prix du matériel informatique" value={inputs.hardware} min={.25} max={3} step={.05} suffix="×" onChange={hardware=>onInput({hardware})}/>
        <Range label="Maintenance technique" value={inputs.maintenance} min={0} max={3} step={.05} suffix="×" onChange={maintenance=>onInput({maintenance})}/>
        <details><summary>Hypothèses d’énergie</summary>
          <Range label="Tarif électrique" value={inputs.tariff} min={0} max={5} step={.05} suffix="MAD/kWh" onChange={tariff=>onInput({tariff})}/>
          <Range label="PUE" value={inputs.pue} min={1} max={3} step={.05} suffix="" onChange={pue=>onInput({pue})}/>
          <Range label="Puissance solaire" value={inputs.solar} min={0} max={120} step={.5} suffix="kWc" onChange={solar=>onInput({solar})}/>
        </details>
        <details><summary>Prix mensuels des services</summary>
          {services.filter(service=>!service.future).map(service=><Numeric key={service.id} label={service.name} value={inputs.prices[service.id]} max={100000} suffix="MAD" onChange={value=>onInput({prices:{...inputs.prices,[service.id]:value}})}/>)}
        </details>
      </aside>
      <div className="stack">
        <article className="surface"><h3>Projection sur cinq ans</h3>
          <div className="scenario-buttons">{scenarioKeys.map(key=><button key={key} aria-pressed={key===scenario} className="soft-button" onClick={()=>onInput({scenario:key})}>{key}</button>)}</div>
          <div className="forecast-controls">
            <Range label="Demande annuelle en plus" value={inputs.growth*100} min={-15} max={15} step={1} suffix="pts/an" onChange={value=>onInput({growth:value/100})}/>
            <YearSelect label="Déclenchement phase 2" value={inputs.phase2Year} onChange={phase2Year=>onInput({phase2Year,phase3Year:inputs.phase3Year>phase2Year?inputs.phase3Year:0})} disabled={phase>=2}/>
            <YearSelect label="Déclenchement phase 3" value={inputs.phase3Year} onChange={phase3Year=>onInput({phase3Year})} earliest={phase>=2?2:inputs.phase2Year+1} disabled={(phase===1&&!inputs.phase2Year)||phase===3}/>
          </div>
          <div className="table-scroll"><table aria-label="Projection financière à cinq ans"><thead><tr><th>Année</th><th>Vendu</th><th>Phase</th><th>Recettes</th><th>Charges</th><th>Investissement</th><th>Cumul</th></tr></thead>
            <tbody>{projection.map(row=><tr key={row.year}><th scope="row">{row.year}</th><td>{number(row.occupancy*100)} %</td><td>{row.phase}</td><td>{compactMAD(row.turnover)}</td><td>{compactMAD(row.opex)}</td><td>{compactMAD(row.capex)}</td><td className={row.cumulative<0?'negative':'positive'}>{compactMAD(row.cumulative)}</td></tr>)}</tbody>
          </table></div>
          <p className="small-copy">Le cumul soustrait les dépenses techniques et l’investissement, avec dépenses additionnelles à chaque extension. Les hypothèses excluent salaires, financement, TVA et droits d’importation.</p>
        </article>
        <article className="surface"><h3>Détail de l’investissement</h3><p>Transport et pose, selon le poste. Montants hors taxes et droits d’importation.</p>
          <div className="table-scroll"><table aria-label="Estimation détaillée des investissements"><thead><tr><th>Poste</th><th>Quantité</th><th>Unitaire central</th><th>Bas</th><th>Central</th><th>Haut</th></tr></thead>
            <tbody>{[...new Set(budget.rows.map(row=>row.group))].map(group=><GroupRows key={group} group={group} rows={budget.rows.filter(row=>row.group===group)}/>)}<tr><th scope="row">Provision pour aléas · 12 %</th><td colSpan={2}/>{budget.contingency.map((result,index)=><td key={index}>{compactMAD(result)}</td>)}</tr></tbody>
          </table></div>
        </article>
        <article className="surface"><h3>Dépenses techniques annuelles</h3><dl className="fact-list">{opex.rows.map(row=><div key={row.name}><dt>{row.name}</dt><dd>{mad(row.cost)}</dd></div>)}</dl></article>
      </div>
    </div>
  </section>
}
function scenarioValue(inputs:Inputs):Scenario{return inputs.scenario??'équilibré'}
function YearSelect({label,value,onChange,earliest=2,disabled}:{label:string;value:number;onChange:(year:number)=>void;earliest?:number;disabled?:boolean}){
  return <label className="field select-field"><span>{label}</span><select disabled={disabled} value={value} onChange={event=>onChange(Number(event.currentTarget.value))}><option value={0}>Aucune</option>
    {[2,3,4,5].filter(year=>year>=earliest).map(year=><option key={year} value={year}>Année {year}</option>)}
  </select></label>
}
function GroupRows({group,rows}:{group:string;rows:ReturnType<typeof costs>['rows']}){
  return <><tr className="table-group"><th colSpan={6}>{group}</th></tr>{rows.map(row=><tr key={row.id}><th scope="row"><details><summary>{row.name}</summary><small>{row.source}</small></details></th>
    <td>{number(row.quantity,2)}<small>{row.unit}</small></td><td>{mad(row.unitCost[1])}</td>{row.totals.map((value,index)=><td key={index}>{compactMAD(value)}</td>)}
  </tr>)}</>
}
export function ExpansionPanel({phase,inputs,cap}:DashboardProps){
  return <section className="dashboard" aria-label="Expansion">
    <header className="dashboard-heading"><div><span className="eyebrow">EXTENSION</span><h2>Équiper le site par étapes</h2><p>Le bâtiment initial est construit dès le départ. Les baies et leurs équipements sont ajoutés à mesure que la demande se confirme.</p></div>
    </header>
    <div className="phase-cards">{([1,2,3] as const).map(n=>{
      const m=phases[n],c=capacity(n,n===phase?inputs:undefined)
      return <article className={'phase-card'+(n===phase?' current':'')} key={n} aria-current={n===phase?'true':undefined}>
        <span className="eyebrow">PHASE {n}</span><h3>{m.name}</h3>
        <span className="phase-bar"><i style={{width:c.racks.length/48*100+'%'}}/></span><strong>{c.racks.length} baies</strong>
        <span>{number(c.servers)} serveurs · {number(c.designIT)} kW IT</span>
        <span>{number(c.allocatable,1)} To allouables</span>
      </article>
    })}</div>
    <div className="dashboard-columns">
      <article className="surface"><h3>Ce qui déclenche le prochain palier</h3>
        <p>La phase suivante suppose une demande durable, la disponibilité des équipements et des marges suffisantes pour maintenir le service pendant les interventions.</p>
        <dl className="fact-list"><div><dt>Baies installées</dt><dd>{cap.racks.length} / 48</dd></div><div><dt>Onduleurs modulaires</dt><dd>{cap.upsModules}</dd></div><div><dt>Climatiseurs de précision</dt><dd>{cap.coolingUnits}</dd></div><div><dt>Groupes électrogènes</dt><dd>{cap.generators}</dd></div><div><dt>Investissement cumulé indicatif</dt><dd>{compactMAD(costs(phase,inputs,cap).central)}</dd></div></dl>
      </article>
      <article className="surface"><h3>Services envisagés</h3><div className="service-list">
        {services.map(service=><div key={service.id}><div><strong>{service.name}</strong><small>{service.example}</small></div><span>{service.future?'Phase future':mad(inputs.prices[service.id])}</span></div>)}
      </div><p className="small-copy">Les offres initiales visent un hébergement au Maroc. Les valeurs affichées sont des hypothèses mensuelles du modèle, par unité de service.</p></article>
    </div>
  </section>
}

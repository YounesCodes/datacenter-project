import type { ReactNode } from 'react'
export default function Metric({name,value,note,icon}:{name:string;value:string;note?:string;icon?:ReactNode}){
  return <div className="metric"><div className="metric-label">{icon}{name}</div><strong>{value}</strong>{note&&<small>{note}</small>}</div>
}

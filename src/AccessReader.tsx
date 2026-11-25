import { useEffect,useRef,useState,type FormEvent } from 'react'
import { Check,Delete,DoorOpen,Fingerprint,KeyRound,LockKeyhole,ScanEye,Truck,X } from 'lucide-react'
import type { AuthenticatedDoor } from './model'
import type { AccessPrompt } from './sceneRuntime'
import './accessReader.css'

const methods={
  code:{title:'Clavier à code',icon:KeyRound},
  fingerprint:{title:'Lecteur d’empreinte',icon:Fingerprint},
  iris:{title:'Lecteur d’iris',icon:ScanEye},
}
const demoCode='12345'

export function DoorPrompt({prompt,onInteract}:{prompt:AccessPrompt;onInteract:()=>void}){
  const {door,action}=prompt
  const name=door.inner?'Porte intérieure du sas':door.room.name
  const text=action==='verify'&&door.method!=='delivery'?methods[door.method].title:action==='pass'?'Porte ouverte':action==='moving'?'Porte en mouvement':
    action==='wait'?'Attendre la fermeture de l’autre porte':action==='call-delivery'?'Simuler l’arrivée du camion':
    action==='truck-arriving'?'Camion en approche · Laissez l’aire libre':door.method==='delivery'?'Ouvrir le quai':'Ouvrir la porte'
  const Icon=door.method==='delivery'?Truck:action==='verify'?LockKeyhole:DoorOpen
  return <button type="button" className="access-prompt" onClick={onInteract} disabled={action==='pass'||action==='moving'||action==='truck-arriving'}>
    <span className="access-prompt-icon"><Icon size={19} aria-hidden="true"/></span>
    <span><strong>{name}</strong><small>{text}</small></span>
    {action==='verify'||action==='open'||action==='call-delivery'?<kbd>E</kbd>:null}
  </button>
}

export default function AccessReader({door,onRestorePointer,onFinish}:{door:AuthenticatedDoor;onRestorePointer:()=>void;onFinish:(approved:boolean)=>void}){
  const [digits,setDigits]=useState('')
  const [error,setError]=useState(false)
  const [phase,setPhase]=useState<'idle'|'scanning'|'approved'>('idle')
  const dialog=useRef<HTMLDialogElement>(null)
  const timer=useRef<number|undefined>(undefined)
  const {title,icon:Icon}=methods[door.method]
  const code=door.method==='code'
  useEffect(()=>{
    const node=dialog.current!
    node.showModal()
    node.querySelector<HTMLElement>('[data-reader-focus]')?.focus()
    return ()=>{clearTimeout(timer.current);node.close()}
  },[])

  function updateDigits(value:string){
    setDigits(value.replace(/\D/g,'').slice(0,5))
    setError(false)
  }
  function approve(){
    setPhase('approved')
    timer.current=window.setTimeout(()=>onFinish(true),420)
  }
  function submit(event:FormEvent){
    event.preventDefault()
    if(phase!=='idle') return
    if(digits!==demoCode){setError(true);return}
    onRestorePointer()
    approve()
  }
  function scan(){
    if(phase!=='idle') return
    // Request pointer lock from the click, before the scan animation starts.
    onRestorePointer()
    setPhase('scanning')
    timer.current=window.setTimeout(approve,matchMedia('(prefers-reduced-motion: reduce)').matches?220:1450)
  }

  return <dialog className="access-reader" ref={dialog} aria-labelledby="access-reader-title"
    onCancel={event=>{event.preventDefault();onFinish(false)}} data-phase={phase}>
    <header>
      <span className="reader-icon"><LockKeyhole size={20} aria-hidden="true"/></span>
      <div><span className="reader-type">{title}</span><h2 id="access-reader-title">{door.room.name}</h2></div>
      <button type="button" className="reader-close" aria-label="Fermer le contrôle d’accès" onClick={()=>{onRestorePointer();onFinish(false)}}><X size={19}/></button>
    </header>
    {code?<form className="reader-body" onSubmit={submit}>
      <label htmlFor="access-code">Code d’accès</label>
      <div className="reader-code">
        <input id="access-code" data-reader-focus type="password" inputMode="numeric" autoComplete="off"
          maxLength={5} placeholder="·····" value={digits} readOnly={phase!=='idle'} aria-invalid={error}
          aria-describedby="reader-code-hint" onChange={event=>updateDigits(event.target.value)}/>
        <span>{digits.length}/5</span>
      </div>
      <p id="reader-code-hint" className="reader-help">Code de démonstration <strong>{demoCode}</strong></p>
      <div className="reader-keypad" aria-label="Clavier numérique">
        {[1,2,3,4,5,6,7,8,9].map(n=><button key={n} type="button" disabled={phase!=='idle'} onClick={()=>updateDigits(digits+n)}>{n}</button>)}
        <button type="button" aria-label="Effacer le dernier chiffre" disabled={phase!=='idle'||!digits} onClick={()=>updateDigits(digits.slice(0,-1))}><Delete size={18}/></button>
        <button type="button" disabled={phase!=='idle'} onClick={()=>updateDigits(digits+'0')}>0</button>
        <button type="submit" className="reader-confirm" aria-label="Valider le code" disabled={phase!=='idle'||digits.length!==5}><Check size={19}/></button>
      </div>
      <p className="reader-feedback" role="status" data-error={error}>{error?'Code incorrect. Réessayez.':phase==='approved'?'Accès autorisé':''}</p>
    </form>:<div className="reader-body">
      <div className={'reader-scan reader-scan--'+door.method} aria-hidden="true">
        <div className="reader-scan-field"><span className="reader-scan-ring"/><Icon size={65}/><span className="reader-scan-beam"/></div>
      </div>
      <p className="reader-feedback" role="status">{phase==='scanning'?'Analyse en cours…':phase==='approved'?'Accès autorisé':'Simulation biométrique'}</p>
      <button type="button" data-reader-focus className="reader-confirm reader-scan-start" disabled={phase!=='idle'} onClick={scan}>
        <Icon size={19} aria-hidden="true"/>{door.method==='iris'?'Simuler le scan de l’iris':'Simuler la lecture d’empreinte'}
      </button>
    </div>}
  </dialog>
}

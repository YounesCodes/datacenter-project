import type { Point } from './model'

export type Scale='city'|'site'
export type ModelSnapshot={position:Point;target:Point;zoom:number}
export type CameraAction={kind:'focus'|'reset'|'zoom'|'simulation';value?:string;token:number}

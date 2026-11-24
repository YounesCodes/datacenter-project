import type { Point } from './model'

export type Scale='city'|'site'
export type Angle='iso'|'top'|'front'|'rear'|'left'|'right'
export type ModelSnapshot={position:Point;target:Point;zoom:number;angle:Angle}
export type CameraAction={kind:'focus'|'angle'|'reset'|'zoom';value?:string;token:number}

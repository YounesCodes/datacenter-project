export const number = (value:number, digits=0) => new Intl.NumberFormat('fr-FR',{maximumFractionDigits:digits}).format(value)
export const mad = (value:number) => number(Math.round(value)) + ' MAD'
export function compactMAD(value:number) {
  if (Math.abs(value)>=1e6) return number(value/1e6,2) + ' M MAD'
  if (Math.abs(value)>=1e3) return number(value/1e3,1) + ' k MAD'
  return mad(value)
}

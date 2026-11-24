import { useEffect,useRef,useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { parcelVerified,property } from './model'

const mapKey=import.meta.env.VITE_MAPTILER_KEY?.trim()
const cityZoom=15
const landmarks=L.latLngBounds(property.parcelAnchor?[property.cityCenter,property.parcelAnchor]:[property.cityCenter])
const localBounds=landmarks.pad(1.5)
if(!property.parcelAnchor){
  const [lat,lon]=property.cityCenter
  localBounds.extend([lat-.018,lon-.023]).extend([lat+.018,lon+.023])
}
const mapPadding={paddingTopLeft:[38,70] as L.PointTuple,paddingBottomRight:[38,44] as L.PointTuple,maxZoom:cityZoom,animate:false}
const osmAttribution='© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Contributeurs OpenStreetMap</a>'
const satelliteAttribution='© <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noreferrer">MapTiler</a> · '+osmAttribution
const validBoundary=parcelVerified?property.cadastralBoundary:null
const coordinates=new Intl.NumberFormat('fr-FR',{minimumFractionDigits:5,maximumFractionDigits:5})

function radiusMarker(location:L.LatLngExpression,title:string,fillColor:string){
  return L.circleMarker(location,{radius:7,weight:2,color:'#fff',fillColor,fillOpacity:1})
    .bindTooltip(title,{permanent:true,direction:'top',offset:[0,-10]})
}
export default function MapView({active}:{active:boolean}){
  const host=useRef<HTMLDivElement>(null)
  const mapRef=useRef<L.Map|null>(null)
  const [mapError,setMapError]=useState(false)
  const [satelliteError,setSatelliteError]=useState(false)
  const [satellite,setSatellite]=useState(false)
  const visible=useRef(active)
  visible.current=active

  useEffect(()=>{
    if(!host.current) return
    const map=L.map(host.current,{
      attributionControl:false,zoomControl:false,maxZoom:19,
      maxBounds:localBounds,maxBoundsViscosity:1,
    })
    mapRef.current=map
    const frameBounds=property.parcelAnchor?landmarks:localBounds
    const padding=L.point(mapPadding.paddingTopLeft).add(L.point(mapPadding.paddingBottomRight))
    function setMinimumZoom(){
      map.setMinZoom(Math.min(cityZoom,map.getBoundsZoom(frameBounds,false,padding)))
    }
    setMinimumZoom()
    map.fitBounds(frameBounds,mapPadding)
    L.control.attribution({prefix:false}).addTo(map)
    L.control.zoom({position:'bottomright',zoomInTitle:'Agrandir',zoomOutTitle:'Réduire'}).addTo(map)
    L.control.scale({imperial:false,position:'bottomleft'}).addTo(map)
    radiusMarker(property.cityCenter,'Benguerir','#36524d').addTo(map)
    if(property.parcelAnchor) radiusMarker(property.parcelAnchor,'Site du projet','#247650').addTo(map)
    if(validBoundary) L.polygon(validBoundary,{color:'#216c51',weight:2}).addTo(map)
    const resize=new ResizeObserver(()=>{
      if(!visible.current||!host.current?.clientWidth||!host.current.clientHeight) return
      map.invalidateSize({pan:false})
      setMinimumZoom()
    })
    resize.observe(host.current)
    return ()=>{resize.disconnect();map.remove();mapRef.current=null}
  },[])

  useEffect(()=>{
    const map=mapRef.current
    if(active&&map) map.invalidateSize({pan:false})
  },[active])

  useEffect(()=>{
    const map=mapRef.current
    if(!map) return
    const remote=Boolean(satellite&&mapKey)
    const url=remote
      ?'https://api.maptiler.com/tiles/satellite-v4/{z}/{x}/{y}.jpg?key='+encodeURIComponent(mapKey)
      :'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    const layer=L.tileLayer(url,{maxZoom:19,bounds:localBounds,noWrap:true,keepBuffer:1,updateWhenZooming:false,attribution:remote?satelliteAttribution:osmAttribution})
    let failed=false,loaded=false
    layer.on('loading',()=>{failed=false;loaded=false})
    layer.on('tileerror',()=>{failed=true})
    layer.on('tileload',()=>{loaded=true})
    layer.on('load',()=>{
      if(remote&&failed&&!loaded){setSatelliteError(true);setSatellite(false)}
      else setMapError(failed&&!loaded)
    })
    layer.addTo(map)
    return ()=>{layer.remove()}
  },[satellite])

  function toggleSatellite(){
    setSatelliteError(false);setMapError(false);setSatellite(value=>!value)
  }
  const coordinatesLabel=property.parcelAnchor?.map(value=>coordinates.format(value)).join(' / ')
  return <div className="geography">
    <div className="map-host" ref={host} role="region" aria-label="Carte interactive de Benguerir" />
    {mapKey&&<div className="map-actions"><button className="soft-button" aria-pressed={satellite} onClick={toggleSatellite}>{satellite?'Plan de ville':'Satellite'}</button></div>}
    <div className="map-footnote">
      {satellite&&<a className="maptiler-logo" href="https://www.maptiler.com/" target="_blank" rel="noreferrer">
        <img src="https://api.maptiler.com/resources/logo.svg" alt="MapTiler" />
      </a>}
      <div className="geo-notice">
        {mapError&&<span role="status">Fond de carte indisponible. Les repères restent visibles. </span>}
        {satelliteError&&!mapError&&<span role="status">Fond satellite indisponible. Le plan de ville est affiché. </span>}
        {coordinatesLabel&&<span>{coordinatesLabel}</span>}
      </div>
    </div>
  </div>
}

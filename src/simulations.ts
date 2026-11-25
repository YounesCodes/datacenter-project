import { normalRoutes,type Layer } from './model'

type RouteCue={route:string;label:string}
export type Frame={title:string;description:string;routes:string[];metric:string;cue:RouteCue;focus?:string;frameEquipment?:boolean}
type Simulation={id:Exclude<Layer,'solar'>;name:string;summary:string;view:Layer;frames:Frame[]}
const step=(title:string,description:string,routes:string[],metric:string,cue:RouteCue,options:Pick<Frame,'focus'|'frameEquipment'>={}):Frame=>({
  title,description,routes,metric,cue,
  ...options,
})
const follow=(route:string,label:string):RouteCue=>({route,label})
const gridCue=follow('grid','Réseau public → onduleurs')
const rackCue=follow('racks','Onduleurs → baies des salles A et B')
const batterySupply=['battery','racks']
const generatorSupply=['generator','racks','cooling']
const remainingNetwork=normalRoutes.network.filter(id=>id!=='ispA')
const remainingStorage=['remoteB','accessB','hdd','backup']
const coolingHallB=['supplyB','returnB','refrigerantB']
const restoredCooling=['supplyAReserve','returnAReserve','refrigerantAReserve',...coolingHallB]

export const simulations:Simulation[]=[
  {id:'power',view:'power',name:'Coupure du réseau électrique',summary:'Suivez le relais entre le réseau public, les batteries et les groupes diesel.',frames:[
    step('Réseau disponible','Le réseau alimente les climatiseurs et les onduleurs. Dans chaque salle, les baies reçoivent le courant par les voies A et B.',normalRoutes.power,'Source · réseau public',gridCue,{focus:'transformer'}),
    step('Perte de l’arrivée publique','Les batteries des onduleurs maintiennent les baies des deux salles. Les climatiseurs raccordés aux tableaux attendent le retour d’une source.',batterySupply,'Source · batteries',follow('battery','Batteries → onduleurs'),{focus:'ups'}),
    step('Démarrage des groupes','Les deux salles restent sur batteries. Le transfert attend que la tension et la fréquence des groupes se stabilisent.',batterySupply,'Transfert · en attente',rackCue,{focus:'generator',frameEquipment:true}),
    step('Relais des groupes','Le tableau transfère la charge aux groupes. Les onduleurs poursuivent l’alimentation des baies et le refroidissement des deux salles redémarre.',generatorSupply,'Source · groupes diesel',follow('generator','Groupes → transfert → onduleurs'),{focus:'generator'}),
    step('Retour contrôlé','Quand le réseau est stable, le tableau retransfère la charge. Les groupes refroidissent à vide et les onduleurs rechargent leurs batteries.',normalRoutes.power,'Source · réseau rétabli',gridCue,{focus:'transformer'}),
    step('Distribution rétablie','Le réseau alimente de nouveau les baies des deux salles par les voies A et B.',normalRoutes.power,'Distribution · voies A et B',rackCue,{focus:'switchgear'}),
  ]},
  {id:'air',view:'air',name:'Panne de refroidissement',summary:'Voyez comment la réserve de refroidissement prend le relais en salle A.',frames:[
    step('Refroidissement normal','Dans chaque salle, les climatiseurs soufflent sous le plancher. L’air traverse les baies, revient par le haut et la chaleur est rejetée dehors.',normalRoutes.air,'Air à l’entrée · A 24 °C · B 24 °C',follow('supplyA','Soufflage sous le plancher · salle A'),{focus:'crac'}),
    step('Une unité s’arrête','Une unité en salle A s’arrête. Les autres continuent avec un débit réduit et la température monte. La salle B fonctionne normalement.', ['reducedA','returnASurviving','refrigerantASurviving',...coolingHallB],'Air à l’entrée · A 27 °C · B 24 °C',follow('reducedA','Soufflage des unités en service · salle A'),{focus:'temperature'}),
    step('Activation de la réserve','La réserve de la salle A reprend le débit perdu. La boucle de refroidissement de la salle B continue.',restoredCooling,'Air à l’entrée · A 26 °C · B 24 °C',follow('supplyAReserve','Soufflage de l’unité de réserve · salle A'),{focus:'crac'}),
    step('Température stabilisée','L’unité de réserve maintient le refroidissement de la salle A. La salle B conserve sa propre boucle.',restoredCooling,'Air à l’entrée · A 24 °C · B 24 °C',follow('returnB','Retour d’air chaud · salle B'),{focus:'crac-b'}),
  ]},
  {id:'network',view:'network',name:'Perte d’un opérateur internet',summary:'Observez comment le trafic rejoint les deux salles par le lien restant.',frames:[
    step('Deux accès disponibles','Les deux opérateurs passent par les routeurs et le cœur réseau, qui distribue le trafic aux salles A et B.',normalRoutes.network,'Opérateurs joignables · 2',follow('core','Fibre → routeurs → cœur réseau'),{focus:'fiber'}),
    step('Une fibre est coupée','Le lien de l’opérateur A s’arrête. Le trafic interne des deux salles continue pendant que les routeurs basculent vers le lien B.',remainingNetwork,'Opérateurs joignables · 1',follow('ispB','Arrivée fibre de l’opérateur B'),{focus:'router'}),
    step('Nouvelles routes','Les routeurs retirent les chemins indisponibles et utilisent le lien de l’opérateur B pour desservir les deux salles.',remainingNetwork,'Routage · convergence',follow('core','Fibre → routeurs → cœur réseau'),{focus:'core'}),
    step('Trafic rétabli','Les services redeviennent accessibles dans la limite du débit du lien restant.',remainingNetwork,'Bilan · capacité externe réduite',follow('hallB','Cœur réseau → baies de la salle B'),{focus:'core'}),
  ]},
  {id:'compute',view:'compute',name:'Panne d’un serveur de calcul',summary:'Suivez le redémarrage d’une machine virtuelle de la salle A vers la salle B.',frames:[
    step('Hôtes actifs','Des serveurs dans les salles A et B exécutent des machines virtuelles. La machine suivie ici fonctionne en salle A.',normalRoutes.compute,'Machine virtuelle · active en A',follow('hallA','Trafic de la machine · salle A'),{focus:'hall-a'}),
    step('Un serveur tombe en panne','La machine de la salle A s’arrête. Le cluster isole l’hôte défaillant. Les services de la salle B continuent.', ['hallB'],'Machine virtuelle · interrompue',follow('hallB','Services encore actifs · salle B'),{focus:'hall-a',frameEquipment:true}),
    step('Redémarrage ailleurs','Proxmox HA utilise le quorum du cluster et le stockage répliqué pour redémarrer la machine sur un hôte de la salle B.', ['hallB'],'Machine virtuelle · redémarrage en B',follow('hallB','Cœur réseau → hôte de la salle B'),{focus:'hall-b'}),
    step('Service récupéré','Le redémarrage a causé une interruption. La machine et son trafic passent maintenant par la salle B.', ['hallB'],'Machine virtuelle · active en B',follow('hallB','Trafic de la machine · salle B'),{focus:'hall-b'}),
  ]},
  {id:'storage',view:'storage',name:'Perte d’un nœud de stockage',summary:'Suivez les accès dégradés et la reconstruction entre les salles.',frames:[
    step('Données réparties','Ceph répartit les copies NVMe et les fragments HDD entre plusieurs hôtes. Les serveurs des deux salles accèdent au stockage.',normalRoutes.storage,'Stockage · redondance disponible',follow('replica','Copies NVMe entre les salles'),{focus:'hall-a'}),
    step('Un nœud ne répond plus','Un nœud NVMe en salle A devient indisponible. Les accès NVMe passent par la copie disponible en salle B.',remainingStorage,'Stockage · dégradé',follow('remoteB','Serveur en A → stockage en B'),{focus:'hall-a'}),
    step('Reconstruction','Les copies disponibles servent à reconstruire les données sur un nœud sain en salle A. Les flux HDD et de sauvegarde continuent.', [...remainingStorage,'rebuild'],'Stockage · reconstruction',follow('rebuild','Copie de secours en B → nœud sain en A'),{focus:'hall-b'}),
    step('Redondance rétablie','Les deux salles retrouvent des chemins vers le stockage.',normalRoutes.storage,'Bilan · redondance rétablie',follow('replica','Copies NVMe entre les salles'),{focus:'hall-a'}),
  ]},
]

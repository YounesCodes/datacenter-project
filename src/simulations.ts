import { normalRoutes,type Layer } from './model'

export type Frame={title:string;description:string;seconds:number;routes:string[];metric:string;focus?:string;phase?:2|3;hour?:number}
type Simulation={id:Layer|'expansion';name:string;summary:string;view:Layer;frames:Frame[]}
const step=(title:string,description:string,routes:string[],metric:string,options:Partial<Frame>={}):Frame=>({title,description,routes,metric,seconds:5,...options})
const batterySupply=['battery','racks']
const generatorSupply=['generator','racks','cooling']
const remainingNetwork=normalRoutes.network.filter(id=>id!=='ispA')
const remainingStorage=['remoteB','accessB','hdd','backup']

export const simulations:Simulation[]=[
  {id:'power',view:'power',name:'Coupure du réseau électrique',summary:'Suivez le relais entre le réseau public, les batteries et les groupes diesel.',frames:[
    step('Réseau disponible','Le réseau alimente les climatiseurs et les onduleurs. Dans chaque salle, les baies reçoivent le courant par les voies A et B.',normalRoutes.power,'Source · réseau public',{focus:'transformer'}),
    step('Perte de l’arrivée publique','Les batteries des onduleurs maintiennent les baies des deux salles. Les climatiseurs raccordés aux tableaux attendent le retour d’une source.',batterySupply,'Source · batteries',{focus:'ups'}),
    step('Démarrage des groupes','Les deux salles restent sur batteries. Le transfert attend que la tension et la fréquence des groupes se stabilisent.',batterySupply,'Transfert · en attente',{focus:'generator'}),
    step('Relais des groupes','Le tableau transfère la charge aux groupes. Les onduleurs poursuivent l’alimentation des baies et le refroidissement des deux salles redémarre.',generatorSupply,'Source · groupes diesel',{focus:'generator'}),
    step('Retour contrôlé','Quand le réseau est stable, le tableau retransfère la charge. Les groupes refroidissent à vide et les onduleurs rechargent leurs batteries.',normalRoutes.power,'Source · réseau rétabli',{focus:'transformer'}),
    step('Conditions de maintien','La continuité des deux salles dépend de la charge, de l’autonomie des batteries et du carburant. Le transfert reste commun aux deux voies.',normalRoutes.power,'Bilan · continuité conditionnelle',{focus:'switchgear'}),
  ]},
  {id:'air',view:'air',name:'Panne de refroidissement',summary:'Voyez comment la réserve de refroidissement prend le relais en salle A.',frames:[
    step('Refroidissement normal','Dans chaque salle, les climatiseurs soufflent sous le plancher. L’air traverse les baies, revient par le haut et la chaleur est rejetée dehors.',normalRoutes.air,'Air à l’entrée · A 24 °C · B 24 °C',{focus:'crac'}),
    step('Une unité s’arrête','Une unité en salle A s’arrête. Les autres continuent avec un débit réduit et la température monte. La salle B fonctionne normalement.', ['reducedA','returnA','refrigerantA','supplyB','returnB','refrigerantB'],'Air à l’entrée · A 27 °C · B 24 °C',{focus:'temperature'}),
    step('Activation de la réserve','La réserve de la salle A reprend le débit perdu. La boucle de refroidissement de la salle B continue.',normalRoutes.air,'Air à l’entrée · A 26 °C · B 24 °C',{focus:'crac'}),
    step('Température stabilisée','La réserve N+1 couvre la perte d’une unité dans chaque salle si la puissance disponible reste suffisante.',normalRoutes.air,'Air à l’entrée · A 24 °C · B 24 °C',{focus:'crac-b'}),
  ]},
  {id:'network',view:'network',name:'Perte d’un opérateur internet',summary:'Observez comment le trafic rejoint les deux salles par le lien restant.',frames:[
    step('Deux accès disponibles','Les deux opérateurs passent par les routeurs et le cœur réseau, qui distribue le trafic aux salles A et B.',normalRoutes.network,'Opérateurs joignables · 2',{focus:'fiber'}),
    step('Une fibre est coupée','Le lien de l’opérateur A s’arrête. Le lien B et les chemins internes des deux salles restent disponibles, avec des pertes possibles pendant la convergence.',remainingNetwork,'Opérateurs joignables · 1',{focus:'router'}),
    step('Nouvelles routes','Les routeurs retirent les chemins indisponibles et utilisent le lien de l’opérateur B pour desservir les deux salles.',remainingNetwork,'Routage · convergence',{focus:'core'}),
    step('Trafic rétabli','Les services redeviennent accessibles dans la limite du débit du lien restant. Un fourreau partagé peut affecter les deux accès.',remainingNetwork,'Bilan · capacité externe réduite',{focus:'core'}),
  ]},
  {id:'compute',view:'compute',name:'Panne d’un serveur de calcul',summary:'Suivez le redémarrage d’une machine virtuelle de la salle A vers la salle B.',frames:[
    step('Hôtes actifs','Des serveurs dans les salles A et B exécutent des machines virtuelles. La machine suivie ici fonctionne en salle A.',normalRoutes.compute,'Machine virtuelle · active en A',{focus:'hall-a'}),
    step('Un serveur tombe en panne','La machine de la salle A s’arrête. Le cluster isole l’hôte défaillant. Les services de la salle B continuent.', ['hallB'],'Machine virtuelle · interrompue',{focus:'hall-a'}),
    step('Redémarrage ailleurs','Avec le quorum, le stockage accessible et la capacité disponible, Proxmox HA redémarre la machine sur un hôte de la salle B.', ['hallB'],'Machine virtuelle · redémarrage en B',{focus:'hall-b'}),
    step('Service récupéré','Le redémarrage a causé une interruption. La machine et son trafic passent maintenant par la salle B.', ['hallB'],'Machine virtuelle · active en B',{focus:'hall-b'}),
  ]},
  {id:'storage',view:'storage',name:'Perte d’un nœud de stockage',summary:'Suivez les accès dégradés et la reconstruction entre les salles.',frames:[
    step('Données réparties','Ceph répartit les copies NVMe et les fragments HDD entre plusieurs hôtes. Les serveurs des deux salles accèdent au stockage.',normalRoutes.storage,'Stockage · redondance disponible',{focus:'hall-a'}),
    step('Un nœud ne répond plus','Un nœud NVMe en salle A devient indisponible. Les accès NVMe représentés passent par la salle B tant que les copies restent accessibles.',remainingStorage,'Stockage · dégradé',{focus:'hall-a'}),
    step('Reconstruction','Les copies disponibles servent à reconstruire les données sur un nœud sain en salle A. Les flux HDD et de sauvegarde continuent.', [...remainingStorage,'rebuild'],'Stockage · reconstruction',{focus:'hall-b'}),
    step('Redondance rétablie','Les deux salles retrouvent des chemins vers le stockage. La reconstruction suppose du débit, de l’espace libre et suffisamment de nœuds sains.',normalRoutes.storage,'Bilan · redondance rétablie',{focus:'hall-a'}),
  ]},
  {id:'expansion',view:'power',name:'Extension progressive',summary:'Ajoutez des baies, des serveurs et la capacité technique qui les alimente.',frames:[
    step('Mise en service','Les deux salles sont construites dès le départ. Seule une partie des emplacements est équipée.',normalRoutes.power,'Phase 1 · équipements initiaux'),
    step('Demande en hausse','Le site doit pouvoir vendre des ressources supplémentaires tout en gardant des marges de secours.',normalRoutes.power,'Déclencheur · demande et capacité'),
    step('Extension interne','Les installateurs ajoutent des baies, des serveurs, des onduleurs et des climatiseurs dans les deux salles.',normalRoutes.power,'Phase 2 · salles existantes',{phase:2}),
    step('Capacité complète','Le projet équipe les emplacements restants dans les deux salles et conserve une zone pour une extension extérieure.',normalRoutes.power,'Phase 3 · emplacements équipés',{phase:3}),
  ]},
  {id:'solar',view:'solar',name:'Cycle solaire jour et nuit',summary:'Comparez la production solaire et le recours au réseau au fil d’une journée type.',frames:[
    step('Lever du soleil','Les panneaux commencent à produire. L’onduleur photovoltaïque alimente le tableau et le réseau fournit le complément aux deux salles.',normalRoutes.solar,'Heure du scénario · 07 h',{hour:7,focus:'solar'}),
    step('Production de milieu de journée','La production est la plus forte. Le centre utilise l’électricité solaire jusqu’à concurrence de sa demande instantanée.',normalRoutes.solar,'Heure du scénario · 12 h',{hour:12,focus:'solar'}),
    step('Coucher du soleil','La production baisse et la puissance tirée du réseau remonte pour alimenter les deux salles.',normalRoutes.solar,'Heure du scénario · 17 h',{hour:17,focus:'solar'}),
    step('Fonctionnement de nuit','Les panneaux ne produisent plus. Le réseau alimente les baies et le refroidissement des deux salles.', ['grid','racks','cooling'],'Heure du scénario · 22 h',{hour:22,focus:'solar'}),
  ]},
]

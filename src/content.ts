import { specs,type Layer } from './model'

export const layers:Record<Layer,{name:string;short:string;color:string;summary:string;steps:string[];details:string}> = {
  power:{name:'Alimentation électrique',short:'Électricité',color:'#a46a16',summary:'Le réseau public fournit l’électricité. Les onduleurs sur batteries couvrent le délai de démarrage des groupes diesel.',steps:['Réseau public','Transformateur','Tableaux et transfert','Onduleurs A/B','Distribution en baie','Serveurs'],details:'Un circuit A et un circuit B alimentent les équipements à double alimentation. Le transfert, le poste amont et la cuve commune restent des points à étudier. La maintenance sans arrêt est un objectif de conception inspiré du Tier III.'},
  air:{name:'Refroidissement',short:'Air',color:'#287d95',summary:'L’air froid monte du plancher vers les entrées des serveurs. L’air chaud ressort à l’arrière et revient en hauteur.',steps:['Climatiseur de précision','Plancher de soufflage','Allée froide','Serveurs','Retour chaud','Condenseur extérieur'],details:'Le fluide de climatisation transporte la chaleur jusqu’aux condenseurs. La réserve N+1 prévoit une unité de plus que nécessaire dans chaque salle. Les équipements à forte densité demandent une étude dédiée.'},
  network:{name:'Réseau et fibre',short:'Réseau',color:'#6857aa',summary:'Une demande arrive par un opérateur, traverse les routeurs et les pare-feu, puis atteint une machine virtuelle ou le stockage.',steps:['Opérateurs A/B','Tiroirs de fibre','Routeurs et pare-feu','Commutateurs A/B','Baie','Machine virtuelle'],details:'Objectif de deux parcours fibre diversifiés et de routage BGP, le protocole qui annonce les chemins entre réseaux. Les liens des hôtes et du stockage restent dimensionnés séparément des accès internet. Les flux de gestion, stockage et clients sont isolés.'},
  compute:{name:'Calcul et virtualisation',short:'Calcul',color:'#527da4',summary:'Proxmox permet de faire fonctionner plusieurs ordinateurs virtuels sur chaque serveur physique.',steps:['Serveur physique','Groupe d’hôtes Proxmox','Machine virtuelle','Application'],details:'Les machines virtuelles et certains conteneurs se partagent les ressources. La migration à chaud concerne les hôtes disponibles. En cas de panne, la haute disponibilité redémarre la machine ailleurs si le quorum, les données et la capacité restent disponibles.'},
  storage:{name:'Stockage et sauvegarde',short:'Stockage',color:'#91643e',summary:'Ceph répartit les données dans plusieurs machines pour qu’un disque ou un serveur puisse tomber en panne sans toujours interrompre l’accès.',steps:['Fichier','Copies ou fragments','Hôtes distincts','Reconstruction si nécessaire'],details:'Les disques rapides NVMe conservent trois copies. Le stockage HDD répartit trois fragments de données et deux fragments de secours. Les métadonnées restent sur un groupe répliqué. Les sauvegardes locales Proxmox Backup Server ne couvrent pas la perte totale du site.'},
  solar:{name:'Énergie solaire',short:'Solaire',color:'#788828',summary:'Les panneaux du toit couvrent une partie des besoins du site en journée. Le réseau fournit le reste.',steps:['Panneaux','Onduleur photovoltaïque','Tableau du bâtiment','Consommation sur place'],details:'La puissance réellement utilisée est plafonnée par la demande instantanée. Les panneaux ne prennent pas le relais d’un réseau coupé. Les onduleurs sur batteries et les groupes assurent ce rôle selon les conditions de la simulation.'},
}
export const equipmentFacts:Record<string,{label:string;value:string}[]>={
  power:[{label:'Distribution',value:'Deux voies A et B'},{label:'Autonomie des batteries',value:specs.electrical.minutes+' min visées'}],
  transformer:[{label:'Fonction',value:'Moyenne vers basse tension'}],
  generator:[{label:'Puissance unitaire',value:specs.electrical.generatorKW+' kW'},{label:'Redondance',value:'N+1'}],
  fuel:[{label:'Autonomie de calcul',value:specs.electrical.fuelHours+' h'}],
  ups:[{label:'Puissance par module',value:specs.electrical.upsKW+' kW'},{label:'Autonomie cible',value:specs.electrical.minutes+' min'}],
  pdus:[{label:'Distribution de calcul',value:specs.electrical.pduVoltage+' V par prise'},{label:'Alimentation des baies',value:'Voies distinctes A et B'}],
  network:[{label:'Accès externe visé',value:specs.network.internetMin+' à '+specs.network.internetMax+' Gbit/s'},{label:'Armoires opérateurs',value:String(specs.network.cabinets)}],
  router:[{label:'Liens des hôtes',value:specs.network.host+' Gbit/s par lien'},{label:'Agrégation visée',value:specs.network.uplink+' Gbit/s par lien'}],
  fiber:[{label:'Accès à confirmer',value:'Deux parcours physiques'}],
  crac:[{label:'Puissance nette unitaire',value:specs.thermal.netUnitKW+' kW'},{label:'Température de soufflage',value:specs.thermal.supply+' °C'}],
  condenser:[{label:'Fluide',value:'Détente directe (DX)'}],
  solar:[{label:'Rendement annuel de calcul',value:specs.solar.yield+' kWh/kWc'}],
  fire:[{label:'Détection',value:'Aspiration précoce de fumée'},{label:'Extinction',value:'Agent propre à étudier'}],
  leak:[{label:'Mesure',value:'Présence d’eau au sol'}],
  temperature:[{label:'Emplacement',value:'Entrée d’air des baies'}],
}

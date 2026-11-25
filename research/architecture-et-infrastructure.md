# Architecture et infrastructure

Étude de préconception du 24 novembre 2026. Les fiches techniques confirment l’existence des équipements pris comme références. Les dimensions du bâtiment, les quantités et l’architecture des réseaux sont des choix de projet. Les puissances et les temps de reprise restent à valider à la réception d’équipements réels. [Données du projet](../src/model.ts) · [Calculs](../src/engineering.ts)

## Terrain, bâtiment et circulation

Le point **32.25065, −7.93090** correspond à l’emplacement probable identifié près de la RP2106. La parcelle rectangulaire de **58 × 42,5 m** conserve les 2 465 m² annoncés. Son tracé, son orientation et ses reculs sont conceptuels. Les 1 465 m² extérieurs incluent les accès, le stationnement, la circulation, les équipements et la réserve d’extension extérieure d’environ 128 m². La photographie montre un fossé dans le voisinage. Le raccordement routier, la topographie, le risque de ruissellement et l’aptitude du sol restent à étudier. [Recherche de localisation](localisation-parcelle.md)

La circulation proposée dans la maquette va de l’entrée est à la sortie ouest, sur la même façade. Elle dessert trois places parallèles et une aire de livraison de 16,5 × 4,15 m devant l’atelier. L’aire comprend un espace de déchargement derrière le camion porteur de 8,2 m représenté. Le raccordement des deux portails à la voirie reste à confirmer sur le terrain.

| Zone du rez-de-chaussée | Dimensions du plan | Surface |
| --- | --- | ---: |
| Salle informatique A | 15 × 10 m | 150 m² |
| Salle informatique B | 15 × 10 m | 150 m² |
| Local électrique | 13 × 12 m | 156 m² |
| Local refroidissement | 9 × 12 m | 108 m² |
| Livraison, préparation et entretien | 8 × 12 m | 96 m² |
| Réseau et raccordement fibre | 10 × 4 m | 40 m² |
| Supervision réseau et sécurité | 7,5 × 6 m | 45 m² |
| Accueil et contrôle d’accès | 10 × 5 m | 50 m² |
| Locaux de service | 7 × 7 m | 49 m² |
| Couloirs, murs, escalier et services | Solde d’emprise | 156 m² |
| **Total au sol** | **40 × 25 m** | **1 000 m²** |

L’étage de l’aile administrative ajoute 120 m². La hauteur de référence est de 4,2 m pour le rez-de-chaussée technique et 3,2 m pour l’étage. Les murs du plan de travail ont 18 cm d’épaisseur. Les surfaces du tableau proviennent des rectangles du modèle, avant déduction de l’épaisseur des cloisons. Les accès de livraison et visiteurs, le gabarit du matériel, les dégagements, le plancher, l’accessibilité et l’évacuation demandent une vérification sur plan d’exécution.

Dans chaque salle, les quatre rangées de six baies laissent environ 1,2 à 1,3 m entre les armoires avant portes ouvertes. Les allées froides desservent deux rangées qui se font face. Les allées chaudes reçoivent l’air rejeté à l’arrière. Le bâti garde 48 places de baie au total. Le modèle utilise des baies 42U de 0,60 × 1,20 × 2,05 m. Les dimensions proches de ces ordres de grandeur existent sur catalogue. Mesurer les portes ouvertes, l’espace de levage, les passages en bout de rangée et la charge au sol avec les équipements retenus. [Baies Vertiv VR](https://www.vertiv.com/en-anz/products-catalog/facilities-enclosures-and-racks/racks-and-containment/vertiv-vr-rack/) · [Guide de conception du Department of Energy, sections 3 à 5](https://www.energy.gov/sites/default/files/2024-07/best-practice-guide-data-center-design.pdf)

## Calcul et sauvegarde

La première phase installe 16 baies sur 48 emplacements. Dix servent au calcul, deux au stockage NVMe, deux au stockage HDD et deux à la sauvegarde. Deux armoires d’interconnexion se trouvent dans le local réseau. Le modèle compte 672U disponibles au montage dans les 16 baies, dont 96U occupées par les serveurs et le matériel réseau représentés. Les équipements futurs, panneaux de séparation et accessoires sont à intégrer au bilan d’encombrement final.

Les 48 serveurs reconditionnés disposent chacun de 32 cœurs physiques et 256 Gio de RAM, soit 1 536 cœurs et 12 Tio. Un PowerEdge R640 1U avec deux Xeon Gold 6130 de 16 cœurs donne une configuration représentative. Vérifier l’état du châssis et des pièces, la garantie, les alimentations doubles, les cartes réseau, le stockage de démarrage et la compatibilité de chaque lot acheté. [Guide technique Dell R640](https://si.cdn.dell.com/sites/doccontent/shared-content/data-sheets/en/Documents/PowerEdge-R640-Technical-Guide.pdf) · [Caractéristiques Intel 6130](https://www.intel.com/content/www/us/en/products/sku/120492/intel-xeon-gold-6130-processor-22m-cache-2-10-ghz/specifications.html)

Proxmox VE regroupe les hôtes qui font tourner les machines virtuelles. La migration à chaud suppose un hôte encore opérationnel, des versions et profils CPU compatibles et un chemin vers les disques. En cas de panne, la haute disponibilité doit rétablir le quorum et isoler l’hôte défaillant avant de redémarrer les services sur un hôte sain. La capacité et l’accès au stockage conditionnent la reprise. Tester les délais et la cohérence des données applicatives sur un banc représentatif. [Guide d’administration Proxmox VE](https://pve.proxmox.com/pve-docs/pve-admin-guide.pdf)

Le modèle réserve des hôtes aux serveurs dédiés, puis applique au reste un ratio de trois vCPU par cœur physique, 12 % de RAM système et 20 % de marge de disponibilité. Il dimensionne un équivalent de machine virtuelle à 2 vCPU, 4 Gio et 40 Go sur NVMe. La plus petite capacité parmi CPU, RAM et stockage fixe le plafond. En première phase, le stockage borne l’offre à 1 228 équivalents, dont 921 pour les VPS et neuf lots privés de 32 équivalents, avec un reliquat. Ces valeurs servent à comparer les scénarios de vente. Mesurer le débit et la latence sous charge avant de fixer les limites commerciales.

| Tier de stockage | Capacité brute | Après redondance | Allouable avec 20 % de réserve |
| --- | ---: | ---: | ---: |
| NVMe, 6 nœuds × 8 × 3,84 To, 3 répliques | 184,32 To | 61,44 To | 49,152 To |
| HDD, 6 nœuds × 8 × 12 To, code 3+2 | 576 To | 345,60 To | 276,480 To |
| **Total des deux tiers** | **760,32 To** | **407,04 To** | **325,632 To** |

Un To contient 10¹² octets. Un Tio contient 2⁴⁰ octets. Pour le stockage NVMe, trois copies consomment trois fois la capacité. Avec le code d’effacement 3+2, les trois fragments de données et les deux fragments de reconstruction doivent être placés sur cinq hôtes distincts. Configurer et tester le domaine de panne par hôte, le quorum des moniteurs, le nombre minimal de fragments et la reconstruction avec un hôte indisponible. Trois nœuds par salle sur un tier de six créent une limite importante en cas de perte de salle. Les disques des machines virtuelles utilisent le tier répliqué. Réserver le tier HDD aux usages compatibles avec sa latence, dont le stockage objet. Pour RBD ou CephFS sur un tier à effacement, garder les métadonnées dans un pool répliqué et valider les prérequis BlueStore et d’écrasement partiel. [Profils Ceph](https://docs.ceph.com/en/latest/rados/operations/erasure-code-profile/) · [Pools Ceph](https://docs.ceph.com/en/latest/rados/operations/pools/) · [SSD Micron 7450 3,84 To](https://my.micron.com/products/storage/ssd/data-center-ssd/7450-ssd/part-catalog) · [Disques Seagate Exos X18](https://www.seagate.com/support/internal-hard-drives/enterprise-hard-drives/exos-X18/)

Les deux nœuds Proxmox Backup Server totalisent 288 To bruts. Le modèle applique 75 % de rendement de protection des disques puis une marge d’espace de 20 %, pour **172,8 To utilisables**. L’exemple protège 90 To avec une sauvegarde quotidienne et 30 points de restauration. Il prévoit 2,5 % de changement journalier, conserve 70 % des changements après déduplication et applique un facteur de compression de 0,8. La demande estimée est de **108,54 To**, soit 90 × [1 + 0,025 × 29 × 0,7] × 0,8. La marge restante sert au produit de sauvegarde, à hauteur de 64 To arrondis. Les résultats réels dépendent des données et de la rétention. Programmer vérification, collecte et essais de restauration. Les deux nœuds prévus sont sur le même site. Une perte du site peut également emporter les sauvegardes. [Maintenance et vérification des sauvegardes Proxmox](https://pbs.proxmox.com/docs/maintenance.html) · [Fonctions de Proxmox Backup Server](https://www.proxmox.com/en/products/proxmox-backup-server/features)

## Réseau

Retenir deux opérateurs et demander le tracé de chaque entrée et des fourreaux jusqu’aux points de présence. Une fibre indépendante du point de vue contractuel peut partager un même tronçon physique. L’accès public de 1 à 10 Gbit/s reste une cible. L’architecture prévoit deux routeurs de bordure, des pare-feu et une agrégation redondants, deux armoires fibre et des liaisons de baie vers les deux chemins. La référence de dimensionnement est de 25 Gbit/s par hôte, 25 Gbit/s pour ses interfaces de stockage et 100 Gbit/s sur les liens d’agrégation. Les réseaux de service, stockage, migration et administration sont segmentés. Les fournisseurs doivent confirmer la diversité, le débit, les adresses et les modalités BGP. Une perte d’accès entraîne une convergence dont le délai dépend de la configuration et du trafic. [Protocole BGP et retrait de routes, RFC 4271](https://www.rfc-editor.org/rfc/rfc4271.html)

## Distribution électrique et refroidissement

| Phase | Baies | Puissance IT de conception | Transformateur | Onduleurs 120 kW, deux voies | Groupes 200 kW | Climatiseurs de précision |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 16 | 96 kW | 315 kVA | 2 | 2 | 6 |
| 2 | 32 | 192 kW | 500 kVA | 4 | 3 | 10 |
| 3 | 48 | 288 kW | 630 kVA | 6 | 4 | 14 |

Les 6 kW par baie sont une affectation de conception. Une voie d’onduleurs peut reprendre la charge informatique totale si l’autre est retirée. Un onduleur protège les serveurs des interruptions courtes pendant le relais des groupes. Le modèle utilise dix minutes à pleine charge IT et un facteur de 0,85. Le total des deux voies en phase 1 ressort à 37,65 kWh de référence. Il faut le corriger selon la technologie de batterie, la décharge, la température, le vieillissement et la capacité effectivement disponible en fin de vie. Les 120 kW correspondent à une taille existante sur catalogue. La coordination des protections, les mises à la terre, les circuits de dérivation et les temps de transfert restent à dimensionner. [Spécifications Schneider Galaxy VS à 400 V](https://productinfo.se.com/galaxyvs_ul/viewer?docidentity=Specifications400V-82C3A31F&extension=xml&lang=en&manualidentity=InstallationGalaxyVSSpecificProduct-2D3D6E0F)

Le modèle applique un facteur de 1,5 à la charge IT de conception pour estimer la puissance secourue totale, puis ajoute un groupe de réserve. Il prévoit 12 h × 48 L/h par groupe nécessaire, soit 576 L au premier palier, à traiter comme volume utile avant réserve, pertes et contraintes de rétention. Les catalogues distinguent les puissances de secours et de service prolongé. Un exemple Cummins annonce 200 kW en secours contre 182 kW en service principal. La charge, la température, l’altitude et les transitoires de démarrage du froid déterminent le groupe à retenir. L’arrivée publique, un transfert amont commun et la chaîne de carburant constituent des dépendances à étudier. Aucune certification de disponibilité n’a été obtenue. [Groupe Cummins C250D5](https://www.cummins.com/en-ame/generators/products/c250d5) · [Fiche de consommation Cummins](https://incal.cummins.com/www/common/templatehtml/technicaldocument/SpecSheets/Diesel/ap/C250-D5.pdf)

Le besoin thermique par salle part de la moitié de la puissance IT de conception, majorée de 12 % pour les autres apports. Il atteint 53,76 puis 107,52 et 161,28 kW. Avec 32 kW nets retenus par unité, il faut respectivement 2, 4 et 6 unités actives par salle, plus une unité de réserve dans chacune. L’air froid arrive par le plénum sous le plancher et traverse les baies. Les climatiseurs reprennent l’air chaud en hauteur. Les températures de simulation de 24 °C au soufflage et 34 °C au retour décrivent un état illustratif. Les températures de calcul locales, la puissance nette en conditions d’été, les longueurs de liaisons, le rejet extérieur, les courts-circuits d’air et l’encombrement du dernier palier demandent une étude. [Vertiv Liebert PDX](https://www.vertiv.com/48ebbb/globalassets/products/thermal-management/room-cooling/liebert-pdx-15-120-kw-brochure-english.pdf) · [Guide de conception du Department of Energy](https://www.energy.gov/sites/default/files/2024-07/best-practice-guide-data-center-design.pdf)

## Sûreté et incendie

La clôture, la barrière, l’accueil, les lecteurs de badge, le sas et la vidéosurveillance séparent les parcours visiteurs et techniques. Les salles combinent détection précoce de fumée, surveillance environnementale, détection de fuites et moyens d’extinction adaptés à l’étude de risque. Le choix d’un agent propre exige une étude d’étanchéité et de surpression, de déclenchement, de mise en sécurité des occupants et de coordination avec les secours. Un architecte, un bureau spécialisé et les autorités compétentes doivent confirmer les classes d’usage et la réglementation applicable à la parcelle. [Règlement marocain sur l’incendie et la panique](https://www.sgg.gov.ma/Portals/0/lois/PD_%202-14-499_FR.pdf) · [NFPA 75](https://www.nfpa.org/codes-and-standards/7/5/nfpa-75) · [NFPA 2001](https://www.nfpa.org/product/nfpa-2001-standard/p2001code)

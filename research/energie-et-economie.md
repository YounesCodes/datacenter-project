# Énergie, coûts et revenus

Estimations du 24 novembre 2026 en MAD constants. La page de calcul contient les paramètres et les formules du projet. Le prix du terrain vient de l’annonce. Les devis, les contrats d’électricité et de fibre, les consommations mesurées et les données de vente restent à obtenir. [Paramètres et calculs](../src/engineering.ts) · [Recherche de localisation](localisation-parcelle.md)

## Production solaire et réseau public

Une requête PVGIS 5.3 exécutée le 24 novembre 2026 au point probable **32.25065, −7.93090** donne **1 783,21 kWh/kWc/an**. La simulation utilise la base SARAH3 2005–2023, une puissance de 1 kWc, des panneaux fixes à 20° orientés au sud et 14 % de pertes du système. Le modèle garde l’hypothèse initiale de **1 750 kWh/kWc/an**. La topographie, l’ombrage proche, la poussière, le nettoyage et l’orientation finale peuvent déplacer le rendement. [Requête PVGIS reproductible](https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?lat=32.25065&lon=-7.93090&peakpower=1&loss=14&angle=20&aspect=0&outputformat=json) · [Méthode du Centre commun de recherche européen](https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis_en)

À 500 Wc par module, 80 kWc demandent environ 160 modules de 1,12 × 2,10 m, soit 376 m² de panneaux. La toiture technique brute représente environ 880 m² si l’on retranche l’emprise de 120 m² de l’étage. Vérifier le calepinage, les rangs espacés, les retraits, les accès d’entretien et de secours, l’étanchéité et la charge admissible. Les modules dessinés représentent une implantation de projet.

| Indicateur de phase 1 | Hypothèse ou formule | Résultat |
| --- | --- | ---: |
| Puissance informatique moyenne | Hypothèse de charge | 55 kW |
| Puissance moyenne du site | Puissance IT × PUE de 1,50 | 82,5 kW |
| Demande annuelle | 82,5 kW × 8 760 h | 722,7 MWh |
| Production solaire | 80 kWc × 1 750 kWh/kWc/an | 140 MWh |
| Autoconsommation solaire | Jusqu’à 90 % de la production, plafonnée par la charge concomitante | 126 MWh |
| Achat d’électricité | 722,7 − 126 MWh | 596,7 MWh |
| Facture simulée | Achat variable à 1 MAD/kWh et forfait annuel de 60 000 MAD | 656 700 MAD/an |
| Économie variable | 126 000 kWh × 1 MAD/kWh | 126 000 MAD/an |

Le PUE rapporte l’énergie totale du site à l’énergie des équipements informatiques sur la même période. Le profil interactif échantillonne une journée type par intervalles de 15 min. Sa courbe sinusoïdale va de 6 h à 18 h avec un maximum de 82 % des kWc. Chaque intervalle limite l’autoconsommation à la demande simultanée. Le ratio ainsi obtenu et le plafond de 90 % s’appliquent à la production annuelle. Le modèle suppose une charge constante sur la journée type. Une étude d’exécution utilisera des séries horaires d’irradiation, de température et de charge. Le solaire réduit l’achat d’énergie. La continuité électrique repose sur les onduleurs et les groupes.

Le tarif de 1 MAD/kWh et les 60 000 MAD/an de frais fixes servent à la sensibilité. L’ONEE décrit une facture moyenne tension qui dépend de l’option tarifaire, des heures de consommation, de la puissance souscrite et appelée, du facteur de puissance et du comptage. Confirmer le gestionnaire de distribution, le poste de raccordement, les redevances d’accès, les pénalités et les prix applicables à l’adresse réelle. [Facturation moyenne tension ONEE](https://www.one.org.ma/fr/pages/interne.asp?esp=1&id1=2&id2=36&t2=1) · [Tarifs ONEE](https://www.one.org.ma/fr/pages/interne.asp?esp=1&id1=2&id2=35&t2=1)

## Investissement initial

Le calcul multiplie les quantités par les prix unitaires bas, centraux et hauts, puis ajoute 12 % d’aléas à chaque total. Les montants sont des enveloppes de planification, hors TVA et coût de financement. Le bâtiment comprend l’enveloppe, les structures, l’aménagement ordinaire et la finition. Les installations techniques sont chiffrées par lots séparés. L’installation est prévue dans les coûts des lots de travaux. Les lots informatiques provisionnent l’acquisition des équipements et leur intégration de base. Traiter le transport, les droits d’importation, les assurances chantier, la participation au raccordement et les frais fonciers comme postes à vérifier dans les devis. [Grille de coût et périmètre](../src/engineering.ts)

| Famille | Base du cas central de phase 1 | Origine et donnée à demander |
| --- | --- | --- |
| Terrain | 800 000 MAD, une parcelle | Prix affiché et plafond retenu. Demander titre, cadastre et frais d’acquisition. |
| Terrassement, accès et clôture | 1 465 m² à 300 MAD/m² | Provision incluant circulation et accès. Lever le terrain et consulter les entreprises. |
| Construction ordinaire | 1 120 m² à 4 600 MAD/m² | Provision ajustée pour dallage et locaux administratifs à partir d’ordres de grandeur industriels. La grille charpente seule décrit un périmètre plus réduit. |
| Études et mobilier | 560 000 et 190 000 MAD | Provisions forfaitaires de mission de conception, suivi et aménagement. |
| Distribution A/B et arrivée | Lot initial à 800 000 MAD et 315 kVA à 2 850 MAD/kVA | Provision protections, tableaux, transfert, poste, câbles et prises. Demander devis de raccordement et schémas chiffrés. |
| Onduleurs et groupes | 2 × 430 000 et 2 × 540 000 MAD | Provisions par ensemble avec batteries ou rétention selon le lot. Les références de puissance sont documentées dans l’étude d’infrastructure. |
| Refroidissement et solaire | 6 × 255 000 MAD et 80 kWc × 8 800 MAD | Provisions climatiseur et condenseur, puis panneaux, onduleur photovoltaïque et pose. Demander offre à température extérieure de calcul et relevé de toiture. |
| Baies, calcul, stockage et sauvegarde | 16 × 8 500, 48 × 21 000, 6 × 65 000, 6 × 40 000 et 2 × 80 000 MAD | Provisions par unité. Consulter au même niveau de garantie, capacité disque, ports et état des pièces. |
| Réseau et fibre | 750 000 et 160 000 MAD | Provisions par lot initial pour actifs réseau puis câblage. La connectivité commerciale annuelle figure en exploitation. |
| Sûreté et extinction | 215 000 et 465 000 MAD | Provisions par site, à reprendre selon le plan des locaux et l’étude réglementaire. |

Le prix de 4 600 MAD/m² rassemble un périmètre élargi de travaux. Le catalogue marocain utilisé comme repère chiffre un hall industriel, ossature et couverture, entre 900 et 1 400 MAD/m² et décrit l’enveloppe logistique isolée à part. Le prix photovoltaïque est une hypothèse de 6 800 à 11 800 MAD/kWc, à confronter à la puissance et au périmètre d’une offre commerciale posée. Un modèle d’équipement cité renseigne une catégorie technique. Aucun fournisseur n’a confirmé un prix d’achat pour ce projet. [Repères marocains de charpente](https://gpcontractor.ma/charpente-metallique) · [Repères photovoltaïques commerciaux](https://libreenergiemaroc.com/combien-coute-une-installation-photovoltaique-au-maroc/) · [Références techniques](architecture-et-infrastructure.md)

Résultats indicatifs en phase 1 avec les paramètres initiaux, arrondis à l’unité. L’investissement s’étend de **12 395 824** à **26 922 952 MAD**, avec **18 521 720 MAD** au centre. Les coûts d’exploitation atteignent **1 504 969 MAD/an**. Le modèle additionne électricité, deux liens de fibre, maintenance informatique, essais des groupes, refroidissement, entretien photovoltaïque, abonnements, réserve de remplacement, assurance et eau. Pour une décision financière, séparer l’argent dépensé et les provisions comptables. La réserve de remplacement est incluse dans le rapprochement pédagogique des flux.

## Services et recettes simulées

| Produit | Tarif initial du modèle | Quantité maximale de phase 1 | Hypothèse commerciale |
| --- | ---: | ---: | --- |
| Serveur virtuel | 159 MAD/mois | 921 | 2 vCPU, 4 Gio et 40 Go. Comparer ressources, région et durée d’engagement. |
| Serveur dédié | 2 400 MAD/mois | 5 | Hôte réservé. Vérifier garantie, débit et assistance inclus. |
| Stockage objet compatible S3 | 180 MAD/To/mois | 276 To | Capacité HDD après protection et marge. Débit, opérations et transfert à tarifer. |
| Sauvegarde à la demande | 230 MAD/To/mois | 64 To | Espace disponible au-delà de la rétention interne modélisée. |
| Lot de nuage privé | 5 200 MAD/mois | 9 | Chaque lot réserve 32 équivalents sur le même parc virtualisé. |

Clouder annonce au Maroc un VPS avec IP marocaine à partir de 250 MAD/mois et affiche d’autres offres cloud à partir de 200 MAD/mois. OVHcloud Maroc publie un repère de 0,076 MAD HT/Go/mois pour le stockage objet standard utilisé par Backup Agent, soit 76 MAD HT/To/mois avant autres services. Ce prix et le produit local projeté couvrent des prestations différentes. Les prix du tableau sont des hypothèses ajustables tenant compte de la petite échelle du projet. Les offres d’hébergeurs servent de comparaison commerciale. [VPS Clouder](https://www.clouder.ma/fr/serveur-vps) · [Panier cloud Clouder](https://dashboard.clouder.ma/index.php/store/serveurs-cloud) · [Backup Agent OVHcloud Maroc](https://www.ovhcloud.com/fr-ma/storage-solutions/backup-agent/) · [Catalogue entreprises Maroc Telecom](https://www.iam.ma/documents/66341/0/Catalogue%2Bdes%2Boffres%2Bentreprises%2B-%2BMai%2B2026.pdf/e47cfbf6-9c48-dbf2-f2ac-fb82a05c1296?t=1779291592151)

Le modèle multiplie la quantité disponible de chaque service par son prix et un taux d’occupation commercial unique. Pour chaque année, le scénario prudent, équilibré ou soutenu donne un taux de base auquel s’ajoutent l’ajustement de l’occupation et la croissance réglée. Le taux représente la part vendue de la capacité facturable. Les ventes simulées utilisent des plafonds séparés pour les hôtes dédiés, les VPS, les lots privés, les données objet et les sauvegardes. Le scénario équilibré sans extension prévoit environ **808 917 MAD** de recettes la première année à 25 % d’occupation. Il laisse un **cumul de trésorerie d’infrastructure de −16 824 909 MAD** à la fin de la cinquième année.

Le modèle débite l’investissement au départ puis la différence lorsqu’un palier supérieur est choisi. Une extension extérieure éventuelle demande un chiffrage distinct. Les dépenses se rapportent aux infrastructures. Le modèle exclut les équipes, les taxes et les frais de financement et omet les délais de livraison ainsi que l’ordre de passage des équipements de puissance. Une projection de rentabilité exige des coûts de remise à niveau, des durées d’amortissement et des contrats spécifiques au site.

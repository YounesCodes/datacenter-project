# Architecture et choix techniques

## Données et calculs

`src/model.ts` contient les identifiants des zones, des équipements et des baies, le site probable, les deux géométries de parcelle (conceptuelle et cadastrale éventuelle), les phases, les configurations, les chemins techniques et les services. `src/engineering.ts` calcule la population, la capacité, la puissance, l’énergie et les budgets. Les panneaux et la maquette consomment les mêmes résultats. Les entrées sont bornées. Les baies avancent par paires pour maintenir l’équilibre entre salles, et le nombre de serveurs dépend du nombre de baies de calcul équipées.

Les scénarios sont des suites d’états dans `src/simulations.ts`. Chaque étape définit ses chemins actifs, les branches à mettre en avant, l’événement affiché, l’équipement à annoter et, au besoin, la priorité de cadrage. Les commandes manuelles changent l’étape et déclenchent le déplacement de la caméra et l’animation du tracé. Les parcours utilisent les points de raccordement des modèles 3D définis dans `src/model.ts`. `src/flowLanes.ts` attribue une voie aux liaisons de natures différentes qui suivent un même segment, puis décale leur tracé de quelques pixels à l’écran pour qu’elles restent lisibles à tout niveau de zoom.

## Rendu et carte

L’application est statique (Vite, React et TypeScript), sans services backend. Le navigateur charge la maquette Three.js et la carte Leaflet au besoin. Le rendu 3D se déclenche lorsque la vue bouge ou que les données changent. Une couche 2D souligne brièvement les branches d’intérêt au début de chaque étape, puis les garde visibles. L’éclairage utilise une ombre directionnelle mise en cache. La qualité Économie réduit la résolution et désactive les ombres.

Les véhicules sont regroupés dans `src/assets/parking-cars.glb`. Le fichier adapte les modèles CC0 1.0 de tevy (version 1, berline LOD1 avec roues LOD2 et compacte LOD2) en quatre maillages instanciés, avec des feux éteints et une palette assortie à la maquette. [Family Sedan](https://tevy.dev/models/family-sedan) · [Five-Door Hatchback](https://tevy.dev/models/hatchback)
   
La maquette réutilise des géométries et des matériaux entre lots instanciés. Les parcours et les simulations limitent ces lots aux salles et aux équipements concernés. La vue solaire laisse voir les équipements sous les panneaux. Les repères HTML suivent les coordonnées projetées. Le modèle et ses repères ouvrent la même fiche et une seconde sélection de l’élément actif recentre la caméra sur l’ensemble du site. Le mode à pied utilise une caméra perspective, la souris ou le glissement pour regarder et le clavier pour avancer. La collision couvre les murs, les limites de la maquette et les rangées de baies.

Leaflet affiche une carte raster indépendante de WebGL, limitée à Benguerir et au site. Les deux vues gardent leur cadrage quand on passe de l’une à l’autre. La maquette utilise une scène locale au mètre. [Comparaisons cartographiques](../research/mapping.md)

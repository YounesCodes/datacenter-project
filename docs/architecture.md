# Architecture et choix techniques

## Données et calculs

`src/model.ts` contient les identifiants des zones, des équipements et des baies, le site probable, les deux géométries de parcelle (conceptuelle et cadastrale éventuelle), les phases, les configurations, les chemins techniques et les services. `src/engineering.ts` calcule la population, la capacité, la puissance, l’énergie et les budgets. Les panneaux et la maquette consomment les mêmes résultats. Les entrées sont bornées. Les baies avancent par paires pour maintenir l’équilibre entre salles, et le nombre de serveurs dépend du nombre de baies de calcul équipées.

Les scénarios sont des suites d’états dans `src/simulations.ts`. Chaque étape définit ses chemins actifs, l’événement affiché, l’équipement à annoter, l’heure applicable et la durée. Un clic lance la lecture. Les annotations restent attachées au modèle pendant que les événements se succèdent. La pause conserve le temps restant et la position des marqueurs de flux.

## Rendu et carte

L’application est statique (Vite, React et TypeScript), sans services backend. Le navigateur charge la maquette Three.js et la carte Leaflet au besoin. Le rendu 3D est piloté directement par le moteur afin de maîtriser l’invalidation, les instances et le changement de caméra. Le rendu 3D se déclenche lorsque la vue bouge ou que les données changent. Dans une vue immobile, une couche 2D anime les marqueurs de parcours. L’éclairage utilise une ombre directionnelle mise en cache. La qualité Économie réduit la résolution et désactive les ombres. 
   
La maquette réutilise des géométries et des matériaux entre lots instanciés. Un seul niveau de bâtiment est rendu à la fois. Les repères HTML suivent les coordonnées projetées. Le modèle et ses repères ouvrent la même fiche et une seconde sélection de l’élément actif recentre la caméra sur l’ensemble du site. Le mode à pied utilise une caméra perspective, la souris ou le glissement pour regarder et le clavier pour avancer. La collision couvre les murs, les limites de la maquette et les rangées de baies.

Leaflet affiche une carte raster indépendante de WebGL, limitée à Benguerir et au site. Les deux vues gardent leur cadrage quand on passe de l’une à l’autre. La maquette utilise une scène locale au mètre. [Comparaisons cartographiques](../research/mapping.md)

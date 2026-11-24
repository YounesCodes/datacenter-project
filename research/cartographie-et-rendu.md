# Choix du moteur de rendu

Three.js pilote la géométrie au mètre, les coupes, la caméra et les marqueurs projetés. Le moteur regroupe les objets d’une même forme et d’un même matériau en instances. Des groupes restent associés aux étages et à l’installation des baies. React gère les commandes et le texte. Le moteur 3D reçoit l’état calculé et s’occupe des changements de caméra en dehors de React.

React Three Fiber fournit un autre accès au même moteur. Il prend en charge les composants déclaratifs, le rendu à la demande et les instances. Ces mécanismes conviendraient à une scène maintenue sous forme de composants d’objets. Dans ce projet, la construction des pièces et équipements passe déjà par un générateur de lots qui produit aussi les identifiants pour la sélection. L’intégration directe évite un second arbre de composants 3D et permet d’appeler le rendu depuis les interactions et les transitions. Les deux solutions permettent des optimisations comparables. Le moteur React Three Fiber n’a pas fait l’objet d’un benchmark équivalent. [React Three Fiber, gestion des performances](https://r3f.docs.pmnd.rs/advanced/scaling-performance) · [Instances Three.js](https://threejs.org/docs/pages/InstancedMesh.html)

Les trajectoires sont projetées sur la maquette. Quand la caméra s’arrête, le moteur conserve l’image 3D et seule une petite couche Canvas 2D anime les marqueurs de flux. Les dimensions projetées restent cohérentes à chaque mouvement de caméra. Les mesures avant et après figurent dans la note de vérification. [Vérification](../docs/verification.md)

## Contre-essai cartographique

Un second essai a chargé les distributions Leaflet 1.9.4 et MapLibre 5.20.2 dans Chromium. Avec un cadre de 720 × 440 pixels, les deux cartes ont centré le repère probable au zoom 18. Leaflet a réussi après désactivation de WebGL. Le fichier JavaScript minifié pesait 42 706 octets gzip pour Leaflet et 275 300 octets gzip pour MapLibre. Le test a utilisé un fond local et ne mesure ni la vitesse des tuiles publiques ni la scène Three.js. [Comparaison principale et test de la carte](mapping.md)

# Choix cartographique et implantation

## Du repère régional à la maquette

La vue locale cadre le centre de Benguerir et le repère du projet, à 32.25065° N et 7.93090° O. Le point correspond à l’enclos visible près du carrefour de la RP2106. L’annonce, l’imagerie et les repères concordent à cet endroit. Le périmètre du bien annoncé reste à confirmer. [Recherche de localisation](localisation-parcelle.md)

Leaflet cadre les deux repères dans une seule carte de Benguerir. Le zoom minimal, le déplacement et les requêtes de tuiles restent dans les environs. Le passage vers « Ouvrir la maquette 3D » charge la scène Three.js en mètres. À ce niveau, la géométrie montre les emprises, volumes et circulations retenus pour l’étude. Le choix d’un repère probable n’établit ni l’orientation du terrain réel, ni ses dimensions.

## Options étudiées

| Solution | Usage envisagé | Décision |
| --- | --- | --- |
| Leaflet | Tuiles raster, positionnement WGS 84, marqueurs et zoom animé | Retenu pour la carte locale. Fonctionne avec un navigateur sans WebGL. |
| MapLibre GL JS | Carte vectorielle, relief et intégration d’une couche 3D | Prototype fonctionnel avec WebGL. Un choix pertinent si le projet dispose ensuite de relevés et doit superposer la maquette à une carte 3D. |
| Mapbox GL JS | Cartographie vectorielle et satellite, styles hébergés, terrain et couches 3D | Jeton nécessaire pour les services Mapbox et tarification par initialisation de carte. Ces services n’apportent pas de preuve cadastrale au projet. |
| CesiumJS | Globe WGS 84, relief, imagerie et données 3D géoréférencées | Présente un intérêt si le projet reçoit des couches de terrain, des relevés ou une maquette à positionner en altitude. Cesium ion fournit sous conditions des données et un hébergement. |
| Three.js | Géométrie propre au campus, bâtiments, salles et équipements | Retenu pour la maquette métrique. La carte et la scène restent utilisables indépendamment. |

[Leaflet](https://leafletjs.com/reference.html) · [MapLibre GL JS](https://maplibre.org/projects/gl-js/) · [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/overview/) · [Tarification Mapbox](https://docs.mapbox.com/mapbox-gl-js/guides/pricing/) · [CesiumJS](https://cesium.com/platform/cesiumjs/) · [Three.js](https://threejs.org/docs/pages/WebGLRenderer)

## Essais de cartographie

Le 24 novembre 2026, deux prototypes Chromium ont utilisé les mêmes points, un cadre de 840 × 520 pixels et un passage de la région à la ville. Leaflet 1.9.4 et MapLibre GL JS 5.24.0 ont cadré les deux points. L’essai sans WebGL a réussi avec Leaflet. MapLibre a échoué à ouvrir le contexte graphique. Après compression gzip niveau 9, le fichier JavaScript distribué par Leaflet pesait 42 494 octets et celui de MapLibre 276 027 octets. Les mesures portent sur les fichiers JavaScript distribués seuls, avant intégration dans l’application.

Le composant de carte de l’application a aussi été essayé dans Chromium sur un écran de 390 pixels de large, avec les deux repères, le passage vers la maquette et l’absence de clé satellite. Les tuiles OpenStreetMap ont répondu dans le navigateur. Des réponses satellite 403 et l’indisponibilité du fond OpenStreetMap ont été injectées pour contrôler le repli. La configuration par défaut retrouve OpenStreetMap sans clé, et les repères restent présents en cas d’échec total du fond. La réception en direct des tuiles MapTiler demande une clé.

## Configuration du déploiement

- Le déploiement statique Vercel charge les tuiles OpenStreetMap dans le navigateur. L’attribution figure dans la carte. Le service public est fourni au mieux et convient à une consultation ponctuelle. [Politique d’utilisation des tuiles](https://operations.osmfoundation.org/policies/tiles/)
- La variable VITE_MAPTILER_KEY active le bouton « Satellite ». Utiliser une clé navigateur limitée aux origines autorisées dans MapTiler. Le logo et les attributions s’affichent avec le fond satellite. En cas d’échec intégral du fond satellite, la carte revient à OpenStreetMap. [Clés API](https://docs.maptiler.com/guides/developer/credentials/api-key/) · [Attribution](https://docs.maptiler.com/guides/map-design/attribution/add-attribution/)

## Saisie de limites vérifiées

Une fois le plan cadastral obtenu, enregistrer sa référence dans la recherche de localisation et relever les sommets du bien. Convertir les coordonnées de leur système d’origine en WGS 84, puis saisir la liste des couples latitude et longitude dans **cadastralBoundary**, dans l’ordre du périmètre. Mettre à jour **parcelAnchor** et passer **confidence** à **parcelle** dans le modèle. La carte trace le polygone seulement si ces deux conditions de vérification sont satisfaites.

Dans la scène 3D, **boundary** reste un polygone local en mètres. Sa mise à jour demande de recaler le plan de masse, les accès, le bâti et l’orientation sur les limites confirmées. Pour l’instant, il représente une emprise rectangulaire de 2 465 m² d’après la surface annoncée.

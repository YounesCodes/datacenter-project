# Projet de centre de données à Benguerir

Maquette 3D et outil de présentation en français. Le navigateur affiche le bâtiment, ses équipements, sept simulations et un modèle d’énergie et de coûts. L’application fonctionne sans compte ni serveur applicatif.

Le repère **32.25065, −7.93090** correspond à l’emplacement probable déduit de l’annonce et de l’imagerie. Les **limites parcellaires restent non vérifiées**. La parcelle de la maquette sert à étudier un aménagement de 2 465 m². Les quantités, prix, flux et événements sont des hypothèses de projet. Le dossier de recherche indique les sources et les validations en attente. [Recherche](research/README.md) · [Localisation](research/localisation-parcelle.md)

## Démarrer

Node.js 22.12 ou ultérieur requis.

```sh
npm ci
npm run dev
```

Ouvrir l’adresse affichée par Vite sur ordinateur. Les boutons d’étage donnent accès à la coupe, à l’aile administrative et à la toiture. Glisser pour tourner, faire défiler pour zoomer. Les objets et leurs repères ouvrent les fiches.

```sh
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm run preview
```

Les tests de bout en bout utilisent Chromium avec un moteur WebGL logiciel. Une connexion permet de vérifier l’affichage des tuiles OpenStreetMap. Le scénario automatisé d’erreur de carte coupe volontairement ces requêtes.

## Déployer sur Vercel

1. Importer le dépôt dans Vercel. Choisir le dossier racine du dépôt et le préréglage **Vite**.
2. Utiliser `npm run build` comme commande de compilation et `dist` comme dossier de sortie. Ces paramètres figurent dans `vercel.json`. Choisir une version Node.js compatible avec `package.json`.
3. Pour activer le satellite, renseigner `VITE_MAPTILER_KEY` dans les variables d’environnement Vercel ou dans un fichier local `.env.local` créé à partir de `.env.example`. Restreindre la clé aux origines attendues chez le fournisseur. Une clé Vite est visible côté navigateur.
4. Compiler et ouvrir le résultat. Sans clé satellite, la carte utilise OpenStreetMap. Si les tuiles échouent, le site et le centre-ville restent repérés sur un fond neutre.

Pour un usage public soutenu, prévoir un fournisseur de tuiles adapté au trafic et conserver les attributions. [Politique de tuiles OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/)

## Modifier les hypothèses

| Besoin | Fichier et changement |
| --- | --- |
| Emprise, hauteur, étages | `src/model.ts`, valeurs `building`, `upper`, `technicalHeight`, `upperHeight`. Les dimensions s’expriment en mètres. |
| Surfaces et implantation des salles | `src/model.ts`, liste `rooms`. Chaque rectangle suit `[x, z, largeur, profondeur]`. Ajuster les ouvertures et les équipements liés dans `src/roomsGeometry.ts`. |
| Enceinte, voirie et zone d’extension | `src/model.ts`, `boundary` et `reserve`. Adapter les positions des accès et installations dans `src/outdoorGeometry.ts`. |
| Implantation des baies | `src/model.ts`, `rackPositions`, `specs.rack` et `phases`. Revoir le dégagement des allées et la distribution de l’équipement si la densité change. |
| Matériel, CPU, mémoire, disques, puissance | `src/model.ts`, `specs`, `equipment` et `phases`. Les calculs communs figurent dans `src/engineering.ts`. |
| Électricité, photovoltaïque | `defaults` dans `src/engineering.ts` et `specs.solar` dans `src/model.ts`. L’interface permet aussi de modifier le tarif, les frais fixes, le PUE et la puissance solaire. |
| Prix de l’équipement et entretien | `costRows` et `operations` dans `src/engineering.ts`. Consigner la date, les inclusions et la source des modifications dans le dossier de recherche. |
| Prix des services et rythme de vente | `services` dans `src/model.ts`, `scenarios` et `projections` dans `src/engineering.ts`. |
| Liaisons et simulations | `coordinates`, `topology` dans `src/model.ts` et `simulations` dans `src/simulations.ts`. |

### Remplacer le repère par une parcelle vérifiée

Obtenir le plan foncier et les coordonnées des sommets, avec leur système de référence, puis convertir les coordonnées géographiques en WGS 84. Dans `src/model.ts`, renseigner `parcelAnchor` et `cadastralBoundary` en paires `[latitude, longitude]`. Passer `confidence` à `'parcelle'` uniquement après validation de la pièce, puis consigner sa provenance et sa date. La carte dessine le polygone uniquement si le statut et les points cadastraux sont renseignés.

Pour réaligner la maquette, projeter les sommets en mètres dans un repère local, définir l’orientation du nord et modifier `property.boundary`. Vérifier l’implantation des bâtiments, des voies, des reculs et des accès dans ce nouveau contour. Actualiser le test de surface seulement si la superficie officielle diffère de l’annonce.

[Conception de l’interface](DESIGN.md) · [Architecture du code](docs/architecture.md) · [Vérification](docs/verification.md)

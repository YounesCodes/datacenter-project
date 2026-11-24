# Vérification de l’application

Vérification le 24 novembre 2026. Node.js 24.22.3 et Playwright Chromium sous Windows.

## Contrôles effectués

- 13 tests Vitest pour les surfaces et recouvrements, les positions de baies et allées, la population, le calcul, le stockage, les réserves, l’énergie, les dépenses, les projections et les dépendances entre phases.
- Contrôles Playwright de la disposition sur ordinateur, de la carte locale, des données, de la sélection des équipements, de l’escalier en vue à pied et de la lecture des simulations.
- Le plan de Benguerir conserve les deux repères à la limite de zoom arrière sur ordinateur et téléphone. Le plan chargé en direct dans Chromium couvre les environs immédiats. Le scénario de panne de carte coupe les requêtes OpenStreetMap pour vérifier les repères et le lien vers la maquette. Le repli satellite après refus simulé a été testé séparément. L’essai en direct de MapTiler demande une clé. [Essais cartographiques](../research/mapping.md)
- Échec WebGL injecté dans Chromium pour contrôler que les pièces et le tableau financier restent consultables.
- Compilation TypeScript et Vite réussie. L’application compilée a été servie localement depuis `dist/`. La configuration et le guide sont prêts pour l’import dans Vercel. [Préréglage Vite de Vercel](https://vercel.com/docs/frameworks/frontend/vite)

## Revue visuelle

Captures Chromium à 1 440 × 900 et à 390 × 844. Contrôle visuel de l’accueil, des baies, des groupes électrogènes et des annotations de simulation. Retour à la vue d’ensemble vérifié avec l’animation de caméra activée.

## Mesures du rendu

Mesures de la version précédente par compteurs de rendu Three.js et horloge du navigateur. Écran émulé à DPR 1, moteur ANGLE SwiftShader. Les essais mobile et ordinateur utilisent la même machine, sans GPU matériel disponible dans Chromium lors de l’essai.

| Cas | Résultat observé |
| --- | --- |
| Coupe initiale, phase 1, ordinateur | 12 appels de dessin et 30 086 triangles par image. Aucun rendu WebGL supplémentaire sur une seconde au repos. |
| Parcours électrique, phase 3, ordinateur | 15 appels et 42 466 triangles à la mise en place. Sur deux secondes à caméra fixe, environ 60 images/s pour les marqueurs et zéro rendu WebGL supplémentaire. |
| Parcours électrique, phase 3, téléphone émulé | Environ 60 images/s pour les marqueurs et zéro rendu WebGL supplémentaire sur deux secondes à caméra fixe. |
| Orbite de la phase 3, ordinateur, rendu logiciel | Environ 11 images/s sur un glissement automatisé de 70 mouvements. Le tampon WebGL passe de 911 à 491 pixels de large pendant le glissement et revient à 911 après la stabilisation. |

Avant la séparation du flux animé, le rendu logiciel complet tournait autour de 8 à 9 images/s à caméra fixe sur ordinateur et 21,5 sur le téléphone émulé. La scène fixe conserve désormais son image tandis que le navigateur anime les points en deux dimensions. Lorsque la caméra bouge, le coût de rastérisation WebGL reste le facteur limitant en rendu logiciel. Ces mesures ne concluent rien sur les performances d’un GPU ou d’un téléphone matériel.

Le build final sépare la logique de la carte, les tableaux et la maquette. Les modules initiaux `index` et `jsx-runtime` totalisent environ 99 ko gzip. Le module 3D représente environ 161 ko gzip et le module cartographique environ 45 ko gzip. Vite signale que le module 3D minifié dépasse son seuil de 500 ko. Le poids provient surtout du moteur Three.js intégré. Les modules JavaScript sont servis statiquement.

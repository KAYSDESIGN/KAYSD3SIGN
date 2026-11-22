# Journal de construction HotCouple

Données : couche factice en mémoire (`mobile/src/data/fake.ts`), mêmes signatures et mêmes règles que `replica/schema.sql`. À remplacer par Supabase avec `/replica-backend`, sans toucher aux écrans.

Vérification : export web + parcours complet dans Chromium (Playwright) à 390 px et 1440 px, aucune erreur console. Captures dans `replica/clone-screens/`. Non testé sur un vrai iPhone ou Android.

| ID | date | statut | manque | plus dur que prévu |
| --- | --- | --- | --- | --- |
| shell | 2026-11-21 | fait | - | NativeWind 4 sur Expo 58 : il a fallu `babel-preset-expo` en dépendance explicite. Le router impératif ne peut pas être appelé pendant le rendu statique. |
| S01 Bienvenue | 2026-11-21 | partiel | vrai lien magique, vraie connexion Apple/Google | - |
| S02 Profil | 2026-11-21 | partiel | photo, date d'anniversaire du couple | - |
| S03 Appairage | 2026-11-21 | fait | - | - |
| S04 Accueil | 2026-11-21 | fait | tirer pour rafraîchir, push des nudges | - |
| S05 Humeur | 2026-11-21 | fait | affichage de la note du partenaire | - |
| S08 Question du jour | 2026-11-21 | fait | - | - |
| S22 Question coquine | 2026-11-21 | partiel | dépend de S20 (âge + audace) | - |
| S20 18+ et audace | 2026-11-22 | fait | vérification d'âge renforcée (selon pays) | les champs de date débordaient sur le web (largeur par défaut d'un input) |
| S21 Envies secrètes | 2026-11-22 | fait | - | - |
| S22 Question coquine | 2026-11-22 | fait | - | le tirage se faisait avant le choix du niveau : il se refait maintenant si le niveau change, et toujours s'il baisse |
| S06 / S23 Défis | 2026-11-22 | partiel | défis photo, vocal, dessin (stockage, micro, toile) | - |
| S16 Premium | 2026-11-22 | partiel | vrais achats RevenueCat, restaurer un achat | - |
| S17 Profil du couple | 2026-11-22 | fait | photo, date d'anniversaire | - |
| S18 Réglages | 2026-11-22 | partiel | réglages de notifications | - |
| S26 Mode discret | 2026-11-22 | partiel | icône neutre, notifications neutres côté serveur, code PIN | - |
| S13 Bucket list | 2026-11-22 | fait | réordonner | - |
| S14 Petits mots | 2026-11-22 | fait | lu / non lu, pagination | - |
| S10 Quiz | 2026-11-22 | fait | plus de quiz | « Retour aux quiz » empilait une 2e liste au lieu de revenir |
| S11 Jouer | 2026-11-22 | fait | autres jeux (mots, mémoire, trivia, fléchettes) | - |
| S12 Parties | 2026-11-22 | partiel | 2 jeux sur 8 | - |
| S15 Nos dates | 2026-11-22 | fait | date d'anniversaire du couple sur S17 | - |
| S24 Dés coquins | 2026-11-22 | partiel | cartes | - |
| S27 Soirée à deux | 2026-11-22 | partiel | rappel push le jour J, choix d'une date libre | - |
| restent en attente (S07, S09, S19, S25) | - | route en place | contenu | demandent des modules natifs : position, appareil photo, widgets, chiffrement |

Notes :
- Le mode démo (boutons « simuler le/la partenaire ») permet de tester la boucle à deux sur un seul téléphone. Il disparaîtra avec la vraie couche de données.
- Le jour du couple est calculé dans le fuseau du couple, pas du téléphone, comme prévu dans l'architecture.

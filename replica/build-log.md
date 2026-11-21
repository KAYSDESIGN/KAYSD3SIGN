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
| autres (S06, S07, S09–S18, S20, S21, S24, S25, S27) | 2026-11-21 | route en place | contenu | - |

Notes :
- Le mode démo (boutons « simuler le/la partenaire ») permet de tester la boucle à deux sur un seul téléphone. Il disparaîtra avec la vraie couche de données.
- Le jour du couple est calculé dans le fuseau du couple, pas du téléphone, comme prévu dans l'architecture.

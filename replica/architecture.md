# Architecture : HotCouple (reconstruction des fonctions de Space for Two, version adulte)

Entrées : `replica/recon.md`, `replica/features.csv`. Schéma complet : `replica/schema.sql`.
Date : 2026-11-21

## Stack

Le produit est une app mobile (iOS + Android) avec position en arrière-plan, widgets, notifications et achats intégrés. La stack est donc mobile d'abord, avec un seul backend managé.

| couche | choix | pourquoi |
| --- | --- | --- |
| mobile | Expo (React Native) + TypeScript, Expo Router | un seul code pour iOS et Android ; builds et mises à jour via EAS |
| widgets | extension WidgetKit (Swift) + widget Android, via un config plugin Expo | les widgets ne se font pas en React Native ; ils lisent des données partagées écrites par l'app |
| styles | NativeWind (Tailwind) avec les tokens de replica-design | mêmes tokens sur l'app et le site |
| site | Next.js sur Vercel : page d'accueil, mentions légales, suppression de compte | obligatoire pour les stores ; pas d'app web au début |
| base de données | Postgres sur Supabase | RLS, temps réel, stockage et auth dans le même service |
| accès aux données | client Supabase + RPC SQL ; types générés par `supabase gen types` | pas d'ORM : la logique sensible est dans la base (RLS, triggers) |
| auth | Supabase Auth : Apple, Google, email avec lien magique | Apple obligatoire dès qu'il y a une connexion Google sur iOS |
| paiements | achats intégrés App Store et Google Play via **RevenueCat** | les abonnements numériques dans une app **doivent** passer par les stores ; Stripe interdit ici |
| temps réel | Supabase Realtime (changements Postgres + Broadcast pour les nudges) | révélations, jeux, humeurs et position en direct |
| notifications | Expo Push (APNs + FCM) | un seul envoi pour les deux plateformes |
| position | expo-location + expo-task-manager (arrière-plan, changements significatifs) | moins de batterie que le GPS continu |
| fichiers | Supabase Storage, buckets privés `couple-media` et `vault` | URL signées de courte durée ; le coffre est chiffré côté client |
| jobs | Supabase Cron (pg_cron) + Edge Functions | tirage du jour, rappels, purges |
| emails | Resend (connexion, reçus de suppression) | peu d'emails, presque tout passe par les notifications push |
| suivi des erreurs | Sentry | sans données de contenu (réglage de scrubbing) |

Une seule base. Pas de microservices.

## Schéma

26 tables. Accès : **Row Level Security partout**, testée en local (voir plus bas).

Principe : chaque contenu porte un `couple_id`, et la fonction `my_couple_id()` limite toutes les lectures au couple de la personne connectée.

| groupe | tables |
| --- | --- |
| comptes | profiles, push_tokens |
| couple | couples, couple_members (max 2, une personne dans un seul couple) |
| au quotidien | moods, locations_current, location_points (trace 48 h max) |
| rituel du jour | prompts, daily_assignments, responses |
| souvenirs et listes | moments, bucket_items, messages, special_dates |
| quiz et jeux | quizzes, quiz_questions, quiz_sessions, quiz_answers, games |
| HotCouple | desires, desire_answers, vault_items, date_plans |
| système | notifications, reports, subscription_events |

Règles imposées par la base, pas par l'interface :
- **Réponse du jour** : on ne voit celle du partenaire qu'après avoir répondu soi-même.
- **Quiz** : les réponses de l'autre restent cachées jusqu'à la révélation, et le score est calculé par un trigger.
- **Envies secrètes** : on ne lit jamais les réponses de l'autre, seulement les « oui » communs via la RPC `mutual_desires()`. Un « non » n'est jamais révélé.
- **Niveau d'audace** du couple = le plus bas des deux (`couple_spice_level()`).
- **Streak et Premium** : colonnes non modifiables par le client. Le streak est calculé par un trigger, Premium par le webhook RevenueCat.
- **Appairage** : codes de 6 caractères sans lettres ambiguës, valables 48 h, et un verrou empêche un troisième membre.
- **Désappairage** : supprime le couple et, en cascade, tout le contenu partagé des deux côtés.

Testé sur Postgres 16 avec des remplaçants d'`auth` et `storage` :
- une tierce personne ne voit rien ;
- un code invalide est refusé ;
- le niveau d'audace retenu est le plus bas des deux ;
- la réponse du partenaire est cachée avant d'avoir répondu soi-même, visible après ;
- le streak passe à 1 et le client ne peut pas le modifier ;
- les envies : chacun ne voit que ses propres réponses, et seul le oui commun ressort ;
- le désappairage vide le contenu.

## API

Le client lit et écrit les tables simples directement (sous RLS). Tout ce qui demande une vérification passe par une RPC SQL ou une Edge Function.

| méthode / chemin | fait | qui | entrée | sortie | parcours |
| --- | --- | --- | --- | --- | --- |
| Supabase Auth (Apple / Google / lien magique) | inscription, connexion | public | jeton du fournisseur | session | F01 |
| `update profiles` | profil, date de naissance, audace, mode discret | soi | champs | profil | F01, S20 |
| `rpc create_couple` | crée le couple, renvoie le code | connecté, sans couple | - | code | F01 |
| `rpc join_couple` | rejoint avec un code | connecté, sans couple | code | couple_id | F01 |
| `POST /functions/v1/unpair` | supprime les fichiers du couple puis `rpc unpair` | membre | - | ok | F08 |
| `POST /functions/v1/delete-account` | désappaire, supprime les fichiers puis l'utilisateur auth | soi | confirmation | ok | F08 |
| `POST /functions/v1/today` | renvoie (et crée si besoin) le tirage du jour selon le fuseau, l'audace et Premium | membre | - | assignments | F02 |
| `insert responses` | répondre ou passer | membre | texte ou fichier | réponse | F02 |
| `insert moods` | humeur | membre | humeur, note | - | F03 |
| `insert messages` (kind nudge / affection / text) | petit mot, nudge | membre | - | - | F03 |
| `upsert locations_current` + `insert location_points` | position (tâche en arrière-plan) | soi | lat, lng | - | F04 |
| `insert moments` + upload `couple-media/<couple>/…` | sauver un moment | membre | photo, légende, lieu | - | F06 |
| `insert quiz_sessions` / `insert quiz_answers` | lancer et jouer un quiz | membre | réponses | score à la révélation | F05 |
| `POST /functions/v1/game-move` | valide le tour et les règles, applique le coup (verrou `version`) | membre dont c'est le tour | game_id, coup, version | nouvel état | F05 |
| `upsert desire_answers` / `rpc mutual_desires` | répondre aux envies, voir les oui communs | membre 18+ | réponse | liste des matchs | S21 |
| `insert vault_items` + upload `vault/<couple>/…` | coffre privé (fichier chiffré côté client) | membre 18+ Premium | fichier chiffré, expiration | - | S25 |
| `insert / update date_plans` | proposer ou accepter une soirée | membre | date, thème | - | S27 |
| CRUD `bucket_items`, `special_dates` | listes et dates | membre | - | - | S13, S15 |
| `insert reports` | signaler un contenu | connecté | cible, raison | - | obligation des stores |
| `POST /functions/v1/revenuecat-webhook` | met à jour `couples.premium_until` | RevenueCat (secret partagé) | événement | 200 | F07 |

Webhooks entrants : RevenueCat. Webhooks sortants : aucun.

Jobs (Supabase Cron) :

| job | quand | fait |
| --- | --- | --- |
| daily-assign | toutes les 15 min | crée le tirage du jour des couples dont il vient d'être minuit dans leur fuseau |
| daily-reminder | toutes les 15 min | relance à 20 h, heure locale, la personne qui n'a pas encore répondu |
| partner-answered | trigger, via Edge Function | push « ton/ta partenaire a répondu » |
| date-reminder | toutes les 15 min | rappel 2 h avant une soirée acceptée |
| location-purge | toutes les heures | supprime les `location_points` de plus de 48 h |
| vault-purge | toutes les 5 min | supprime les éléments du coffre expirés (fichier + ligne) |
| invite-cleanup | une fois par jour | supprime les couples d'une seule personne avec un code expiré depuis 7 jours |

## Les points délicats

- **Fuseaux horaires** : « le jour » est celui de `couples.timezone`, pas celui de chaque téléphone. Les couples à distance le verront ; on l'affiche (« nouvelle question à minuit, heure de Paris »).
- **Idempotence** : les webhooks RevenueCat peuvent arriver deux fois. Chaque événement est stocké avec un id unique et un doublon ne fait rien.
- **Concurrence** : les coups de jeu passent par un verrou optimiste (`games.version`). L'appairage verrouille la ligne du couple. Les révélations sont calculées dans des triggers, pas dans l'app.
- **Abonnement partagé** : RevenueCat est lié à la personne qui paie. Le webhook écrit `premium_until` et `premium_owner_id` sur le couple. Si cette personne se désappaire, Premium la suit dans son prochain couple (à recalculer à l'appairage).
- **Position en arrière-plan** : Apple exige une vraie raison visible et l'autorisation « Toujours », demandée en deux temps (d'abord « Pendant l'utilisation »). On envoie au plus une position par changement significatif (~500 m) ou toutes les 15 min.
- **Temps réel** : un abonnement Realtime par couple. Les nudges passent par Broadcast (éphémère) et aussi par une ligne `messages` pour l'historique.
- **Hors ligne** : les réponses, humeurs et messages sont mis en file d'attente sur le téléphone et renvoyés au retour du réseau. Les jeux demandent d'être en ligne.
- **Fichiers** : 15 Mo max, photos compressées sur le téléphone avant l'envoi, URL signées de 10 min.
- **Coffre privé** : chiffré sur le téléphone avec une clé de couple échangée à l'appairage et gardée dans le trousseau. Le serveur ne voit jamais l'image en clair. Si les deux perdent leur téléphone, le coffre est perdu ; il faut le dire clairement.
- **Contenu adulte et stores** : tout le contenu fourni par l'app reste du **texte non explicite**, classé 17+ sur iOS et 18+ sur Android. L'accès aux fonctions coquines exige la date de naissance et le consentement (S20). Signalement disponible partout (table `reports`).
- **Mode discret** : en mode discret, le texte des notifications est construit sur le serveur (« Nouveau message », sans contenu). Icône alternative via `expo-alternate-app-icons`.
- **RGPD** : suppression de compte dans l'app et sur le site, purge des fichiers, trace de position limitée à 48 h. Les données d'orientation et de vie sexuelle sont des **données sensibles** au sens du RGPD (article 9) : consentement explicite, mention dans la politique de confidentialité, hébergement Supabase en région UE (Francfort ou Paris).
- **Notifications** : jamais de contenu coquin dans le texte d'une notification, même hors mode discret (l'écran verrouillé est visible par d'autres).

## Ordre de construction

1. **Tranche verticale** (prouve la stack, moche mais complète)
   - écrans : S01, S02, S03, S04, S08
   - tables : profiles, couples, couple_members, prompts, daily_assignments, responses
   - routes : auth, `create_couple`, `join_couple`, `today`, `insert responses`, Realtime sur `responses`
   - fini quand : deux téléphones s'appairent, répondent à la question du jour et voient la révélation.
2. **Indispensables** (features.csv, priorité must)
   - accueil, nudges, humeurs, défi du jour, streak : S04, S05, S06, S14 ; moods, messages
   - notifications push : push_tokens, partner-answered, daily-reminder
   - Premium : S16, RevenueCat, webhook, `couples.premium_until`
   - réglages, désappairage, suppression : S17, S18, `unpair`, `delete-account`
   - **18+ et niveau d'audace** : S20
3. **Importants**, par ordre de valeur pour HotCouple
   - envies secrètes S21 (la fonction phare), question coquine S22, défis coquins S23, mode discret S26
   - carte partagée S07 (le plus risqué techniquement, à part)
   - moments S09, quiz S10, bucket list S13, dates S15, widgets S19
4. **Optionnels** : jeux S11/S12 (un par un, en commençant par le morpion pour valider `game-move`), dés et cartes S24, coffre S25, planificateur S27, langues.
5. **Corrections issues de replica-entrepreneur**, une fois qu'il aura tourné.

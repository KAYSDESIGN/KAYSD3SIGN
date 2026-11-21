# Recon map : Space for Two (iOS + Android)

Scope : l'app complète de Space for Two (petite app, 10 « coins »), puis la couche « coquine » propre à HotCouple
Pour : HotCouple, une app adulte (18+) pour couples, à vendre en abonnement
Date : 2026-11-21
Méthode : pages publiques uniquement (site marketing, pages légales, fiche App Store). Aucun compte utilisé, aucune capture de code ni d'API.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | site marketing | https://www.spacefortwo.dev/ | pitch, grille des 10 fonctions, carrousel de 9 écrans |
| 2 | conditions d'utilisation | https://www.spacefortwo.dev/terms.html | août 2024 ; clause anti-concurrence (voir Règles) |
| 3 | politique de confidentialité | https://www.spacefortwo.dev/privacy.html | août 2024, pas à jour (dit « pas de géoloc ») |
| 4 | suppression de compte | https://www.spacefortwo.dev/delete-account.html | juillet 2026 ; **meilleure source du modèle de données** (liste tout ce qui est stocké) |
| 5 | fiche App Store | https://apps.apple.com/app/space-for-two-couples-app/id6759118502 | description, prix, versions, 2 avis |
| 6 | fiche Google Play | https://play.google.com/store/apps/details?id=app.spacefortwo&hl=en | page rendue en JS, non lisible : note, téléchargements et avis Android non récupérés |

Pas de centre d'aide, pas de changelog détaillé, pas d'API publique, pas de vidéo trouvée.

## Règles appliquées

Les conditions de Space for Two (section 12, point 7, et section 8) interdisent d'utiliser **l'app ou ses services** pour créer un produit concurrent, et la section 12 interdit la rétro-ingénierie. Donc :
- **Ne crée pas de compte Space for Two pour faire la recon** et ne l'utilise pas comme référence pendant le build. Tout ce qui suit vient de pages publiques.
- Pas de reprise du nom, de l'univers visuel (astronautes, « petit univers »), des textes ou des questions de l'app.
- Les fonctions elles-mêmes (humeurs, carte partagée, quiz, défis, streaks) sont des idées génériques du marché des apps de couple (Paired, Agapé, Lasting, Couple Pulse…), pas la propriété de Space for Two.

## Fiche d'identité de l'original

- Éditeur : Sugi Studio Pty Ltd (Australie), développeur solo apparent.
- Positionnement : « une app privée pour couples », anti-réseau social (« pas de feed, pas de followers, pas d'inconnus »), cible forte : couples à distance.
- Lancement v1.0 le 27 juillet 2026, v1.3.1 le 8 novembre 2026 : 18 versions en 4 mois.
- iOS : 4.6/5 sur 13 notes, classé 4+, 162 Mo, 10 langues dont le français.
- Prix : gratuit + Premium. 9,99 $/mois, 24,99 $/an, 29,99 $ à vie. **Un abonnement couvre les deux partenaires.**
- Seule critique publique trouvée : l'app « pourrait être plus adaptée à la durée de la relation, à l'âge, aux problèmes de couple courants ».

## Boucle principale

Chaque jour, les deux partenaires ouvrent l'app pour répondre à la question du jour, faire le défi et garder leur streak, pendant que humeur, position et petits « je pense à toi » circulent en continu (y compris en widget).

## Écrans

Inférés des légendes du site, de la description App Store et de la page de suppression. Les états marqués « ? » n'ont pas été vus.

| ID | écran | accès | but | composants clés | états vus |
| --- | --- | --- | --- | --- | --- |
| S01 | Bienvenue / inscription | premier lancement | créer un compte | email + mot de passe, connexion sociale (?) | ? |
| S02 | Profil de base | après inscription | nom, photo, fuseau horaire, date d'anniversaire de couple | formulaire, sélecteur de date, upload photo | ? |
| S03 | Appairage | après profil | lier les deux comptes | code d'invitation à 6 caractères, partage du code, saisie du code | en attente du partenaire, appairé |
| S04 | Accueil | onglet 1 | hub du jour | 2 avatars, boutons « Tu me manques » / « Je pense à toi », carte question du jour, raccourcis quiz/défis/jeux/moments, streak | rempli |
| S05 | Humeurs | depuis l'accueil | dire comment on se sent | grille d'emojis (de « Super » à « Besoin d'un câlin »), note courte | rempli |
| S06 | Défis | raccourci accueil | défi du jour | défi photo, vocal, dessin ou texte ; envoi ; réponse du partenaire | à faire, envoyé, les deux ont répondu |
| S07 | Carte partagée | onglet ou accueil | se voir en direct | carte, 2 marqueurs, distance, « bien rentré·e », trace du jour, célébration des retrouvailles | à distance, réunis, localisation coupée |
| S08 | Journal du jour | carte accueil | question quotidienne partagée | question, réponse, réponse du partenaire révélée | non répondu, en attente du partenaire, révélé |
| S09 | Moments | raccourci accueil | album photo géolocalisé | grille de photos, légende, épingle sur la carte | vide, rempli |
| S10 | Quiz / Date Night Duels | raccourci accueil | répondre en même temps et voir si on matche | question, choix, score de compatibilité, historique | en attente, résultat |
| S11 | Jeux (liste) | raccourci accueil | choisir un jeu à deux | tuiles de jeux, verrou Premium (?) | ? |
| S12 | Jeu (partie) | depuis S11 | jouer en tour par tour | Puissance 4, morpion, trivia, Wordle, fléchettes, memory, Sumo, Spot It | à ton tour, au tour du partenaire, gagné/perdu |
| S13 | Bucket list | onglet ou accueil | liste partagée de voyages, rendez-vous, aventures | liste, ajout, case à cocher | vide, rempli |
| S14 | Notes et petits mots | accueil | messages doux, chat | fil de messages, envoi rapide | ? |
| S15 | Dates spéciales | accueil | comptes à rebours | liste de dates, compte à rebours | ? |
| S16 | Paywall Premium | fonction verrouillée | vendre l'abonnement | 3 offres (mois, an, à vie), « un abonnement pour deux » | ? |
| S17 | Onglet « Us » / profil couple | onglet en bas à droite | profil du couple | infos du couple, streak, roue des réglages | rempli |
| S18 | Réglages / « About you » | roue dentée dans S17 | compte, notifications, désappairage, suppression | listes de réglages, confirmation en 2 étapes | ? |
| S19 | Widgets écran d'accueil | système | humeur, photo et distance du partenaire | widgets iOS/Android | ? |

19 écrans (dont 1 widget système).

## Parcours

```
F01 Créer un compte et s'appairer
    S01 -> S02 -> S03 (partager le code) ... partenaire : S01 -> S02 -> S03 (saisir le code) -> S04
    clics chemin heureux : ~8 par personne (estimé)
    cas limites : code expiré, code d'un compte déjà appairé, un seul partenaire a installé l'app

F02 Rituel quotidien (la boucle principale)
    S04 -> S08 répondre -> attendre -> révélation -> S06 défi -> S04 streak +1
    clics chemin heureux : ~6 (estimé)
    cas limites : un seul a répondu, fuseaux horaires différents (le « jour » de qui ?), streak cassé

F03 Envoyer une humeur ou un « je pense à toi »
    S04 -> S05 -> choisir -> envoyer   (ou 1 tap sur l'accueil pour un nudge)
    clics : 1 à 3
    cas limites : notifications coupées, partenaire hors ligne

F04 Se voir sur la carte
    S04 -> S07
    cas limites : permission refusée, localisation en pause, partenaires au même endroit (retrouvailles)

F05 Jouer un duel
    S04 -> S11 -> S12 -> tours -> résultat
    cas limites : partenaire ne répond pas, jeu Premium verrouillé

F06 Sauver un moment
    S04 -> S09 -> ajouter photo -> légende -> lieu -> enregistrer

F07 Passer Premium
    fonction verrouillée -> S16 -> achat via l'App Store ou Google Play -> les deux comptes débloqués

F08 Se désappairer et supprimer son compte
    S17 -> S18 -> désappairer (efface le contenu partagé des deux côtés) -> About you -> Supprimer -> Supprimer définitivement
```

## Composants

| composant | variantes | états | utilisé sur |
| --- | --- | --- | --- |
| Bouton | principal, secondaire, fantôme, danger | normal, appuyé, désactivé, chargement | partout |
| Carte du jour | question, défi, quiz | à faire, en attente du partenaire, révélé | S04, S06, S08 |
| Avatar de couple | moi, partenaire | en ligne, humeur affichée | S04, S17 |
| Bouton nudge | « tu me manques », « je pense à toi », câlin | envoyé (animation) | S04 |
| Sélecteur d'humeur | grille d'emojis + note | sélectionné | S05 |
| Carte | 2 marqueurs, trace | à distance, réunis, pas de position | S07, S09 |
| Saisie de code | 6 caractères | vide, erreur, valide | S03 |
| Compteur de streak | flamme ou équivalent | actif, cassé | S04, S17 |
| Élément de liste cochable | bucket list | à faire, fait | S13 |
| Plateau de jeu | un par jeu | ton tour, son tour, fin | S12 |
| Paywall | 3 offres | sélectionnée, achat en cours, erreur | S16 |
| Toast / notification interne | info, nudge reçu | - | partout |
| Barre d'onglets | ~4–5 onglets, « Us » à droite | actif | partout |
| Widget | humeur, photo, distance | - | S19 |

## Modèle de données inféré

Source principale : la page de suppression de compte, qui liste chaque donnée stockée.

```
User          id, email, password_hash, name, avatar_url, timezone, notification_settings
              evidence: source 4 ; confidence: high
Couple        id, user_a_id, user_b_id, pairing_code (6 car.), anniversary_date, streak_count,
              subscription_status, created_at
              evidence: S03, source 4, « un abonnement pour deux » ; confidence: high
              (anniversary et subscription stockés côté couple : guess, source 4 les liste « par compte »)
Mood          id, user_id, emoji_key, note, created_at          evidence: S05 ; high
Location      user_id, lat, lng, recorded_at, sharing_paused    evidence: S07, source 4 « historique » ; high
DailyPrompt   id, date, text                                     evidence: S08 ; high
JournalEntry  id, couple_id, prompt_id, user_id, answer, created_at   evidence: S08, source 4 ; high
Challenge     id, date, kind (photo | voice | drawing | text), text   evidence: S06 ; high
ChallengeSubmission  id, challenge_id, user_id, media_url, text        evidence: source 4 ; high
Moment        id, couple_id, author_id, photo_url, caption, lat, lng, taken_at   evidence: S09 ; high
QuizSession   id, couple_id, quiz_id, answers_a, answers_b, match_score, played_at  evidence: S10, source 4 ; medium
GameSession   id, couple_id, game_type, state (json), turn_user_id, winner_id, score   evidence: S12, source 4 ; medium
BucketItem    id, couple_id, title, kind (trip | date | adventure), done, done_at   evidence: S13 ; high
Note/Message  id, couple_id, sender_id, body, kind (note | nudge | affection), created_at   evidence: S14, source 4 ; high
SpecialDate   id, couple_id, title, date                         evidence: S15 ; high
Notification  id, user_id, kind, payload, read_at                evidence: source 4 ; medium
Subscription  couple_id, store, product (monthly | yearly | lifetime), expires_at   evidence: S16, source 5 ; medium
```

Relations : User 1-1 Couple (via user_a/user_b), Couple 1-n tout le contenu partagé. Le désappairage supprime le contenu du Couple.

## La couche HotCouple (ce qui rend la version « coquine » meilleure)

Rien de ceci n'existe dans l'original. Ce sont des propositions, pas de la recon. Elles comblent aussi la seule critique publique : du contenu adapté au couple (ancienneté, envies, niveau d'audace).

| ID | nouvel écran | idée |
| --- | --- | --- |
| S20 | Vérification d'âge 18+ et consentement | obligatoire avant tout contenu ; chacun règle son niveau d'audace (doux, épicé, brûlant) ; on voit le **plus bas des deux** |
| S21 | Envies secrètes (« Fantasy match ») | chacun répond oui / non / peut-être à une liste d'envies ; **seuls les oui communs sont révélés**, jamais les non ; c'est la fonction phare |
| S22 | Question coquine du jour | même mécanique que S08, banque de questions par niveau d'audace |
| S23 | Défis coquins | version adulte de S06 (tâches, gages, défis à distance), avec bouton « passer » sans pénalité |
| S24 | Dés et cartes | dés « action + zone », cartes de jeux à deux, minuteur |
| S25 | Coffre privé | photos privées chiffrées, déverrouillage Face ID, pas de capture d'écran (quand l'OS le permet), suppression auto optionnelle |
| S26 | Mode discret | icône et nom neutres, notifications génériques (« Nouveau message »), code PIN à l'ouverture |
| S27 | Planificateur de soirée | proposer une date + un thème ; l'autre accepte ; rappel le jour J |

Règles des stores à respecter, sinon refus de publication :
- Apple (règle 1.1.4) refuse le contenu pornographique explicite. Le texte suggestif et les jeux de couple sont acceptés en 17+ ; **pas d'images explicites fournies par l'app**.
- Google Play interdit le contenu sexuellement explicite et les services sexuels ; les apps de bien-être sexuel et de couple sont tolérées si le contenu reste non graphique.
- Les photos privées entre partenaires (S25) sont du contenu utilisateur : il faut signalement, blocage et suppression, et les garder strictement entre les deux comptes.
- Le site web (sans store) peut aller plus loin, mais demande une vraie vérification d'âge selon les pays (Royaume-Uni, plusieurs États US, France avec l'Arcom).

## Matrice de fonctions

Voir `features.csv`. Must : 17, should : 14, could : 10, skip : 3.

## Hors périmètre

- Les textes, questions, quiz et défis de Space for Two : à écrire de zéro (c'est l'essentiel du contenu, donc du travail).
- Le nom, l'univers des astronautes, les illustrations, les captures.
- Les jeux Wordle et Puissance 4 sous ces noms (marques déposées) : on fait des jeux équivalents sous d'autres noms et avec d'autres règles visuelles.
- Les utilisateurs et notes de l'original.

## Taille

Écrans 27 (19 originaux + 8 HotCouple), parcours 8, entités 16 (+ ~4 pour HotCouple).

Parties difficiles :
1. **Localisation en direct en arrière-plan** (S07, S19) : permissions iOS/Android, batterie, vie privée, et revue Apple stricte.
2. **Temps réel entre les deux partenaires** : révélations simultanées, jeux tour par tour, nudges, notifications push.
3. **Abonnement partagé à deux** sur l'App Store et Google Play (un achat débloque deux comptes), plus les règles des stores sur le contenu adulte.

Autres : widgets natifs, coffre photo chiffré, écriture de centaines de questions et défis dans plusieurs langues.

Taille : **L** (un trimestre) pour tout. Le cœur (S01–S08, S16–S18, S20–S22) est **M** (quelques semaines) et peut sortir en premier.

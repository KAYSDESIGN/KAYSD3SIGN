# Backend HotCouple

Projet Supabase : `lsaztmwydeuvavtehihi` (région eu-west-1, Irlande). Usage privé : un seul couple.

## Ce qui est en place

| élément | où | état |
| --- | --- | --- |
| Schéma, RLS, buckets privés, temps réel | `supabase/migrations/0001_schema.sql` | appliqué |
| Fonctions serveur : tirage du jour, révélation, jeux, quiz, suppression de compte, confidentialité du profil | `0002_app_functions.sql` | appliqué |
| Premium offert à tout couple (version privée) | `0003_private_couple.sql` | appliqué, **à retirer avant une publication** |
| Description des quiz | `0004_quiz_blurb.sql` | appliqué |
| Contenu (23 questions/défis, 10 envies, 3 quiz) | `supabase/seed.sql`, généré par `mobile/scripts/gen-seed-sql.ts` depuis `mobile/src/data/seed.ts` | chargé |
| Couche de données de l'app | `mobile/src/data/supabase.ts` (mêmes signatures que `fake.ts`) | testée de bout en bout : 20 étapes à deux utilisateurs sur le vrai projet (`mobile/e2e/two-users-real.cjs`) |
| Tests serveur | `supabase/tests.sql` : 26 vérifications, toutes OK sur une base locale | OK |

Appliquer une migration : `SUPABASE_PROJECT_REF=lsaztmwydeuvavtehihi replica/run-sql.sh supabase/migrations/XXXX.sql`.

## Connexion

Email + mot de passe. Pas de lien magique : l'expéditeur d'emails intégré de Supabase n'envoie qu'aux membres de l'équipe du projet.
**À faire par toi dans le tableau de bord Supabase** (refusé côté Claude car c'est un réglage de sécurité) :
- soit désactiver « Confirm email » (Authentication → Sign In / Providers → Email) ;
- soit créer vos deux comptes à la main (Authentication → Users → Add user, cocher « Auto Confirm User »).
Une fois vos deux comptes créés : désactiver « Allow new users to sign up » pour fermer l'app aux inconnus.

Apple et Google : pas configurés (demandent des comptes développeur).

## Non fait

- Notifications push (Expo Push + table push_tokens) : demande une vraie app installée.
- Envoi de photos, vocaux, dessins : le stockage est prêt (buckets privés), l'écran ne l'est pas.
- Paiements : inutiles en version privée (Premium offert).
- Emails transactionnels (Resend) : inutiles en version privée.
- Jobs planifiés (rappel du soir, purge des positions) : à faire avec les notifications.

## Sécurité

- [x] aucun secret dans le code : seule la clé « publishable » est dans l'app (`.env.local`, ignoré par git, modèle dans `.env.example`)
- [x] règles d'accès sur chaque table, testées avec un 3e utilisateur qui ne voit rien
- [x] partenaire sans accès à la date de naissance ni au niveau d'audace de l'autre (droits par colonne)
- [x] confirmation d'âge posée par le serveur, mineurs refusés par une contrainte
- [x] coups de jeu, tirages, révélations calculés côté serveur
- [ ] limitation de débit sur l'inscription : celle de Supabase par défaut ; fermer les inscriptions après création des 2 comptes
- [ ] fichiers : limite 15 Mo par bucket ; contrôle du type à ajouter avec l'écran d'envoi
- [x] pas de données personnelles dans les URL
- [ ] `npm audit` : 3 vulnérabilités modérées dans les outils de dev d'Expo, à revoir
- [ ] politique de confidentialité : à écrire avant toute publication (Supabase = sous-traitant)
- [x] sauvegardes : non incluses dans l'offre gratuite de Supabase. Pour un test privé c'est acceptable ; sinon, export manuel de temps en temps.

## Version web en ligne (test privé)

- Adresse : https://hotcouple-2b6781.homehub-28saz.workers.dev (Cloudflare Workers, compte gratuit). Non indexée (`noindex`).
- Republier après un changement : depuis `mobile/`, `HC_WORKER=hotcouple-2b6781 CLOUDFLARE_ACCOUNT_ID=… CLOUDFLARE_API_TOKEN=… deploy/deploy-web.sh`.
  Les fichiers sont embarqués dans le Worker (`deploy/build-worker.py`), sans passer par l'envoi de fichiers statiques de Cloudflare.
- Testé en ligne : les 20 étapes de `mobile/e2e/two-users-real.cjs` passent sur cette adresse, comptes de test supprimés ensuite.
- Limites de la version web : pas de position en arrière-plan, pas de widgets ; notifications non branchées.

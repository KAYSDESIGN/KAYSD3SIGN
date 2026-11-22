# Composants HotCouple

Code : `mobile/src/components/ui/`. Galerie de tous les états : route `/design` de l'app.
Tokens : `replica/design/tokens.json` (source), synchronisés par `npm run tokens` vers `mobile/src/theme/tokens.json` et `replica/design/tokens.css`.

## v2 · verre liquide (22/11/2026)

- **Deux thèmes automatiques** : clair « Aube rosée » le jour, sombre « Nuit néon » le soir (suit le téléphone). Rôles identiques, valeurs par thème dans `tokens.json > themes`, posées en variables CSS par `ThemeRoot`.
- **Dégradé de marque** corail → rose → violet (`#D63A45 → #CF2470 → #8338EC`), assez profond pour du texte blanc à 4.5:1 : boutons principaux, anneaux d'avatar, onglet actif, « Oui ».
- **Verre** (`Glass`) : flou d'arrière-plan (iOS, web ; Android : verre translucide sans flou pour l'instant), teinte translucide, liseré lumineux `glass-edge`, reflet en haut `glass-shine`, ombre douce. Fond de chaque écran : taches colorées floues (`GlassBackground`).
- **Barre d'onglets flottante** en verre, onglet actif en pastille dégradée.
- **Icône** : cœur de verre (cœur dégradé sur verre pastel), source `mobile/design-src/icon.html`, rendu `node design-src/render-icons.cjs`.
- **Contraste** : `node mobile/scripts/check-contrast.mjs` calcule le pire fond réel (verre posé sur la tache la plus vive) : 46 paires, 0 échec.

## Identité (propre à HotCouple, rien de Space for Two)

- **Ambiance** : intime, élégante, un peu nocturne. Thème sombre unique en v1 (usage le soir, discrétion à l'écran). Pas d'astronautes, pas d'espace.
- **Couleurs** : fond prune presque noir, accent rose corail `#FF5C7A`, or `#F2B880` pour la série de jours, trois teintes pour les niveaux d'audace.
- **Polices** (libres, licence OFL) : **Fraunces** pour les titres (une serif chaleureuse et un peu sensuelle), **Manrope** pour le texte.
- **Icônes** : Lucide (licence ISC). Les emojis sont réservés aux humeurs et aux piments.
- **Classes** : toujours des rôles (`bg-surface`, `text-text-muted`, `border-border-input`), jamais de hex dans un composant. Sur mobile, une graisse = une famille : `font-sans`, `font-sans-semibold`, `font-sans-bold`, `font-display`.

## Règles communes

- Cible tactile ≥ 44 px partout.
- Focus clavier (web, Android TV, clavier externe) : bordure 2 px `focus`.
- Désactivé = opacité 50 % et `accessibilityState.disabled`.
- Erreurs : texte `danger` sous le champ, annoncé (`accessibilityLiveRegion="polite"`), jamais la couleur seule.
- Textes écrits de zéro, inclusifs (« partenaire », « Heureux·se »).
- Rien de coquin dans une notification, un toast visible sur l'écran verrouillé ou un libellé d'accessibilité lu à voix haute hors de l'app.

---

```
Button
  variants  primary (accent), secondary (surface-raised + border), ghost (texte accent), danger (contour danger)
  sizes     sm 36px, md 44px, lg 52px ; forme pilule ; option block (pleine largeur)
  states    default, pressed (accent-pressed / surface), disabled, loading (spinner, libellé gardé pour les lecteurs d'écran)
  tokens    bg accent, text on-accent, radius pill, Manrope 700 sm/base, icône Lucide 16–18
  a11y      role button, accessibilityLabel = libellé, state disabled/busy
  used on   partout

IconButton
  variants  default (surface-raised), accent (accent-soft)
  size      44×44 rond
  a11y      label obligatoire
  used on   S04, S17, S18, en-têtes

Text (Display, Heading, Title, Body, Muted, Caption)
  scale     display 40/44 Fraunces, xl 28/34 Fraunces, lg 20/28 Manrope 700, base 16/24, sm 14/20, xs 12/16 majuscules
  a11y      Display et Heading ont le rôle header

Card
  variants  surface, raised
  tokens    radius lg (22), border, padding 16
  used on   S04, S09, S13, S16

TextField
  parts     libellé visible, champ 48px, aide ou erreur
  states    default (border-input 3:1), focus (2px focus), error (danger + message annoncé), disabled
  a11y      label et hint reliés au champ
  used on   S01, S02, S13, S14, S15, S27

CodeInput (appairage)
  parts     6 cases de 56px, vrai TextInput caché pour le clavier et l'autocomplétion du code
  rules     majuscules auto, alphabet sans 0/O/1/I (identique à la base), 6 caractères max
  states    vide, en cours (case active en focus), complet, erreur (expiré / invalide)
  a11y      un seul champ lu : « Code de ton/ta partenaire, 6 caractères »
  used on   S03

CoupleAvatars
  parts     deux pastilles qui se chevauchent (initiale en Fraunces ou photo), badge d'humeur du partenaire
  a11y      un seul élément : « Kay et Sam, humeur de Sam : 🔥 »
  used on   S04, S17

NudgeButton
  variants  par message : « Tu me manques », « Je pense à toi », câlin
  states    default, pressed (accent-soft), envoyé 2 s (coche success), désactivé pendant l'envoi
  feedback  vibration légère, annonce « envoyé »
  used on   S04, S14

MoodPicker
  layout    grille 4 colonnes, 8 humeurs (clés = contrainte check de public.moods)
  states    non sélectionné, sélectionné (accent-soft + bord accent)
  a11y      radiogroup + radio
  used on   S05

StreakBadge
  states    actif (flamme or + nombre), cassé (gris, 0)
  a11y      « Série de 12 jours »
  used on   S04, S17

SpiceBadge / SpiceSelector
  levels    Doux 🌶️, Épicé 🌶️🌶️, Brûlant 🌶️🌶️🌶️ (fonds spice-soft / spicy / hot, texte on-spice)
  selector  radiogroup de 3 lignes avec description + rappel « le plus doux des deux s'applique »
  used on   S20, S22, S23, cartes de contenu

DailyCard (question ou défi du jour)
  states    todo (bouton Répondre), waiting (sa réponse + cadenas « s'affichera quand vous aurez répondu tous les deux »),
            revealed (les deux réponses, celle du partenaire en accent-soft)
  options   badge d'audace pour les cartes coquines
  used on   S04, S06, S08, S22, S23

DesireCard (envies secrètes)
  parts     énoncé en Fraunces, choix Non / Peut-être / Oui, mention « Secret »
  states    sans réponse, non, peut-être (or), oui (accent)
  rule      la réponse n'est jamais montrée au partenaire ; seuls les oui communs le sont (RPC mutual_desires)
  a11y      radiogroup « Ta réponse, gardée secrète »
  used on   S21

ChecklistItem
  states    à faire, fait (case accent + texte barré muted), pressed
  a11y      role checkbox
  used on   S13

PlanOption (paywall)
  parts     radio, titre, détail, badge or optionnel (« -79 % »), prix
  states    sélectionné (2px accent + accent-soft), non sélectionné
  rule      prix lus depuis RevenueCat, jamais codés en dur (ceux de la galerie sont des exemples)
  used on   S16

Toast
  tones     info, nudge (cœur accent), error (bord danger)
  a11y      role alert, annoncé
  used on   partout, via un provider en haut d'écran (à construire avec l'app)

EmptyState
  parts     icône dans un rond accent-soft, titre Fraunces, texte, action secondaire
  used on   S09, S13, S14, S15, S21 (pas encore de match), S25
```

## Reste à construire pendant replica-build

Ces composants dépendent des écrans et seront faits avec eux : barre d'onglets (S04–S17), carte partagée avec deux marqueurs (S07, `react-native-maps`), plateaux de jeux (S12), lecteur et enregistreur vocal (S06), toile de dessin (S06), widgets natifs (S19), écran de verrouillage PIN (S26).

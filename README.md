# MOTOFORGE

*Imagine. Personnalise. Roule.*

Application iOS native de personnalisation virtuelle de motos, basée sur des pièces réellement commercialisées et compatibles. Première moto prise en charge : **Honda CB125R JC91**.

- Règles du projet : [`CLAUDE.md`](CLAUDE.md)
- Architecture : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Avancement et ressources manquantes : [`docs/ROADMAP.md`](docs/ROADMAP.md)

## Démarrer (Mac + Xcode 26)

```sh
brew install xcodegen
xcodegen generate
open MotoForge.xcodeproj
```

## Tests du cœur métier (macOS ou Linux)

```sh
cd Packages/MotoForgeKit
swift test
```

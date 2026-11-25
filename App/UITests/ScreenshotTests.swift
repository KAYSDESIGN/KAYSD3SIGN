import XCTest

/// Captures every main screen for visual review (exported as CI artifacts).
final class ScreenshotTests: XCTestCase {
    override func setUp() { continueAfterFailure = true }

    private func snap(_ app: XCUIApplication, _ name: String) {
        sleep(3)
        let a = XCTAttachment(screenshot: app.screenshot())
        a.name = name
        a.lifetime = .keepAlways
        add(a)
    }

    func testCaptureAllScreens() {
        let app = XCUIApplication()
        app.launchArguments = ["UITEST", "UITEST_SEED"]
        app.launch()
        _ = app.staticTexts["Mon projet"].waitForExistence(timeout: 8)
        snap(app, "01-accueil")

        app.buttons["Garage"].tap(); snap(app, "02-garage")
        app.buttons["Catalogue"].tap(); snap(app, "03-catalogue")
        let card = app.buttons["Ajouter au projet"].firstMatch
        if card.waitForExistence(timeout: 3) {
            app.scrollViews.firstMatch.staticTexts.element(boundBy: 3).tap()
            snap(app, "04-produit")
            app.navigationBars.buttons.firstMatch.tap()
        }
        app.buttons["Projets et favoris"].tap(); snap(app, "06-projets")
        if app.buttons["Actions du projet"].firstMatch.waitForExistence(timeout: 3) {
            app.buttons["Actions du projet"].firstMatch.tap()
            if app.buttons["Budget"].waitForExistence(timeout: 2) { app.buttons["Budget"].tap(); snap(app, "08-budget") }
            if app.buttons["Voir la liste d'achat"].waitForExistence(timeout: 2) { app.buttons["Voir la liste d'achat"].tap(); snap(app, "09-liste-achat") }
            app.buttons["Projets et favoris"].tap()
        }
        app.buttons["Menu"].tap(); snap(app, "10-menu")

        app.buttons["Accueil"].tap()
        app.buttons["Atelier"].firstMatch.tap()
        _ = app.navigationBars["Atelier"].waitForExistence(timeout: 5)
        snap(app, "05-atelier-origine")
        if app.buttons["Rouge"].exists { app.buttons["Rouge"].tap(); snap(app, "05-atelier-rouge") }
        if app.buttons["Satiné"].exists { app.buttons["Satiné"].tap(); snap(app, "05-atelier-rouge-satine") }
        app.buttons["Finition"].tap(); snap(app, "05b-atelier-finition")
        app.buttons["Pièces"].tap(); snap(app, "05c-atelier-pieces")
        app.buttons["Configurer"].tap(); snap(app, "05d-atelier-configurer")
        app.buttons["Personnaliser"].tap()
        app.buttons["Couleur"].tap()
        if app.buttons["Plus de couleurs"].exists {
            app.buttons["Plus de couleurs"].tap(); snap(app, "07-studio-peinture")
            app.navigationBars.buttons["Annuler"].firstMatch.tap()
        }
        app.buttons["Finition"].tap()
        if app.buttons["Covering"].waitForExistence(timeout: 2) {
            app.buttons["Covering"].tap(); snap(app, "07b-studio-covering")
            app.navigationBars.buttons["Annuler"].firstMatch.tap()
        }
        app.buttons["Garage"].tap()
        app.navigationBars["Mon garage"].buttons["Ajouter une moto"].tap()
        snap(app, "02b-ajout-moto")
    }
}

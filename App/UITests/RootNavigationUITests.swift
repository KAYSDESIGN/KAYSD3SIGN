import XCTest

final class RootNavigationUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    /// The floating bar exposes the five destinations by accessibility label.
    func testFiveMainDestinationsAreReachable() {
        let app = XCUIApplication()
        app.launch()
        let destinations: [(String, String)] = [
            ("Garage", "Mon garage"), ("Catalogue", "Catalogue"), ("Projets et favoris", "Mes projets"), ("Menu", "Menu")
        ]
        for (tab, title) in destinations {
            let button = app.buttons[tab]
            XCTAssertTrue(button.waitForExistence(timeout: 5), "Onglet manquant : \(tab)")
            button.tap()
            XCTAssertTrue(app.navigationBars[title].waitForExistence(timeout: 3), "Écran manquant : \(title)")
        }
        app.buttons["Accueil"].tap()
        XCTAssertTrue(app.staticTexts["Mon projet"].waitForExistence(timeout: 3))
    }

    /// Adding the CB125R from the garage, then opening the workshop.
    func testAddMotorcycleThenOpenWorkshop() {
        let app = XCUIApplication()
        app.launch()
        app.buttons["Garage"].tap()
        app.navigationBars["Mon garage"].buttons["Ajouter une moto"].tap()
        let add = app.navigationBars["Ajouter une moto"].buttons["Ajouter"]
        XCTAssertTrue(add.waitForExistence(timeout: 3))
        add.tap()
        app.buttons["Accueil"].tap()
        app.buttons["Atelier"].tap()
        XCTAssertTrue(app.navigationBars["Atelier"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["Couleur"].exists)
        XCTAssertTrue(app.buttons["Finition"].exists)
        XCTAssertTrue(app.buttons["Pièces"].exists)
    }
}

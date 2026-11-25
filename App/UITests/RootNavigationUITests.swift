import XCTest

final class RootNavigationUITests: XCTestCase {
    func testFiveMainDestinationsAreReachable() {
        let app = XCUIApplication()
        app.launch()
        for title in ["Accueil", "Garage", "Catalogue", "Projets", "Menu"] {
            let tab = app.tabBars.buttons[title]
            XCTAssertTrue(tab.waitForExistence(timeout: 5), "Onglet manquant : \(title)")
            tab.tap()
            XCTAssertTrue(app.navigationBars[title].waitForExistence(timeout: 2))
        }
    }
}

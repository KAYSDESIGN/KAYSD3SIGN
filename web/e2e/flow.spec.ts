import { expect, test } from '@playwright/test'

import type { Page } from '@playwright/test'
const tab = (page: Page, name: string) => page.getByRole('navigation').getByRole('button', { name, exact: true }).click()
const shot = (name: string) => `e2e-shots/${test.info().project.name}/${name}.png`

test('add the CB125R, customise, add a part, budget, persistence', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await expect(page.getByText('MOTOFORGE').first()).toBeVisible()
  await page.screenshot({ path: shot('01-accueil-vide') })

  // Garage → add bike
  await tab(page, 'Garage')
  await page.getByRole('button', { name: 'Ajouter une moto' }).first().click()
  await page.getByRole('button', { name: /JC91/ }).first().click().catch(() => undefined)
  await page.screenshot({ path: shot('02-ajout-moto'), fullPage: true })
  await page.getByRole('button', { name: 'Ajouter au garage' }).click()
  await expect(page.getByText('Honda CB125R').first()).toBeVisible()
  await page.waitForTimeout(2500)
  await page.screenshot({ path: shot('03-garage') })

  // Workshop
  await page.getByRole('button', { name: 'Ouvrir l\'atelier' }).first().click()
  await expect(page.getByRole('heading', { name: 'Atelier' })).toBeVisible()
  await page.waitForTimeout(4000)
  await page.screenshot({ path: shot('04-atelier') })
  await page.getByRole('button', { name: 'Rouge', exact: true }).click()
  await page.getByRole('button', { name: 'Satiné', exact: true }).click()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: shot('05-atelier-rouge') })
  await page.getByRole('button', { name: 'Profil gauche' }).click()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: shot('06-profil-gauche') })
  await page.getByRole('button', { name: 'Plus de couleurs' }).click()
  await page.waitForTimeout(800)
  await page.screenshot({ path: shot('07-studio-peinture') })
  await page.getByRole('button', { name: 'Annuler', exact: true }).click()
  await page.getByRole('button', { name: 'Finition' }).first().click()
  await page.getByRole('button', { name: 'Covering' }).click()
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
  await page.getByRole('button', { name: 'Bandes', exact: true }).click()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: shot('08-covering') })
  await page.getByRole('button', { name: 'Appliquer le covering' }).click()
  await page.getByRole('button', { name: 'Retour' }).click()

  // Catalog → product → add
  await tab(page, 'Catalogue')
  await page.waitForTimeout(2500)
  await page.screenshot({ path: shot('09-catalogue') })
  await page.getByRole('button', { name: /Fiche Top case B45/ }).click()
  await page.waitForTimeout(2000)
  await page.screenshot({ path: shot('10-produit') })
  await page.getByRole('button', { name: 'Ajouter au projet' }).click()
  await expect(page.getByRole('button', { name: 'Ajouté au projet' })).toBeVisible()
  await page.getByRole('button', { name: 'Retour' }).click()

  // Projects → budget → list
  await tab(page, 'Projets et favoris')
  await page.waitForTimeout(2000)
  await page.screenshot({ path: shot('11-projets') })
  await page.getByRole('button', { name: 'Actions du projet' }).first().click()
  await page.getByRole('button', { name: 'Budget' }).click()
  await page.screenshot({ path: shot('12-budget') })
  await page.getByRole('button', { name: "Voir la liste d'achat" }).click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: shot('13-liste') })
  await tab(page, 'Menu')
  await page.waitForTimeout(500)
  await page.screenshot({ path: shot('14-menu') })

  // Persistence: reload keeps bike and project
  await page.reload()
  await tab(page, 'Projets et favoris')
  await expect(page.getByText(/Projet CB125R 1/)).toBeVisible()
  await tab(page, 'Accueil')
  await page.waitForTimeout(2500)
  await page.screenshot({ path: shot('15-accueil') })
  expect(errors, errors.join('\n')).toEqual([])
})

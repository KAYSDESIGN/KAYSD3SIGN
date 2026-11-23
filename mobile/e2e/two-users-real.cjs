// Test de bout en bout à deux utilisateurs sur la vraie base Supabase. Crée deux comptes jetables puis les supprime.
// Usage : construire la version web (npm run export:web), la servir, puis HC_URL=http://... node e2e/two-users-real.cjs
const { chromium } = require('playwright');
const URL = process.env.HC_URL ?? 'http://127.0.0.1:8766/';
const PW = 'e2e-' + Math.random().toString(36).slice(2) + 'X9';
const stamp = Date.now().toString(36);
const log = (...a) => console.log(...a);
(async () => {
  const b = await chromium.launch();
  const mk = async (name) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage(); p.__errs = [];
    p.on('pageerror', e => p.__errs.push(e.message));
    if (process.env.DBG) {
      p.on('requestfailed', r => r.url().includes('supabase') && log('dbg-fail', p.name, r.url().split('/').slice(-2).join('/').slice(0, 80), r.failure()?.errorText));
      p.on('requestfinished', async r => { if (!r.url().includes('supabase')) return; const t = r.timing(); const ms = t.responseEnd; if (ms > 1500) log('dbg-slow', p.name, Math.round(ms), r.method(), r.url().split('/').slice(-2).join('/').slice(0, 90)); });
      p.on('response', async r => { if (r.url().includes('/rpc/') && r.status() >= 400) log('dbg-err', p.name, r.status(), r.url().split('/').pop(), (await r.text().catch(() => '')).slice(0, 200)); });
    }
    p.on('response', r => { if (r.status() >= 400) p.__errs.push(r.status() + ' ' + r.request().method() + ' ' + r.url().replace(/apikey=[^&]+/, '')); });
    p.on('console', m => m.type() === 'error' && p.__errs.push(m.text()));
    p.click2 = (n) => p.getByRole('button', { name: n, exact: true }).locator('visible=true').first().click();
    p.see = (t, timeout = 30000) => p.getByText(t).locator('visible=true').first().waitFor({ timeout });
    p.name = name; return p;
  };
  const A = await mk('Kay'), B = await mk('Sam');
  const step = async (label, fn) => { const t = Date.now(); await fn(); log('OK  ', label, `(${((Date.now() - t) / 1000).toFixed(1)} s)`); };
  try {
    for (const p of [A, B]) await step(`${p.name} crée son compte`, async () => {
      await p.goto(URL, { waitUntil: 'networkidle' });
      await p.getByLabel('Email').fill(`${p.name.toLowerCase()}.${stamp}@example.com`);
      await p.getByLabel('Mot de passe').fill(PW);
      await p.click2('Créer mon compte');
      await p.see("Comment veux-tu qu'on t'appelle ?");
      await p.getByLabel('Prénom ou surnom').fill(p.name);
      await p.click2('Continuer');
      await p.see("Ton espace à deux t'attend");
    });
    await step('Kay visite l\'app en solo (Envies, Quiz)', async () => {
      await A.getByRole('tab', { name: /Envies/ }).locator('visible=true').first().click();
      await A.see("Cette partie s'ouvre dès que vous êtes deux.");
      await A.getByRole('tab', { name: /^Nous$/ }).locator('visible=true').first().click();
      await A.see("Ton espace à deux t'attend");
      await A.waitForURL(/\/home$/);
      await A.getByRole('button', { name: /^Quiz à deux/ }).locator('visible=true').first().click();
      await A.waitForURL(/\/quiz$/);
      await A.see("Cette partie s'ouvre dès que vous êtes deux.");
      await A.goBack();
      await A.see("Ton espace à deux t'attend");
    });
    let code;
    await step('Sam génère aussi un code (cas des deux invitations)', async () => {
      await B.click2('Inviter');
      await B.click2("J'invite mon/ma partenaire");
      await B.click2('Générer mon code');
      await B.see('En attente de ton/ta partenaire…');
    });
    await step('Kay génère un code', async () => {
      await A.click2('Inviter');
      await A.click2("J'invite mon/ma partenaire");
      await A.click2('Générer mon code');
      const lbl = await A.getByLabel(/^Ton code/).locator('visible=true').first().getAttribute('aria-label');
      code = lbl.replace('Ton code : ', '').replace(/ /g, '');
    });
    await step(`Sam saisit le code ${code}`, async () => {
      await B.click2("J'ai plutôt reçu un code");
      await B.getByLabel('Code de ton/ta partenaire, 6 caractères').fill(code);
      await B.click2('Nous relier');
      await B.see('Toi & Kay');
    });
    await step("Kay voit l'appairage arriver tout seul", async () => { await A.see('Toi & Sam', 25000); });
    await step('Kay répond à la question du jour', async () => {
      await A.click2('Répondre');
      await A.getByRole('textbox', { name: 'Ta réponse' }).locator('visible=true').fill('Réponse de Kay, test e2e');
      await A.click2('Envoyer ma réponse');
      await A.see("s'affichera quand vous aurez répondu tous les deux");
    });
    await step('Sam répond', async () => {
      await B.click2('Répondre');
      await B.getByRole('textbox', { name: 'Ta réponse' }).locator('visible=true').fill('Réponse de Sam, test e2e');
      await B.click2('Envoyer ma réponse');
      await B.see('Réponse de Kay, test e2e');
    });
    await step('Kay voit la réponse de Sam', async () => { await A.see('Réponse de Sam, test e2e', 25000); });
    await A.screenshot({ path: 'real-A-revealed.png' });
    await step('Sam envoie un nudge, Kay le reçoit', async () => {
      await B.click2("Retour à l'accueil");
      await B.getByRole('button', { name: 'Petits mots express' }).locator('visible=true').first().click();
      await B.getByRole('button', { name: 'Envoyer : Tu me manques' }).locator('visible=true').first().click();
      await A.click2("Retour à l'accueil");
      await A.see(/Sam : .*Tu me manques/, 25000);
    });
    for (const [p, lvl, bd] of [[A, 'Brûlant', '14'], [B, 'Épicé', '20']]) await step(`${p.name} confirme son âge (${lvl})`, async () => {
      await p.getByRole('button', { name: /^Questions coquines/ }).locator('visible=true').first().click();
      await p.getByLabel('Jour', { exact: true }).locator('visible=true').fill(bd);
      await p.getByLabel('Mois', { exact: true }).locator('visible=true').fill('03');
      await p.getByLabel('Année', { exact: true }).locator('visible=true').fill('1992');
      await p.getByRole('checkbox').locator('visible=true').click();
      await p.click2('Confirmer');
      await p.see("Jusqu'où avez-vous envie d'aller ?");
      await p.getByRole('radio', { name: new RegExp('^' + lvl) }).locator('visible=true').click();
      await p.click2('Enregistrer');
    });
    await step('La question coquine apparaît au niveau Épicé', async () => {
      await B.see('Question coquine', 25000);
      await B.getByLabel('Niveau Épicé').locator('visible=true').first().waitFor({ timeout: 10000 });
    });
    // Envies du jour : même tirage pour les deux, on dit oui à la première.
    const fresh = (p) => p.locator('[role="radiogroup"]:not(:has([aria-checked="true"]))').locator('visible=true');
    for (const p of [A, B]) await step(`${p.name} dit oui à la première envie du jour`, async () => {
      await p.getByRole('tab', { name: /Envies/ }).locator('visible=true').first().click();
      await p.getByRole('tab', { name: /Du jour · 0\/5/ }).locator('visible=true').first().waitFor({ timeout: 60000 });
      await fresh(p).first().getByRole('radio', { name: 'Oui' }).click();
      await p.getByRole('tab', { name: /Du jour · 1\/5/ }).locator('visible=true').first().waitFor({ timeout: 15000 });
    });
    await step('Le match apparaît chez Kay', async () => {
      await A.getByRole('tab', { name: /Matchs du jour · 1/ }).locator('visible=true').first().waitFor({ timeout: 25000 });
    });
    await step('Kay finit ses 5 envies du jour', async () => {
      for (let i = 2; i <= 5; i++) {
        await fresh(A).first().getByRole('radio', { name: 'Peut-être' }).click();
        await A.getByRole('tab', { name: new RegExp(`Du jour · ${i}/5`) }).locator('visible=true').first().waitFor({ timeout: 15000 });
      }
      await A.see("C'est tout pour aujourd'hui", 15000);
    });
    await step('Kay lance un morpion et joue', async () => {
      await A.getByRole('tab', { name: /Jouer/ }).locator('visible=true').first().click();
      await A.getByRole('button', { name: /^Morpion du cœur/ }).locator('visible=true').click();
      await A.see('À toi de jouer');
      await A.getByRole('button', { name: /^Ligne 1, colonne 1,/ }).locator('visible=true').click();
      await A.see('Au tour de Sam');
    });
    await step('Sam voit la partie et joue au centre', async () => {
      await B.getByRole('tab', { name: /Jouer/ }).locator('visible=true').first().click();
      await B.getByRole('button', { name: /^Morpion du cœur, À toi de jouer/ }).locator('visible=true').first().click({ timeout: 25000 });
      await B.getByRole('button', { name: /^Ligne 2, colonne 2,/ }).locator('visible=true').click();
      await B.see('Au tour de Kay');
    });
    await step('Kay reçoit le coup de Sam', async () => { await A.see('À toi de jouer', 25000); });
    await step('Une seule partie à la fois : Quatre d\'affilée bloqué pour Sam', async () => {
      await B.goto(URL + 'play', { waitUntil: 'networkidle' });
      await B.getByRole('button', { name: /Quatre d'affilée\. Finissez d'abord la partie en cours/ }).locator('visible=true').first().waitFor({ timeout: 15000 });
    });
    await B.screenshot({ path: 'real-B-game.png' });
    for (const p of [A, B]) await step(`${p.name} supprime son compte`, async () => {
      await p.goto(URL + 'settings', { waitUntil: 'networkidle' });
      await p.click2('Supprimer mon compte');
      await p.click2('Supprimer');
      await p.click2('Supprimer définitivement');
      await p.see('Rien que vous deux.');
    });
    log('errors A:', JSON.stringify(A.__errs), '| B:', JSON.stringify(B.__errs));
  } catch (e) {
    log('FAIL', e.message.split('\n')[0]);
    await A.screenshot({ path: 'real-fail-A.png' }).catch(() => {}); await B.screenshot({ path: 'real-fail-B.png' }).catch(() => {});
    log('errors A:', JSON.stringify(A.__errs.slice(0, 3)), '| B:', JSON.stringify(B.__errs.slice(0, 3)));
    process.exitCode = 1;
  }
  await b.close();
})();

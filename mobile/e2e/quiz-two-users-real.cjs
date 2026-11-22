// Quiz à deux sur la vraie base : les deux jouent, voient le résultat, puis « Rejouer ». Comptes de test @example.com supprimés à la fin.
// Usage : S=<dossier captures> node e2e/quiz-two-users-real.cjs
const { chromium } = require('playwright');
const URL = 'https://hotcouple-2b6781.homehub-28saz.workers.dev/';
const stamp = Date.now().toString(36);
(async () => {
  const b = await chromium.launch();
  const mk = async (name) => { const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); p.errs = [];
    p.on('pageerror', e => p.errs.push(e.message)); p.on('response', r => { if (r.status() >= 400) p.errs.push(r.status() + ' ' + r.url().split('?')[0].split('/').slice(-2).join('/')); });
    p.btn = (n) => p.getByRole('button', { name: n }).locator('visible=true').first(); p.see = (t, timeout = 20000) => p.getByText(t).locator('visible=true').first().waitFor({ timeout }); p.name = name; return p; };
  const A = await mk('Kay'), B = await mk('Sam');
  const step = async (l, f) => { try { await f(); console.log('OK  ', l); } catch (e) { console.log('FAIL', l, '—', e.message.split('\n')[0]); for (const p of [A, B]) await p.screenshot({ path: `${process.env.S}/quizfail-${p.name}.png` }); throw e; } };
  try {
    for (const p of [A, B]) await step(`${p.name} compte`, async () => {
      await p.goto(URL, { waitUntil: 'networkidle' });
      await p.getByLabel('Email').fill(`${p.name.toLowerCase()}.q${stamp}@example.com`); await p.getByLabel('Mot de passe').fill('quiz-test-1234');
      await p.btn('Créer mon compte').click(); await p.getByLabel('Prénom ou surnom').fill(p.name); await p.btn('Continuer').click(); await p.see("Ton espace à deux t'attend");
    });
    let code;
    await step('appairage', async () => {
      await A.btn('Inviter').click(); await A.btn("J'invite mon/ma partenaire").click(); await A.btn('Générer mon code').click();
      code = (await A.getByLabel(/^Ton code/).locator('visible=true').first().getAttribute('aria-label')).replace('Ton code : ', '').replace(/ /g, '');
      await B.btn("J'ai reçu un code").click(); await B.getByLabel('Code de ton/ta partenaire, 6 caractères').fill(code); await B.btn('Nous relier').click(); await B.see('Toi & Kay');
      await A.see('Toi & Sam');
    });
    const play = async (p, picks) => {
      await p.goto(URL + 'quiz', { waitUntil: 'networkidle' }); await p.see("Sur la même longueur d'onde ?");
      await p.btn(/^Nos petites habitudes/).click();
      for (let i = 0; i < 5; i++) {
        await p.see(new RegExp(`· ${i + 1} sur 5`));
        for (const k of picks[i]) await p.getByRole('checkbox').locator('visible=true').nth(k).click();
        await p.btn(/^Valider/).click();
      }
    };
    await step('Kay joue les 5 questions', async () => { await play(A, [[0], [0, 1], [2], [0], [1]]); await A.see("C'est envoyé !"); });
    await step('Sam joue les 5 questions', async () => { await play(B, [[0], [1], [2, 3], [0], [1]]); });
    await step('Sam voit le résultat', async () => { await B.getByLabel(/pour cent de complicité/).locator('visible=true').first().waitFor({ timeout: 20000 }); console.log('   ', await B.getByLabel(/pour cent de complicité/).locator('visible=true').first().getAttribute('aria-label')); });
    await step('Kay voit le résultat', async () => { await A.goto(URL + 'quiz', { waitUntil: 'networkidle' }); await A.see(/% de complicité/); await A.btn(/^Nos petites habitudes/).click(); await A.getByLabel(/pour cent de complicité/).locator('visible=true').first().waitFor({ timeout: 20000 }); });
    await step('Kay rejoue', async () => { await A.btn('Rejouer').click(); await A.see(/· 1 sur 5/); });
  } catch {}
  console.log('erreurs Kay:', JSON.stringify(A.errs.slice(0, 6)), '| Sam:', JSON.stringify(B.errs.slice(0, 6)));
  // nettoyage des comptes de test
  for (const p of [A, B]) { try { await p.goto(URL + 'settings'); await p.btn('Supprimer mon compte').click(); await p.btn('Supprimer').click(); await p.btn('Supprimer définitivement').click(); await p.see('Rien que vous deux.'); } catch {} }
  await b.close();
})();

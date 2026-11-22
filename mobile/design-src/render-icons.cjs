// Génère toutes les icônes de HotCouple (cœur de verre) à partir de icon.html.
// Usage (depuis mobile/) : NODE_PATH=$(npm root -g) node design-src/render-icons.cjs
const { chromium } = require('playwright');
const path = require('path');
const A = path.join(__dirname, '..', 'assets'), P = path.join(__dirname, '..', 'public');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
  await p.goto('file://' + path.join(__dirname, 'icon.html'));
  const shot = async (file, { cls = '', heart = 600, size = 1024, transparent = false } = {}) => {
    await p.evaluate(({ cls, heart }) => {
      document.getElementById('tile').className = 'tile ' + cls;
      const h = document.getElementById('heart'); h.setAttribute('width', heart); h.setAttribute('height', heart);
    }, { cls, heart });
    await p.setViewportSize({ width: 1024, height: 1024 });
    const buf = await p.locator('#tile').screenshot({ omitBackground: transparent });
    if (size === 1024) require('fs').writeFileSync(file, buf);
    else {
      const sp = await b.newPage({ viewport: { width: size, height: size } });
      await sp.setContent(`<body style="margin:0;background:transparent"><img src="data:image/png;base64,${buf.toString('base64')}" style="width:${size}px;height:${size}px;display:block"></body>`);
      require('fs').writeFileSync(file, await sp.screenshot({ omitBackground: true }));
      await sp.close();
    }
    console.log('ok', path.relative(path.join(__dirname, '..'), file));
  };
  await shot(A + '/icon.png');                                                         // iOS : carré plein, iOS arrondit
  await shot(A + '/android-icon-foreground.png', { cls: 'transparent', heart: 430, transparent: true }); // zone sûre 66 %
  await shot(A + '/android-icon-background.png', { cls: '', heart: 0 });
  await shot(A + '/android-icon-monochrome.png', { cls: 'transparent mono', heart: 430, transparent: true });
  await shot(A + '/splash-icon.png', { cls: 'transparent', heart: 560, transparent: true });
  await shot(A + '/favicon.png', { size: 48 });
  await shot(P + '/icon-192.png', { size: 192 });
  await shot(P + '/icon-512.png', { size: 512 });
  await b.close();
})();

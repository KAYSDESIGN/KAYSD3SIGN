import { ScrollViewStyleReset, useServerDocumentContext } from "expo-router/html";
import type { PropsWithChildren } from "react";

// Après une mise à jour, une page ouverte peut réclamer un morceau de l'ancienne version (supprimé) :
// on recharge alors la page une seule fois pour prendre la nouvelle version.
const RELOAD_ON_STALE = "(function(){var k='hc-stale-reload';function r(m){if(/Loading (module|chunk)|dynamically imported module|Importing a module script failed/i.test(String(m||''))&&!sessionStorage.getItem(k)){try{sessionStorage.setItem(k,'1')}catch(e){}location.reload()}}window.addEventListener('error',function(e){r(e&&e.message)},true);window.addEventListener('unhandledrejection',function(e){r(e&&e.reason&&(e.reason.message||e.reason))});window.addEventListener('load',function(){setTimeout(function(){try{sessionStorage.removeItem(k)}catch(e){}},15000)})})();";

const GLASS_CSS = "html,body{background:#EEE2EE;}html[data-scheme=dark] html,html[data-scheme=dark] body{background:#121014;}.lg{position:relative;isolation:isolate;-webkit-backdrop-filter:blur(2.5px) saturate(185%) brightness(1.04);backdrop-filter:blur(2.5px) saturate(185%) brightness(1.04);text-shadow:0 0 10px rgba(255,255,255,.75),0 0 2px rgba(255,255,255,.6);box-shadow:inset 0 2.5px 1.5px rgba(255,255,255,.95),inset 0 -2px 2px rgba(255,255,255,.65),inset 2px 0 2px rgba(255,255,255,.35),inset -2px 0 2px rgba(255,255,255,.35),inset 0 0 0 1px rgba(255,255,255,.35),inset 0 10px 14px -10px rgba(255,255,255,.75),inset 0 -12px 16px -12px rgba(255,255,255,.5),0 8px 22px rgba(40,25,60,.16);}.lg.lg-flat{box-shadow:inset 0 2.5px 1.5px rgba(255,255,255,.95),inset 0 -2px 2px rgba(255,255,255,.65),inset 2px 0 2px rgba(255,255,255,.35),inset -2px 0 2px rgba(255,255,255,.35),inset 0 0 0 1px rgba(255,255,255,.35),inset 0 10px 14px -10px rgba(255,255,255,.75),inset 0 -12px 16px -12px rgba(255,255,255,.5);}.lg::before{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:-1;background:linear-gradient(170deg,rgba(255,255,255,.28) 0%,rgba(255,255,255,0) 22%,rgba(255,255,255,0) 78%,rgba(255,255,255,.16) 100%);}html[data-scheme=dark] .lg{text-shadow:0 0 10px rgba(0,0,0,.6),0 0 2px rgba(0,0,0,.5);box-shadow:inset 0 2px 1.5px rgba(255,255,255,.6),inset 0 -2px 2px rgba(255,255,255,.28),inset 2px 0 2px rgba(255,255,255,.14),inset -2px 0 2px rgba(255,255,255,.14),inset 0 0 0 1px rgba(255,255,255,.14),inset 0 10px 14px -10px rgba(255,255,255,.28),inset 0 -12px 16px -12px rgba(255,255,255,.18),0 8px 22px rgba(0,0,0,.5);}html[data-scheme=dark] .lg.lg-flat{box-shadow:inset 0 2px 1.5px rgba(255,255,255,.6),inset 0 -2px 2px rgba(255,255,255,.28),inset 0 0 0 1px rgba(255,255,255,.14),inset 0 10px 14px -10px rgba(255,255,255,.28);}html[data-scheme=dark] .lg::before{background:linear-gradient(170deg,rgba(255,255,255,.10) 0%,rgba(255,255,255,0) 22%,rgba(255,255,255,0) 78%,rgba(255,255,255,.06) 100%);}.bg-surface,.bg-surface-raised,.bg-accent-soft{-webkit-backdrop-filter:blur(2.5px) saturate(185%) brightness(1.04);backdrop-filter:blur(2.5px) saturate(185%) brightness(1.04);}.border-glass-edge{box-shadow:inset 0 2px 1.5px rgba(255,255,255,.9),inset 0 -2px 2px rgba(255,255,255,.55),inset 0 0 0 1px rgba(255,255,255,.3);}html[data-scheme=dark] .border-glass-edge{box-shadow:inset 0 2px 1.5px rgba(255,255,255,.5),inset 0 -2px 2px rgba(255,255,255,.22),inset 0 0 0 1px rgba(255,255,255,.12);}html[data-palette=bordeaux],html[data-palette=bordeaux] body{background:#FCF8F7;}html[data-palette=bordeaux][data-scheme=dark],html[data-palette=bordeaux][data-scheme=dark] body{background:#170E12;}html[data-palette=bordeaux] .lg:not(.lg-float){-webkit-backdrop-filter:none;backdrop-filter:none;text-shadow:none;box-shadow:none;}html[data-palette=bordeaux] .lg:not(.lg-float)::before{display:none;}html[data-palette=bordeaux] .bg-surface,html[data-palette=bordeaux] .bg-surface-raised,html[data-palette=bordeaux] .bg-accent-soft{-webkit-backdrop-filter:none;backdrop-filter:none;}html[data-palette=bordeaux] .border-glass-edge{box-shadow:none;}html[data-palette=bordeaux] .lg.lg-float{text-shadow:none;}/* Liquid Glass : réaction au toucher, verre clair sur photo, verre teinté, accessibilité */.lg.lg-float{transition:transform .28s cubic-bezier(.2,.9,.25,1.25),box-shadow .28s ease,background-color .28s ease,filter .28s ease;}.lg.lg-interactive{cursor:pointer;}.lg.lg-interactive:active{transform:scale(.955);filter:brightness(1.06) saturate(1.08);}.lg.lg-interactive:active::before{background:radial-gradient(120% 90% at 50% 0%,rgba(255,255,255,.55) 0%,rgba(255,255,255,0) 60%);}.lg.lg-clear{-webkit-backdrop-filter:blur(6px) saturate(160%);backdrop-filter:blur(6px) saturate(160%);text-shadow:none;box-shadow:inset 0 1.5px 1px rgba(255,255,255,.55),inset 0 -1px 1.5px rgba(255,255,255,.25),inset 0 0 0 1px rgba(255,255,255,.22),0 6px 18px rgba(0,0,0,.18)!important;}.lg.lg-prominent{text-shadow:none;box-shadow:inset 0 1.5px 1px rgba(255,255,255,.45),inset 0 -1.5px 2px rgba(255,255,255,.18),inset 0 0 0 1px rgba(255,255,255,.14),0 6px 16px rgba(85,29,53,.22)!important;}html[data-palette=bordeaux] .lg.lg-float:not(.lg-clear):not(.lg-prominent){box-shadow:inset 0 2px 1.5px rgba(255,255,255,.95),inset 0 -1.5px 2px rgba(255,255,255,.6),inset 0 0 0 1px rgba(255,255,255,.55),0 6px 18px rgba(85,29,53,.10);}html[data-palette=bordeaux][data-scheme=dark] .lg.lg-float:not(.lg-clear):not(.lg-prominent){box-shadow:inset 0 1.5px 1px rgba(255,255,255,.35),inset 0 -1.5px 2px rgba(255,255,255,.12),inset 0 0 0 1px rgba(255,255,255,.12),0 8px 20px rgba(0,0,0,.45);}@media (prefers-reduced-motion:reduce){.lg.lg-float{transition:none;}.lg.lg-interactive:active{transform:none;}}@media (prefers-contrast:more){.lg.lg-float{box-shadow:inset 0 0 0 1.5px rgba(36,24,32,.55)!important;}}@media (prefers-reduced-transparency:reduce){.lg{-webkit-backdrop-filter:none!important;backdrop-filter:none!important;}}";

// Page HTML de la version web : installable sur l'écran d'accueil, jamais indexée.
// SDK 58 : headNodes et bodyNodes portent les styles et les scripts de l'app, ne pas les retirer.
export default function Root({ children }: PropsWithChildren) {
  const { bodyAttributes, bodyNodes, htmlAttributes, headNodes } = useServerDocumentContext();
  return (
    <html lang="fr" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#F8F1F8" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#120818" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="HotCouple" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="manifest" href="/manifest.json" />
        <title>HotCouple</title>
        <script dangerouslySetInnerHTML={{ __html: RELOAD_ON_STALE }} />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: GLASS_CSS }} />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}

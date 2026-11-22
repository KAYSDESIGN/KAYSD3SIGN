import { ScrollViewStyleReset, useServerDocumentContext } from "expo-router/html";
import type { PropsWithChildren } from "react";

const GLASS_CSS = "html,body{background:#F1EEF3;}html[data-scheme=dark] html,html[data-scheme=dark] body{background:#121014;}.lg{position:relative;isolation:isolate;-webkit-backdrop-filter:blur(2.5px) saturate(185%) brightness(1.04);backdrop-filter:blur(2.5px) saturate(185%) brightness(1.04);text-shadow:0 0 10px rgba(255,255,255,.75),0 0 2px rgba(255,255,255,.6);box-shadow:inset 0 2.5px 1.5px rgba(255,255,255,.95),inset 0 -2px 2px rgba(255,255,255,.65),inset 2px 0 2px rgba(255,255,255,.35),inset -2px 0 2px rgba(255,255,255,.35),inset 0 0 0 1px rgba(255,255,255,.35),inset 0 10px 14px -10px rgba(255,255,255,.75),inset 0 -12px 16px -12px rgba(255,255,255,.5),0 8px 22px rgba(40,25,60,.16);}.lg.lg-flat{box-shadow:inset 0 2.5px 1.5px rgba(255,255,255,.95),inset 0 -2px 2px rgba(255,255,255,.65),inset 2px 0 2px rgba(255,255,255,.35),inset -2px 0 2px rgba(255,255,255,.35),inset 0 0 0 1px rgba(255,255,255,.35),inset 0 10px 14px -10px rgba(255,255,255,.75),inset 0 -12px 16px -12px rgba(255,255,255,.5);}.lg::before{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:-1;background:linear-gradient(170deg,rgba(255,255,255,.28) 0%,rgba(255,255,255,0) 22%,rgba(255,255,255,0) 78%,rgba(255,255,255,.16) 100%);}html[data-scheme=dark] .lg{text-shadow:0 0 10px rgba(0,0,0,.6),0 0 2px rgba(0,0,0,.5);box-shadow:inset 0 2px 1.5px rgba(255,255,255,.6),inset 0 -2px 2px rgba(255,255,255,.28),inset 2px 0 2px rgba(255,255,255,.14),inset -2px 0 2px rgba(255,255,255,.14),inset 0 0 0 1px rgba(255,255,255,.14),inset 0 10px 14px -10px rgba(255,255,255,.28),inset 0 -12px 16px -12px rgba(255,255,255,.18),0 8px 22px rgba(0,0,0,.5);}html[data-scheme=dark] .lg.lg-flat{box-shadow:inset 0 2px 1.5px rgba(255,255,255,.6),inset 0 -2px 2px rgba(255,255,255,.28),inset 0 0 0 1px rgba(255,255,255,.14),inset 0 10px 14px -10px rgba(255,255,255,.28);}html[data-scheme=dark] .lg::before{background:linear-gradient(170deg,rgba(255,255,255,.10) 0%,rgba(255,255,255,0) 22%,rgba(255,255,255,0) 78%,rgba(255,255,255,.06) 100%);}.bg-surface,.bg-surface-raised,.bg-accent-soft{-webkit-backdrop-filter:blur(2.5px) saturate(185%) brightness(1.04);backdrop-filter:blur(2.5px) saturate(185%) brightness(1.04);}.border-glass-edge{box-shadow:inset 0 2px 1.5px rgba(255,255,255,.9),inset 0 -2px 2px rgba(255,255,255,.55),inset 0 0 0 1px rgba(255,255,255,.3);}html[data-scheme=dark] .border-glass-edge{box-shadow:inset 0 2px 1.5px rgba(255,255,255,.5),inset 0 -2px 2px rgba(255,255,255,.22),inset 0 0 0 1px rgba(255,255,255,.12);}";

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

import { ScrollViewStyleReset, useServerDocumentContext } from "expo-router/html";
import type { PropsWithChildren } from "react";

const GLASS_CSS = [
  "html,body{background:#F1F0F5;}",
  "@media (prefers-color-scheme: dark){html,body{background:#08060C;}}",
  // Verre liquide (classe lg) : clair, peu flouté, saturé, lumière sur tout le pourtour, reflet en haut à gauche
  ".lg{position:relative;isolation:isolate;-webkit-backdrop-filter:blur(7px) saturate(190%) brightness(1.06);backdrop-filter:blur(7px) saturate(190%) brightness(1.06);",
  "box-shadow:inset 0 1.5px 1px rgba(255,255,255,.95),inset 0 -1px 1px rgba(255,255,255,.55),inset 1px 0 1px rgba(255,255,255,.5),inset -1px 0 1px rgba(255,255,255,.5),inset 0 0 22px rgba(255,255,255,.32),0 10px 30px rgba(40,10,50,.13),0 1px 2px rgba(40,10,50,.08);}",
  ".lg.lg-flat{box-shadow:inset 0 1.5px 1px rgba(255,255,255,.95),inset 0 -1px 1px rgba(255,255,255,.55),inset 1px 0 1px rgba(255,255,255,.5),inset -1px 0 1px rgba(255,255,255,.5),inset 0 0 22px rgba(255,255,255,.32);}",
  ".lg::before{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:-1;background:radial-gradient(120% 70% at 18% 0%,rgba(255,255,255,.55),rgba(255,255,255,0) 55%);}",
  ".lg::after{content:'';position:absolute;inset:0;border-radius:inherit;padding:1px;pointer-events:none;",
  "background:conic-gradient(from 210deg,rgba(255,255,255,.95),rgba(255,255,255,.15) 25%,rgba(255,255,255,.7) 50%,rgba(255,255,255,.12) 75%,rgba(255,255,255,.95));",
  "-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;}",
  ".lg-smoke::before{background:radial-gradient(120% 70% at 18% 0%,rgba(255,255,255,.28),rgba(255,255,255,0) 55%);}",
  "@media (prefers-color-scheme: dark){",
  ".lg{box-shadow:inset 0 1.2px 1px rgba(255,255,255,.45),inset 0 -1px 1px rgba(255,255,255,.15),inset 1px 0 1px rgba(255,255,255,.18),inset -1px 0 1px rgba(255,255,255,.18),inset 0 0 18px rgba(255,255,255,.07),0 10px 30px rgba(0,0,0,.5);}",
  ".lg.lg-flat{box-shadow:inset 0 1.2px 1px rgba(255,255,255,.45),inset 0 -1px 1px rgba(255,255,255,.15),inset 1px 0 1px rgba(255,255,255,.18),inset -1px 0 1px rgba(255,255,255,.18),inset 0 0 18px rgba(255,255,255,.07);}",
  ".lg::before{background:radial-gradient(120% 70% at 18% 0%,rgba(255,255,255,.16),rgba(255,255,255,0) 55%);}",
  ".lg::after{opacity:.5;}}",
  // tout ce qui est translucide (boutons, puces, champs) devient aussi du verre
  ".bg-surface,.bg-surface-raised,.bg-accent-soft{-webkit-backdrop-filter:blur(7px) saturate(190%) brightness(1.05);backdrop-filter:blur(7px) saturate(190%) brightness(1.05);}",
  ".border-glass-edge{box-shadow:inset 0 1.5px 1px rgba(255,255,255,.9),inset 0 -1px 1px rgba(255,255,255,.45),inset 1px 0 1px rgba(255,255,255,.4),inset -1px 0 1px rgba(255,255,255,.4),inset 0 0 16px rgba(255,255,255,.22);}",
  "@media (prefers-color-scheme: dark){.border-glass-edge{box-shadow:inset 0 1.2px 1px rgba(255,255,255,.4),inset 0 -1px 1px rgba(255,255,255,.14),inset 1px 0 1px rgba(255,255,255,.16),inset -1px 0 1px rgba(255,255,255,.16),inset 0 0 14px rgba(255,255,255,.06);}}",
].join("");

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

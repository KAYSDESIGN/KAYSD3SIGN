import { ScrollViewStyleReset, useServerDocumentContext } from "expo-router/html";
import type { PropsWithChildren } from "react";

const GLASS_CSS = [
  "html,body{background:#F8F1F8;}",
  "@media (prefers-color-scheme: dark){html,body{background:#120818;}}",
  // verre liquide : tout ce qui est translucide floute et sature ce qu'il y a derrière
  ".bg-surface,.bg-surface-raised,.bg-accent-soft{-webkit-backdrop-filter:blur(12px) saturate(185%);backdrop-filter:blur(12px) saturate(185%);}",
  // bords qui accrochent la lumière (haut-gauche fort, bas-droite doux, halo intérieur)
  ".border-glass-edge{box-shadow:inset 1.5px 1.5px 0 rgba(255,255,255,.85),inset -1px -1px 0 rgba(255,255,255,.4),inset 0 0 18px rgba(255,255,255,.18);}",
  "@media (prefers-color-scheme: dark){.border-glass-edge{box-shadow:inset 1.2px 1.2px 0 rgba(255,255,255,.3),inset -1px -1px 0 rgba(255,255,255,.12),inset 0 0 16px rgba(255,255,255,.06);}}",
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

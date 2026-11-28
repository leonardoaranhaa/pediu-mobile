import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

// Web only. The static splash below is painted with the HTML, before any JavaScript,
// so the page shows the brand instead of a blank screen while the bundle loads.
// BootSplash removes it once its own identical copy is on screen.
const BOOT_CSS = `
html, body { background: #F7F6F4; }
#pediu-boot {
  position: fixed; inset: 0; z-index: 2147483647;
  display: flex; align-items: center; justify-content: center;
  background: #E20D2A;
}
#pediu-boot img { width: 125px; height: 39px; }
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#E20D2A" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: BOOT_CSS }} />
      </head>
      <body>
        <div id="pediu-boot" aria-hidden="true">
          <img src="/boot-wordmark.png" alt="" />
        </div>
        {children}
      </body>
    </html>
  );
}

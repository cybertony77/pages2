import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Theme & App Settings */}
        <meta name="theme-color" content="#1FA8DC" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="TopPhysics" />
        <meta name="apple-touch-fullscreen" content="yes" />

        {/* Camera Permission Policy */}
        <meta httpEquiv="Permissions-Policy" content="camera=(self)" />

        {/* Icons for iOS */}
        <link rel="apple-touch-icon" href="/icons/apple-icon-180.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

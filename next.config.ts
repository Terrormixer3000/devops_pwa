import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";
// Web Push soll in `npm run dev` standardmaessig testbar sein.
const enablePwaInDev = process.env.PWA_IN_DEV !== "false";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: isDevelopment ? !enablePwaInDev : false,
  // Custom Service Worker als Einstiegspunkt; next-pwa injiziert Workbox-Precaching zusaetzlich
  swSrc: "public/sw-custom.js",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_PWA_IN_DEV: enablePwaInDev ? "true" : "false",
  },
};

export default withPWA(nextConfig);

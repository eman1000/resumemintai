// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  typescript: {
    ignoreBuildErrors: true, // ✅ valid place
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  experimental: {
    typedRoutes: true,
    serverComponentsExternalPackages: [
      '@sparticuz/chromium',
      'puppeteer-core',
      'pdfjs-dist',
      'pdf-parse',
      'puppeteer',
    ],
    // keep only if you truly need it; otherwise remove
    missingSuspenseWithCSRBailout: true,
  },
};

export default nextConfig;

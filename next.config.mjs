/** @type {import('next').NextConfig} */
const nextConfig = {
  ignoreBuildErrors: true,
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
    serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core', 'pdfjs-dist', 'pdf-parse', 'puppeteer'],
    missingSuspenseWithCSRBailout: false,

  }
};
export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  ignoreBuildErrors: true,
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
    serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core', 'pdfjs-dist', 'pdf-parse', 'puppeteer'],
    missingSuspenseWithCSRBailout: true,

  }
};
export default nextConfig;

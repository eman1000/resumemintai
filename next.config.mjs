// next.config.mjs
/** @type {import('next').NextConfig} */
import WebpackObfuscator from 'webpack-obfuscator';

const nextConfig = {
  reactStrictMode: true,

  typescript: {
    // keep build moving in CI; surface in editor/local
    ignoreBuildErrors: true,
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
      // JSON Resume themes (pure HTML/CSS) + engines — keep as runtime node
      // requires so Next doesn't bundle handlebars/pug/fs/moment.
      'moment',
      'jsonresume-theme-even',
      'jsonresume-theme-stackoverflow',
      'jsonresume-theme-kendall',
      'jsonresume-theme-elegant',
      'jsonresume-theme-flat',
      'jsonresume-theme-onepage',
      'jsonresume-theme-macchiato',
      'jsonresume-theme-paper',
      'jsonresume-theme-short',
      'jsonresume-theme-spartan',
      'jsonresume-theme-caffeine',
      'jsonresume-theme-kards',
    ],
    // remove if not needed
    missingSuspenseWithCSRBailout: true,
  },

  // don’t publish readable source maps
  productionBrowserSourceMaps: false,

  webpack: (config, { isServer, dev }) => {
    const shouldObfuscate = !isServer && !dev && process.env.OBFUSCATE === '1';

    if (shouldObfuscate) {
      config.plugins.push(
        new WebpackObfuscator(
          {
            compact: true,
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 0.75,
            deadCodeInjection: true,
            deadCodeInjectionThreshold: 0.4,
            disableConsoleOutput: true,
            identifierNamesGenerator: 'hexadecimal',
            rotateStringArray: true,
            selfDefending: true,
            stringArray: true,
            stringArrayEncoding: ['rc4'],
            stringArrayThreshold: 0.75,
            transformObjectKeys: true,
            unicodeEscapeSequence: false,
          },
          // exclude core Next/React runtime chunks to avoid hydration issues
          [
            'static/chunks/webpack-*.js',
            'static/chunks/framework-*.js',
            'static/chunks/main-*.js',
            'static/chunks/react-*.js',
            'static/chunks/react-dom-*.js',
          ]
        )
      );
    }

    return config;
  },
};

export default nextConfig;

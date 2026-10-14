import type { NextConfig } from 'next';
const config: NextConfig = {
  webpack(config, { webpack, isServer }) {
    config.plugins.push(
      new webpack.ContextReplacementPlugin(
        /@vscode[\\/]vscode-languagedetection[\\/]dist[\\/]lib$/,
        /^\.\/979\.js$/,
      ),
    );
    config.resolve.fallback = { ...config.resolve.fallback, encoding: false };

    if (!isServer) config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    return config;
  },
  outputFileTracingRoot: process.cwd(),
  outputFileTracingIncludes: { '/api/library': ['./data/codelens.sqlite'] },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
          },
        ],
      },
      ...[
        '/pyodide/:version([a-f0-9]{16})/:path*',
        '/monaco/:version([a-f0-9]{16})/:path*',
        '/language-detection/:version([a-f0-9]{16})/:path*',
      ].map((source) => ({
        source,
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      })),
      { source: '/runtime-assets.json', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
    ];
  },
};
export default config;

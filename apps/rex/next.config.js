import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */

const remotePatterns = [];

if (process.env.FILE_PROVIDER === 'local') {
  remotePatterns.push({
    protocol: 'http',
    hostname: 'localhost',
    port: '3000',
    pathname: '/**',
  });
}

const config = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    remotePatterns,
  },
  serverExternalPackages: ['@electric-sql/pglite'],
  webpack(config) {
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts'],
      '.jsx': ['.jsx', '.tsx'],
    };
    config.resolve.fallback = {
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
    };
    return config;
  },
  devIndicators: false,
};

export default config;

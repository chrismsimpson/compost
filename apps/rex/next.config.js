/** @type {import('next').NextConfig} */

const remotePatterns = [
  
];

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
    remotePatterns
  },
  serverExternalPackages: ['@electric-sql/pglite'],
};

export default config;
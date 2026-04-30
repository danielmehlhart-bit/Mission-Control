import { SECURITY_HEADERS } from './lib/security-headers.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: undefined,
    staleTimes: {
      dynamic: 0,
      static: 180,
    },
  },
  // Fix 5: HTTP Security Headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;

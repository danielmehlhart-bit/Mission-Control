/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: undefined,
    // Router Cache: kein Caching für dynamische Seiten → useEffect läuft immer neu
    staleTimes: {
      dynamic: 0,
      static: 180,
    },
  },
};

export default nextConfig;

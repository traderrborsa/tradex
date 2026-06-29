import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'flagcdn.com', pathname: '/**' },
      { protocol: 'https', hostname: 'assets.coincap.io', pathname: '/**' },
      {
        protocol: 'https',
        hostname: 'financialmodelingprep.com',
        pathname: '/image-stock/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
        pathname: '/gh/ahmeterenodaci/Istanbul-Stock-Exchange--BIST--including-symbols-and-logos/**',
      },
    ],
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: {
    // Lint is run explicitly in CI via `npm run lint`; don't fail production builds on it.
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Server Actions accept modest uploads; large card photos go through the
    // /api/generate route handler which streams multipart form data instead.
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;

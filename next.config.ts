/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ⚠️ Build will succeed even if ESLint finds problems
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ⚠️ Build will succeed even if there are TS type errors
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;

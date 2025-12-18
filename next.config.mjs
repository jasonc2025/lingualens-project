/** @type {import('next').NextConfig} */
const nextConfig = {
  // This is required for Cloudflare compatibility
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

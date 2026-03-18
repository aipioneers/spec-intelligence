/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@spec-kit/ui"],
  experimental: {
    optimizePackageImports: ["@radix-ui/themes"],
  },
};

export default nextConfig;

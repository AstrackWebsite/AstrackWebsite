/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // @react-pdf/renderer ships CJS; keep it external to the server bundle
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
};

export default nextConfig;

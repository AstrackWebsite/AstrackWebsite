// A token that changes on every deploy. Netlify sets COMMIT_REF at build; we
// fall back to a build-time timestamp locally. It's baked into the client and
// the service worker so the installed app can tell when a new version is live.
const BUILD_ID = process.env.COMMIT_REF || Date.now().toString();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
  experimental: {
    // @react-pdf/renderer ships CJS; keep it external to the server bundle
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
};

export default nextConfig;

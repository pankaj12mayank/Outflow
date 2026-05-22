/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  transpilePackages: ["framer-motion"],

  images: {
    formats: ["image/avif", "image/webp"],
  },

  async redirects() {
    return [
      { source: "/app/super-admin", destination: "/system-owner/dashboard", permanent: false },
      { source: "/app/super-admin/organizations", destination: "/system-owner/organizations", permanent: false },
      { source: "/app/super-admin/plans", destination: "/system-owner/plans", permanent: false },
      { source: "/app/super-admin/settings", destination: "/system-owner/settings", permanent: false },
      { source: "/app/super-admin/cms", destination: "/system-owner/cms", permanent: false },
      { source: "/app/super-admin/billing", destination: "/system-owner/payments", permanent: false },
      { source: "/app/super-admin/monitoring", destination: "/system-owner/dashboard", permanent: false },
      { source: "/app/super-admin/abuse", destination: "/system-owner/organizations", permanent: false },
    ];
  },
};

module.exports = nextConfig;

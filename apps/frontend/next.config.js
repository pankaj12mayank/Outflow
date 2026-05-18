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
};

module.exports = nextConfig;

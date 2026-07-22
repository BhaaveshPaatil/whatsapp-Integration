/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/__/auth/:path*",
        destination: "https://whatsapp-taskflow.firebaseapp.com/__/auth/:path*",
      },
    ];
  },
};

export default nextConfig;

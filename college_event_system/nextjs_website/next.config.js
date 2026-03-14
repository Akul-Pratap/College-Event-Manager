/** @type {import('next').NextConfig} */
const { withSentryConfig } = require("@sentry/nextjs");

const securityHeaders = [
  { key: "X-Frame-Options",           value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "X-DNS-Prefetch-Control",    value: "on" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const allowedOrigins = ['localhost:3000'];

const appUrls = [
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.NEXT_PUBLIC_STAGING_URL,
].filter(Boolean);

for (const rawUrl of appUrls) {
  try {
    allowedOrigins.push(new URL(rawUrl).host);
  } catch {
    allowedOrigins.push(String(rawUrl).replace(/^https?:\/\//, ''));
  }
}

const nextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
      {
        protocol: 'https',
        hostname: 'images.clerk.dev',
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins,
    },
  },
};

module.exports = withSentryConfig(nextConfig, {
  // Suppress non-error output during builds
  silent: !process.env.CI,
  // Upload source maps only when SENTRY_AUTH_TOKEN is set (optional)
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  hideSourceMaps: true,
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: true,
  },
});

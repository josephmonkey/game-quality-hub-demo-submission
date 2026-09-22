import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Keep client bundles and HMR available when the dev server is opened through
  // this LAN subnet. A stale single-host entry leaves the server-rendered HTML
  // visible while Next.js blocks the JavaScript chunks, making every client
  // interaction appear unresponsive.
  allowedDevOrigins: ['192.168.11.*', '127.0.0.1'],
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  }
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['avatars.githubusercontent.com'],
  },
  experimental: {
    // Prevent Next.js from bundling pdf-parse / pdfjs-dist so that
    // pdfjs-dist's internal dynamic import('./pdf.worker.mjs') resolves
    // correctly against the package's own files at runtime.
    serverComponentsExternalPackages: ['pdf-parse', 'pdfjs-dist'],
  },
  webpack: (config) => {
    config.resolve.alias['canvas'] = false
    config.resolve.alias['encoding'] = false
    return config
  },
}

module.exports = nextConfig

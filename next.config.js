/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['avatars.githubusercontent.com'],
  },
  webpack: (config) => {
    // pdf-parse reads test files from disk during init — tell webpack to ignore them
    config.resolve.alias['canvas'] = false
    config.resolve.alias['encoding'] = false
    return config
  },
}

module.exports = nextConfig

import { DeploymentProvider } from './provider'
import { RailwayProvider } from './railway-provider'
import { DockerProvider } from './docker-provider'

export type { DeploymentProvider, DeploymentResult } from './provider'

let _provider: DeploymentProvider | null = null

/**
 * Get the deployment provider based on DEPLOY_BACKEND env var.
 * Defaults to 'railway' for backwards compatibility.
 * Set DEPLOY_BACKEND=docker to use Docker/DigitalOcean.
 */
export function getProvider(): DeploymentProvider {
  if (_provider) return _provider

  const backend = process.env.DEPLOY_BACKEND || 'railway'

  switch (backend) {
    case 'railway':
      _provider = new RailwayProvider()
      break
    case 'docker':
      _provider = new DockerProvider()
      break
    default:
      throw new Error(`Unknown DEPLOY_BACKEND: ${backend}. Use 'railway' or 'docker'.`)
  }

  console.log(`[Deploy] Using ${backend} provider`)
  return _provider
}

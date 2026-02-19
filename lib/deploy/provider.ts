import { UserConfiguration } from '@/lib/openclaw/config-builder'
import { InstanceStatus } from '@prisma/client'

export interface DeploymentResult {
  instanceId: string
  containerId: string
  containerName: string
  port: number
  accessUrl: string
  status: string
}

export interface DeploymentProvider {
  /** Deploy a new instance for a user. */
  deploy(userId: string, config: UserConfiguration): Promise<DeploymentResult>

  /** Start a stopped instance. */
  start(instanceId: string): Promise<void>

  /** Stop a running instance. */
  stop(instanceId: string): Promise<void>

  /** Restart an instance. */
  restart(instanceId: string): Promise<void>

  /** Destroy an instance completely. */
  destroy(instanceId: string): Promise<void>

  /** Check if instance is healthy. Returns true if running. */
  checkHealth(instanceId: string): Promise<boolean>

  /** Get logs from the instance. */
  getLogs(instanceId: string, tail?: number): Promise<string>

  /** Update configuration on a running instance and restart it. */
  updateConfig(instanceId: string, config: UserConfiguration): Promise<void>

  /** Get the internal service URL for API calls to the instance. */
  getServiceUrl(instanceId: string): Promise<string | null>

  /** Get the public access URL. */
  getAccessUrl(instanceId: string): Promise<string | null>

  /** Redeploy with updated pairing server script. */
  redeploy(instanceId: string): Promise<void>
}

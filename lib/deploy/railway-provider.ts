import { DeploymentProvider, DeploymentResult } from './provider'
import { RailwayClient } from '@/lib/railway/client'
import { prisma } from '@/lib/prisma'
import { allocatePort } from '@/lib/utils/port-allocator'
import {
  generateOpenClawConfig,
  buildEnvironmentVariables,
  UserConfiguration,
} from '@/lib/openclaw/config-builder'
import { InstanceStatus } from '@prisma/client'
import { randomUUID } from 'crypto'

const OPENCLAW_IMAGE = process.env.OPENCLAW_IMAGE || 'ghcr.io/placeparks/bot-saas/openclaw-wrapper:latest'

// Import pairing server script + start command builders from existing code
import { PAIRING_SCRIPT_B64, buildStartScript, buildRailwayStartCommand } from '@/lib/railway/deploy'

/** Build a start command that writes SOUL.md + IDENTITY.md then runs the original entrypoint. */
function buildWrapperStartCommand(): string {
  // This runs BEFORE the entrypoint; writes workspace files from env vars then execs entrypoint
  return [
    '/bin/bash -c \'',
    'CONFIG_DIR="${OPENCLAW_CONFIG_DIR:-$HOME/.openclaw}";',
    'WORKSPACE_DIR="$CONFIG_DIR/workspace";',
    'mkdir -p "$WORKSPACE_DIR";',
    // Write IDENTITY.md with agent name
    'if [ -n "$_AGENT_NAME" ]; then printf "# Identity\\n\\nname: %s\\n" "$_AGENT_NAME" > "$WORKSPACE_DIR/IDENTITY.md"; echo "[STARTUP] Wrote IDENTITY.md: $_AGENT_NAME"; fi;',
    // Write SOUL.md with system prompt
    'SOUL="";',
    'if [ -n "$_AGENT_NAME" ]; then SOUL="# $_AGENT_NAME\n\n"; fi;',
    'if [ -n "$_SYSTEM_PROMPT" ]; then SOUL="${SOUL}$_SYSTEM_PROMPT"; fi;',
    'if [ -n "$SOUL" ]; then printf "%b" "$SOUL" > "$WORKSPACE_DIR/SOUL.md"; echo "[STARTUP] Wrote SOUL.md"; fi;',
    'exec /usr/local/bin/openclaw-entrypoint.sh',
    '\'',
  ].join(' ')
}

export class RailwayProvider implements DeploymentProvider {

  private async getInstanceWithContainerId(instanceId: string) {
    const instance = await prisma.instance.findUnique({ where: { id: instanceId } })
    if (!instance) throw new Error('Instance not found')

    if (!instance.containerId && instance.containerName) {
      const railway = new RailwayClient()
      const found = await railway.findServiceByName(instance.containerName)
      if (!found) throw new Error('Railway service not found for instance')
      await prisma.instance.update({ where: { id: instance.id }, data: { containerId: found } })
      return { ...instance, containerId: found }
    }

    if (!instance.containerId) throw new Error('Instance has no container ID')
    return instance as typeof instance & { containerId: string }
  }

  async deploy(userId: string, config: UserConfiguration): Promise<DeploymentResult> {
    const railway = new RailwayClient()
    const serviceName = `openclaw-${userId}`

    // Clean up any existing instance
    const existing = await prisma.instance.findUnique({ where: { userId } })
    if (existing) {
      try {
        if (existing.containerId) await railway.deleteService(existing.containerId)
        await prisma.instance.delete({ where: { id: existing.id } })
      } catch (err) {
        console.warn('Cleanup error (continuing):', err)
      }
    }

    // Clean up orphaned Railway service by name
    try {
      const orphanedServiceId = await railway.findServiceByName(serviceName)
      if (orphanedServiceId) {
        await railway.deleteService(orphanedServiceId)
      }
    } catch (err) {
      console.warn('Orphan cleanup error (continuing):', err)
    }

    // Create placeholder DB record
    const port = await allocatePort()
    const instance = await prisma.instance.create({
      data: {
        userId,
        containerId: null,
        containerName: serviceName,
        port,
        status: InstanceStatus.DEPLOYING,
      },
    })

    await this.logDeployment(instance.id, 'DEPLOY', 'IN_PROGRESS', 'Creating Railway service...')

    try {
      // Build env vars
      const envVars = buildEnvironmentVariables(config)
      envVars.PORT = '18800'
      const gatewayToken = randomUUID()
      envVars.OPENCLAW_GATEWAY_TOKEN = gatewayToken
      const openclawConfig = generateOpenClawConfig({ ...config, gatewayToken })
      envVars.OPENCLAW_CONFIG = JSON.stringify(openclawConfig)
      envVars._PAIRING_SCRIPT_B64 = PAIRING_SCRIPT_B64

      // Create Railway service
      const { id: serviceId } = await railway.createService(serviceName, OPENCLAW_IMAGE, envVars)

      // Set start command that writes SOUL.md before calling original entrypoint
      await railway.updateServiceInstance(serviceId, {
        startCommand: buildWrapperStartCommand(),
      })

      await prisma.instance.update({
        where: { id: instance.id },
        data: { containerId: serviceId },
      })

      // Create public domain
      let publicDomain: string | null = null
      try {
        publicDomain = await railway.createServiceDomain(serviceId)
        if (publicDomain) {
          await prisma.instance.update({
            where: { id: instance.id },
            data: { accessUrl: `https://${publicDomain}` },
          })
        }
      } catch (err) {
        console.warn('Failed to create public domain (continuing):', err)
      }

      const serviceUrl = `http://${serviceName}.railway.internal:18789`

      await prisma.instance.update({
        where: { id: instance.id },
        data: {
          status: InstanceStatus.DEPLOYING,
          accessUrl: publicDomain ? `https://${publicDomain}` : null,
          serviceUrl,
          containerId: serviceId,
        },
      })

      await this.logDeployment(instance.id, 'DEPLOY', 'QUEUED', 'Deployment queued (Railway-managed)')

      return {
        instanceId: instance.id,
        containerId: serviceId,
        containerName: serviceName,
        port,
        accessUrl: publicDomain ? `https://${publicDomain}` : '',
        status: 'DEPLOYING',
      }
    } catch (error: any) {
      await prisma.instance.update({
        where: { id: instance.id },
        data: { status: InstanceStatus.ERROR },
      })
      await this.logDeployment(instance.id, 'DEPLOY', 'FAILED', 'Deployment failed', error.message)
      throw new Error(`Deployment failed: ${error.message}`)
    }
  }

  async start(instanceId: string): Promise<void> {
    const instance = await this.getInstanceWithContainerId(instanceId)
    const railway = new RailwayClient()
    await railway.redeployService(instance.containerId)
    await prisma.instance.update({ where: { id: instanceId }, data: { status: InstanceStatus.RUNNING } })
    await this.logDeployment(instanceId, 'START', 'SUCCESS', 'Instance started')
  }

  async stop(instanceId: string): Promise<void> {
    const instance = await this.getInstanceWithContainerId(instanceId)
    const railway = new RailwayClient()
    const deployment = await railway.getLatestDeployment(instance.containerId)
    if (!deployment) throw new Error('No active deployment found')
    await railway.removeDeployment(deployment.id)
    await prisma.instance.update({ where: { id: instanceId }, data: { status: InstanceStatus.STOPPED } })
    await this.logDeployment(instanceId, 'STOP', 'SUCCESS', 'Instance stopped')
  }

  async restart(instanceId: string): Promise<void> {
    const instance = await this.getInstanceWithContainerId(instanceId)
    await prisma.instance.update({ where: { id: instanceId }, data: { status: InstanceStatus.RESTARTING } })
    const railway = new RailwayClient()
    const deployment = await railway.getLatestDeployment(instance.containerId)
    if (deployment && deployment.status === 'SUCCESS') {
      await railway.restartDeployment(deployment.id)
    } else {
      await railway.redeployService(instance.containerId)
    }
    await prisma.instance.update({ where: { id: instanceId }, data: { status: InstanceStatus.RUNNING } })
    await this.logDeployment(instanceId, 'RESTART', 'SUCCESS', 'Instance restarted')
  }

  async destroy(instanceId: string): Promise<void> {
    const instance = await this.getInstanceWithContainerId(instanceId)
    const railway = new RailwayClient()
    await railway.deleteService(instance.containerId)
    await prisma.instance.delete({ where: { id: instanceId } })
    await this.logDeployment(instanceId, 'DESTROY', 'SUCCESS', 'Instance destroyed')
  }

  async checkHealth(instanceId: string): Promise<boolean> {
    try {
      const instance = await this.getInstanceWithContainerId(instanceId)
      const railway = new RailwayClient()
      const deployment = await railway.getLatestDeployment(instance.containerId)

      const deployStatus = deployment?.status?.toUpperCase() || ''
      const isHealthy = deployStatus === 'SUCCESS'
      const isTransient = ['BUILDING', 'DEPLOYING', 'INITIALIZING', 'WAITING', 'REMOVING'].includes(deployStatus)

      // Only mark ERROR for truly failed states, not transient ones
      let newStatus: InstanceStatus
      if (isHealthy) {
        newStatus = InstanceStatus.RUNNING
      } else if (isTransient) {
        newStatus = instance.status === InstanceStatus.RESTARTING
          ? InstanceStatus.RESTARTING
          : InstanceStatus.DEPLOYING
      } else if (deployStatus === 'FAILED' || deployStatus === 'CRASHED') {
        newStatus = InstanceStatus.ERROR
      } else {
        // Unknown status — keep current status, don't flip to ERROR
        newStatus = instance.status
      }

      await prisma.instance.update({
        where: { id: instanceId },
        data: {
          lastHealthCheck: new Date(),
          status: newStatus,
        },
      })
      return isHealthy
    } catch {
      return false
    }
  }

  async getLogs(instanceId: string, tail = 100): Promise<string> {
    const instance = await this.getInstanceWithContainerId(instanceId)
    const railway = new RailwayClient()
    const deployment = await railway.getLatestDeployment(instance.containerId)
    if (!deployment) return 'No deployments found.'
    const logs = await railway.getLogs(deployment.id, tail)
    return logs.map(l => `[${l.timestamp}] [${l.severity}] ${l.message}`).join('\n')
  }

  async updateConfig(instanceId: string, config: UserConfiguration): Promise<void> {
    const instance = await this.getInstanceWithContainerId(instanceId)
    const railway = new RailwayClient()

    // Rebuild env vars and config
    const envVars = buildEnvironmentVariables(config)
    envVars.PORT = '18800'
    const gatewayToken = config.gatewayToken || randomUUID()
    envVars.OPENCLAW_GATEWAY_TOKEN = gatewayToken
    const openclawConfig = generateOpenClawConfig({ ...config, gatewayToken })
    envVars.OPENCLAW_CONFIG = JSON.stringify(openclawConfig)
    envVars._PAIRING_SCRIPT_B64 = PAIRING_SCRIPT_B64

    // Update env vars on Railway
    await railway.setVariables(instance.containerId, envVars)

    // Ensure start command writes SOUL.md
    await railway.updateServiceInstance(instance.containerId, {
      startCommand: buildWrapperStartCommand(),
    })

    // Redeploy to apply changes
    await railway.redeployService(instance.containerId)

    await prisma.instance.update({
      where: { id: instanceId },
      data: { status: InstanceStatus.RESTARTING },
    })

    await this.logDeployment(instanceId, 'CONFIG_UPDATE', 'SUCCESS', 'Config updated and redeployed')
  }

  async getServiceUrl(instanceId: string): Promise<string | null> {
    const instance = await prisma.instance.findUnique({ where: { id: instanceId } })
    return instance?.serviceUrl ?? null
  }

  async getAccessUrl(instanceId: string): Promise<string | null> {
    const instance = await prisma.instance.findUnique({ where: { id: instanceId } })
    return instance?.accessUrl ?? null
  }

  async redeploy(instanceId: string): Promise<void> {
    const instance = await this.getInstanceWithContainerId(instanceId)
    const railway = new RailwayClient()
    await railway.setVariables(instance.containerId, { _PAIRING_SCRIPT_B64: PAIRING_SCRIPT_B64 })
    await railway.redeployService(instance.containerId)
    await this.logDeployment(instanceId, 'REDEPLOY', 'SUCCESS', 'Fresh deployment triggered')
  }

  private async logDeployment(instanceId: string, action: string, status: string, message: string, error?: string) {
    await prisma.deploymentLog.create({ data: { instanceId, action, status, message, error } })
  }
}

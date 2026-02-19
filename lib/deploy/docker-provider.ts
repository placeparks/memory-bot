import Docker from 'dockerode'
import { DeploymentProvider, DeploymentResult } from './provider'
import { prisma } from '@/lib/prisma'
import { allocatePort } from '@/lib/utils/port-allocator'
import {
  generateOpenClawConfig,
  buildEnvironmentVariables,
  UserConfiguration,
} from '@/lib/openclaw/config-builder'
import { InstanceStatus } from '@prisma/client'
import { randomUUID } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

const OPENCLAW_IMAGE = process.env.OPENCLAW_IMAGE || 'ghcr.io/placeparks/bot-saas/openclaw-wrapper:latest'
const DOCKER_NETWORK = process.env.DOCKER_NETWORK || 'openclaw-network'
const DATA_DIR = process.env.OPENCLAW_DATA_DIR || '/data/openclaw'

// Pairing server JS — same script used by Railway, but loaded from file on Docker
const PAIRING_SERVER_JS = `
const http = require('http');
const { spawnSync } = require('child_process');

function send(res, code, data) {
  const payload = JSON.stringify(data);
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(payload);
}

function extractQr(raw) {
  if (!raw) return null;
  const jsonMatch = raw.match(/"qr"\\s*:\\s*"([^"]+)"/i);
  if (jsonMatch && jsonMatch[1]) return jsonMatch[1];
  const lineMatch = raw.match(/\\bqr\\s*[:=]\\s*([A-Za-z0-9+/=_:-]+)/i);
  if (lineMatch && lineMatch[1]) return lineMatch[1];
  return null;
}

function hasAsciiQr(raw) {
  return typeof raw === 'string' && raw.includes('\\u2584\\u2584') && raw.includes('\\u2588');
}

function readBody(req, cb) {
  let buf = '';
  req.on('data', (c) => { buf += c; });
  req.on('end', () => {
    try { cb(null, buf ? JSON.parse(buf) : {}); }
    catch (e) { cb(e); }
  });
}

const handler = (req, res) => {
  console.log('[pairing-server]', req.method, req.url);

  if (req.method === 'GET' && req.url === '/health') {
    return send(res, 200, { status: 'ok' });
  }

  if (req.method === 'GET' && req.url && req.url.startsWith('/pairing/list/')) {
    const ch = req.url.split('/').pop();
    const r = spawnSync('openclaw', ['pairing', 'list', ch], { encoding: 'utf8', timeout: 10000 });
    return send(res, 200, { success: r.status === 0, raw: r.stdout || '', requests: [] });
  }

  if (req.method === 'POST' && req.url === '/pairing/approve') {
    return readBody(req, (err, body) => {
      if (err) return send(res, 400, { success: false, message: 'Invalid JSON' });
      const ch = body.channel || '';
      const code = body.code || '';
      if (!ch || !code) return send(res, 400, { success: false, message: 'Missing channel or code' });
      const r = spawnSync('openclaw', ['pairing', 'approve', ch, code], { encoding: 'utf8', timeout: 15000 });
      const ok = r.status === 0;
      return send(res, ok ? 200 : 500, {
        success: ok,
        output: r.stdout || '',
        message: ok ? 'Pairing approved successfully' : (r.stderr || 'Pairing failed')
      });
    });
  }

  if (req.method === 'POST' && req.url === '/whatsapp/qr') {
    const r = spawnSync('openclaw', ['channels', 'login'], { encoding: 'utf8', timeout: 20000 });
    const raw = [r.stdout || '', r.stderr || ''].join('\\n').trim();
    const qr = extractQr(raw);
    const ok = Boolean(qr) || hasAsciiQr(raw) || r.status === 0;
    return send(res, ok ? 200 : 500, { success: ok, qr, raw });
  }

  if (req.method === 'POST' && req.url === '/config/reload') {
    return readBody(req, (err, body) => {
      if (err) return send(res, 400, { success: false, message: 'Invalid JSON' });
      try {
        const configPath = process.env.OPENCLAW_CONFIG_PATH || '/tmp/.openclaw/openclaw.json';
        require('fs').writeFileSync(configPath, JSON.stringify(body.config, null, 2));
        send(res, 200, { success: true, message: 'Config written. Restart required.' });
      } catch (e) {
        send(res, 500, { success: false, message: e.message });
      }
    });
  }

  res.writeHead(404);
  res.end();
};

const server = http.createServer(handler);
const PORT = parseInt(process.env.PORT || '18800', 10);
server.listen(PORT, '0.0.0.0', () => {
  console.log('[pairing-server] listening on port', PORT);
});
if (PORT !== 18800) {
  const internal = http.createServer(handler);
  internal.listen(18800, '0.0.0.0', () => {
    console.log('[pairing-server] listening on port 18800');
  });
}
`.trim()

export class DockerProvider implements DeploymentProvider {
  private docker: Docker

  constructor() {
    const socketPath = process.env.DOCKER_SOCKET || '/var/run/docker.sock'
    const dockerHost = process.env.DOCKER_HOST_URL

    if (dockerHost) {
      // Remote Docker API (for when SaaS app runs on different machine)
      const url = new URL(dockerHost)
      this.docker = new Docker({
        host: url.hostname,
        port: parseInt(url.port || '2376'),
        protocol: url.protocol === 'https:' ? 'https' : 'http',
      })
    } else {
      // Local Docker socket
      this.docker = new Docker({ socketPath })
    }
  }

  /** Ensure the Docker network exists. */
  private async ensureNetwork(): Promise<void> {
    try {
      const network = this.docker.getNetwork(DOCKER_NETWORK)
      await network.inspect()
    } catch {
      await this.docker.createNetwork({ Name: DOCKER_NETWORK, Driver: 'bridge' })
      console.log(`[Docker] Created network: ${DOCKER_NETWORK}`)
    }
  }

  /** Ensure host directories exist for a user. */
  private ensureDirectories(userId: string): { configDir: string; dataDir: string } {
    const configDir = path.join(DATA_DIR, userId, 'config')
    const dataDir = path.join(DATA_DIR, userId, 'data')
    fs.mkdirSync(configDir, { recursive: true })
    fs.mkdirSync(dataDir, { recursive: true })
    return { configDir, dataDir }
  }

  /** Write OpenClaw config JSON to host filesystem. */
  private writeConfigFile(userId: string, config: object): string {
    const configDir = path.join(DATA_DIR, userId, 'config')
    fs.mkdirSync(configDir, { recursive: true })
    const configPath = path.join(configDir, 'openclaw.json')
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    return configPath
  }

  /** Write pairing server script to shared location. */
  private ensurePairingServer(): string {
    const sharedDir = path.join(DATA_DIR, 'shared')
    fs.mkdirSync(sharedDir, { recursive: true })
    const scriptPath = path.join(sharedDir, 'pairing-server.js')
    fs.writeFileSync(scriptPath, PAIRING_SERVER_JS)
    return scriptPath
  }

  async deploy(userId: string, config: UserConfiguration): Promise<DeploymentResult> {
    const containerName = `openclaw-${userId}`

    // Clean up existing
    const existing = await prisma.instance.findUnique({ where: { userId } })
    if (existing) {
      try {
        const container = this.docker.getContainer(existing.containerName)
        await container.stop({ t: 5 }).catch(() => {})
        await container.remove({ force: true }).catch(() => {})
        await prisma.instance.delete({ where: { id: existing.id } })
      } catch (err) {
        console.warn('Cleanup error (continuing):', err)
      }
    }

    // Also try to remove any orphaned container
    try {
      const orphan = this.docker.getContainer(containerName)
      await orphan.stop({ t: 5 }).catch(() => {})
      await orphan.remove({ force: true }).catch(() => {})
    } catch { /* no orphan */ }

    // Create placeholder DB record
    const port = await allocatePort()
    const instance = await prisma.instance.create({
      data: {
        userId,
        containerId: null,
        containerName,
        port,
        status: InstanceStatus.DEPLOYING,
      },
    })

    await this.logDeployment(instance.id, 'DEPLOY', 'IN_PROGRESS', 'Creating Docker container...')

    try {
      await this.ensureNetwork()
      const { configDir, dataDir } = this.ensureDirectories(userId)
      const pairingScriptPath = this.ensurePairingServer()

      // Build config
      const gatewayToken = randomUUID()
      const openclawConfig = generateOpenClawConfig({ ...config, gatewayToken })
      this.writeConfigFile(userId, openclawConfig)

      // Build env vars
      const envVars = buildEnvironmentVariables(config)
      envVars.PORT = '18800'
      envVars.OPENCLAW_GATEWAY_TOKEN = gatewayToken
      envVars.OPENCLAW_CONFIG_PATH = '/tmp/.openclaw/openclaw.json'

      const envArray = Object.entries(envVars).map(([k, v]) => `${k}=${v}`)

      // Start command: run pairing server + openclaw
      const startCmd = [
        '/bin/sh', '-c',
        'node /tmp/pairing-server.js & sleep 1 && exec openclaw --config /tmp/.openclaw/openclaw.json'
      ]

      // Create container
      const container = await this.docker.createContainer({
        Image: OPENCLAW_IMAGE,
        name: containerName,
        Env: envArray,
        Cmd: startCmd,
        ExposedPorts: {
          '18789/tcp': {},
          '18800/tcp': {},
        },
        HostConfig: {
          Binds: [
            `${path.join(configDir, 'openclaw.json')}:/tmp/.openclaw/openclaw.json:ro`,
            `${dataDir}:/home/node/.openclaw/data`,
            `${pairingScriptPath}:/tmp/pairing-server.js:ro`,
          ],
          NetworkMode: DOCKER_NETWORK,
          RestartPolicy: { Name: 'unless-stopped' },
          // Resource limits per container
          Memory: 512 * 1024 * 1024, // 512MB
          NanoCpus: 500000000,        // 0.5 CPU
        },
      })

      await container.start()

      const containerId = container.id
      const serviceUrl = `http://${containerName}:18789`

      await prisma.instance.update({
        where: { id: instance.id },
        data: {
          containerId,
          containerName,
          status: InstanceStatus.DEPLOYING,
          serviceUrl,
          accessUrl: null, // Docker containers don't auto-get public URLs
        },
      })

      await this.logDeployment(instance.id, 'DEPLOY', 'SUCCESS', 'Docker container started')

      return {
        instanceId: instance.id,
        containerId,
        containerName,
        port,
        accessUrl: '',
        status: 'DEPLOYING',
      }
    } catch (error: any) {
      await prisma.instance.update({
        where: { id: instance.id },
        data: { status: InstanceStatus.ERROR },
      })
      await this.logDeployment(instance.id, 'DEPLOY', 'FAILED', 'Deployment failed', error.message)
      throw new Error(`Docker deployment failed: ${error.message}`)
    }
  }

  async start(instanceId: string): Promise<void> {
    const instance = await this.requireInstance(instanceId)
    const container = this.docker.getContainer(instance.containerName)
    await container.start()
    await prisma.instance.update({ where: { id: instanceId }, data: { status: InstanceStatus.RUNNING } })
    await this.logDeployment(instanceId, 'START', 'SUCCESS', 'Instance started')
  }

  async stop(instanceId: string): Promise<void> {
    const instance = await this.requireInstance(instanceId)
    const container = this.docker.getContainer(instance.containerName)
    await container.stop({ t: 5 })
    await prisma.instance.update({ where: { id: instanceId }, data: { status: InstanceStatus.STOPPED } })
    await this.logDeployment(instanceId, 'STOP', 'SUCCESS', 'Instance stopped')
  }

  async restart(instanceId: string): Promise<void> {
    const instance = await this.requireInstance(instanceId)
    await prisma.instance.update({ where: { id: instanceId }, data: { status: InstanceStatus.RESTARTING } })
    const container = this.docker.getContainer(instance.containerName)
    await container.restart({ t: 5 })
    await prisma.instance.update({ where: { id: instanceId }, data: { status: InstanceStatus.RUNNING } })
    await this.logDeployment(instanceId, 'RESTART', 'SUCCESS', 'Instance restarted')
  }

  async destroy(instanceId: string): Promise<void> {
    const instance = await this.requireInstance(instanceId)
    const container = this.docker.getContainer(instance.containerName)
    await container.stop({ t: 5 }).catch(() => {})
    await container.remove({ force: true })

    // Clean up host files
    const userDir = path.join(DATA_DIR, instance.userId)
    fs.rmSync(userDir, { recursive: true, force: true })

    await prisma.instance.delete({ where: { id: instanceId } })
    await this.logDeployment(instanceId, 'DESTROY', 'SUCCESS', 'Instance destroyed')
  }

  async checkHealth(instanceId: string): Promise<boolean> {
    try {
      const instance = await this.requireInstance(instanceId)
      const container = this.docker.getContainer(instance.containerName)
      const info = await container.inspect()
      const isHealthy = info.State.Running === true

      await prisma.instance.update({
        where: { id: instanceId },
        data: {
          lastHealthCheck: new Date(),
          status: isHealthy ? InstanceStatus.RUNNING : InstanceStatus.ERROR,
        },
      })
      return isHealthy
    } catch {
      return false
    }
  }

  async getLogs(instanceId: string, tail = 100): Promise<string> {
    const instance = await this.requireInstance(instanceId)
    const container = this.docker.getContainer(instance.containerName)
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail,
      timestamps: true,
    })
    return logs.toString('utf-8')
  }

  async updateConfig(instanceId: string, config: UserConfiguration): Promise<void> {
    const instance = await this.requireInstance(instanceId)

    // Regenerate config and write to host filesystem
    const gatewayToken = config.gatewayToken || randomUUID()
    const openclawConfig = generateOpenClawConfig({ ...config, gatewayToken })
    this.writeConfigFile(instance.userId, openclawConfig)

    // Restart container to pick up new config (config is mounted as volume)
    const container = this.docker.getContainer(instance.containerName)
    await container.restart({ t: 5 })

    await prisma.instance.update({
      where: { id: instanceId },
      data: { status: InstanceStatus.RUNNING },
    })

    await this.logDeployment(instanceId, 'CONFIG_UPDATE', 'SUCCESS', 'Config updated and container restarted')
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
    const instance = await this.requireInstance(instanceId)

    // Update pairing server script
    this.ensurePairingServer()

    // Restart container to pick up the new script
    const container = this.docker.getContainer(instance.containerName)
    await container.restart({ t: 5 })

    await this.logDeployment(instanceId, 'REDEPLOY', 'SUCCESS', 'Container restarted with updated scripts')
  }

  private async requireInstance(instanceId: string) {
    const instance = await prisma.instance.findUnique({ where: { id: instanceId } })
    if (!instance) throw new Error('Instance not found')
    return instance
  }

  private async logDeployment(instanceId: string, action: string, status: string, message: string, error?: string) {
    await prisma.deploymentLog.create({ data: { instanceId, action, status, message, error } })
  }
}

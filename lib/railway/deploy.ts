import { RailwayClient } from './client'
import { prisma } from '@/lib/prisma'
import { allocatePort } from '@/lib/utils/port-allocator'
import {
  generateOpenClawConfig,
  buildEnvironmentVariables,
  UserConfiguration,
} from '@/lib/openclaw/config-builder'
import { InstanceStatus } from '@prisma/client'
import { randomUUID } from 'crypto'
import { getProviderEnvVar } from '@/lib/models'

// Use custom wrapper image with our entrypoint baked in
// Set OPENCLAW_IMAGE env var to override (format: ghcr.io/owner/repo/openclaw-wrapper:latest)
const OPENCLAW_IMAGE = process.env.OPENCLAW_IMAGE || 'ghcr.io/placeparks/bot-saas/openclaw-wrapper:latest'

// Minimal Node HTTP server that wraps `openclaw pairing` CLI commands.
// Runs on port 18800 inside the container alongside OpenClaw (port 18789).
const PAIRING_SERVER_JS = `
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const startedAt = Date.now();

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
  return typeof raw === 'string' && raw.includes('▄▄') && raw.includes('█');
}

function readBody(req, cb) {
  let buf = '';
  req.on('data', (c) => { buf += c; });
  req.on('end', () => {
    try { cb(null, buf ? JSON.parse(buf) : {}); }
    catch (e) { cb(e); }
  });
}

// Read OpenClaw log files and parse stats
function getStats() {
  // Search multiple possible log directories
  const logDirs = [
    '/tmp/openclaw',
    '/tmp/.openclaw',
    process.env.OPENCLAW_CONFIG_DIR ? process.env.OPENCLAW_CONFIG_DIR : null,
    process.env.HOME ? path.join(process.env.HOME, '.openclaw') : null,
    '/home/node/.openclaw',
  ].filter(Boolean);

  let messages = 0;
  let tokens = 0;
  const responseTimes = [];
  let totalLines = 0;
  let logFilesFound = [];

  try {
    // Collect all .log files from all candidate directories (including subdirs like /logs/)
    const allLogFiles = [];
    for (const dir of logDirs) {
      if (!fs.existsSync(dir)) continue;
      // Check dir itself for .log files
      try {
        const entries = fs.readdirSync(dir);
        for (const e of entries) {
          const full = path.join(dir, e);
          try {
            const st = fs.statSync(full);
            if (st.isFile() && e.endsWith('.log')) allLogFiles.push(full);
            if (st.isDirectory()) {
              // Check one level deeper (e.g. logs/ subdir)
              const sub = fs.readdirSync(full);
              for (const s of sub) {
                if (s.endsWith('.log')) allLogFiles.push(path.join(full, s));
              }
            }
          } catch (_) {}
        }
      } catch (_) {}
    }

    logFilesFound = allLogFiles;

    for (const file of allLogFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\\n');
      totalLines += lines.length;
      for (const line of lines) {
        // Count inbound messages (user sent to bot)
        if (/\\[(telegram|discord|whatsapp|slack|signal|matrix|gateway)\\].*(?:inbound|received|new message|handling|incoming|message from)/i.test(line)) {
          messages++;
        }
        // Count outbound replies
        else if (/\\[(telegram|discord|whatsapp|slack|signal|matrix|gateway)\\].*(?:sent|reply|respond|sending|outbound)/i.test(line)) {
          messages++;
        }
        // Count agent turns as messages
        else if (/\\[agent\\].*(?:turn|processing|completed|response|handling|responding)/i.test(line)) {
          messages++;
        }
        // Broad fallback: any line with "message" near a channel name
        else if (/(?:telegram|discord|whatsapp|slack).*message/i.test(line) || /message.*(?:telegram|discord|whatsapp|slack)/i.test(line)) {
          messages++;
        }
        // Extract token usage
        const tokenMatch = line.match(/(\\d[\\d,]*)\\s*tokens?/i);
        if (tokenMatch) {
          tokens += parseInt(tokenMatch[1].replace(/,/g, ''), 10) || 0;
        }
        // Extract response times
        const timeMatch = line.match(/(?:completed|response|latency|took)[^\\d]*(\\d+(?:\\.\\d+)?)\\s*ms/i);
        if (timeMatch) {
          responseTimes.push(parseFloat(timeMatch[1]));
        }
      }
    }
  } catch (e) {
    console.error('[pairing-server] stats error:', e.message);
  }

  // Calculate uptime
  const uptimeMs = Date.now() - startedAt;
  const mins = Math.floor(uptimeMs / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  let uptime = mins + 'm';
  if (days > 0) uptime = days + 'd ' + (hrs % 24) + 'h';
  else if (hrs > 0) uptime = hrs + 'h ' + (mins % 60) + 'm';

  // Avg response time
  let avgResponse = '--';
  if (responseTimes.length > 0) {
    const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    avgResponse = avg < 1000 ? Math.round(avg) + 'ms' : (avg / 1000).toFixed(1) + 's';
  }

  return {
    messagesProcessed: messages,
    uptime,
    avgResponseTime: avgResponse,
    tokensUsed: tokens,
    _debug: { logFiles: logFilesFound.length, totalLines, dirs: logDirs.filter(d => d && fs.existsSync(d)) }
  };
}

const handler = (req, res) => {
  console.log('[pairing-server]', req.method, req.url);

  if (req.method === 'GET' && req.url === '/health') {
    return send(res, 200, { status: 'ok' });
  }

  if (req.method === 'GET' && req.url === '/stats') {
    return send(res, 200, getStats());
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
      console.log('[pairing-server] approving', ch, code);
      const r = spawnSync('openclaw', ['pairing', 'approve', ch, code], { encoding: 'utf8', timeout: 15000 });
      const ok = r.status === 0;
      console.log('[pairing-server] result:', ok ? 'success' : 'failed', r.stdout, r.stderr);
      return send(res, ok ? 200 : 500, {
        success: ok,
        output: r.stdout || '',
        message: ok ? 'Pairing approved successfully' : (r.stderr || 'Pairing failed')
      });
    });
  }

  if (req.method === 'POST' && req.url === '/whatsapp/qr') {
    // Start WhatsApp login flow and return QR data if present.
    const r = spawnSync('openclaw', ['channels', 'login'], {
      encoding: 'utf8',
      timeout: 20000
    });
    const raw = [r.stdout || '', r.stderr || ''].join('\\n').trim();
    const qr = extractQr(raw);
    const ok = Boolean(qr) || hasAsciiQr(raw) || r.status === 0;
    return send(res, ok ? 200 : 500, {
      success: ok,
      qr,
      raw
    });
  }

  res.writeHead(404);
  res.end();
};

const server = http.createServer(handler);
const PORT = parseInt(process.env.PORT || '18800', 10);

// Primary listener (public PORT on Railway)
server.listen(PORT, '0.0.0.0', () => {
  console.log('[pairing-server] listening on port', PORT);
});

// Secondary listener for internal calls on 18800
if (PORT !== 18800) {
  const internal = http.createServer(handler);
  internal.listen(18800, '0.0.0.0', () => {
    console.log('[pairing-server] listening on port 18800');
  });
}
`.trim()

/** Base64-encoded pairing server script for embedding in container env vars. */
export const PAIRING_SCRIPT_B64 = Buffer.from(PAIRING_SERVER_JS).toString('base64')

/** Build a start script that runs both the pairing server and OpenClaw. */
export function buildStartScript(): string {
  const openclawCmd = process.env.OPENCLAW_CMD || 'openclaw'
  const configDir = '/tmp/.openclaw'

  const workspaceDir = `${configDir}/workspace`

  return [
    '#!/bin/sh',
    'set -e',
    `OPENCLAW_BIN="${openclawCmd}"`,
    'if [ ! -x "$OPENCLAW_BIN" ]; then OPENCLAW_BIN="$(command -v openclaw 2>/dev/null || true)"; fi',
    'if [ ! -x "$OPENCLAW_BIN" ]; then echo "OpenClaw binary not found (PATH=$PATH)"; exit 1; fi',
    `mkdir -p ${configDir}`,
    `mkdir -p ${workspaceDir}`,
    `printf '%s' "$OPENCLAW_CONFIG" > ${configDir}/openclaw.json`,
    // Write IDENTITY.md with agent name
    `if [ -n "$_AGENT_NAME" ]; then printf '# Identity\\n\\nname: %s\\n' "$_AGENT_NAME" > ${workspaceDir}/IDENTITY.md; echo "[STARTUP] Wrote IDENTITY.md: $_AGENT_NAME"; fi`,
    // Write SOUL.md from agent name + system prompt env vars
    'SOUL=""',
    'if [ -n "$_AGENT_NAME" ]; then SOUL="# $_AGENT_NAME\\n\\n"; fi',
    'if [ -n "$_SYSTEM_PROMPT" ]; then SOUL="${SOUL}$_SYSTEM_PROMPT"; fi',
    `if [ -n "$SOUL" ]; then printf '%b' "$SOUL" > ${workspaceDir}/SOUL.md; echo "[STARTUP] Wrote SOUL.md"; fi`,
    `printf '%s' "$_PAIRING_SCRIPT_B64" | base64 -d > /tmp/pairing-server.js`,
    'node /tmp/pairing-server.js &',
    'sleep 1',
    `exec "$OPENCLAW_BIN" --config ${configDir}/openclaw.json`,
  ].join('\n')
}

/**
 * Railway image deployments run start commands in exec form. Wrap in a shell so
 * env vars like $OPENCLAW_CONFIG expand at runtime.
 */
export function buildRailwayStartCommand(): string {
  const scriptB64 = Buffer.from(buildStartScript()).toString('base64')
  return `/bin/sh -c "printf '%s' '${scriptB64}' | base64 -d > /tmp/openclaw-start.sh && /bin/sh /tmp/openclaw-start.sh"`
}

const POLL_INTERVAL_MS = 3000
const DEPLOY_TIMEOUT_MS = 120_000 // 2 minutes
const RAILWAY_COOLDOWN_MAX_MS = 180_000 // 3 minutes
const RAILWAY_COOLDOWN_BASE_DELAY_MS = 5000

interface DeploymentResult {
  instanceId: string
  containerId: string   // Railway service ID
  containerName: string
  port: number          // Unique DB value; not an actual network port
  accessUrl: string     // Railway-assigned public URL
  status: string
}

export async function deployInstance(
  userId: string,
  config: UserConfiguration
): Promise<DeploymentResult> {
  const railway = new RailwayClient()
  const serviceName = `openclaw-${userId}`

  // --- Clean up any pre-existing instance ---
  const existing = await prisma.instance.findUnique({ where: { userId } })
  if (existing) {
    console.log(`⚠️  Cleaning up existing DB instance for user ${userId}...`)
    try {
      if (existing.containerId) {
        await railway.deleteService(existing.containerId)
      }
      await prisma.instance.delete({ where: { id: existing.id } })
      console.log('✅ DB instance cleaned up')
    } catch (err) {
      console.warn('⚠️  DB cleanup error (continuing):', err)
    }
  }

  // --- Also clean up orphaned Railway service by name (in case previous deploy failed mid-way) ---
  try {
    const orphanedServiceId = await railway.findServiceByName(serviceName)
    if (orphanedServiceId) {
      console.log(`⚠️  Found orphaned Railway service ${serviceName}, deleting...`)
      await railway.deleteService(orphanedServiceId)
      console.log('✅ Orphaned service deleted')
    }
  } catch (err) {
    console.warn('⚠️  Orphan cleanup error (continuing):', err)
  }

  // --- Create placeholder DB record ---
  const port = await allocatePort()
  const instance = await prisma.instance.create({
    data: {
      userId,
      containerId: null,  // filled in after Railway service is created
      containerName: serviceName,
      port,
      status: InstanceStatus.DEPLOYING,
    },
  })

  await logDeployment(instance.id, 'DEPLOY', 'IN_PROGRESS', 'Creating Railway service...')

  try {
  // --- Build env vars for the OpenClaw container ---
  const envVars = buildEnvironmentVariables(config)
  // Force Railway public port to the pairing server (18800) for WhatsApp QR + pairing endpoints.
  envVars.PORT = '18800'
  // Gateway token required by OpenClaw (generate a random one per instance)
  const gatewayToken = randomUUID()
  envVars.OPENCLAW_GATEWAY_TOKEN = gatewayToken
  // Generate config with the gateway token embedded
  const openclawConfig = generateOpenClawConfig({ ...config, gatewayToken } as UserConfiguration)
  // Serialized config; the start command writes it to the expected file path
  envVars.OPENCLAW_CONFIG = JSON.stringify(openclawConfig)
  // Pairing server script — decoded + launched by the start command
  envVars._PAIRING_SCRIPT_B64 = PAIRING_SCRIPT_B64
  validateOpenClawEnv(config, envVars)

    // --- Create Railway service (image + env vars, auto-deploys) ---
    const { id: serviceId } = await railway.createService(
      serviceName,
      OPENCLAW_IMAGE,
      envVars
    )


    // Persist the Railway service ID immediately
    try {
      await prisma.instance.update({
        where: { id: instance.id },
        data: { containerId: serviceId },
      })
    } catch (err) {
      console.warn('⚠️  Failed to persist containerId (will retry later):', err)
    }

    console.log('[Railway] ✅ Service created with custom OpenClaw wrapper image')

    // Create a public domain for the service (best-effort)
    let publicDomain: string | null = null
    try {
      publicDomain = await railway.createServiceDomain(serviceId)
      if (publicDomain) {
        const accessUrl = `https://${publicDomain}`
        await prisma.instance.update({
          where: { id: instance.id },
          data: { accessUrl },
        })
      }
    } catch (err) {
      console.warn('âš ï¸  Failed to create public domain (continuing):', err)
    }

    // Railway private networking uses plain HTTP (no TLS)
    const serviceUrl = `http://${serviceName}.railway.internal:18789`

    await prisma.instance.update({
      where: { id: instance.id },
      data: {
        status: InstanceStatus.DEPLOYING,
        accessUrl: publicDomain ? `https://${publicDomain}` : null,
        serviceUrl,
        containerId: serviceId
      },
    })

    await logDeployment(instance.id, 'DEPLOY', 'QUEUED', 'Deployment queued (Railway-managed)')

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

    await logDeployment(instance.id, 'DEPLOY', 'FAILED', 'Deployment failed', error.message)
    throw new Error(`Deployment failed: ${error.message}`)
  }
}

function validateOpenClawEnv(
  config: UserConfiguration,
  envVars: Record<string, string>
) {
  const errors: string[] = []

  if (!envVars.OPENCLAW_CONFIG || envVars.OPENCLAW_CONFIG.length < 10) {
    errors.push('OPENCLAW_CONFIG is missing or too small')
  }

  // Check that the provider's API key env var is set
  const expectedEnvVar = getProviderEnvVar(config.provider)
  if (!envVars[expectedEnvVar]) {
    errors.push(`${expectedEnvVar} is missing for provider ${config.provider}`)
  }

  const hasTelegram = config.channels.some(c => c.type === 'TELEGRAM' && c.config.botToken)
  if (hasTelegram && !envVars.TELEGRAM_BOT_TOKEN) {
    errors.push('TELEGRAM_BOT_TOKEN is missing')
  }

  const hasDiscord = config.channels.some(c => c.type === 'DISCORD' && c.config.token)
  if (hasDiscord && !envVars.DISCORD_APPLICATION_ID) {
    errors.push('DISCORD_APPLICATION_ID is missing')
  }

  if (errors.length) {
    throw new Error(`[Deploy] Invalid config/env: ${errors.join('; ')}`)
  }
}

async function retryRailwayCooldown<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  const startedAt = Date.now()
  let attempt = 0

  while (true) {
    try {
      return await fn()
    } catch (error: any) {
      const message = String(error?.message || '').toLowerCase()
      const isCooldown =
        message.includes('too recently updated') ||
        message.includes('rate limit') ||
        message.includes('rate limited')

      const is400Error =
        message.includes('http 400') ||
        message.includes('problem processing request')

      // If it's a 400 error, retry a few times with delays
      if (is400Error && attempt < 3) {
        attempt += 1
        const delay = 2000 * attempt
        console.warn(
          `[Railway] ${label} got 400 error; retry ${attempt}/3 in ${delay}ms`
        )
        await sleep(delay)
        continue
      }

      if (!isCooldown && !is400Error) throw error

      const elapsed = Date.now() - startedAt
      if (elapsed >= RAILWAY_COOLDOWN_MAX_MS) {
        throw new Error(`[Railway] ${label} blocked by cooldown/errors for >3 minutes`)
      }

      attempt += 1
      const delay = Math.min(
        RAILWAY_COOLDOWN_BASE_DELAY_MS * attempt,
        20_000
      )
      console.warn(
        `[Railway] ${label} blocked by cooldown; retry ${attempt} in ${delay}ms`
      )
      await sleep(delay)
    }
  }
}

/**
 * Poll Railway until the latest deployment reaches a terminal state.
 * Returns the public URL on SUCCESS.
 */
async function waitForDeployment(
  railway: RailwayClient,
  serviceId: string
): Promise<string> {
  const deadline = Date.now() + DEPLOY_TIMEOUT_MS

  while (Date.now() < deadline) {
    const deployment = await railway.getLatestDeployment(serviceId)

    if (!deployment) {
      await sleep(POLL_INTERVAL_MS)
      continue
    }

    console.log(`  [Railway] deployment ${deployment.id} → ${deployment.status}`)

    switch (deployment.status) {
      case 'SUCCESS':
        return deployment.url || ''

      case 'FAILED':
      case 'CRASHED': {
        let logSnippet = ''
        try {
          const logs = await railway.getLogs(deployment.id, 30)
          logSnippet = logs.map(l => `[${l.severity}] ${l.message}`).join('\n')
        } catch { /* best-effort */ }
        throw new Error(`Railway deployment ${deployment.status}.\n${logSnippet}`)
      }
    }

    // BUILDING / DEPLOYING / other transient states — keep polling
    await sleep(POLL_INTERVAL_MS)
  }

  throw new Error('Deployment timed out (2 min)')
}

async function ensureContainerId(
  railway: RailwayClient,
  instance: { id: string; containerId: string | null; containerName: string | null }
): Promise<string> {
  if (instance.containerId) return instance.containerId
  if (!instance.containerName) throw new Error('Instance has no container name')

  const found = await railway.findServiceByName(instance.containerName)
  if (!found) throw new Error('Railway service not found for instance')

  await prisma.instance.update({
    where: { id: instance.id },
    data: { containerId: found },
  })

  return found
}

export async function stopInstance(instanceId: string): Promise<void> {
  const instance = await prisma.instance.findUnique({ where: { id: instanceId } })
  if (!instance) throw new Error('Instance not found')

  const railway = new RailwayClient()
  const containerId = await ensureContainerId(railway, instance)
  const deployment = await railway.getLatestDeployment(containerId)
  if (!deployment) throw new Error('No active deployment found')

  await railway.removeDeployment(deployment.id)

  await prisma.instance.update({
    where: { id: instanceId },
    data: { status: InstanceStatus.STOPPED },
  })

  await logDeployment(instanceId, 'STOP', 'SUCCESS', 'Instance stopped')
}

export async function startInstance(instanceId: string): Promise<void> {
  const instance = await prisma.instance.findUnique({ where: { id: instanceId } })
  if (!instance) throw new Error('Instance not found')

  const railway = new RailwayClient()
  const containerId = await ensureContainerId(railway, instance)
  await railway.redeployService(containerId)

  await prisma.instance.update({
    where: { id: instanceId },
    data: { status: InstanceStatus.RUNNING },
  })

  await logDeployment(instanceId, 'START', 'SUCCESS', 'Instance started')
}

export async function restartInstance(instanceId: string): Promise<void> {
  const instance = await prisma.instance.findUnique({ where: { id: instanceId } })
  if (!instance) throw new Error('Instance not found')

  await prisma.instance.update({
    where: { id: instanceId },
    data: { status: InstanceStatus.RESTARTING },
  })

  const railway = new RailwayClient()
  const containerId = await ensureContainerId(railway, instance)
  const deployment = await railway.getLatestDeployment(containerId)

  if (deployment && deployment.status === 'SUCCESS') {
    await railway.restartDeployment(deployment.id)
  } else {
    await railway.redeployService(containerId)
  }

  await prisma.instance.update({
    where: { id: instanceId },
    data: { status: InstanceStatus.RUNNING },
  })

  await logDeployment(instanceId, 'RESTART', 'SUCCESS', 'Instance restarted')
}

export async function getInstanceLogs(instanceId: string, tail = 100): Promise<string> {
  const instance = await prisma.instance.findUnique({ where: { id: instanceId } })
  if (!instance) throw new Error('Instance not found')

  const railway = new RailwayClient()
  const containerId = await ensureContainerId(railway, instance)
  const deployment = await railway.getLatestDeployment(containerId)
  if (!deployment) return 'No deployments found.'

  const logs = await railway.getLogs(deployment.id, tail)
  return logs.map(l => `[${l.timestamp}] [${l.severity}] ${l.message}`).join('\n')
}

export async function checkInstanceHealth(instanceId: string): Promise<boolean> {
  try {
    const instance = await prisma.instance.findUnique({ where: { id: instanceId } })
    if (!instance) return false

    const railway = new RailwayClient()
    const containerId = await ensureContainerId(railway, instance)
    const deployment = await railway.getLatestDeployment(containerId)

    const deployStatus = deployment?.status?.toUpperCase() || ''
    const isHealthy = deployStatus === 'SUCCESS'
    const isTransient = ['BUILDING', 'DEPLOYING', 'INITIALIZING', 'WAITING', 'REMOVING'].includes(deployStatus)

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

async function logDeployment(
  instanceId: string,
  action: string,
  status: string,
  message: string,
  error?: string
): Promise<void> {
  await prisma.deploymentLog.create({
    data: { instanceId, action, status, message, error },
  })
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

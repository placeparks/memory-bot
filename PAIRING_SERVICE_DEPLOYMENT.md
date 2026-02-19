# Deploying the Pairing Microservice

This guide shows how to deploy the pairing microservice to Railway for one-click Telegram pairing.

## Why This Microservice?

Railway's API doesn't support executing commands inside containers. This microservice uses the Railway CLI to execute `openclaw pairing approve` commands on behalf of your SaaS app.

## Prerequisites

- Railway account with CLI access
- Your Railway project already set up with the main Next.js app

## Deployment Steps

### 1. Create New Service in Railway

1. Go to your Railway project dashboard
2. Click **"New"** → **"Empty Service"**
3. Name it `pairing-service`

### 2. Connect to GitHub

1. Click **"Settings"** in the new service
2. Under **"Source"**, click **"Connect Repo"**
3. Select your repository
4. Set **Root Directory**: `pairing-service`
5. Set **Dockerfile Path**: `pairing-service/Dockerfile`

### 3. Set Environment Variables

In the pairing-service settings, add these variables:

**Required:**
```bash
PAIRING_SERVICE_API_KEY=58811957fccb28b6ec37610043ced87c6a296aa0f038769c299e94985cedad29
RAILWAY_TOKEN=dcc32d8d-27ac-4470-b205-743160424bf7

# IMPORTANT: These must point to your MAIN project (where OpenClaw instances are)
# NOT the pairing service's own project
TARGET_RAILWAY_PROJECT_ID=a2f328b8-a687-49bf-be4a-c09e02477eaa
TARGET_RAILWAY_ENVIRONMENT_ID=f0f0334d-bd86-415f-a14d-40668873c6cb
```

**Critical:** The `TARGET_*` variables must point to your **main SaaS project** where OpenClaw instances are deployed, not the pairing service's own project.

**Auto-provided by Railway:**
- `PORT` (don't set manually)

**How to generate `PAIRING_SERVICE_API_KEY`:**
```bash
# Linux/Mac
openssl rand -hex 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**How to get `RAILWAY_TOKEN`:**
1. Railway Dashboard → Account Settings → Tokens
2. Create new token → Copy it
3. Use the SAME token you use in your main Next.js app

**How to get `TARGET_RAILWAY_PROJECT_ID` and `TARGET_RAILWAY_ENVIRONMENT_ID`:**
These are the values from your **main SaaS project** (where OpenClaw instances deploy):
1. Go to your main project in Railway
2. Open any service → Settings → Variables
3. Copy the values of `RAILWAY_PROJECT_ID` and `RAILWAY_ENVIRONMENT_ID`
4. Use them as `TARGET_RAILWAY_PROJECT_ID` and `TARGET_RAILWAY_ENVIRONMENT_ID` in the pairing service

### 4. Update Main App Environment Variables

In your **main Next.js service**, add these variables:

```bash
PAIRING_SERVICE_URL=https://pairing-service.railway.app
PAIRING_SERVICE_API_KEY=<same-key-as-above>
```

Replace `pairing-service.railway.app` with your actual Railway-assigned domain for the pairing service.

### 5. Deploy

Railway will automatically deploy when you push to GitHub. You can also manually trigger deployment:

1. Go to the pairing-service in Railway
2. Click **"Deployments"**
3. Click **"Deploy"**

### 6. Verify Deployment

Check the logs:

```
[Pairing Service] Listening on port 3001
[Pairing Service] Railway project: a2f328b8-...
[Pairing Service] Environment: f0f0334d-...
```

Test the health endpoint:
```bash
curl https://your-pairing-service.railway.app/health
# Should return: {"status":"ok","service":"openclaw-pairing-service"}
```

## Testing

1. Deploy an OpenClaw instance via your SaaS app
2. Start a Telegram conversation with the bot
3. Get a pairing code from the bot
4. In your SaaS UI, enter the code and click "Pair Now"
5. Check the pairing service logs in Railway

**Success logs:**
```
[Pairing] Approving telegram pairing for service fc62de36-... with code LZELXUXT
[Pairing] Executing: railway run --project ... --service ... -- openclaw pairing approve telegram LZELXUXT
[Pairing] stdout: Approved telegram sender ...
```

## Troubleshooting

### "Railway CLI not available"

The Dockerfile should install Railway CLI automatically. If you see this error:
1. Check the Dockerfile includes: `RUN npm install -g @railway/cli`
2. Rebuild the service
3. Check deployment logs for installation errors

### "Unauthorized" 401 Error

The API keys don't match. Verify:
1. `PAIRING_SERVICE_API_KEY` is the same in both services
2. Next.js app is sending `Authorization: Bearer <key>` header

### Timeout Errors

The Railway CLI command takes 10-20 seconds. If timeouts occur:
1. Increase timeout in `server.js` (currently 20000ms)
2. Check if the target OpenClaw service is running
3. Verify Railway credentials are correct

### Command Not Found

Check that:
1. `RAILWAY_TOKEN` is set and valid
2. `RAILWAY_PROJECT_ID` and `RAILWAY_ENVIRONMENT_ID` are auto-set by Railway
3. The Railway CLI is installed (check deployment logs)

## Cost

The pairing service is tiny and runs continuously:
- **Memory**: ~50MB
- **CPU**: Minimal (only active during pairing)
- **Railway cost**: ~$1-2/month on hobby plan

## Security

- API key authentication required for all endpoints (except `/health`)
- Railway token stored securely as environment variable
- Service can only execute pairing commands (no arbitrary commands)
- Input validation on all parameters

## Updating

When you update `server.js`:
1. Commit and push to GitHub
2. Railway auto-deploys
3. No downtime (Railway uses rolling deploys)

## Alternative: Manual Pairing

If you don't want to deploy the microservice, the app falls back to showing manual CLI instructions. Users copy-paste the command into Railway Terminal. This works but isn't "one-click".

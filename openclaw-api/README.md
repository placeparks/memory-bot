# OpenClaw Pairing API

This adds an HTTP API to OpenClaw containers for automated pairing approval.

## 🎯 What This Solves

**Problem:** Users can't approve Telegram pairing without manually accessing Railway terminal

**Solution:** HTTP API wrapper that runs inside OpenClaw container, callable from your SaaS backend

## 🏗️ Architecture

```
User clicks "Approve" in UI
       ↓
Next.js API (/api/instance/pair)
       ↓
HTTP call to OpenClaw Container (port 18800)
       ↓
pairing-server.js executes: openclaw pairing approve
       ↓
✅ Pairing approved!
```

## 📦 Files

- **`pairing-server.js`** - Express server that wraps OpenClaw CLI
- **`Dockerfile.openclaw`** - Modified OpenClaw image with API server
- **`README.md`** - This file

## 🚀 Setup Instructions

### Step 1: Build Custom OpenClaw Image

```bash
cd openclaw-api
docker build -f Dockerfile.openclaw -t your-registry/openclaw-with-api:latest .
docker push your-registry/openclaw-with-api:latest
```

### Step 2: Update Railway Deployment

In your OpenClaw service on Railway:
1. Change image to: `your-registry/openclaw-with-api:latest`
2. Expose port **18800** (in addition to 18789)
3. Redeploy

### Step 3: Update Database Schema

Add `serviceUrl` field to your instance model if not already present.

### Step 4: Store Service URL

When creating instances, store the service URL:
```typescript
const instance = await prisma.instance.create({
  data: {
    // ...
    serviceUrl: `http://openclaw-service.railway.internal:18789`
  }
})
```

## 🔌 API Endpoints

### List Pending Requests
```
GET /pairing/list/:channel
```

Response:
```json
{
  "success": true,
  "channel": "telegram",
  "requests": [
    {
      "code": "ABC123",
      "userId": "123456789",
      "expires": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### Approve Pairing
```
POST /pairing/approve
Content-Type: application/json

{
  "channel": "telegram",
  "code": "ABC123"
}
```

Response:
```json
{
  "success": true,
  "message": "Pairing approved successfully",
  "output": "✓ Approved user 123456789"
}
```

### Health Check
```
GET /health
```

Response:
```json
{
  "status": "ok",
  "service": "openclaw-pairing-api"
}
```

## 🎨 User Experience

### Before (Bad UX):
1. User messages bot
2. Admin manually SSHs into Railway
3. Admin runs `openclaw pairing approve telegram CODE`
4. User can chat

### After (Good UX):
1. User messages bot
2. User clicks "Approve" in dashboard
3. ✅ Done! User can chat

## 🔧 Environment Variables

None needed! The API runs inside the container with OpenClaw.

## 🐛 Troubleshooting

### API not accessible
- Check port 18800 is exposed in Railway
- Verify the custom image is deployed
- Check logs: `railway logs`

### "Command not found: openclaw"
- Ensure OpenClaw is in PATH inside container
- Check the Dockerfile builds correctly

### Permission denied
- The API runs as the same user as OpenClaw
- Should have access to all OpenClaw commands

## 🔐 Security Notes

- The API has NO authentication - it's internal only
- Only expose it to your private network (Railway internal)
- Don't expose port 18800 publicly
- Use Railway's private networking

## 📊 Alternative: Simpler CLI Display

If you don't want to build custom images, you can still show CLI commands in the UI and have users run them in Railway's web terminal. The current implementation falls back to this if the API is unavailable.

## 🎓 Why This Approach?

✅ **Automated** - One-click approval for users
✅ **No SSH needed** - Simple HTTP calls
✅ **No Railway CLI** - No complex setup
✅ **Fallback** - Shows CLI command if API fails
✅ **Secure** - Internal-only API
✅ **Simple** - Just runs OpenClaw CLI internally

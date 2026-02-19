# Kainat - OpenClaw SaaS Platform

## 🎯 Project Overview

**Kainat** is a SaaS platform that allows users to deploy their own personal OpenClaw (AI assistant) instances with a simple one-click deployment. Users select a subscription plan, configure their bot through a beautiful UI, and get instant access to their AI assistant on their preferred messaging platforms (WhatsApp, Telegram, Discord, Slack, Signal, etc.).

### What We're Building

- **Beautiful subscription UI** with 3 pricing tiers (Monthly, 3-Month, Yearly)
- **One-click deployment system** - Users configure everything through our UI
- **Automated Docker deployment** - Each user gets their isolated OpenClaw instance
- **Multi-channel support** - WhatsApp, Telegram, Discord, Slack, Signal, and more
- **User dashboard** - Manage instance, view stats, update configuration
- **Stripe payment integration** - Secure subscription management

### User Flow

1. Visit website → Choose subscription plan
2. Enter AI provider credentials (Anthropic/OpenAI API key)
3. Select and configure messaging channels
4. Optionally enable skills and advanced features
5. Complete Stripe payment
6. **Bot deployed instantly!** → Access it on chosen platforms

---

## 🏗️ Architecture

### Tech Stack

**Frontend & Backend:**
- **Next.js 14+** (App Router) - Full-stack framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **React Hook Form** - Form management
- **Zod** - Validation

**Database:**
- **PostgreSQL** - Primary database
- **Prisma ORM** - Database management

**Payment:**
- **Stripe** - Subscription & payment processing

**Deployment:**
- **Docker** - Container orchestration for OpenClaw instances
- **Docker Compose** - Multi-container management

**Infrastructure:**
- **VPS/Cloud Server** - Host for all user instances
- **Nginx** - Reverse proxy (optional, for web UI access)

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js SaaS App                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Frontend   │  │  API Routes  │  │   PostgreSQL     │  │
│  │   (React)    │◄─┤  (Backend)   │◄─┤   (Prisma)       │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│         │                 │                                  │
│         │                 ├──────► Stripe API               │
│         │                 │                                  │
│         │                 ▼                                  │
│         │          Docker Engine                            │
│         │          ┌────────────────────────────┐           │
│         │          │  OpenClaw Instance #1      │           │
│         │          │  (User A's Bot)            │           │
│         │          └────────────────────────────┘           │
│         │          ┌────────────────────────────┐           │
│         └─────────►│  OpenClaw Instance #2      │           │
│                    │  (User B's Bot)            │           │
│                    └────────────────────────────┘           │
│                    ┌────────────────────────────┐           │
│                    │  OpenClaw Instance #N      │           │
│                    │  (User N's Bot)            │           │
│                    └────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Configuration Collection

### Required Configurations (Step-by-Step in UI)

#### Step 1: Subscription Plan
- **Monthly**: $29/month
- **3 Months**: $75 (save 13%)
- **Yearly**: $299 (save 14%)

#### Step 2: AI Provider Configuration

**Provider Selection:**
- ○ Anthropic Claude (Recommended - Better reasoning & context)
- ○ OpenAI GPT

**API Key:**
- Input field for API key
- Link to "How to get API key" guide
- Validation: Test key before proceeding

**Model Selection (Optional - we can set defaults):**
- Anthropic: `claude-opus-4-5` (default), `claude-sonnet-4-5`
- OpenAI: `gpt-5.2` (default), `gpt-5.2-mini`

#### Step 3: Channel Selection & Configuration

**Available Channels:**

1. **WhatsApp** (via Baileys - No API needed!)
   - ✓ Select checkbox
   - User will scan QR code after deployment
   - Allowlist (optional): Phone numbers that can interact with bot

2. **Telegram**
   - ✓ Select checkbox
   - Required: Bot Token (from @BotFather)
   - Link: [Create Telegram Bot →](https://t.me/botfather)
   - Allowlist (optional): Usernames/chat IDs

3. **Discord**
   - ✓ Select checkbox
   - Required: Bot Token
   - Required: Application ID
   - Link: [Discord Developer Portal →](https://discord.com/developers/applications)
   - Server/Guild IDs (optional)

4. **Slack**
   - ✓ Select checkbox
   - Required: Bot OAuth Token
   - Required: App Token
   - Link: [Slack API →](https://api.slack.com/apps)

5. **Signal**
   - ✓ Select checkbox
   - Requires phone number
   - Will be configured via signal-cli after deployment

6. **Google Chat**
   - ✓ Select checkbox
   - Required: Service Account JSON
   - Link: [Google Cloud Console →](https://console.cloud.google.com)

7. **iMessage** (macOS only)
   - ✓ Select checkbox
   - Requires macOS host with iMessage configured

8. **Matrix**
   - ✓ Select checkbox
   - Required: Homeserver URL
   - Required: Access Token

#### Step 4: Skills & Extensions (Optional)

**Bundled Skills:**
- ○ Enable web search (requires Brave API key)
- ○ Enable browser automation
- ○ Enable voice/TTS (ElevenLabs - requires API key)
- ○ Enable canvas (visual workspace)
- ○ Enable cron jobs
- ○ Enable memory/RAG

**Extensions:**
- Available plugins list with descriptions
- Enable/disable toggles

#### Step 5: Advanced Configuration (Optional - Collapsible)

**Agent Settings:**
- Workspace path (default: `~/.openclaw/workspace`)
- Agent identity/name (default: "Clawd")
- System prompt customization
- Thinking mode (high/low/off)

**Session Settings:**
- Session mode: per-sender (default) / shared / group-isolated
- Max context length
- Message prefixes/formatting

**Security Settings:**
- DM policy: pairing (default - requires approval) / open / closed
- Allowlist management
- Group chat settings

**Tools & Permissions:**
- File system access
- Command execution
- Web tools
- Elevated permissions

---

## 🗄️ Database Schema

### Prisma Schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String         @id @default(cuid())
  email         String         @unique
  name          String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  subscription  Subscription?
  instance      Instance?

  @@map("users")
}

model Subscription {
  id                    String   @id @default(cuid())
  userId                String   @unique
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  stripeCustomerId      String   @unique
  stripeSubscriptionId  String   @unique
  stripePriceId         String
  stripeCurrentPeriodEnd DateTime

  plan                  Plan     // MONTHLY, THREE_MONTH, YEARLY
  status                SubscriptionStatus // ACTIVE, CANCELED, PAST_DUE, etc.

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@map("subscriptions")
}

enum Plan {
  MONTHLY
  THREE_MONTH
  YEARLY
}

enum SubscriptionStatus {
  ACTIVE
  CANCELED
  PAST_DUE
  INCOMPLETE
  TRIALING
  UNPAID
}

model Instance {
  id            String          @id @default(cuid())
  userId        String          @unique
  user          User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  containerId   String          @unique
  containerName String          @unique
  port          Int             @unique
  status        InstanceStatus  // DEPLOYING, RUNNING, STOPPED, ERROR

  accessUrl     String?
  qrCode        String?         // For WhatsApp QR

  config        Configuration?

  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  lastHealthCheck DateTime?

  @@map("instances")
}

enum InstanceStatus {
  DEPLOYING
  RUNNING
  STOPPED
  ERROR
  RESTARTING
}

model Configuration {
  id          String   @id @default(cuid())
  instanceId  String   @unique
  instance    Instance @relation(fields: [instanceId], references: [id], onDelete: Cascade)

  // AI Provider
  provider    AIProvider // ANTHROPIC, OPENAI
  apiKey      String     @db.Text // Encrypted
  model       String

  // Channels
  channels    Channel[]

  // Skills & Extensions
  webSearchEnabled    Boolean @default(false)
  braveApiKey         String?
  browserEnabled      Boolean @default(false)
  ttsEnabled          Boolean @default(false)
  elevenlabsApiKey    String?
  canvasEnabled       Boolean @default(false)
  cronEnabled         Boolean @default(false)
  memoryEnabled       Boolean @default(false)

  // Advanced Settings
  workspace           String?
  agentName           String?
  systemPrompt        String? @db.Text
  thinkingMode        String  @default("high")
  sessionMode         String  @default("per-sender")
  dmPolicy            String  @default("pairing")

  // Full OpenClaw config JSON
  fullConfig          Json

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("configurations")
}

enum AIProvider {
  ANTHROPIC
  OPENAI
}

model Channel {
  id              String        @id @default(cuid())
  configId        String
  configuration   Configuration @relation(fields: [configId], references: [id], onDelete: Cascade)

  type            ChannelType   // WHATSAPP, TELEGRAM, DISCORD, etc.
  enabled         Boolean       @default(true)

  // Channel-specific config (JSON)
  config          Json

  // Access info
  botUsername     String?       // For Telegram, Discord
  phoneNumber     String?       // For WhatsApp, Signal
  inviteLink      String?

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@map("channels")
}

enum ChannelType {
  WHATSAPP
  TELEGRAM
  DISCORD
  SLACK
  SIGNAL
  GOOGLE_CHAT
  IMESSAGE
  MATRIX
  MSTEAMS
}

model DeploymentLog {
  id          String   @id @default(cuid())
  instanceId  String
  action      String   // DEPLOY, START, STOP, RESTART, UPDATE
  status      String   // SUCCESS, FAILED, IN_PROGRESS
  message     String?  @db.Text
  error       String?  @db.Text

  createdAt   DateTime @default(now())

  @@map("deployment_logs")
}
```

---

## 📁 Project Structure

```
kainat-saas/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── instance/
│   │   └── settings/
│   ├── (marketing)/
│   │   ├── page.tsx              # Landing page
│   │   ├── pricing/
│   │   └── features/
│   ├── api/
│   │   ├── auth/
│   │   ├── stripe/
│   │   │   ├── checkout/
│   │   │   └── webhook/
│   │   ├── instance/
│   │   │   ├── deploy/
│   │   │   ├── status/
│   │   │   ├── start/
│   │   │   ├── stop/
│   │   │   └── restart/
│   │   └── config/
│   │       ├── validate/
│   │       └── update/
│   ├── onboard/                   # Multi-step configuration
│   │   ├── step-1-plan/
│   │   ├── step-2-provider/
│   │   ├── step-3-channels/
│   │   ├── step-4-skills/
│   │   └── step-5-checkout/
│   └── layout.tsx
├── components/
│   ├── ui/                        # shadcn components
│   ├── forms/
│   │   ├── provider-config.tsx
│   │   ├── channel-selector.tsx
│   │   └── skills-config.tsx
│   ├── dashboard/
│   │   ├── instance-status.tsx
│   │   ├── usage-stats.tsx
│   │   └── channel-access.tsx
│   └── pricing/
│       └── pricing-cards.tsx
├── lib/
│   ├── prisma.ts
│   ├── stripe.ts
│   ├── docker/
│   │   ├── deploy.ts
│   │   ├── config-generator.ts
│   │   └── container-manager.ts
│   ├── openclaw/
│   │   ├── config-builder.ts
│   │   └── config-validator.ts
│   └── utils/
│       ├── encryption.ts
│       └── port-allocator.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
├── scripts/
│   └── setup-docker.sh
├── .env.example
├── docker-compose.template.yml    # Template for user instances
├── kainat.md                      # This file!
├── package.json
└── tsconfig.json
```

---

## 🔧 Environment Variables

Create `.env` file in the root:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/kainat"

# Next Auth (or your auth provider)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Stripe Product IDs (create in Stripe dashboard)
STRIPE_PRICE_MONTHLY="price_..."
STRIPE_PRICE_THREE_MONTH="price_..."
STRIPE_PRICE_YEARLY="price_..."

# Docker
DOCKER_HOST="unix:///var/run/docker.sock"
DOCKER_NETWORK="kainat-network"

# Server Config
BASE_PORT=18790                    # Starting port for instances
MAX_INSTANCES=100
INSTANCE_BASE_URL="https://yourdomain.com"

# Encryption (for storing API keys)
ENCRYPTION_KEY="your-32-char-encryption-key"

# Optional: Admin notifications
ADMIN_EMAIL="admin@yourdomain.com"
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
```

---

## 🚀 Setup Instructions

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL database
- Stripe account
- Domain (optional, for production)

### Step 1: Clone & Install

```bash
# Create new Next.js project
npx create-next-app@latest kainat-saas --typescript --tailwind --app
cd kainat-saas

# Install dependencies
npm install @prisma/client prisma stripe @stripe/stripe-js
npm install dockerode zod react-hook-form @hookform/resolvers
npm install bcryptjs jsonwebtoken
npm install -D @types/dockerode @types/bcryptjs @types/jsonwebtoken

# Install shadcn/ui
npx shadcn-ui@latest init
```

### Step 2: Setup Database

```bash
# Initialize Prisma
npx prisma init

# Copy the schema from this document to prisma/schema.prisma

# Create and run migrations
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate
```

### Step 3: Configure Stripe

1. Create Stripe account at https://stripe.com
2. Create 3 products:
   - Monthly ($29)
   - 3 Months ($75)
   - Yearly ($299)
3. Copy price IDs to `.env`
4. Set up webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
5. Copy webhook secret to `.env`

### Step 4: Docker Network Setup

```bash
# Create Docker network for all instances
docker network create kainat-network

# Test Docker access
docker ps
```

### Step 5: Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

---

## 🐳 Docker Deployment Flow

### 1. User Completes Configuration

User fills out all forms → Stripe payment succeeds → Webhook triggers deployment

### 2. Config Generation

```typescript
// lib/openclaw/config-builder.ts
function generateOpenClawConfig(userConfig) {
  return {
    agents: {
      defaults: {
        workspace: "~/.openclaw/workspace",
        model: {
          primary: userConfig.provider === 'anthropic'
            ? "anthropic/claude-opus-4-5"
            : "openai/gpt-5.2"
        }
      }
    },
    channels: {
      whatsapp: userConfig.channels.whatsapp ? {
        enabled: true,
        allowFrom: userConfig.channels.whatsapp.allowlist || []
      } : undefined,
      telegram: userConfig.channels.telegram ? {
        enabled: true,
        botToken: userConfig.channels.telegram.token
      } : undefined,
      // ... other channels
    },
    tools: {
      web: {
        search: {
          enabled: userConfig.webSearchEnabled,
          apiKey: userConfig.braveApiKey
        }
      }
    }
  };
}
```

### 3. Docker Compose Generation

```yaml
# Generated for each user
version: '3.8'
services:
  openclaw-{userId}:
    image: ghcr.io/openclaw/openclaw:latest
    container_name: openclaw-{userId}
    environment:
      - ANTHROPIC_API_KEY={encrypted_key}
      - TELEGRAM_BOT_TOKEN={encrypted_token}
      # ... other env vars
    ports:
      - "{allocated_port}:18789"
    volumes:
      - openclaw-{userId}-data:/root/.openclaw
      - openclaw-{userId}-config:/root/.openclaw/openclaw.json
    networks:
      - kainat-network
    restart: unless-stopped

volumes:
  openclaw-{userId}-data:
  openclaw-{userId}-config:

networks:
  kainat-network:
    external: true
```

### 4. Deployment

```typescript
// lib/docker/deploy.ts
async function deployInstance(userId: string, config: any) {
  const port = await allocatePort();
  const containerName = `openclaw-${userId}`;

  // 1. Create volume with config
  await createConfigVolume(userId, config);

  // 2. Start container
  const container = await docker.createContainer({
    Image: 'ghcr.io/openclaw/openclaw:latest',
    name: containerName,
    Env: buildEnvVars(config),
    HostConfig: {
      PortBindings: {
        '18789/tcp': [{ HostPort: port.toString() }]
      },
      RestartPolicy: { Name: 'unless-stopped' }
    }
  });

  await container.start();

  // 3. Health check
  await waitForHealthy(containerId);

  // 4. Get access info (QR codes, bot links)
  const accessInfo = await getAccessInfo(containerId);

  return { containerId, port, accessInfo };
}
```

---

## 📊 Monitoring & Management

### Health Checks

```typescript
// Cron job running every 5 minutes
async function checkInstanceHealth() {
  const instances = await prisma.instance.findMany({
    where: { status: 'RUNNING' }
  });

  for (const instance of instances) {
    const isHealthy = await pingContainer(instance.containerId);

    if (!isHealthy) {
      await restartInstance(instance.id);
      await notifyAdmin(`Instance ${instance.id} restarted`);
    }
  }
}
```

### User Dashboard Features

- Real-time instance status
- QR code for WhatsApp (if enabled)
- Bot invite links for Telegram, Discord, etc.
- Usage statistics
- Configuration editor
- Start/Stop/Restart buttons
- Logs viewer

---

## 💰 Pricing Structure

| Plan | Price | Discount | Features |
|------|-------|----------|----------|
| Monthly | $29/mo | - | All features, month-to-month |
| 3 Months | $25/mo ($75) | 13% off | Save $12, quarterly billing |
| Yearly | $24.92/mo ($299) | 14% off | Save $49, annual billing |

All plans include:
- Dedicated OpenClaw instance
- Unlimited messages
- All channel integrations
- All skills & extensions
- 24/7 uptime monitoring
- Email support

---

## 🔒 Security Considerations

### API Key Storage

- All API keys encrypted using AES-256
- Encryption key stored securely (env var, never in code)
- Keys never exposed in logs or UI

### Container Isolation

- Each user gets isolated Docker container
- Network isolation via Docker networks
- Volume isolation (no shared storage)
- Resource limits (CPU, memory)

### Payment Security

- PCI compliance via Stripe
- No credit card data stored
- Webhook signature verification

---

## 🎨 UI/UX Guidelines

### Design Principles

1. **Simple & Beautiful** - Clean, modern interface
2. **One-Click Everything** - Minimize user friction
3. **Clear Pricing** - Transparent, no hidden fees
4. **Instant Feedback** - Show deployment progress
5. **Mobile Responsive** - Works on all devices

### Color Scheme

- Primary: Purple/Blue gradient (tech, trust)
- Secondary: Green (success, active status)
- Accent: Orange (calls-to-action)
- Dark mode support

---

## 🧪 Testing Checklist

- [ ] Stripe payment flow (test mode)
- [ ] Container deployment success
- [ ] WhatsApp QR code generation
- [ ] Telegram bot connectivity
- [ ] Discord bot invitation
- [ ] Config validation
- [ ] Health check system
- [ ] Instance restart
- [ ] Subscription cancellation
- [ ] Resource cleanup on cancel

---

## 🚢 Production Deployment

### Server Requirements

- **VPS**: 4+ cores, 16GB+ RAM (scales with users)
- **Storage**: 100GB+ SSD
- **OS**: Ubuntu 22.04 LTS
- **Docker**: Latest stable version
- **Database**: Managed PostgreSQL (Supabase, Railway, etc.)

### Deployment Steps

1. Set up production VPS
2. Install Docker & Docker Compose
3. Set up PostgreSQL database
4. Configure Nginx reverse proxy
5. Set up SSL certificates (Let's Encrypt)
6. Deploy Next.js app (Vercel/Railway/Docker)
7. Configure Stripe production keys
8. Set up monitoring (Sentry, DataDog, etc.)
9. Configure backups (database, volumes)

---

## 📈 Future Enhancements

- [ ] Custom domain for each instance
- [ ] White-label options
- [ ] Team/multi-user accounts
- [ ] Usage analytics dashboard
- [ ] API access for advanced users
- [ ] Marketplace for custom skills
- [ ] Auto-scaling infrastructure
- [ ] Multi-region deployment

---

## 🆘 Support & Troubleshooting

### Common Issues

**Container won't start:**
- Check Docker daemon status
- Verify port availability
- Check logs: `docker logs openclaw-{userId}`

**WhatsApp QR not showing:**
- Container may still be initializing (wait 30s)
- Check container logs for errors

**Bot not responding:**
- Verify API key is valid
- Check channel configuration
- Restart instance from dashboard

### Getting Help

- Email: support@yourdomain.com
- Discord: [Join our server]
- Docs: https://docs.yourdomain.com

---

## 📝 License & Credits

Built on top of [OpenClaw](https://github.com/openclaw/openclaw) - MIT License

---

**Last Updated:** 2026-02-02
**Version:** 1.0.0
**Author:** Kainat Development Team

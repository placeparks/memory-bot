# Kainat SaaS - OpenClaw Deployment Platform

One-click AI assistant deployment platform built on top of OpenClaw.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL database
- Stripe account

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your credentials
```

### Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Or run migrations
npm run db:migrate
```

### Stripe Setup

1. Create Stripe account at https://stripe.com
2. Create 3 products:
   - Monthly ($29)
   - 3 Months ($75)
   - Yearly ($299)
3. Copy price IDs to `.env`
4. Set up webhook: `https://yourdomain.com/api/stripe/webhook`
5. Copy webhook secret to `.env`

### Docker Setup

```bash
# Create Docker network
docker network create kainat-network

# Test Docker
docker ps
```

### Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## 📁 Project Structure

```
kainat-saas/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   ├── (auth)/            # Auth pages
│   ├── (dashboard)/       # Dashboard pages
│   ├── (marketing)/       # Marketing pages
│   └── onboard/           # Onboarding flow
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── forms/            # Form components
│   ├── dashboard/        # Dashboard components
│   └── pricing/          # Pricing components
├── lib/                   # Utilities & logic
│   ├── docker/           # Docker management
│   ├── openclaw/         # OpenClaw config generation
│   └── utils/            # Helper functions
└── prisma/               # Database schema

## 🔧 Configuration

See `kainat.md` in the openclaw directory for detailed configuration guide.

## 🐳 Docker Deployment

Each user gets an isolated Docker container running OpenClaw:

```yaml
openclaw-{userId}:
  image: ghcr.io/openclaw/openclaw:latest
  ports:
    - "{allocated_port}:18789"
  volumes:
    - openclaw-{userId}-data:/root/.openclaw
  environment:
    - ANTHROPIC_API_KEY=...
    - TELEGRAM_BOT_TOKEN=...
```

## 📊 Database Schema

See `prisma/schema.prisma` for the complete schema.

Main tables:
- **users** - User accounts
- **subscriptions** - Stripe subscriptions
- **instances** - Docker containers
- **configurations** - OpenClaw configs
- **channels** - Channel configurations
- **deployment_logs** - Deployment history

## 🔐 Security

- API keys encrypted using AES-256
- Container isolation via Docker
- Payment processing via Stripe
- Webhook signature verification
- Session-based authentication

## 🧪 Testing

```bash
# Test Stripe webhook locally
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Test Docker deployment
npm run test:deploy
```

## 📝 Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection
- `NEXTAUTH_SECRET` - Auth secret
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `ENCRYPTION_KEY` - For encrypting API keys

Optional:
- `DOCKER_HOST` - Docker socket path
- `BASE_PORT` - Starting port for instances
- `ADMIN_EMAIL` - Admin notifications

## 🚢 Production Deployment

### 1. Server Setup

```bash
# Ubuntu 22.04
sudo apt update
sudo apt install docker.io docker-compose nginx

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Application Deployment

```bash
# Clone repository
git clone your-repo.git
cd kainat-saas

# Install dependencies
npm install --production

# Build Next.js
npm run build

# Start with PM2
npm install -g pm2
pm2 start npm --name "kainat-saas" -- start
```

### 3. Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## 📚 Documentation

Full documentation in `kainat.md` including:
- Complete configuration options
- Channel setup guides
- Skills and extensions
- Troubleshooting

## 🤝 Support

- Email: support@yourdomain.com
- Discord: [Join server]
- Docs: https://docs.yourdomain.com

## 📄 License

MIT License - See LICENSE file

## 🙏 Credits

Built on top of [OpenClaw](https://github.com/openclaw/openclaw)
```

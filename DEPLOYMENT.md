# Psychometric Testing Platform — Production Deployment Guide

## Architecture Overview

```
[Domain: your-brand.com]
        |
   [Nginx/Caddy — SSL]
        |
   [Next.js App (port 3000)]
        |
   [PostgreSQL Database]
        |
   [File Storage (PDFs, reports)]
```

---

## Option A: VPS Deployment (Recommended for White-Label)

### 1. Provision a VPS
- **Provider**: DigitalOcean / AWS EC2 / Hetzner / Linode
- **Specs**: 2 vCPU, 2GB RAM, 20GB SSD
- **OS**: Ubuntu 22.04 LTS

### 2. Install Prerequisites
```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Bun (for package management)
curl -fsSL https://bun.sh/install | bash

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx (reverse proxy + SSL)
sudo apt install -y nginx

# Install Certbot (SSL certificates)
sudo apt install -y certbot python3-certbot-nginx
```

### 3. Setup PostgreSQL
```bash
sudo -u postgres psql
CREATE DATABASE psychometric;
CREATE USER psychouser WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE psychometric TO psychouser;
\q
```

### 4. Clone & Build
```bash
git clone https://github.com/your-org/psychometric-platform.git
cd psychometric-platform

# Install dependencies
bun install

# Set environment
cp .env.production .env
# Edit .env with your PostgreSQL connection string
nano .env

# Generate Prisma client
bun run db:generate

# Push database schema
bun run db:push

# Seed initial data (creates admin account + 9 assessments)
# Start the server temporarily to seed
bun run dev &
sleep 8
curl -X POST http://localhost:3000/api/seed
kill %1

# Build for production
bun run build
```

### 5. Run with PM2 (Process Manager)
```bash
# Install PM2
npm install -g pm2

# Start the production server
NODE_ENV=production pm2 start .next/standalone/server.js --name psychometric

# Save PM2 config (auto-restart on reboot)
pm2 save
pm2 startup
```

### 6. Configure Nginx + SSL
```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/psychometric
```

```nginx
server {
    listen 80;
    server_name your-brand.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Max upload size
    client_max_body_size 10M;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/psychometric /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d your-brand.com
```

---

## Option B: Docker Deployment (Easiest)

### 1. Install Docker
```bash
curl -fsSL https://get.docker.com | sh
```

### 2. Clone & Configure
```bash
git clone https://github.com/your-org/psychometric-platform.git
cd psychometric-platform

# Edit docker-compose.yml with your password
nano docker-compose.yml

# Set environment
cp .env.production .env
nano .env  # Set DATABASE_URL to match docker-compose
```

### 3. Build & Run
```bash
docker compose up -d --build

# Seed the database (run once)
docker compose exec app curl -X POST http://localhost:3000/api/seed
```

### 4. Set up Nginx + SSL (same as Option A, step 6)

---

## Option C: Railway / Render / Fly.io (PaaS)

1. Push code to GitHub
2. Create a new project on Railway/Render/Fly.io
3. Connect your GitHub repo
4. Add environment variable: `DATABASE_URL=postgresql://...`
5. Add a PostgreSQL database add-on
6. Deploy — the platform auto-builds and deploys
7. Seed after first deploy: `curl -X POST https://your-app.up.railway.app/api/seed`

---

## Post-Deployment Checklist

### Initial Setup
- [ ] Domain configured (your-brand.com)
- [ ] SSL certificate active (HTTPS)
- [ ] Database seeded (admin account + 9 assessments)
- [ ] Default admin password changed
- [ ] Create counsellor accounts
- [ ] Register test students
- [ ] Verify test-taking flow works
- [ ] Verify PDF download works
- [ ] Verify Smart Interpreter works

### White-Label Customization
- [ ] Change platform name in `src/components/AppShell.tsx` (line: "Psychometric Platform")
- [ ] Change platform name in `src/components/views/AuthView.tsx` (landing page)
- [ ] Replace logo in `public/logo.svg`
- [ ] Change color scheme in `tailwind.config.ts` (primary color)
- [ ] Update PDF header text in `src/lib/pdfkit-generator.ts` (line: "Psychometric Testing Platform")
- [ ] Update footer text in `src/components/AppShell.tsx`
- [ ] Update email domain for student registration
- [ ] Configure custom SMTP for notifications (future)

### Security Hardening
- [ ] Change default admin password (Admin@123 → strong password)
- [ ] Set `NODE_ENV=production`
- [ ] Configure firewall (only allow ports 80, 443, 22)
- [ ] Set up automatic database backups
- [ ] Enable rate limiting (via Nginx)
- [ ] Review CSP headers

---

## White-Label Checklist

The platform is designed for white-labeling. Here's what to change per client:

### Branding Changes (per client)
1. **Platform Name**: Search for "Psychometric" in all components and replace with client name
2. **Logo**: Replace `public/logo.svg` with client logo
3. **Colors**: Edit `tailwind.config.ts` → change teal/green to client brand colors
4. **Domain**: Point client's domain to the server
5. **PDF Reports**: Change header text and colors in `src/lib/pdfkit-generator.ts`

### Per-Client Configuration
- Each client gets their own database (or multi-tenant with `clientId` field)
- Each client gets their own admin account
- Tests can be customized per client (add/remove assessments)

---

## Database Backup Strategy

```bash
# Daily backup (add to crontab)
pg_dump -U psychouser psychometric | gzip > /backups/psychometric-$(date +%Y%m%d).sql.gz

# Keep 30 days of backups
find /backups/ -name "*.sql.gz" -mtime +30 -delete
```

---

## Git Workflow for White-Label

```
main (your base platform)
  |
  ├── client-a branch (Client A branding + config)
  ├── client-b branch (Client B branding + config)
  └── client-c branch (Client C branding + config)
```

Or use environment-based config:
- Keep ONE codebase
- Store branding in environment variables / config file
- Load branding at runtime based on domain

---

## Resource Cost Estimate

| Resource | Monthly Cost |
|----------|-------------|
| VPS (2 vCPU, 2GB) | $6–12 |
| Domain | $10/year |
| SSL | Free (Let's Encrypt) |
| PostgreSQL | Included in VPS |
| **Total** | **~$10/month** |

No external API costs — the Smart Interpreter uses pre-engineered frameworks ($0), PDF generation is pure JavaScript ($0), and authentication is self-hosted ($0).

---

## Scaling (Future)

When you have 100+ concurrent students:
- Upgrade to 4 vCPU / 4GB RAM VPS
- Add Redis for session caching
- Use a managed PostgreSQL (AWS RDS / Supabase)
- Add CDN for static assets (Cloudflare free tier)
- Load balancer + multiple app instances

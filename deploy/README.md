# Living Nexus — Self-Host Deployment Guide

This directory contains everything needed to deploy Living Nexus on your own infrastructure, completely independent of the Manus platform. It replaces Manus OAuth with a simple email/password system and Manus Forge with a self-hosted MinIO (S3-compatible) storage container.

## Prerequisites
- A Linux server (Ubuntu/Debian recommended)
- Docker and Docker Compose installed
- Node.js 20+ and `pnpm` (for building the app)
- MySQL client (optional, for running the migration manually)

## Step 1: Apply Simple Auth Patches

Before building the Docker image, you need to replace the Manus-specific auth files with the simple auth versions provided in this folder.

Run these commands from the root of the repository:

```bash
# 1. Replace server OAuth logic
cp deploy/oauth.simple-auth.ts server/_core/oauth.ts

# 2. Replace client login page
cp deploy/LoginPage.simple-auth.tsx client/src/pages/LoginPage.tsx

# 3. Update client routing constants
cp deploy/const.simple-auth.ts client/src/const.ts

# 4. Install bcryptjs for password hashing
pnpm add bcryptjs
pnpm add -D @types/bcryptjs
```

*Note: You will also need to add `<Route path="/login" element={<LoginPage />} />` to your `client/src/App.tsx` router if it's not already there.*

## Step 2: Configure Environment

Copy the template and fill in your secrets:

```bash
cp deploy/.env.template .env
nano .env
```

Make sure to set a strong `JWT_SECRET` and change the default MinIO/MySQL passwords.

## Step 3: Build and Start Services

Use Docker Compose to spin up the database, storage, and the app itself.

```bash
# Build the app container and start all services in the background
docker-compose -f deploy/docker-compose.selfhost.yml up -d --build
```

## Step 4: Database Migration

Once the database is running, you need to push the schema and apply the simple auth migration.

```bash
# Push the Drizzle schema to the database
pnpm db:push

# Apply the password_hash column migration
mysql -h 127.0.0.1 -u living_nexus -p living_nexus < deploy/add-password-hash.sql
```

## Step 5: Create Admin Account

You can create your first account by visiting `http://<your-server-ip>:3000/login` and clicking "Register".

Alternatively, you can uncomment the SQL insert statement at the bottom of `deploy/add-password-hash.sql` to seed an admin account directly into the database.

## Step 6: Configure MinIO

1. Visit `http://<your-server-ip>:9001` (MinIO Console)
2. Log in with your `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`
3. Create a bucket named `living-nexus-uploads` (or whatever you set in `.env`)
4. Set the bucket access policy to "Public" so images can be viewed.

## Done!

Living Nexus is now running on port 3000. You can put it behind a reverse proxy like Nginx or Caddy to serve it over HTTPS.

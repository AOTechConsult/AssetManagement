# Self-Hosted Installation Guide

This guide will walk you through deploying the Enterprise Asset Management System on your own server.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 20** or higher installed
- **PostgreSQL 14** or higher database server
- A server with at least 1GB RAM and 10GB disk space
- Basic familiarity with command line operations

## Step 1: Download the Application

Clone or download the application to your server:

```bash
git clone <your-repository-url> asset-management
cd asset-management
```

Or if you downloaded a zip file:

```bash
unzip asset-management.zip
cd asset-management
```

## Step 2: Install Dependencies

Install all required packages:

```bash
npm install
```

## Step 3: Set Up PostgreSQL Database

### Option A: Using an existing PostgreSQL server

1. Create a new database:
```sql
CREATE DATABASE asset_management;
```

2. Create a user (optional but recommended):
```sql
CREATE USER asset_user WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE asset_management TO asset_user;
```

### Option B: Using Docker for PostgreSQL

```bash
docker run -d \
  --name postgres \
  -e POSTGRES_DB=asset_management \
  -e POSTGRES_USER=asset_user \
  -e POSTGRES_PASSWORD=your-secure-password \
  -p 5432:5432 \
  postgres:16
```

## Step 4: Configure Environment Variables

Create a `.env` file in the project root:

```bash
touch .env
```

Add the following configuration:

```env
# Database connection string (REQUIRED)
DATABASE_URL=postgresql://asset_user:your-secure-password@localhost:5432/asset_management

# Session secret - REQUIRED for production (REQUIRED)
# Generate with: openssl rand -base64 32
SESSION_SECRET=your-random-32-character-secret-key-here

# Environment mode
NODE_ENV=production

# Server port (optional, defaults to 5000)
PORT=5000
```

### Generating a Secure SESSION_SECRET

The SESSION_SECRET is critical for security. Generate one using:

**Linux/macOS:**
```bash
openssl rand -base64 32
```

**Windows (PowerShell):**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

**Or use any password manager** to generate a random string of at least 32 characters.

## Step 5: Initialize the Database

Push the database schema:

```bash
npm run db:push
```

This creates all necessary tables for:
- Users and sessions
- Assets and categories
- AD users
- Audit logs
- Import templates

## Step 6: Build the Application

Create the production build:

```bash
npm run build
```

## Step 7: Start the Application

Start the server:

```bash
npm start
```

The application will be available at `http://your-server-ip:5000`

## Step 8: Create Your First Admin User

1. Open your browser and navigate to `http://your-server-ip:5000`
2. Click the "Register" tab
3. Fill in your details:
   - First Name
   - Last Name
   - Email (this will be your login username)
   - Password
4. Click "Create Account"

You're now logged in and can start managing assets!

---

## Running as a Service (Recommended)

### Using systemd (Linux)

Create a service file:

```bash
sudo nano /etc/systemd/system/asset-management.service
```

Add the following content:

```ini
[Unit]
Description=Enterprise Asset Management System
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/asset-management
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/path/to/asset-management/.env

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable asset-management
sudo systemctl start asset-management
```

Check status:

```bash
sudo systemctl status asset-management
```

### Using PM2 (Alternative)

Install PM2 globally:

```bash
npm install -g pm2
```

Start the application:

```bash
pm2 start dist/index.js --name "asset-management"
pm2 save
pm2 startup
```

---

## Reverse Proxy Setup (Recommended for Production)

### Using Nginx

Install Nginx:

```bash
sudo apt install nginx
```

Create a configuration file:

```bash
sudo nano /etc/nginx/sites-available/asset-management
```

Add the following:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/asset-management /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Adding SSL with Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Troubleshooting

### Application won't start

1. **Check environment variables:**
   ```bash
   cat .env
   ```
   Ensure DATABASE_URL and SESSION_SECRET are set correctly.

2. **Check database connection:**
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

3. **Check logs:**
   ```bash
   # If using systemd
   sudo journalctl -u asset-management -f
   
   # If using PM2
   pm2 logs asset-management
   ```

### "SESSION_SECRET is required" error

This error appears when running in production mode without a SESSION_SECRET. Set the environment variable:

```bash
export SESSION_SECRET=$(openssl rand -base64 32)
```

Or add it to your `.env` file.

### Database connection failed

1. Verify PostgreSQL is running:
   ```bash
   sudo systemctl status postgresql
   ```

2. Check the DATABASE_URL format:
   ```
   postgresql://username:password@host:port/database
   ```

3. Ensure the database user has proper permissions.

### Port already in use

Change the PORT in your `.env` file or stop the conflicting service:

```bash
sudo lsof -i :5000
sudo kill <PID>
```

---

## Backup and Restore

### Backup Database

```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### Restore Database

```bash
psql $DATABASE_URL < backup_20240101.sql
```

---

## Updating the Application

1. Stop the service:
   ```bash
   sudo systemctl stop asset-management
   ```

2. Pull the latest changes:
   ```bash
   git pull origin main
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Update database schema:
   ```bash
   npm run db:push
   ```

5. Rebuild:
   ```bash
   npm run build
   ```

6. Start the service:
   ```bash
   sudo systemctl start asset-management
   ```

---

## Security Recommendations

1. **Always use HTTPS** in production with a valid SSL certificate
2. **Keep SESSION_SECRET secure** and never commit it to version control
3. **Use strong passwords** for database and user accounts
4. **Regular backups** - schedule daily database backups
5. **Keep software updated** - regularly update Node.js and dependencies
6. **Firewall** - only expose port 80/443, block direct access to port 5000
7. **Database security** - don't expose PostgreSQL to the internet

---

## Support

If you encounter issues not covered in this guide, check:

1. Application logs for error messages
2. PostgreSQL logs: `/var/log/postgresql/`
3. Nginx logs: `/var/log/nginx/`

For additional help, open an issue in the project repository.

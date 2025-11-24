# Cloudflare IP Updater

A lightweight Node.js application that automatically updates your Cloudflare DNS A records with your current public IP address. Perfect for dynamic IP addresses or home server setups.

## Features

- 🔄 Automatically updates all A records in your Cloudflare zone
- ⏰ Runs every 15 minutes via cron schedule
- 🐳 Docker support with Alpine Linux for minimal footprint
- 🌍 Timezone-aware (Europe/Berlin by default)
- 🚀 Updates on startup and scheduled intervals
- 📝 Detailed logging for all operations

## Prerequisites

- A Cloudflare account with a domain
- Cloudflare API Token with DNS edit permissions
- Cloudflare Zone ID for your domain
- Docker and Docker Compose (for Docker setup) OR Node.js (for local setup)

## Configuration

### Getting Your Cloudflare Credentials

1. **API Token**: 
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
   - Click "Create Token"
   - Use the "Edit zone DNS" template or create a custom token with `Zone.DNS` permissions
   - Copy the generated token

2. **Zone ID**:
   - Go to your domain's overview page in Cloudflare Dashboard
   - Scroll down to find your Zone ID in the right sidebar
   - Copy the Zone ID

### Environment Variables

Create a `.env` file in the project root (you can copy from `.env.example`):

```bash
cp .env.example .env
```

Then edit `.env` with your credentials:

```env
CLOUDFLARE_ZONE_ID=your_zone_id_here
CLOUDFLARE_API_TOKEN=your_api_token_here
```

**Important**: Never commit your `.env` file to version control!

## Setup & Usage

### Option 1: Docker (Recommended)

#### Using Docker Compose

1. Clone the repository:
```bash
git clone https://github.com/FNoBaby/Cloudflare-IP-Updater.git
cd Cloudflare-IP-Updater
```

2. Create your `.env` file with your Cloudflare credentials (see Configuration section above)

3. Build and start the container:
```bash
docker-compose up -d
```

4. View logs:
```bash
docker-compose logs -f
```

5. Stop the container:
```bash
docker-compose down
```

#### Using Docker CLI

1. Build the image:
```bash
docker build -t cloudflare-ip-updater .
```

2. Run the container:
```bash
docker run -d \
  --name cloudflare-ip-updater \
  --restart unless-stopped \
  -e CLOUDFLARE_ZONE_ID=your_zone_id_here \
  -e CLOUDFLARE_API_TOKEN=your_api_token_here \
  cloudflare-ip-updater
```

3. View logs:
```bash
docker logs -f cloudflare-ip-updater
```

4. Stop the container:
```bash
docker stop cloudflare-ip-updater
docker rm cloudflare-ip-updater
```

### Option 2: Local Node.js Setup

1. Clone the repository:
```bash
git clone https://github.com/FNoBaby/Cloudflare-IP-Updater.git
cd Cloudflare-IP-Updater
```

2. Install dependencies:
```bash
npm install
```

3. Create your `.env` file with your Cloudflare credentials (see Configuration section above)

4. Run the application:
```bash
npm start
```

Or using Node directly:
```bash
node index.js
```

## How It Works

1. **On Startup**: The application immediately checks your current public IP and updates all A records if needed
2. **Scheduled Updates**: Every 15 minutes, the application:
   - Fetches your current public IP address from `ipv4.icanhazip.com`
   - Retrieves all DNS records from your Cloudflare zone
   - Compares each A record's IP with your current IP
   - Updates any A records that don't match your current IP
   - Logs all operations to the console

## Customization

### Change Update Interval

Edit the cron schedule in `index.js`:
```javascript
// Current: every 15 minutes
cron.schedule('*/15 * * * *', ...

// Every 5 minutes
cron.schedule('*/5 * * * *', ...

// Every hour
cron.schedule('0 * * * *', ...
```

### Change Timezone

Edit the timezone in `index.js`:
```javascript
cron.schedule('*/15 * * * *', () => {
    // ...
}, {
    timezone: "America/New_York"  // Change to your timezone
});
```

### Enable Cloudflare Proxy

To enable Cloudflare's proxy (orange cloud), edit `index.js`:
```javascript
proxied: true  // Change from false to true in updateDNSRecord function
```

## Troubleshooting

**Container won't start?**
- Check your `.env` file exists and contains valid credentials
- Verify your API token has DNS edit permissions
- Check logs: `docker-compose logs` or `docker logs cloudflare-ip-updater`

**IP not updating?**
- Verify your Zone ID is correct
- Ensure your API token has the right permissions
- Check if your current IP has actually changed

**DNS records not found?**
- Verify the Zone ID matches your domain
- Ensure you have A records in your Cloudflare DNS settings

## License

ISC

## Author

FNoBaby

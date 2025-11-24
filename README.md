# Cloudflare IP Updater

Automatically updates Cloudflare DNS A records with your current public IP address. Runs as a scheduled task every 15 minutes.

## Features

- 🔄 Automatic IP detection and DNS record updates
- ⏰ Scheduled checks every 15 minutes
- 🐳 Docker and Docker Compose support
- 📬 Discord webhook notifications
- 🌍 Timezone-aware (Europe/Berlin)
- 🔒 Secure API token authentication

## Discord Notifications

When configured, the application sends Discord webhook notifications for:

- **IP Updates**: Paginated embeds showing old IP → new IP for all updated records (10 per page)
- **Errors**: Detailed error notifications with error descriptions

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Cloudflare API Configuration (Required)
CLOUDFLARE_ZONE_ID=your_zone_id_here
CLOUDFLARE_API_TOKEN=your_api_token_here

# Domain Configuration (Required)
DOMAIN=your_domain_here

# Discord Webhook Configuration (Optional)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook_url
```

See `.env.example` for a template.

## Usage

### Using Docker Compose (Recommended)

1. Clone the repository
2. Create your `.env` file with the required variables
3. Build and start the container:

```bash
docker compose up -d
```

4. View logs:

```bash
docker compose logs -f
```

### Using Docker

1. Build the image:

```bash
docker build -t cloudflare-ip-updater .
```

2. Run the container:

```bash
docker run -d \
  --name cloudflare-ip-updater \
  --restart unless-stopped \
  -e CLOUDFLARE_ZONE_ID=your_zone_id \
  -e CLOUDFLARE_API_TOKEN=your_token \
  -e DOMAIN=your_domain \
  -e DISCORD_WEBHOOK_URL=your_webhook_url \
  cloudflare-ip-updater
```

### Using Node.js

1. Install dependencies:

```bash
npm install
```

2. Create your `.env` file
3. Start the application:

```bash
npm start
```

## How It Works

1. On startup and every 15 minutes, the application:
   - Fetches your current public IP address
   - Retrieves all DNS A records from your Cloudflare zone
   - Compares each record's IP with your current IP
   - Updates any records that don't match
   - Sends Discord notifications (if configured) for updates or errors

2. The application runs continuously and handles DST changes automatically using the Europe/Berlin timezone

## Discord Webhook Setup

1. In your Discord server, go to Server Settings → Integrations → Webhooks
2. Create a new webhook or select an existing one
3. Copy the webhook URL
4. Add it to your `.env` file as `DISCORD_WEBHOOK_URL`

## License

ISC

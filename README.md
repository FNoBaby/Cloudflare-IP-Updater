# Cloudflare IP Updater

Automatically updates Cloudflare DNS A records with your current public
IPv4 address. Runs as a scheduled task every 15 minutes.

## Features

- Automatic IPv4 detection and DNS record updates
- Scheduled checks every 15 minutes
- Docker and Docker Compose support
- Optional Discord webhook notifications
- Timezone-aware (Europe/Berlin)
- Secure API token authentication

## How It Works

On startup and every 15 minutes, the application:

1.  Fetches your current public IPv4 address
2.  Retrieves all DNS records from your Cloudflare zone
3.  Compares each A record's IP with your current IP
4.  Updates any records that do not match
5.  Sends Discord notifications for updates or errors (if configured)

Only A records (IPv4) are updated. AAAA, CNAME, TXT, and other records
are ignored.

## Requirements

### Cloudflare API Token Permissions

The Cloudflare API token must include:

- Zone → DNS → Read
- Zone → DNS → Edit

## Environment Variables

Create a `.env` file in the project root:

    # Cloudflare Configuration (Required)
    CLOUDFLARE_ZONE_ID=your_zone_id_here
    CLOUDFLARE_API_TOKEN=your_api_token_here

    # Domain Configuration (Required)
    DOMAIN=your_domain_here

    # Discord Webhook (Optional)
    DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook_url

See `.env.example` for a complete template.

## Usage

### Clone the repository

Clone this repository locally and change into the project directory:

```shell
git clone https://github.com/FNoBaby/Cloudflare-IP-Updater.git
cd Cloudflare-IP-Updater
```

You can also use your SSH URL if you prefer:

```shell
git clone git@github.com:FNoBaby/Cloudflare-IP-Updater.git
```

### Using Docker Compose (Recommended)

1.  Clone the repository
2.  Edit the env variables in the compose file (docker-compose.yml)
3.  Start the service:

```shell
docker compose up -d
```

4.  View logs:

```shell
docker compose logs -f
```

### Using Docker

1.  Build the image:

```shell
docker build -t cloudflare-ip-updater .
```

2.  Run the container:

```shell
  docker run -d   --name cloudflare-ip-updater   --restart unless-stopped   --env-file .env   cloudflare-ip-updater
```

### Using Node.js

1.  Install dependencies:

```shell
npm install
```

2.  Start the application:

```shell
npm start
```

## Discord Notifications

If configured, the application sends:

### IP Update Notifications

Paginated embeds showing: - Old IP → new IP - Record name
(10 records per page)

### Error Notifications

Includes: - Error message - Truncated error details (Discord-safe
length)

## Troubleshooting

### Container image is large (\~180MB)

Node 18 images are large by default.
Multi-stage or distroless Dockerfiles can significantly reduce size.

### Discord notifications not appearing

- Ensure `DISCORD_WEBHOOK_URL` is set
- Check logs for webhook errors

### Cron not running inside Docker

Cron is handled entirely by `node-cron`; no OS cron is required.

### Discord rate limiting

The updater introduces a delay between embed pages to avoid hitting
limits.

## License

ISC

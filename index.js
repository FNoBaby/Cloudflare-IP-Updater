// Import required packages
const axios = require('axios');
const dotenv = require('dotenv');
const cron = require('node-cron');

// Load environment variables from .env file
dotenv.config();

// Cloudflare API settings from environment variables
const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;  // Cloudflare Zone ID
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;  // Cloudflare API Token
const DOMAIN = process.env.DOMAIN;  // Your main domain
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;  // Discord webhook URL for notifications
const UNPROXIED_RECORDS = process.env.UNPROXIED_RECORDS || '';  // Comma-separated list of records to keep unproxied

// Discord webhook configuration constants
const DISCORD_EMBEDS_PER_PAGE = 10;  // Number of records per Discord embed page
const DISCORD_PAGE_DELAY_MS = 1000;  // Delay between pages to avoid rate limiting
const DISCORD_FIELD_VALUE_LIMIT = 1024;  // Discord field value character limit

// Validate required environment variables
if (!ZONE_ID || !API_TOKEN || !DOMAIN) {
    console.error('Error: Missing required environment variables');
    if (!ZONE_ID) console.error('  - CLOUDFLARE_ZONE_ID is required');
    if (!API_TOKEN) console.error('  - CLOUDFLARE_API_TOKEN is required');
    if (!DOMAIN) console.error('  - DOMAIN is required');
    process.exit(1);
}

// Parse comma-separated record names from env var
const unproxiedRecordsSet = new Set(
    UNPROXIED_RECORDS
        .split(',')
        .map(record => record.trim().toLowerCase())
        .filter(Boolean)
);

function getNormalizedRecordAliases(recordName) {
    const aliases = new Set();
    const normalizedName = recordName.trim().toLowerCase();
    const normalizedDomain = DOMAIN.trim().toLowerCase();

    aliases.add(normalizedName);

    // Support root record aliases for convenience
    if (normalizedName === normalizedDomain) {
        aliases.add('@');
        aliases.add('root');
    }

    // Support short-name aliases like "home" for "home.example.com"
    if (normalizedName.endsWith(`.${normalizedDomain}`)) {
        const shortName = normalizedName.slice(0, -(normalizedDomain.length + 1));
        if (shortName) {
            aliases.add(shortName);
        }
    }

    return aliases;
}

function isUnproxiedRecord(recordName) {
    const aliases = getNormalizedRecordAliases(recordName);
    for (const alias of aliases) {
        if (unproxiedRecordsSet.has(alias)) {
            return true;
        }
    }
    return false;
}

// Function to send Discord webhook messages
async function sendDiscordMessage(content) {
    if (!DISCORD_WEBHOOK_URL) {
        return; // Skip if no webhook URL is configured
    }
    
    try {
        await axios.post(DISCORD_WEBHOOK_URL, {
            content: content
        });
    } catch (error) {
        console.error('Error sending Discord message:', error.message);
    }
}

// Function to send paginated Discord embeds for IP updates
async function sendDiscordEmbeds(updates) {
    if (!DISCORD_WEBHOOK_URL || updates.length === 0) {
        return; // Skip if no webhook URL is configured or no updates
    }
    
    try {
        // Create embeds with pagination
        const totalPages = Math.ceil(updates.length / DISCORD_EMBEDS_PER_PAGE);
        
        for (let page = 0; page < totalPages; page++) {
            const startIdx = page * DISCORD_EMBEDS_PER_PAGE;
            const endIdx = Math.min(startIdx + DISCORD_EMBEDS_PER_PAGE, updates.length);
            const pageUpdates = updates.slice(startIdx, endIdx);
            
            const fields = pageUpdates.map(update => ({
                name: update.recordName,
                value: `${update.oldIP} → ${update.newIP}`,
                inline: false
            }));
            
            const embed = {
                title: `IP Address Updates (Page ${page + 1}/${totalPages})`,
                description: `Updated ${updates.length} DNS record(s)`,
                color: 0x00ff00, // Green color
                fields: fields,
                timestamp: new Date().toISOString(),
                footer: {
                    text: 'Cloudflare IP Updater'
                }
            };
            
            await axios.post(DISCORD_WEBHOOK_URL, {
                embeds: [embed]
            });
            
            // Add a small delay between pages to avoid rate limiting
            if (page < totalPages - 1) {
                await new Promise(resolve => setTimeout(resolve, DISCORD_PAGE_DELAY_MS));
            }
        }
    } catch (error) {
        console.error('Error sending Discord embeds:', error.message);
    }
}

// Function to send error messages to Discord
async function sendDiscordError(errorMessage, errorDetails = '') {
    if (!DISCORD_WEBHOOK_URL) {
        return; // Skip if no webhook URL is configured
    }
    
    try {
        const embed = {
            title: '❌ Error in Cloudflare IP Updater',
            description: errorMessage,
            color: 0xff0000, // Red color
            timestamp: new Date().toISOString(),
            footer: {
                text: 'Cloudflare IP Updater'
            }
        };
        
        if (errorDetails) {
            embed.fields = [{
                name: 'Details',
                value: errorDetails.substring(0, DISCORD_FIELD_VALUE_LIMIT), // Discord field value limit
                inline: false
            }];
        }
        
        await axios.post(DISCORD_WEBHOOK_URL, {
            embeds: [embed]
        });
    } catch (error) {
        console.error('Error sending Discord error notification:', error.message);
    }
}

// Function to get current public IP address
async function getCurrentIP() {
    try {
        const response = await axios.get('https://ipv4.icanhazip.com');
        return response.data.trim();
    } catch (error) {
        console.error('Error getting current IP:', error);
        await sendDiscordError('Failed to get current IP address', error.message);
        process.exit(1);
    }
}

// Function to get all DNS records from Cloudflare
async function getAllDNSRecords() {
    try {
        const response = await axios.get(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records`, {
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data.result;  // Returning DNS records
    } catch (error) {
        console.error('Error fetching DNS records from Cloudflare:', error);
        await sendDiscordError('Failed to fetch DNS records from Cloudflare', error.message);
        process.exit(1);
    }
}

// Function to update a DNS record in Cloudflare
async function updateDNSRecord(recordId, newIP, recordName, proxied = true) {
    try {
        const response = await axios.put(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${recordId}`, {
            type: 'A',
            name: recordName,
            content: newIP,
            ttl: 120,
            proxied
        }, {
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        const proxyState = proxied ? 'proxied' : 'unproxied';
        console.log(`Updated DNS record ${recordName} (${recordId}) to IP: ${newIP} (${proxyState})`);
    } catch (error) {
        console.error(`Error updating DNS record ${recordId} (${recordName}):`, error);
        await sendDiscordError(`Failed to update DNS record: ${recordName}`, error.message);
    }
}

// Dedicated updater for records that should stay DNS-only (unproxied)
async function updateDNSRecordUnproxied(recordId, newIP, recordName) {
    await updateDNSRecord(recordId, newIP, recordName, false);
}

// Main function to check and update IP for all A records
async function checkAndUpdateAllRecords() {
    const currentIP = await getCurrentIP();
    const dnsRecords = await getAllDNSRecords();
    
    const updates = []; // Track all updates for Discord notification

    // Loop through all DNS records and update A records
    for (const record of dnsRecords) {
        if (record.type === 'A') {
            if (record.content !== currentIP) {
                console.log(`IP has changed for ${record.name}: ${record.content} => ${currentIP}`);
                if (isUnproxiedRecord(record.name)) {
                    await updateDNSRecordUnproxied(record.id, currentIP, record.name);
                } else {
                    await updateDNSRecord(record.id, currentIP, record.name);
                }
                updates.push({
                    recordName: record.name,
                    oldIP: record.content,
                    newIP: currentIP
                });
            } else {
                console.log(`No change for ${record.name}, IP is already correct.`);
            }
        }
    }
    
    // Send Discord notification if there were any updates
    if (updates.length > 0) {
        await sendDiscordEmbeds(updates);
    }
}

// Schedule the task to run every 15 minutes regardless of DST changes
console.log('Setting up cron job to run IP update check every 15 minutes in Europe/Berlin timezone');
cron.schedule('*/15 * * * *', () => {
    console.log('Running scheduled IP update check...');
    checkAndUpdateAllRecords()
        .catch(err => {
            console.error('Error in scheduled update:', err);
            sendDiscordError('Error in scheduled update', err.message);
        });
}, {
    scheduled: true,
    timezone: "Europe/Berlin" // This will automatically handle DST changes
});

// Run the script immediately on startup
console.log('Running initial IP update check...');
checkAndUpdateAllRecords()
    .catch(err => {
        console.error('Error in initial update:', err);
        sendDiscordError('Error in initial update', err.message);
    });

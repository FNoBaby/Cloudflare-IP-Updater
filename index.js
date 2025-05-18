// Import required packages
const axios = require('axios');
const dotenv = require('dotenv');
const cron = require('node-cron');

// Load environment variables from .env file
dotenv.config();

// Cloudflare API settings from environment variables
const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;  // Cloudflare Zone ID for fnobaby.dev
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;  // Cloudflare API Token
const DOMAIN = "fnobaby.dev";  // Your main domain

// Function to get current public IP address
async function getCurrentIP() {
    try {
        const response = await axios.get('https://ipv4.icanhazip.com');
        return response.data.trim();
    } catch (error) {
        console.error('Error getting current IP:', error);
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
        process.exit(1);
    }
}

// Function to update a DNS record in Cloudflare
async function updateDNSRecord(recordId, newIP, recordName) {
    try {
        const response = await axios.put(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${recordId}`, {
            type: 'A',
            name: recordName,
            content: newIP,
            ttl: 120,
            proxied: false  // Set to true if you want Cloudflare's proxy to be enabled
        }, {
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        console.log(`Updated DNS record ${recordName} (${recordId}) to IP: ${newIP}`);
    } catch (error) {
        console.error(`Error updating DNS record ${recordId} (${recordName}):`, error);
    }
}

// Main function to check and update IP for all A records
async function checkAndUpdateAllRecords() {
    const currentIP = await getCurrentIP();
    const dnsRecords = await getAllDNSRecords();

    // Loop through all DNS records and update A records
    for (const record of dnsRecords) {
        if (record.type === 'A') {
            if (record.content !== currentIP) {
                console.log(`IP has changed for ${record.name}: ${record.content} => ${currentIP}`);
                await updateDNSRecord(record.id, currentIP, record.name);
            } else {
                console.log(`No change for ${record.name}, IP is already correct.`);
            }
        }
    }
}

// Schedule the task to run every 15 minutes regardless of DST changes
console.log('Setting up cron job to run IP update check every 15 minutes in Europe/Berlin timezone');
cron.schedule('*/15 * * * *', () => {
    console.log('Running scheduled IP update check...');
    checkAndUpdateAllRecords()
        .catch(err => console.error('Error in scheduled update:', err));
}, {
    scheduled: true,
    timezone: "Europe/Berlin" // This will automatically handle DST changes
});

// Run the script immediately on startup
console.log('Running initial IP update check...');
checkAndUpdateAllRecords()
    .catch(err => console.error('Error in initial update:', err));

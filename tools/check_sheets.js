
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

async function test() {
    console.log("Starting Sheets Auth Test...");
    // token.json is in project root, which is parent of tools/
    const tokenPath = path.join(__dirname, '../token.json');

    if (!fs.existsSync(tokenPath)) {
        console.error("No token.json found at", tokenPath);
        return;
    }

    const content = fs.readFileSync(tokenPath, 'utf8');
    const token = JSON.parse(content);

    // Creating client
    const oAuth2Client = new google.auth.OAuth2(
        token.client_id,
        token.client_secret,
        "http://localhost"
    );

    // Setting credentials with fix
    const expiryDate = token.expiry ? new Date(token.expiry).getTime() : token.expiry_date;
    console.log("Setting expiry date:", expiryDate, "(Original:", token.expiry, ")");

    oAuth2Client.setCredentials({
        access_token: token.token,
        refresh_token: token.refresh_token,
        expiry_date: expiryDate,
    });

    const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });
    const spreadsheetId = process.argv[2];

    if (!spreadsheetId) {
        console.error("Please provide spreadsheetId as argument");
        return;
    }

    try {
        console.log(`Attempting to read ITEMS!A2:F5 from ${spreadsheetId}...`);
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'ITEMS!A2:F5',
        });
        console.log("READ SUCCESS!");
        if (res.data.values) {
            console.log("Rows found:", res.data.values.length);
            console.log("First row sample:", res.data.values[0]);
        } else {
            console.log("No data found in range.");
        }
    } catch (error) {
        console.error("READ FAILED:", error.message);
        if (error.response) {
            console.error("Response data:", error.response.data);
        }
    }
}

test();

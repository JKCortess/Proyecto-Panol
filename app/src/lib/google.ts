
import { google } from "googleapis";
import path from "path";
import fs from "fs";

function loadToken() {
    // 1. Try environment variable first (Vercel / production)
    if (process.env.GOOGLE_CREDENTIALS) {
        return JSON.parse(process.env.GOOGLE_CREDENTIALS);
    }

    // 2. Fallback to local file (development)
    const tokenPath = path.join(process.cwd(), "token.json");
    if (fs.existsSync(tokenPath)) {
        const content = fs.readFileSync(tokenPath, "utf-8");
        return JSON.parse(content);
    }

    throw new Error(
        "Google credentials not found. Set GOOGLE_CREDENTIALS env var or provide token.json"
    );
}

export async function getAuthClient() {
    const token = loadToken();

    const oAuth2Client = new google.auth.OAuth2(
        token.client_id,
        token.client_secret,
        "http://localhost" // Redirect URI
    );

    oAuth2Client.setCredentials({
        access_token: token.token,
        refresh_token: token.refresh_token,
        // Ensure expiry is a number (ms)
        expiry_date: token.expiry ? new Date(token.expiry).getTime() : token.expiry_date,
    });

    return oAuth2Client;
}

export async function getSheets() {
    const auth = await getAuthClient();
    return google.sheets({ version: "v4", auth });
}

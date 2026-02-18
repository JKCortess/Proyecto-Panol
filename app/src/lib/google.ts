
import { google } from "googleapis";
import path from "path";
import fs from "fs";

const TOKEN_PATH = path.join(process.cwd(), "token.json");

export async function getAuthClient() {
    const content = fs.readFileSync(TOKEN_PATH, "utf-8");
    const token = JSON.parse(content);

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

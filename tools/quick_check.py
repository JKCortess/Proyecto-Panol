import json
import warnings
warnings.filterwarnings("ignore")
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

TOKEN_PATH = "token.json"
ENV_PATH = ".env"

def get_sid():
    with open(ENV_PATH, "r") as f:
        for line in f:
            if "PANOL_DB_SPREADSHEET_ID=" in line:
                return line.strip().split("=", 1)[1]

def main():
    with open(TOKEN_PATH, "r") as f:
        td = json.load(f)
    creds = Credentials(token=td["token"], refresh_token=td["refresh_token"], token_uri=td["token_uri"], client_id=td["client_id"], client_secret=td["client_secret"], scopes=td.get("scopes", []))
    if creds.expired or not creds.valid:
        creds.refresh(Request())
        td["token"] = creds.token
        with open(TOKEN_PATH, "w") as f: json.dump(td, f)

    svc = build("sheets", "v4", credentials=creds)
    sid = get_sid()

    # Check ITEMS count
    res = svc.spreadsheets().values().get(spreadsheetId=sid, range="ITEMS!A1:A").execute()
    rows = res.get("values", [])
    print(f"ITEMS_COUNT={len(rows)-1}")

    # Check Specific User
    res = svc.spreadsheets().values().get(spreadsheetId=sid, range="USUARIOS!A1:D").execute()
    rows = res.get("values", [])
    found = False
    for r in rows:
        if len(r) > 3 and "daniel.rojas@dole.com" in r[3]:
            print(f"USER_FOUND={r[1]}|{r[2]}|{r[3]}")
            found = True
            break
    if not found:
        print("USER_FOUND=FALSE")

if __name__ == "__main__":
    main()

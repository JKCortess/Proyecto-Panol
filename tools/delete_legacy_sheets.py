import os
import sys
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from dotenv import load_dotenv

# Load env from app/.env.local (where PANOL_DB_SPREADSHEET_ID is)
# Or assume run from root and load .env
load_dotenv('app/.env.local')

SPREADSHEET_ID = os.getenv('PANOL_DB_SPREADSHEET_ID')
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

def get_creds():
    creds = None
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
    return creds

def delete_sheets():
    if not SPREADSHEET_ID:
        print("Error: SPREADSHEET_ID not found in environment.")
        return

    creds = get_creds()
    if not creds:
        print("Error: Could not obtain credentials.")
        return

    try:
        service = build('sheets', 'v4', credentials=creds)
        
        # Get sheet IDs by title
        print(f"Accesing Spreadsheet: {SPREADSHEET_ID}...")
        spreadsheet_meta = service.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()
        sheets = spreadsheet_meta.get('sheets', [])
        
        sheet_ids_to_delete = []
        titles_to_delete = ['PEDIDOS', 'PEDIDOS_ITEMS']
        
        for sheet in sheets:
            title = sheet['properties']['title']
            if title in titles_to_delete:
                sheet_ids_to_delete.append(sheet['properties']['sheetId'])
                print(f"FOUND: Sheet '{title}' (ID: {sheet['properties']['sheetId']}) - MARKED FOR DELETION")
            else:
                print(f"KEEP:  Sheet '{title}'")
                
        if not sheet_ids_to_delete:
            print("No legacy sheets found to delete.")
            return

        requests = []
        for sheet_id in sheet_ids_to_delete:
            requests.append({
                "deleteSheet": {
                    "sheetId": sheet_id
                }
            })
            
        body = {
            'requests': requests
        }
        
        # Execute batch update
        response = service.spreadsheets().batchUpdate(
            spreadsheetId=SPREADSHEET_ID,
            body=body
        ).execute()
        
        print(f"\nSUCCESS: Deleted {len(sheet_ids_to_delete)} sheets.")
        
    except Exception as e:
        print(f"\nERROR: {e}")

if __name__ == '__main__':
    delete_sheets()

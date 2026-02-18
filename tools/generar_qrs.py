"""
generar_qrs.py — Genera códigos QR para cada ítem y los sube a Google Drive.
"""
import io
import json
import os
import sys
import qrcode
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

TOKEN_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "token.json")
ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
QR_FOLDER_NAME = "Pañol_QRs"

def get_creds():
    with open(TOKEN_PATH, "r") as f:
        td = json.load(f)
    creds = Credentials(token=td["token"], refresh_token=td["refresh_token"],
                        token_uri=td["token_uri"], client_id=td["client_id"],
                        client_secret=td["client_secret"], scopes=td.get("scopes", []))
    if creds.expired or not creds.valid:
        creds.refresh(Request())
        td["token"] = creds.token
        with open(TOKEN_PATH, "w") as f: json.dump(td, f)
    return creds

def get_sid():
    with open(ENV_PATH, "r") as f:
        for line in f:
            if "PANOL_DB_SPREADSHEET_ID=" in line:
                return line.strip().split("=", 1)[1]

def get_or_create_folder(drive_service, folder_name):
    q = f"mimeType='application/vnd.google-apps.folder' and name='{folder_name}' and trashed=false"
    res = drive_service.files().list(q=q, fields="files(id)").execute()
    files = res.get("files", [])
    if files:
        return files[0]["id"]
    else:
        file_metadata = {
            "name": folder_name,
            "mimeType": "application/vnd.google-apps.folder"
        }
        folder = drive_service.files().create(body=file_metadata, fields="id").execute()
        print(f"📁 Carpeta creada: {folder_name} (ID: {folder['id']})")
        return folder["id"]

def generate_qr_image(sku):
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(sku)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf

def upload_qr(drive_service, folder_id, sku, buf):
    file_metadata = {
        "name": f"{sku}.png",
        "parents": [folder_id]
    }
    media = MediaIoBaseUpload(buf, mimetype="image/png", resumable=True)
    file = drive_service.files().create(body=file_metadata, media_body=media, fields="id, webViewLink, webContentLink").execute()
    
    # Make public so AppSheet can see it (optional, but often needed generally)
    # Actually, let's keep it restricted for now or share with "anyone with link" if AppSheet needs it
    # AppSheet with signed-in user usually can access if user has access.
    # But let's verify if we need to set permissions.
    # For simplicity, we just return the link.
    permission = {
        "type": "anyone",
        "role": "reader"
    }
    drive_service.permissions().create(fileId=file["id"], body=permission).execute()

    return file["webContentLink"]  # This is usually the direct download link

def main():
    print("=" * 60)
    print("  📷 Generando Códigos QR — Pañol_DB")
    print("=" * 60)

    creds = get_creds()
    sheets = build("sheets", "v4", credentials=creds)
    drive = build("drive", "v3", credentials=creds)
    sid = get_sid()

    # 1. Start - Get Items
    print("📥 Leyendo SKUs desde Google Sheets...")
    res = sheets.spreadsheets().values().get(spreadsheetId=sid, range="ITEMS!A2:A").execute()
    rows = res.get("values", [])
    skus = [r[0] for r in rows if r]
    print(f"   ✅ {len(skus)} SKUs encontrados")

    # 2. Prepare Folder
    folder_id = get_or_create_folder(drive, QR_FOLDER_NAME)

    # 3. Process
    updates = []
    print("🔄 Generando y subiendo imágenes...")
    
    # Get existing Link_Foto to skip if already present
    link_res = sheets.spreadsheets().values().get(spreadsheetId=sid, range=f"ITEMS!G2:G{len(skus)+1}").execute()
    existing_links = link_res.get("values", [])
    
    processed_count = 0
    skipped_count = 0

    for i, sku in enumerate(skus):
        # Check if link exists
        current_link = ""
        if i < len(existing_links) and len(existing_links[i]) > 0:
            current_link = existing_links[i][0]
        
        if current_link:
            skipped_count += 1
            updates.append([current_link]) # Keep existing
            continue

        print(f"   Generating QR for: {sku}")
        try:
            buf = generate_qr_image(sku)
            link = upload_qr(drive, folder_id, sku, buf)
            updates.append([link])
            processed_count += 1
        except Exception as e:
            print(f"   ❌ Error con {sku}: {e}")
            updates.append(["ERROR"]) # Placeholder

    # 4. Batch Update Sheet
    if processed_count > 0:
        print(f"📤 Actualizando {processed_count} filas en Sheet...")
        body = {
            "values": updates
        }
        sheets.spreadsheets().values().update(
            spreadsheetId=sid, 
            range="ITEMS!G2", 
            valueInputOption="USER_ENTERED", 
            body=body
        ).execute()
        print("✅ Columna Link_Foto actualizada")
    else:
        print("⏩ No hubo nuevos QRs para generar.")

    print(f"\n🎉 Proceso completado: {processed_count} nuevos, {skipped_count} saltados.")

if __name__ == "__main__":
    main()

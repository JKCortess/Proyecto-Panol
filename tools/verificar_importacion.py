"""
verificar_importacion.py — Verifica la importación de datos.
"""
import json
import os
import warnings
warnings.filterwarnings("ignore")

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

TOKEN_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "token.json")
ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")

def get_creds():
    with open(TOKEN_PATH, "r") as f:
        td = json.load(f)
    creds = Credentials(
        token=td["token"], refresh_token=td["refresh_token"],
        token_uri=td["token_uri"], client_id=td["client_id"],
        client_secret=td["client_secret"],
        scopes=td.get("scopes", []),
    )
    if creds.expired or not creds.valid:
        creds.refresh(Request())
        td["token"] = creds.token
        td["expiry"] = creds.expiry.isoformat() + "Z" if creds.expiry else None
        with open(TOKEN_PATH, "w") as f:
            json.dump(td, f)
    return creds

def get_sid():
    with open(ENV_PATH, "r") as f:
        for line in f:
            if "PANOL_DB_SPREADSHEET_ID=" in line:
                return line.strip().split("=", 1)[1]

def main():
    creds = get_creds()
    svc = build("sheets", "v4", credentials=creds)
    sid = get_sid()
    
    print("=" * 60)
    print("  🔍 Verificación Post-Importación")
    print("=" * 60)
    
    # Check ITEMS
    res = svc.spreadsheets().values().get(spreadsheetId=sid, range="'ITEMS'!A1:J170").execute()
    rows = res.get("values", [])
    print(f"\n📦 ITEMS: {len(rows)-1} registros (excl. header)")
    print(f"   Header: {rows[0]}")
    print(f"   Primeros 3 ítems:")
    for r in rows[1:4]:
        print(f"     SKU={r[0]} | {r[1]} | Stock={r[3]} | Cat={r[2]} | Ubi={r[5]} | Clas={r[7]}")
    
    # Count categories
    cats = {}
    for r in rows[1:]:
        c = r[2] if len(r) > 2 else "?"
        cats[c] = cats.get(c, 0) + 1
    print(f"\n   Categorías:")
    for c, n in sorted(cats.items(), key=lambda x: -x[1]):
        print(f"     {c}: {n}")
    
    # Count critical
    crit = sum(1 for r in rows[1:] if len(r) > 7 and r[7] == "Crítico")
    print(f"\n   Ítems Críticos: {crit}")
    
    # Check USUARIOS
    res = svc.spreadsheets().values().get(spreadsheetId=sid, range="'USUARIOS'!A1:D10").execute()
    urows = res.get("values", [])
    print(f"\n👥 USUARIOS: {len(urows)-1} registros")
    for r in urows[1:]:
        email = r[3] if len(r) > 3 else "[sin email]"
        print(f"   {r[0]} | {r[1]} | Rol: {r[2]} | Email: {email}")
    
    # Check CONFIGURACION
    res = svc.spreadsheets().values().get(spreadsheetId=sid, range="'CONFIGURACION'!A1:C10").execute()
    crows = res.get("values", [])
    print(f"\n⚙️  CONFIGURACION: {len(crows)-1} parámetros")
    
    print()
    print("=" * 60)
    print("  ✅ Verificación completada")
    print(f"  📊 https://docs.google.com/spreadsheets/d/{sid}")
    print("=" * 60)

if __name__ == "__main__":
    main()

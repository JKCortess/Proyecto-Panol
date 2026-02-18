"""
Script para generar token.json con OAuth2 para la cuenta panoldolemolina@gmail.com
Este script abre el navegador, pide autorización, y genera el token.json
"""

import json
import os
from google_auth_oauthlib.flow import InstalledAppFlow

# === CONFIGURACIÓN ===
CLIENT_ID = "773461887870-mik1okrenu3u76j3kivo6ujn88clu4t9.apps.googleusercontent.com"
CLIENT_SECRET = "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"
PROJECT_ID = "proyectopanol"

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

# Construir la configuración del cliente OAuth como diccionario
# (equivale a descargar el JSON de credenciales de Google Cloud Console)
client_config = {
    "installed": {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "project_id": PROJECT_ID,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "redirect_uris": ["http://localhost"],
    }
}

def main():
    print("=" * 60)
    print("🔑 Generador de Token OAuth2 - Pañol MRO")
    print("=" * 60)
    print()
    print("⚠️  IMPORTANTE: Cuando se abra el navegador,")
    print("   inicia sesión con: panoldolemolina@gmail.com")
    print()
    print("   Si aparece 'Google no ha verificado esta app',")
    print("   click en 'Avanzado' → 'Ir a Panol MRO (no seguro)'")
    print()
    print("   Luego acepta TODOS los permisos solicitados.")
    print("=" * 60)
    print()

    # Ejecutar el flujo OAuth2
    flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
    credentials = flow.run_local_server(port=8090, prompt="consent")

    # Construir el token.json en el formato que usa el proyecto
    token_data = {
        "token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_uri": credentials.token_uri,
        "client_id": credentials.client_id,
        "client_secret": credentials.client_secret,
        "scopes": list(credentials.scopes),
        "universe_domain": "googleapis.com",
        "account": "panoldolemolina@gmail.com",
        "expiry": credentials.expiry.isoformat() + "Z" if credentials.expiry else None,
    }

    # Guardar en la raíz del proyecto
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Guardar token.json en la raíz
    root_token_path = os.path.join(root_dir, "token.json")
    with open(root_token_path, "w") as f:
        json.dump(token_data, f)
    print(f"\n✅ Token guardado en: {root_token_path}")

    # Guardar token.json en /app
    app_token_path = os.path.join(root_dir, "app", "token.json")
    with open(app_token_path, "w") as f:
        json.dump(token_data, f)
    print(f"✅ Token guardado en: {app_token_path}")

    print()
    print("=" * 60)
    print("🎉 ¡Token generado exitosamente!")
    print(f"   Cuenta: panoldolemolina@gmail.com")
    print(f"   Scopes: Sheets + Drive")
    print(f"   Refresh Token: {'✅ Presente' if credentials.refresh_token else '❌ NO PRESENTE'}")
    print("=" * 60)

if __name__ == "__main__":
    main()

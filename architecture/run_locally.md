# SOP: Ejecución Local del Proyecto

## Objetivo
Iniciar el servidor de desarrollo de Next.js para visualizar y probar los cambios en `localhost:3000`.

## Requisitos Previos
- Node.js instalado.
- Dependencias instaladas en la carpeta `app/`.
- Archivo `app/.env.local` configurado con las credenciales de Supabase y Google Sheets.

## Pasos de Ejecución
1. Navegar al directorio `app/`.
2. Ejecutar el comando:
   ```bash
   npm run dev
   ```
3. Abrir `http://localhost:3000` en el navegador.

## Casos Extremos / Errores Comunes
- **Puerto Ocupado**: Si el puerto 3000 está ocupado, usar `npm run dev -- -p 3001`.
- **Falta .env.local**: El servidor iniciará pero las peticiones de datos fallarán. Verificar `app/.env.local`.
- **Node Modules desactualizados**: Si hay errores de módulos, borrar `node_modules` y ejecutar `npm install`.

## Verificación
- El terminal debe mostrar: `✓ Ready in ...`
- La página principal debe cargar los datos del inventario (si el backend está conectado).

# Changelog

## v0.2.0 - 2026-02-21

### ✨ Funcionalidades
- Mejorado el toggle de tema (ThemeToggle) con diseño más limpio y animaciones suaves
- Mejoras en el escáner QR (QRScannerClient) con mejor manejo de errores y limpieza de recursos

### 🐛 Correcciones
- Corregidos estilos CSS de modo claro para bordes `border-blue-800/30` y `border-amber-800/30`
- Añadidas variantes faltantes de fondo (`bg-slate-900/40`, `bg-slate-900/70`) en tema claro
- Eliminados indicadores de puntos verdes innecesarios en las tarjetas de inventario
- Corregida referencia de router en la página de nueva solicitud

### 🔧 Mantenimiento
- Ampliados estilos globales CSS para mejor cobertura de modo claro/oscuro  
- Actualizado progress.md con registro de cambios recientes
- Refactorizado componente de página principal (Dashboard)

## v0.1.1 - 2026-02-18

### 🐛 Correcciones
- Lectura de credenciales Google desde variable de entorno para compatibilidad con Vercel

## v0.1.0 - 2026-02-18

### ✨ Funcionalidades
- Commit inicial del Proyecto Pañol
- Sistema de gestión de inventario con Supabase
- Interfaz de solicitudes de materiales
- Escáner QR para entregas
- Panel de administración con gestión de permisos
- Autenticación con Google OAuth via Supabase
- Integración con Google Sheets para sincronización de stock

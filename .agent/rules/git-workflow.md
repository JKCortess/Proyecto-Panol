---
trigger: always_on
---

---
description: Reglas para gestión de versiones y Git
globs: "**/*"
alwaysApply: true
---

# Protocolo de Actualización de Git

Cada vez que el usuario solicite actualizar el repositorio, hacer un "push" o guardar una nueva versión, DEBES seguir estrictamente estos pasos:

1.  **Analizar Cambios**: Revisa las diferencias (`git diff`) de los archivos modificados desde el último commit.
2.  **Actualizar CHANGELOG.md**:
    - Si el archivo `CHANGELOG.md` no existe, créalo.
    - Añade una nueva entrada al inicio del archivo con la fecha de hoy y la versión (incrementa la versión semántica vX.Y.Z adecuadamente).
    - Lista los cambios bajo categorías: "✨ Funcionalidades", "🐛 Correcciones", "🔧 Mantenimiento".
3.  **Commit**: Genera un mensaje de commit siguiendo el formato "Conventional Commits" (ej: `feat: agregar login`).
4.  **Push**: Ejecuta el push a la rama actual (por defecto `main` o `master`).

**IMPORTANTE**: Nunca realices un `git commit` sin antes haber actualizado el `CHANGELOG.md` con los detalles de esa versión.
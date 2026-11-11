# Casa Irati: formulario + administración

## Archivos
- `index.html`: formulario público y cálculo en directo.
- `admin.html`: inicio de sesión y gestión de precios, opciones y solicitudes.
- `config.js`: URL y clave pública de Supabase.
- `02-seguridad-y-funciones.sql`: políticas de administrador y función segura para guardar solicitudes.

## Pasos para ponerlo en marcha
1. En Supabase > Authentication > Users, crea un usuario administrador (Add user) con email y contraseña. Copia su **User UID**.
2. En `02-seguridad-y-funciones.sql`, sustituye `EL-UUID-DEL-USUARIO` por ese UID y ejecuta el script completo en SQL Editor. Si ya lo ejecutaste, no lo vuelvas a ejecutar sin adaptar las políticas.
3. En Supabase > Project Settings > API Keys, copia la **Project URL** y la **publishable key** (o anon key), y sustitúyelas en `config.js`. **Nunca pongas una secret key/service_role ni la contraseña de PostgreSQL en un archivo web.**
4. Publica los archivos HTML/CSS/JS juntos en un hosting estático HTTPS (GitHub Pages, Netlify, etc.). Para pruebas locales, ejecuta `python3 -m http.server 8000` dentro de la carpeta y abre `http://localhost:8000`.
5. Prueba un presupuesto y verifica que se guarda en `solicitudes`. Entra a `admin.html` con el usuario creado.

## Antes de publicar para clientes reales
- Incorporar aviso de privacidad y textos legales de Casa Irati, y validar su base legal de tratamiento.
- Implementar CAPTCHA/Turnstile y limitación de frecuencia en un backend o Edge Function para proteger el formulario público del spam. La función SQL de esta versión no incluye antispam.
- Configurar notificaciones por correo desde un backend/Edge Function si se quieren avisos automáticos; esta versión guarda las solicitudes, pero **no envía correos**.
- Confirmar precios reales, qué incluye el cálculo, IVA, y costes de transporte/cimentación/licencias.
- La gestión actual permite editar opciones existentes y añadir nuevas; desactivar una opción equivale a ocultarla al público.
- Si la Data API está deshabilitada o no expone `public`, habilita el acceso al esquema necesario en Supabase. Mantén RLS y permisos.

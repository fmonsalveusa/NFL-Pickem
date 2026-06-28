# 🏈 NFL Pick'Em — Guía de instalación

App estilo CBS Pick'Em para grupos privados. PWA instalable en móvil.

---

## Stack
- **Frontend:** React 18 + Vite (PWA installable)
- **Auth + DB:** Supabase
- **NFL Data:** ESPN API pública (gratis, sin key)
- **Pagos:** Coordinados fuera de la app (Zelle/Venmo)

---

## Paso 1 — Supabase

1. Crea una cuenta en [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Ve a **SQL Editor** y ejecuta todo el contenido de `supabase-schema.sql`
4. Ve a **Settings → API** y copia:
   - `Project URL`
   - `anon public key`

---

## Paso 2 — Variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus valores:

```env
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_APP_URL=http://localhost:3000
```

---

## Paso 3 — Instalar y correr

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## Paso 4 — Supabase Auth (email)

En Supabase → **Authentication → Settings**:
- Email confirmations: puedes desactivar para desarrollo
- Site URL: `http://localhost:3000` (producción: tu dominio)

---

## Flujo de uso

### Como jugador:
1. Regístrate con email + contraseña
2. Crea un grupo o únete con código
3. Selecciona tu pick en cada juego de la semana
4. Predice el marcador total del Monday Night (desempate)
5. Guarda picks antes del kickoff del jueves

### Como admin del grupo:
1. Crea el grupo → comparte el código de 8 letras
2. Marca quién ha pagado el entry fee (en la pestaña Admin)
3. Al final de cada semana, los resultados se actualizan automáticamente via ESPN API
4. En caso de error, puedes corregir resultados manualmente desde Admin

---

## Reglas de puntos (configurable en `supabase-schema.sql`)

- Pick correcto: **10 puntos** (ajustable)
- Pick incorrecto: **0 puntos**
- Empate de puntos: gana quien predijo el total del **Monday Night** más cercano
- Si hay empate en tiebreaker también: se reparte el premio

---

## Deploy a producción

```bash
npm run build
```

Sube la carpeta `dist/` a:
- **Vercel** (recomendado): conecta el repo y despliega automático
- **Netlify:** arrastra la carpeta `dist/`
- **Cualquier hosting estático**

En producción actualiza:
- `VITE_APP_URL` en `.env`
- Site URL en Supabase Auth settings

---

## Estructura del proyecto

```
src/
  components/
    GameCard/        ← Card CBS-style con logos NFL
  pages/
    AuthPage.jsx     ← Login + registro
    PicksPage.jsx    ← Pantalla principal de picks
    LeaderboardPage.jsx ← Tabla de posiciones
    GroupsPage.jsx   ← Crear/unirse a grupos
    AdminPage.jsx    ← Panel del admin
  hooks/
    useAuth.jsx      ← Context de autenticación
  lib/
    supabase.js      ← Cliente + todas las queries
    teams.js         ← Colores y logos de los 32 equipos
  styles/
    global.css       ← Design system completo
supabase-schema.sql  ← Tablas, vistas, RLS, funciones
```

---

## Próximos pasos opcionales

- [ ] Stripe para cobrar entry fees directamente en la app
- [ ] Notificaciones push (recordatorio antes del kickoff)
- [ ] Historial de temporadas anteriores
- [ ] Picks automáticos (autofill con el favorito de Las Vegas)
- [ ] Compartir resultados en WhatsApp

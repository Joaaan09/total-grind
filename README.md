# Total Grind - Tracker de Entrenamiento de Powerlifting

Total Grind es una aplicación web completa diseñada para powerlifters y entrenadores para realizar un seguimiento de los bloques de entrenamiento, el progreso y las estimaciones de 1RM. Soporta tanto el seguimiento individual de atletas como sistemas de gestión entrenador-atleta.

## Características

### 🏋️ Para Atletas
- **Bloques de Entrenamiento**: Crea y gestiona bloques de entrenamiento de varias semanas.
- **Registro de Entrenamientos**: Registra series, repeticiones, RPE y pesos para cada ejercicio.
- **Seguimiento del Progreso**: Visualiza tu progreso con gráficos para el 1RM estimado (e1RM) y máximos reales en movimientos de competición (Sentadilla, Press de Banca, Peso Muerto).
- **Cálculos Automáticos**: Cálculo automático del e1RM basado en el RPE y las repeticiones.

### 👨‍🏫 Para Entrenadores
- **Gestión de Atletas**: Invita a atletas a tu equipo mediante correo electrónico.
- **Asignación de Programas**: Crea bloques de entrenamiento y asígnalos directamente a tus atletas.
- **Monitoreo del Progreso**: Visualiza los registros de entrenamiento y gráficos de progreso de tus atletas en tiempo real.

## Tecnologías

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Recharts, Lucide React
- **Backend**: Node.js, Express, MongoDB, Mongoose, Autenticación JWT
- **Almacenamiento**: Almacenamiento local de archivos para fotos de perfil
- **Despliegue**: Docker, Docker Compose, Nginx

---

## 🚀 Despliegue con Docker (Producción)

### Requisitos
- Docker y Docker Compose instalados
- Red de Docker `reverse_proxy_network` existente (para Nginx Proxy Manager)

### Pasos

1. **Clonar el repositorio**
```bash
git clone https://github.com/Joaaan09/total-grind.git
cd total-grind
```

2. **Configurar variables de entorno** (opcional)
```bash
# Editar JWT_SECRET en docker-compose.yml o crear archivo .env
export JWT_SECRET=tu-secreto-super-seguro
```

3. **Levantar los contenedores**
```bash
docker compose up -d
```

4. **Verificar que todo funciona**
```bash
docker compose ps
docker compose logs backend --tail 20
```

### Servicios
| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| frontend | 80 | React app con Nginx |
| backend | 5000 | API Node.js/Express |
| mongodb | 27017 | Base de datos MongoDB |

### Configurar Nginx Proxy Manager
- **Domain**: tu-dominio.com
- **Forward Hostname**: `totalgrind-frontend`
- **Forward Port**: `80`

---

## 💻 Desarrollo Local

### Requisitos
- [Node.js](https://nodejs.org/) (v16 o superior)
- [MongoDB](https://www.mongodb.com/try/download/community) instalado y ejecutándose localmente

### 1. Configuración del Backend
```bash
cd server
npm install
```

Crea un archivo `.env` en el directorio `server`:
```bash
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/powerlift-pro
JWT_SECRET=tu_secreto_super_seguro
```

Inicia el servidor:
```bash
npm start
```

### 2. Configuración del Frontend
```bash
cd ..  # si estás en server/
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

---

## Guía de Uso

1. **Registrarse**: Crea una cuenta como Atleta.
2. **Dashboard**: Consulta tus bloques activos y tu progreso reciente.
3. **Entrenamiento**: Crea un nuevo Bloque, añade semanas y registra tus días.
4. **Perfil**: Sube una foto de perfil, cambia tu nombre o cambia de rol.
5. **Modo Entrenador**: Ve a Perfil -> Convertirse en Entrenador para empezar a gestionar atletas.

## Solución de Problemas

- **¿No cargan las imágenes?** Asegúrate de que el backend se está ejecutando.
- **¿Conexión rechazada?** Comprueba si MongoDB se está ejecutando.
- **¿Error 502 en producción?** Revisa los logs: `docker compose logs backend`

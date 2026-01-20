require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const TrainingBlock = require('./models/TrainingBlock');
const Progress = require('./models/Progress');
const User = require('./models/User');
const authRoutes = require('./routes/auth');
const { authMiddleware } = require('./middleware/authMiddleware');

const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Configurar almacenamiento de Multer para subida de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads/profiles';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // userId-timestamp.extension
    cb(null, req.user._id + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // Límite de 5MB
});

const app = express();

// Trust Proxy (Necesario porque estamos detrás de Nginx / Docker)
app.set('trust proxy', 1);

const PORT = process.env.PORT || 5000;
// Usar 127.0.0.1 en lugar de localhost para evitar problemas de resolución IPv6 en Node 17+
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/totalgrind';

// ===== SEGURIDAD =====

// Helmet - headers de seguridad HTTP
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Permitir carga de imágenes
}));

// CORS - restringido en producción
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://total-grind.duckdns.org', 'http://total-grind.duckdns.org']
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (ej. mobile apps, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS not allowed'), false);
  },
  credentials: true
}));

// Rate limiting - prevenir ataques de fuerza bruta
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // máximo 20 intentos por IP
  message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // 100 requests por minuto
  message: { error: 'Demasiadas peticiones. Intenta más tarde.' },
});

app.use(generalLimiter);
app.use(express.json({ limit: '50mb' }));

// ===== RUTAS =====

// Rutas de Autenticación (con rate limiting extra)
app.use('/api/auth', authLimiter, authRoutes);

// Servir archivos subidos estáticamente
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// --- RUTAS ---

// Verificación de estado del servidor
app.get('/', (req, res) => {
  res.send('TotalGrind API is running');
});

// Endpoint para subir avatar de usuario
app.post('/api/user/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const user = await User.findById(req.user._id);

    // Eliminar avatar anterior si existe y es local
    if (user.profilePicture && user.profilePicture.startsWith('/uploads')) {
      const oldPath = path.join(__dirname, user.profilePicture);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Establecer nueva ruta relativa a la raíz del servidor
    // Nota: Añadimos / al inicio para hacerlo ruta absoluta relativa al dominio
    const newPath = '/uploads/profiles/' + req.file.filename;
    // console.log('Saving profile picture path:', newPath);
    user.profilePicture = newPath;

    // Marcar explícitamente como modificado (aunque no es necesario para asignación directa)
    user.markModified('profilePicture');

    await user.save();
    // console.log('User saved. Profile Picture in DB:', user.profilePicture);

    res.json({
      success: true,
      profilePicture: user.profilePicture
    });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener Bloques (Protegido)
app.get('/api/blocks', authMiddleware, async (req, res) => {
  try {
    const blocks = await TrainingBlock.find({ ownerId: req.user._id.toString() });
    res.json(blocks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar perfil de usuario (Solo Nombre - Foto se maneja en /avatar)
app.put('/api/user/profile', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'No data to update' });
    }

    const user = await User.findById(req.user._id);
    user.name = name;
    await user.save();

    res.json({
      success: true,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cambiar Contraseña
app.put('/api/user/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id);

    // Verificar contraseña actual
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    // Establecer nueva contraseña (el hash se hace en el hook pre-save)
    user.password = newPassword;
    await user.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear Bloque (Protegido)
app.post('/api/blocks', authMiddleware, async (req, res) => {
  try {
    const { title, source, weeks, startDate } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'El título es requerido' });
    }

    const newBlock = new TrainingBlock({
      title,
      ownerId: req.user._id.toString(),
      source: source || 'personal',
      startDate: startDate || new Date().toISOString().split('T')[0],
      weeks: weeks || [{
        weekNumber: 1,
        days: [{
          dayName: 'Día 1',
          isCompleted: false,
          exercises: []
        }]
      }]
    });

    await newBlock.save();
    res.status(201).json(newBlock);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Actualizar Bloque (Protegido)
app.put('/api/blocks/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Verificar que el usuario es dueño del bloque
    const block = await TrainingBlock.findOne({ _id: id });
    if (!block) return res.status(404).json({ error: "Block not found" });

    const isOwner = block.ownerId.toString() === req.user._id.toString();
    const owner = await User.findById(block.ownerId);
    const isCoach = owner && owner.coachId && owner.coachId.toString() === req.user._id.toString();

    if (!isOwner && !isCoach) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Restricción: Los bloques asignados no pueden ser editados estructuralmente por el atleta (solo por el entrenador)
    if (isOwner && block.source === 'assigned') {
      // Si el usuario es Dueño (Atleta) Y el bloque es asignado -> PROHIBIR
      return res.status(403).json({ error: "Cannot edit assigned blocks. Contact your coach for changes." });
    }
    // El entrenador puede editar todo. El atleta puede editar bloques personales.

    // Actualizar campos simples
    if (updateData.title !== undefined) block.title = updateData.title;
    if (updateData.startDate !== undefined) block.startDate = updateData.startDate;
    if (updateData.source !== undefined) block.source = updateData.source;
    if (updateData.assignedBy !== undefined) block.assignedBy = updateData.assignedBy;

    // Actualizar array de semanas - necesita marcar como modificado para que Mongoose detecte cambios
    if (updateData.weeks !== undefined) {
      block.weeks = updateData.weeks;
      block.markModified('weeks');
    }

    await block.save();
    res.json(block);
  } catch (err) {
    console.error('Error updating block:', err);
    res.status(500).json({ error: err.message });
  }
});

// Eliminar Bloque (Protegido: Dueño o Entrenador)
app.delete('/api/blocks/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id.toString();

    // Buscar bloque primero
    const block = await TrainingBlock.findById(id);
    if (!block) {
      return res.status(404).json({ error: "Block not found" });
    }

    // Verificar propiedad
    if (block.ownerId === userId) {
      await TrainingBlock.deleteOne({ _id: id });
      return res.json({ success: true });
    }

    // Verificar si el solicitante es entrenador del dueño
    const owner = await User.findById(block.ownerId);
    if (owner && owner.coachId && owner.coachId.toString() === userId) {
      await TrainingBlock.deleteOne({ _id: id });
      return res.json({ success: true });
    }

    return res.status(403).json({ error: "Unauthorized to delete this block" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar día específico (Actualización anidada profunda simplificada para MVP)
app.put('/api/days/:dayId', authMiddleware, async (req, res) => {
  try {
    const { dayId } = req.params;
    const dayData = req.body; // Espera el objeto Day completo
    const userId = req.user._id.toString();

    // Buscar bloques de este usuario
    const blocks = await TrainingBlock.find({ ownerId: userId });

    let found = false;
    let targetBlock = null;

    // Buscar en todos los bloques para encontrar el día
    for (const block of blocks) {
      for (const week of block.weeks) {
        for (let i = 0; i < week.days.length; i++) {
          const day = week.days[i];
          // Verificar tanto _id de MongoDB como campo id personalizado
          if (day._id.toString() === dayId || day.id === dayId) {
            week.days[i].exercises = dayData.exercises;
            week.days[i].isCompleted = true;
            found = true;
            targetBlock = block;
            break;
          }
        }
        if (found) break;
      }
      if (found) break;
    }

    if (found && targetBlock) {
      targetBlock.markModified('weeks');
      await targetBlock.save();

      // Generar datos de progreso de ejercicios completados (solo levantamientos de competición)
      const today = new Date().toISOString().split('T')[0];
      const COMPETITION_LIFTS = ['Comp SQ', 'Comp BP', 'Comp DL'];

      for (const exercise of dayData.exercises) {
        // Solo rastrear levantamientos de competición
        if (!COMPETITION_LIFTS.includes(exercise.name)) continue;
        if (!exercise.sets || exercise.sets.length === 0) continue;

        // Encontrar el mejor e1RM y máx real de las series de este ejercicio
        let bestE1RM = 0;
        let actualMax = 0;

        for (const set of exercise.sets) {
          if (set.weight && set.reps) {
            const weight = Number(set.weight);
            const reps = Number(set.reps);

            if (!isNaN(weight) && !isNaN(reps) && reps > 0 && weight > 0) {
              // Rastrear máximo real (mayor peso levantado)
              if (weight > actualMax) {
                actualMax = weight;
              }

              // Nueva fórmula: 1RM = Peso * (1 + (Reps + (10 - RPE)) / 30)
              const rpe = Number(set.rpe) || 10;
              const e1rm = Math.round(weight * (1 + (reps + (10 - rpe)) / 30));
              if (e1rm > bestE1RM) {
                bestE1RM = e1rm;
              }
            }
          }
        }

        // Guardar progreso si tenemos datos válidos
        if (bestE1RM > 0 || actualMax > 0) {
          let progress = await Progress.findOne({ userId, exerciseName: exercise.name });

          if (!progress) {
            progress = new Progress({
              userId,
              exerciseName: exercise.name,
              history: []
            });
          }

          // Verificar si ya tenemos una entrada para hoy
          const existingEntryIndex = progress.history.findIndex(h => h.date === today);
          if (existingEntryIndex >= 0) {
            const entry = progress.history[existingEntryIndex];
            if (bestE1RM > (entry.estimatedMax || 0)) {
              entry.estimatedMax = bestE1RM;
            }
            if (actualMax > (entry.actualMax || 0)) {
              entry.actualMax = actualMax;
            }
          } else {
            progress.history.push({
              date: today,
              estimatedMax: bestE1RM,
              actualMax: actualMax
            });
          }

          progress.markModified('history');
          await progress.save();
        }
      }

      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Day not found" });
    }

  } catch (err) {
    console.error('Error updating day:', err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener Progreso (Protegido)
app.get('/api/progress', authMiddleware, async (req, res) => {
  try {
    const progress = await Progress.find({ userId: req.user._id.toString() });
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener invitaciones del usuario
app.get('/api/user/invites', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user.coachRequests || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Aceptar invitación
app.post('/api/user/invites/:coachId/accept', authMiddleware, async (req, res) => {
  try {
    const { coachId } = req.params;
    const user = await User.findById(req.user._id);
    const coach = await User.findById(coachId);

    if (!coach) return res.status(404).json({ error: 'Coach not found' });

    // Verificar que existe la solicitud
    const requestIndex = user.coachRequests.findIndex(req => req.coachId.toString() === coachId);
    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    // Vincular usuarios
    user.coachId = coachId;
    user.coachRequests = []; // Limpiar todas las solicitudes (límite de 1 entrenador)
    await user.save();

    // Añadir a lista del entrenador si no está presente
    if (!coach.athletes.includes(user._id)) {
      coach.athletes.push(user._id);
      await coach.save();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rechazar invitación
app.post('/api/user/invites/:coachId/reject', authMiddleware, async (req, res) => {
  try {
    const { coachId } = req.params;
    const user = await User.findById(req.user._id);

    user.coachRequests = user.coachRequests.filter(req => req.coachId.toString() !== coachId);
    await user.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============== ENDPOINTS DE ENTRENADOR ==============

// Cambiar rol de usuario a entrenador
app.put('/api/users/role', authMiddleware, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['athlete', 'coach'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await User.findById(req.user._id);
    user.role = role;
    if (role === 'coach') {
      user.athletes = user.athletes || [];
    }
    await user.save();

    res.json({ success: true, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener atletas del entrenador
app.get('/api/coach/athletes', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('athletes', 'name email');
    if (user.role !== 'coach') {
      return res.status(403).json({ error: 'Only coaches can access this' });
    }
    res.json(user.athletes || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Añadir atleta por email
app.post('/api/coach/athletes', authMiddleware, async (req, res) => {
  try {
    const { athleteEmail } = req.body;
    const coach = await User.findById(req.user._id);

    if (coach.role !== 'coach') {
      return res.status(403).json({ error: 'Only coaches can add athletes' });
    }

    const athlete = await User.findOne({ email: athleteEmail.toLowerCase() });
    if (!athlete) {
      return res.status(404).json({ error: 'Athlete not found' });
    }

    if (athlete._id.toString() === coach._id.toString()) {
      return res.status(400).json({ error: 'Cannot add yourself as athlete' });
    }

    // Verificar si ya fue invitado
    const existingRequest = athlete.coachRequests.find(req => req.coachId.toString() === coach._id.toString());
    if (existingRequest) {
      return res.status(400).json({ error: 'Invitation already sent' });
    }

    // Añadir invitación al atleta
    athlete.coachRequests.push({
      coachId: coach._id,
      coachName: coach.name
    });
    await athlete.save();

    res.json({ success: true, message: 'Invitación enviada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar atleta
app.delete('/api/coach/athletes/:athleteId', authMiddleware, async (req, res) => {
  try {
    const { athleteId } = req.params;
    const coach = await User.findById(req.user._id);

    if (coach.role !== 'coach') {
      return res.status(403).json({ error: 'Only coaches can remove athletes' });
    }

    // Eliminar de la lista del entrenador
    coach.athletes = coach.athletes.filter(id => id.toString() !== athleteId);
    await coach.save();

    // Eliminar entrenador del atleta
    const athlete = await User.findById(athleteId);
    if (athlete && athlete.coachId?.toString() === coach._id.toString()) {
      athlete.coachId = null;
      await athlete.save();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener progreso del atleta (para entrenador)
app.get('/api/coach/athletes/:athleteId/progress', authMiddleware, async (req, res) => {
  try {
    const { athleteId } = req.params;
    const coach = await User.findById(req.user._id);

    if (coach.role !== 'coach' || !coach.athletes.includes(athleteId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const progress = await Progress.find({ userId: athleteId });
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener bloques del atleta (para entrenador)
app.get('/api/coach/athletes/:athleteId/blocks', authMiddleware, async (req, res) => {
  try {
    const { athleteId } = req.params;
    const coach = await User.findById(req.user._id);

    if (coach.role !== 'coach' || !coach.athletes.includes(athleteId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const blocks = await TrainingBlock.find({ ownerId: athleteId });
    res.json(blocks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear/Asignar bloque a atleta
app.post('/api/coach/athletes/:athleteId/blocks', authMiddleware, async (req, res) => {
  try {
    const { athleteId } = req.params;
    const coach = await User.findById(req.user._id);

    if (coach.role !== 'coach' || !coach.athletes.includes(athleteId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const blockData = req.body;
    const newBlock = new TrainingBlock({
      ...blockData,
      ownerId: athleteId,
      source: 'assigned',
      assignedBy: coach.name
    });

    await newBlock.save();
    res.status(201).json(newBlock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- INICIALIZACIÓN ---
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.log('Ensure MongoDB is running locally on port 27017 or update MONGO_URI.');
  });
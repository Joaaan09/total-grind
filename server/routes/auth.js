const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authMiddleware, JWT_SECRET } = require('../middleware/authMiddleware');

const router = express.Router();

// Generar Token JWT
const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// @route   POST /api/auth/register
// @desc    Registrar un nuevo usuario
// @access  Público
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, role } = req.body;

        // Validation
        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Por favor, completa todos los campos' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        }

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ error: 'Ya existe una cuenta con este email' });
        }

        // Crear usuario
        const user = new User({
            email: email.toLowerCase(),
            password,
            name,
            role: role || 'athlete'
        });

        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                coachId: user.coachId, // Likely null or ID string initially
                profilePicture: user.profilePicture
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Error al registrar usuario' });
    }
});

// @route   POST /api/auth/login
// @desc    Iniciar sesión de usuario
// @access  Público
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Por favor, ingresa email y contraseña' });
        }

        // Buscar usuario
        // Buscar usuario y popular entrenador
        const user = await User.findOne({ email: email.toLowerCase() }).populate('coachId', 'name email');
        if (!user) {
            return res.status(400).json({ error: 'Credenciales inválidas' });
        }

        // Verificar contraseña
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Credenciales inválidas' });
        }

        // Generate token
        const token = generateToken(user._id);

        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                coachId: user.coachId,
                profilePicture: user.profilePicture
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});

// @route   GET /api/auth/me
// @desc    Obtener usuario actual
// @access  Privado
router.get('/me', authMiddleware, async (req, res) => {
    try {
        // Evitar caché para asegurar que las actualizaciones de foto de perfil se vean inmediatamente
        res.set('Cache-Control', 'no-store');

        console.log('ME Called. User ID:', req.user._id);
        console.log('ME User ProfilePicture:', req.user.profilePicture);

        // Popular detalles del entrenador si está presente
        if (req.user.coachId) {
            await req.user.populate('coachId', 'name email');
        }

        res.json({
            user: {
                id: req.user._id,
                email: req.user.email,
                name: req.user.name,
                role: req.user.role,
                coachId: req.user.coachId,
                profilePicture: req.user.profilePicture
            }
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ error: 'Error al obtener usuario' });
    }
});

module.exports = router;

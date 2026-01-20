require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const TrainingBlock = require('./models/TrainingBlock');
const Progress = require('./models/Progress');
const User = require('./models/User');
const authRoutes = require('./routes/auth');
const { authMiddleware } = require('./middleware/authMiddleware');

const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Configure Multer Storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads/profiles';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // userId-timestamp.ext
    cb(null, req.user._id + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const app = express();
const PORT = process.env.PORT || 5000;
// Use 127.0.0.1 instead of localhost to avoid Node 17+ IPv6 resolution issues
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/powerlift-pro';

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Auth Routes
// Auth Routes
app.use('/api/auth', authRoutes);

// Serve uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// --- ROUTES ---

// Health Check
app.get('/', (req, res) => {
  res.send('TotalGrind API is running');
});

// Upload Avatar Endpoint
app.post('/api/user/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const user = await User.findById(req.user._id);

    // Delete old avatar if it exists and is local
    if (user.profilePicture && user.profilePicture.startsWith('/uploads')) {
      const oldPath = path.join(__dirname, user.profilePicture);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Set new path relative to server root
    // Note: We prepend separator / to make it absolute path relative to domain
    const newPath = '/uploads/profiles/' + req.file.filename;
    // console.log('Saving profile picture path:', newPath);
    user.profilePicture = newPath;

    // Explicitly mark modified (though not needed for direct assignment usually)
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

// Get Blocks (Protected)
app.get('/api/blocks', authMiddleware, async (req, res) => {
  try {
    const blocks = await TrainingBlock.find({ ownerId: req.user._id.toString() });
    res.json(blocks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user profile (Name Only - Picture handled by /avatar)
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

// Change Password
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

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    // Set new password (hashing happens in pre-save hook)
    user.password = newPassword;
    await user.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Block (Protected)
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

// Update Block (Protected)
app.put('/api/blocks/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Ensure user owns the block
    const block = await TrainingBlock.findOne({ _id: id });
    if (!block) return res.status(404).json({ error: "Block not found" });

    const isOwner = block.ownerId.toString() === req.user._id.toString();
    const owner = await User.findById(block.ownerId);
    const isCoach = owner && owner.coachId && owner.coachId.toString() === req.user._id.toString();

    if (!isOwner && !isCoach) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Restriction: Assigned blocks cannot be structurally edited by athlete (only by coach)
    if (isOwner && block.source === 'assigned') {
      // If user is Owner (Athlete) AND block is assigned -> FORBID
      return res.status(403).json({ error: "Cannot edit assigned blocks. Contact your coach for changes." });
    }
    // Coach can edit anything. Athlete can edit personal blocks.

    // Update simple fields
    if (updateData.title !== undefined) block.title = updateData.title;
    if (updateData.startDate !== undefined) block.startDate = updateData.startDate;
    if (updateData.source !== undefined) block.source = updateData.source;
    if (updateData.assignedBy !== undefined) block.assignedBy = updateData.assignedBy;

    // Update weeks array - need to mark as modified for Mongoose to detect changes
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

// Delete Block (Protected: Owner or Coach)
app.delete('/api/blocks/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id.toString();

    // Find block first
    const block = await TrainingBlock.findById(id);
    if (!block) {
      return res.status(404).json({ error: "Block not found" });
    }

    // Check ownership
    if (block.ownerId === userId) {
      await TrainingBlock.deleteOne({ _id: id });
      return res.json({ success: true });
    }

    // Check if requester is coach of the owner
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

// Update specific Day (Deep nested update for simplicity in MVP)
app.put('/api/days/:dayId', authMiddleware, async (req, res) => {
  try {
    const { dayId } = req.params;
    const dayData = req.body; // Expects the full Day object
    const userId = req.user._id.toString();

    // Find blocks owned by this user
    const blocks = await TrainingBlock.find({ ownerId: userId });

    let found = false;
    let targetBlock = null;

    // Search through all blocks to find the day
    for (const block of blocks) {
      for (const week of block.weeks) {
        for (let i = 0; i < week.days.length; i++) {
          const day = week.days[i];
          // Check both MongoDB _id and custom id field
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

      // Generate progress data from completed exercises (only competition lifts)
      const today = new Date().toISOString().split('T')[0];
      const COMPETITION_LIFTS = ['Comp SQ', 'Comp BP', 'Comp DL'];

      for (const exercise of dayData.exercises) {
        // Only track competition lifts
        if (!COMPETITION_LIFTS.includes(exercise.name)) continue;
        if (!exercise.sets || exercise.sets.length === 0) continue;

        // Find the best e1RM and actual max from this exercise's sets
        let bestE1RM = 0;
        let actualMax = 0;

        for (const set of exercise.sets) {
          if (set.weight && set.reps) {
            const weight = Number(set.weight);
            const reps = Number(set.reps);

            if (!isNaN(weight) && !isNaN(reps) && reps > 0 && weight > 0) {
              // Track actual max (highest weight lifted)
              if (weight > actualMax) {
                actualMax = weight;
              }

              // New Formula: 1RM = Weight * (1 + (Reps + (10 - RPE)) / 30)
              const rpe = Number(set.rpe) || 10;
              const e1rm = Math.round(weight * (1 + (reps + (10 - rpe)) / 30));
              if (e1rm > bestE1RM) {
                bestE1RM = e1rm;
              }
            }
          }
        }

        // Save progress if we have valid data
        if (bestE1RM > 0 || actualMax > 0) {
          let progress = await Progress.findOne({ userId, exerciseName: exercise.name });

          if (!progress) {
            progress = new Progress({
              userId,
              exerciseName: exercise.name,
              history: []
            });
          }

          // Check if we already have an entry for today
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

// Get Progress (Protected)
app.get('/api/progress', authMiddleware, async (req, res) => {
  try {
    const progress = await Progress.find({ userId: req.user._id.toString() });
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user invites
app.get('/api/user/invites', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user.coachRequests || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Accept invite
app.post('/api/user/invites/:coachId/accept', authMiddleware, async (req, res) => {
  try {
    const { coachId } = req.params;
    const user = await User.findById(req.user._id);
    const coach = await User.findById(coachId);

    if (!coach) return res.status(404).json({ error: 'Coach not found' });

    // Verify request exists
    const requestIndex = user.coachRequests.findIndex(req => req.coachId.toString() === coachId);
    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    // Link users
    user.coachId = coachId;
    user.coachRequests = []; // Clear all requests (1 coach limit)
    await user.save();

    // Add to coach list if not present
    if (!coach.athletes.includes(user._id)) {
      coach.athletes.push(user._id);
      await coach.save();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject invite
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

// ============== COACH ENDPOINTS ==============

// Change user role to coach
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

// Get coach's athletes
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

// Add athlete by email
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

    // Check if already invited
    const existingRequest = athlete.coachRequests.find(req => req.coachId.toString() === coach._id.toString());
    if (existingRequest) {
      return res.status(400).json({ error: 'Invitation already sent' });
    }

    // Add invitation to athlete
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

// Remove athlete
app.delete('/api/coach/athletes/:athleteId', authMiddleware, async (req, res) => {
  try {
    const { athleteId } = req.params;
    const coach = await User.findById(req.user._id);

    if (coach.role !== 'coach') {
      return res.status(403).json({ error: 'Only coaches can remove athletes' });
    }

    // Remove from coach's list
    coach.athletes = coach.athletes.filter(id => id.toString() !== athleteId);
    await coach.save();

    // Remove coach from athlete
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

// Get athlete's progress (for coach)
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

// Get athlete's blocks (for coach)
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

// Create/Assign block to athlete
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


// --- INIT ---
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
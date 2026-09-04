import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const router = express.Router();

// ============================================
// REGISTER - New Athlete
// ============================================
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Όλα τα πεδία είναι απαραίτητα' });
    }

    // Check if user exists
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Αυτό το email υπάρχει ήδη' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email.toLowerCase(), hashedPassword, 'athlete']
    );

    const user = result.rows[0];

    // Create athlete bio
    await pool.query(
      'INSERT INTO athlete_bios (athlete_id, selected_blueprint_key) VALUES ($1, $2)',
      [user.id, 'recomp_standard']
    );

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: '✅ Επιτυχής εγγραφή!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Σφάλμα κατά την εγγραφή' });
  }
});

// ============================================
// LOGIN
// ============================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email και κωδικός απαραίτητα' });
    }

    // Find user
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Λάθος στοιχεία σύνδεσης' });
    }

    const user = result.rows[0];

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Λάθος στοιχεία σύνδεσης' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: '✅ Επιτυχής σύνδεση!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Σφάλμα κατά τη σύνδεση' });
  }
});

// ============================================
// COACH LOGIN (Special - Auto-register if first time)
// ============================================
router.post('/coach-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Hardcoded coach credentials (change in production!)
    if (email.toLowerCase() !== 'arvantis200@gmail.com' || password !== 'arva123') {
      return res.status(401).json({ error: 'Λάθος στοιχεία Coach' });
    }

    // Check if coach exists
    let coach = await pool.query('SELECT * FROM users WHERE email = $1', ['arvantis200@gmail.com']);

    if (coach.rows.length === 0) {
      // Create coach if doesn't exist
      const hashedPassword = await bcrypt.hash(password, 10);
      coach = await pool.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
        ['Coach Αρβανίτης', 'arvantis200@gmail.com', hashedPassword, 'coach']
      );
    }

    const coachUser = coach.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { id: coachUser.id, email: coachUser.email, role: coachUser.role, name: coachUser.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: '✅ Coach Login Επιτυχής!',
      token,
      user: {
        id: coachUser.id,
        name: coachUser.name,
        email: coachUser.email,
        role: coachUser.role,
        avatar_url: coachUser.avatar_url
      }
    });
  } catch (err) {
    console.error('Coach login error:', err);
    res.status(500).json({ error: 'Σφάλμα σύνδεσης Coach' });
  }
});

// ============================================
// VERIFY TOKEN
// ============================================
router.post('/verify', (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Δεν υπάρχει token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (err) {
    res.status(401).json({ valid: false, error: 'Invalid token' });
  }
});

export default router;

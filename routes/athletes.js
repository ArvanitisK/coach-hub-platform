import express from 'express';
import pool from '../db.js';
import { verifyToken, verifyAthlete } from '../middleware/auth.js';

const router = express.Router();

// ============================================
// GET ATHLETE PROFILE
// ============================================
router.get('/profile', verifyAthlete, async (req, res) => {
  try {
    const athlete = await pool.query('SELECT id, name, email, avatar_url FROM users WHERE id = $1', [req.user.id]);
    const bio = await pool.query('SELECT * FROM athlete_bios WHERE athlete_id = $1', [req.user.id]);
    const program = await pool.query('SELECT * FROM workout_programs WHERE athlete_id = $1 AND is_active = true', [req.user.id]);

    res.json({
      user: athlete.rows[0],
      bio: bio.rows[0],
      program: program.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα ανάκτησης προφίλ' });
  }
});

// ============================================
// UPDATE ATHLETE BIO
// ============================================
router.put('/bio', verifyAthlete, async (req, res) => {
  try {
    const { phone, address, height, current_weight, target_weight, medical_history, selected_blueprint_key } = req.body;

    await pool.query(
      `UPDATE athlete_bios SET phone = $1, address = $2, height = $3, current_weight = $4, target_weight = $5, medical_history = $6, selected_blueprint_key = $7, updated_at = NOW()
       WHERE athlete_id = $8`,
      [phone, address, height, current_weight, target_weight, medical_history, selected_blueprint_key, req.user.id]
    );

    // Track weight if provided
    if (current_weight) {
      await pool.query(
        'INSERT INTO weight_tracking (athlete_id, weight_kg, date) VALUES ($1, $2, NOW()::date) ON CONFLICT (athlete_id, date) DO UPDATE SET weight_kg = $2',
        [req.user.id, current_weight]
      );
    }

    res.json({ message: '✅ Το προφίλ ενημερώθηκε!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα ενημέρωσης προφίλ' });
  }
});

// ============================================
// GET WEEKLY CALENDAR
// ============================================
router.get('/calendar', verifyAthlete, async (req, res) => {
  try {
    const calendar = await pool.query(
      `SELECT wc.*, r.routine_name FROM weekly_calendars wc
       LEFT JOIN routines r ON wc.routine_id = r.id
       WHERE wc.athlete_id = $1
       ORDER BY CASE WHEN wc.day_of_week = 'mon' THEN 1
                      WHEN wc.day_of_week = 'tue' THEN 2
                      WHEN wc.day_of_week = 'wed' THEN 3
                      WHEN wc.day_of_week = 'thu' THEN 4
                      WHEN wc.day_of_week = 'fri' THEN 5
                      WHEN wc.day_of_week = 'sat' THEN 6 END`,
      [req.user.id]
    );

    res.json(calendar.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα ανάκτησης καλενταριού' });
  }
});

// ============================================
// UPDATE WEEKLY CALENDAR
// ============================================
router.put('/calendar/:day', verifyAthlete, async (req, res) => {
  try {
    const { day } = req.params;
    const { routine_id, notes } = req.body;

    await pool.query(
      `INSERT INTO weekly_calendars (athlete_id, day_of_week, routine_id, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (athlete_id, day_of_week) DO UPDATE SET routine_id = $3, notes = $4, updated_at = NOW()`,
      [req.user.id, day, routine_id, notes]
    );

    res.json({ message: `✅ Το ${day} ενημερώθηκε!` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα ενημέρωσης ημέρας' });
  }
});

// ============================================
// GET ACTIVE WORKOUT PROGRAM
// ============================================
router.get('/program', verifyAthlete, async (req, res) => {
  try {
    const program = await pool.query(
      'SELECT * FROM workout_programs WHERE athlete_id = $1 AND is_active = true',
      [req.user.id]
    );

    if (program.rows.length === 0) {
      return res.status(404).json({ error: 'Δεν υπάρχει ενεργό πρόγραμμα' });
    }

    const programId = program.rows[0].id;

    // Get routines
    const routines = await pool.query(
      'SELECT * FROM routines WHERE program_id = $1 ORDER BY id',
      [programId]
    );

    // Get exercises for each routine
    const routinesWithExercises = await Promise.all(
      routines.rows.map(async (routine) => {
        const exercises = await pool.query(
          'SELECT * FROM exercises WHERE routine_id = $1 ORDER BY order_index',
          [routine.id]
        );
        return { ...routine, exercises: exercises.rows };
      })
    );

    res.json({ ...program.rows[0], routines: routinesWithExercises });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα ανάκτησης προγράμματος' });
  }
});

// ============================================
// SAVE WORKOUT LOG FOR A DAY
// ============================================
router.post('/workout-log', verifyAthlete, async (req, res) => {
  try {
    const { routine_id, day_of_week, sets_data } = req.body;

    // Create workout log
    const workoutLog = await pool.query(
      `INSERT INTO workout_logs (athlete_id, routine_id, date, day_of_week, completed)
       VALUES ($1, $2, NOW()::date, $3, true)
       RETURNING id`,
      [req.user.id, routine_id, day_of_week]
    );

    const workoutLogId = workoutLog.rows[0].id;

    // Save sets
    let totalVolume = 0;
    for (const setData of sets_data) {
      const { exercise_id, set_number, weight_kg, reps } = setData;
      await pool.query(
        'INSERT INTO set_logs (workout_log_id, exercise_id, set_number, weight_kg, reps, completed) VALUES ($1, $2, $3, $4, $5, true)',
        [workoutLogId, exercise_id, set_number, weight_kg, reps]
      );
      totalVolume += (weight_kg || 0) * (reps || 0);
    }

    // Update workout log with total volume
    await pool.query(
      'UPDATE workout_logs SET total_volume_kg = $1 WHERE id = $2',
      [totalVolume, workoutLogId]
    );

    // Send message to coach
    const user = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    const coach = await pool.query('SELECT id FROM users WHERE role = $1', ['coach']);

    if (coach.rows.length > 0) {
      const messageText = `📊 [Workout Log - ${day_of_week}]\nΣυνολικό Τονάζ: ${totalVolume.toLocaleString()}kg\n`;
      await pool.query(
        'INSERT INTO messages (sender_id, recipient_id, message_text, message_type) VALUES ($1, $2, $3, $4)',
        [req.user.id, coach.rows[0].id, messageText, 'workout_log']
      );
    }

    res.json({ message: '✅ Το workout αποθηκεύτηκε και στάλθηκε στο Coach!', workoutLogId, totalVolume });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα αποθήκευσης workout' });
  }
});

// ============================================
// GET WORKOUT HISTORY
// ============================================
router.get('/workout-history', verifyAthlete, async (req, res) => {
  try {
    const history = await pool.query(
      `SELECT wl.*, r.routine_name FROM workout_logs wl
       LEFT JOIN routines r ON wl.routine_id = r.id
       WHERE wl.athlete_id = $1
       ORDER BY wl.date DESC
       LIMIT 30`,
      [req.user.id]
    );

    res.json(history.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα ανάκτησης ιστορικού' });
  }
});

// ============================================
// GET WEIGHT PROGRESS
// ============================================
router.get('/weight-progress', verifyAthlete, async (req, res) => {
  try {
    const progress = await pool.query(
      'SELECT date, weight_kg FROM weight_tracking WHERE athlete_id = $1 ORDER BY date DESC LIMIT 90',
      [req.user.id]
    );

    res.json(progress.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα ανάκτησης προόδου' });
  }
});

export default router;
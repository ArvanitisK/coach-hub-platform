import express from 'express';
import pool from '../db.js';
import { verifyCoach } from '../middleware/auth.js';

const router = express.Router();

// ============================================
// GET ALL ATHLETES
// ============================================
router.get('/athletes', verifyCoach, async (req, res) => {
  try {
    const athletes = await pool.query(
      `SELECT u.id, u.name, u.email, u.avatar_url, ab.phone, ab.address, ab.height, ab.current_weight, ab.target_weight, ab.medical_history,
              wp.title as program_title, COUNT(wl.id) as workout_count
       FROM users u
       LEFT JOIN athlete_bios ab ON u.id = ab.athlete_id
       LEFT JOIN workout_programs wp ON u.id = wp.athlete_id AND wp.is_active = true
       LEFT JOIN workout_logs wl ON u.id = wl.athlete_id
       WHERE u.role = 'athlete'
       GROUP BY u.id, ab.id, wp.id
       ORDER BY u.created_at DESC`
    );

    res.json(athletes.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα ανάκτησης αθλητών' });
  }
});

// ============================================
// ASSIGN PROGRAM TO ATHLETE
// ============================================
router.post('/assign-program', verifyCoach, async (req, res) => {
  try {
    const { athlete_id, title, blueprint_key, instructions, routines } = req.body;

    // Deactivate previous programs
    await pool.query(
      'UPDATE workout_programs SET is_active = false WHERE athlete_id = $1',
      [athlete_id]
    );

    // Create new program
    const program = await pool.query(
      `INSERT INTO workout_programs (athlete_id, blueprint_key, title, description, instructions, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id`,
      [athlete_id, blueprint_key, title, 'Coach assigned', instructions]
    );

    const programId = program.rows[0].id;

    // Create routines and exercises
    for (const routine of routines) {
      const routineResult = await pool.query(
        'INSERT INTO routines (program_id, routine_name) VALUES ($1, $2) RETURNING id',
        [programId, routine.name]
      );

      const routineId = routineResult.rows[0].id;

      if (routine.exercises) {
        for (let i = 0; i < routine.exercises.length; i++) {
          const ex = routine.exercises[i];
          await pool.query(
            `INSERT INTO exercises (routine_id, exercise_name, sets, reps, rest_seconds, notes, order_index)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [routineId, ex.name, ex.sets, ex.reps, 60, ex.note || '', i]
          );
        }
      }
    }

    res.json({ message: '✅ Το πρόγραμμα ανατέθηκε επιτυχώς!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα ανάθεσης προγράμματος' });
  }
});

// ============================================
// GET PENDING REQUESTS
// ============================================
router.get('/requests', verifyCoach, async (req, res) => {
  try {
    const requests = await pool.query(
      'SELECT * FROM program_requests WHERE status = $1 ORDER BY created_at DESC',
      ['pending']
    );

    res.json(requests.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα ανάκτησης αιτημάτων' });
  }
});

// ============================================
// APPROVE REQUEST
// ============================================
router.put('/requests/:id/approve', verifyCoach, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      'UPDATE program_requests SET status = $1 WHERE id = $2',
      ['approved', id]
    );

    res.json({ message: '✅ Το αίτημα εγκρίθηκε!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα έγκρισης' });
  }
});

export default router;
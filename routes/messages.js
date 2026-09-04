import express from 'express';
import pool from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// ============================================
// SEND MESSAGE
// ============================================
router.post('/send', verifyToken, async (req, res) => {
  try {
    const { recipient_id, message_text, message_type } = req.body;

    const result = await pool.query(
      `INSERT INTO messages (sender_id, recipient_id, message_text, message_type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.id, recipient_id, message_text, message_type || 'text']
    );

    res.json({ message: '✅ Μήνυμα στάλθηκε!', data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα αποστολής μηνύματος' });
  }
});

// ============================================
// GET CONVERSATION WITH USER
// ============================================
router.get('/conversation/:other_user_id', verifyToken, async (req, res) => {
  try {
    const { other_user_id } = req.params;

    const messages = await pool.query(
      `SELECT m.*, u.name as sender_name FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE (m.sender_id = $1 AND m.recipient_id = $2) OR (m.sender_id = $2 AND m.recipient_id = $1)
       ORDER BY m.created_at ASC`,
      [req.user.id, other_user_id]
    );

    // Mark as read
    await pool.query(
      'UPDATE messages SET is_read = true WHERE recipient_id = $1 AND sender_id = $2',
      [req.user.id, other_user_id]
    );

    res.json(messages.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα ανάκτησης συνομιλίας' });
  }
});

// ============================================
// GET ALL CONVERSATIONS (Latest message from each user)
// ============================================
router.get('/inbox', verifyToken, async (req, res) => {
  try {
    const messages = await pool.query(
      `SELECT DISTINCT ON (CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END)
              m.*, u.name as other_user_name, u.role
       FROM messages m
       JOIN users u ON CASE WHEN sender_id = $1 THEN recipient_id = u.id ELSE sender_id = u.id END
       WHERE sender_id = $1 OR recipient_id = $1
       ORDER BY CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END, m.created_at DESC`,
      [req.user.id]
    );

    res.json(messages.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα ανάκτησης inbox' });
  }
});

export default router;
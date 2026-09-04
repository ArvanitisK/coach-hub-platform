-- ============================================
-- COACH HUB DATABASE SCHEMA
-- PostgreSQL
-- ============================================

-- Users Table (Athletes & Coach)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('athlete', 'coach')),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Program Requests
CREATE TABLE IF NOT EXISTS program_requests (
  id SERIAL PRIMARY KEY,
  athlete_id INT REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255),
  email VARCHAR(255),
  height VARCHAR(50),
  current_weight DECIMAL(5,2),
  target_weight DECIMAL(5,2),
  goal_category VARCHAR(255),
  experience_level VARCHAR(50),
  training_days_per_week INT,
  injury_history TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Athlete Bio/Profile
CREATE TABLE IF NOT EXISTS athlete_bios (
  id SERIAL PRIMARY KEY,
  athlete_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  phone VARCHAR(20),
  address VARCHAR(255),
  height VARCHAR(50),
  current_weight DECIMAL(5,2),
  target_weight DECIMAL(5,2),
  medical_history TEXT,
  selected_blueprint_key VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workout Programs/Blueprints
CREATE TABLE IF NOT EXISTS workout_programs (
  id SERIAL PRIMARY KEY,
  athlete_id INT REFERENCES users(id) ON DELETE CASCADE,
  blueprint_key VARCHAR(255),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  instructions TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Program Routines (e.g., Push A, Pull A, Legs A)
CREATE TABLE IF NOT EXISTS routines (
  id SERIAL PRIMARY KEY,
  program_id INT REFERENCES workout_programs(id) ON DELETE CASCADE,
  routine_name VARCHAR(255) NOT NULL,
  day_of_week VARCHAR(20),
  is_rest_day BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exercises in Routines
CREATE TABLE IF NOT EXISTS exercises (
  id SERIAL PRIMARY KEY,
  routine_id INT REFERENCES routines(id) ON DELETE CASCADE,
  exercise_name VARCHAR(255) NOT NULL,
  sets INT,
  reps VARCHAR(50),
  rest_seconds INT,
  notes TEXT,
  order_index INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workout Logs (Daily session data)
CREATE TABLE IF NOT EXISTS workout_logs (
  id SERIAL PRIMARY KEY,
  athlete_id INT REFERENCES users(id) ON DELETE CASCADE,
  routine_id INT REFERENCES routines(id),
  date DATE NOT NULL,
  day_of_week VARCHAR(20),
  total_volume_kg DECIMAL(10,2),
  notes TEXT,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Set Logs (Individual set data)
CREATE TABLE IF NOT EXISTS set_logs (
  id SERIAL PRIMARY KEY,
  workout_log_id INT REFERENCES workout_logs(id) ON DELETE CASCADE,
  exercise_id INT REFERENCES exercises(id),
  set_number INT,
  weight_kg DECIMAL(5,2),
  reps INT,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Weekly Calendar (Day assignments for athletes)
CREATE TABLE IF NOT EXISTS weekly_calendars (
  id SERIAL PRIMARY KEY,
  athlete_id INT REFERENCES users(id) ON DELETE CASCADE,
  day_of_week VARCHAR(20),
  routine_id INT REFERENCES routines(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(athlete_id, day_of_week)
);

-- Two-Way Messages (Athlete & Coach Communication)
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender_id INT REFERENCES users(id) ON DELETE CASCADE,
  recipient_id INT REFERENCES users(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'workout_log', 'system')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Weight Tracking (Progress monitoring)
CREATE TABLE IF NOT EXISTS weight_tracking (
  id SERIAL PRIMARY KEY,
  athlete_id INT REFERENCES users(id) ON DELETE CASCADE,
  weight_kg DECIMAL(5,2) NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(athlete_id, date)
);

-- Progress Metrics (Volume, strength gains, etc.)
CREATE TABLE IF NOT EXISTS progress_metrics (
  id SERIAL PRIMARY KEY,
  athlete_id INT REFERENCES users(id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL,
  value DECIMAL(10,2),
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_program_requests_athlete ON program_requests(athlete_id);
CREATE INDEX idx_workout_logs_athlete ON workout_logs(athlete_id);
CREATE INDEX idx_workout_logs_date ON workout_logs(date);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_weight_tracking_athlete ON weight_tracking(athlete_id);
CREATE INDEX idx_weight_tracking_date ON weight_tracking(date);

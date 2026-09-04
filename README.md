# 🏋️ COACH HUB - Elite Workout Tracking Platform

## Full Stack Implementation

### Backend
- **Node.js + Express** - REST API
- **PostgreSQL** - Database
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Socket.io** - Real-time messaging (upcoming)

### Features
✅ User Authentication (JWT)
✅ Workout Logging & Tracking
✅ Weight Progress Tracking
✅ Two-Way Messaging (Athlete ↔ Coach)
✅ Program Assignment by Coach
✅ Weekly Calendar Management
✅ Workout History Archive
✅ Medical Records (Confidential)

### Setup

1. **Install Dependencies**
```bash
npm install
```

2. **Configure Database**
```bash
# Create PostgreSQL database
psql -U postgres -d coach_hub_db -f database.sql
```

3. **Environment Variables (.env)**
```
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=coach_hub_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
NODE_ENV=development
```

4. **Start Server**
```bash
npm start
# Or with auto-reload
npm run dev
```

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register athlete
- `POST /api/auth/login` - Login
- `POST /api/auth/coach-login` - Coach login
- `POST /api/auth/verify` - Verify token

#### Athlete
- `GET /api/athlete/profile` - Get profile
- `PUT /api/athlete/bio` - Update bio
- `GET /api/athlete/program` - Get active program
- `POST /api/athlete/workout-log` - Log workout
- `GET /api/athlete/workout-history` - Get history
- `GET /api/athlete/weight-progress` - Weight tracking

#### Coach
- `GET /api/coach/athletes` - List all athletes
- `POST /api/coach/assign-program` - Assign program
- `GET /api/coach/requests` - Get pending requests
- `PUT /api/coach/requests/:id/approve` - Approve request

#### Messages
- `POST /api/messages/send` - Send message
- `GET /api/messages/conversation/:user_id` - Get conversation
- `GET /api/messages/inbox` - Get inbox

### Frontend Integration

Update your HTML to use the API endpoints:
```javascript
const API_URL = 'http://localhost:5000/api';

// Example: Login
await fetch(`${API_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
```

### Database Schema
- Users (athletes + coach)
- Athlete Bios
- Workout Programs & Routines
- Exercises
- Workout Logs & Set Logs
- Weekly Calendars
- Messages
- Weight Tracking
- Progress Metrics

### Security
✅ Password hashing with bcryptjs
✅ JWT token authentication
✅ Role-based access control
✅ CORS enabled
✅ Input validation

### Next Steps
- [ ] WebSocket real-time messaging
- [ ] Push notifications
- [ ] Frontend update to use API
- [ ] Mobile app (React Native)
- [ ] Analytics dashboard
- [ ] Export workout data (PDF)

---
**Coach Αρβανίτης** | Elite Training Platform

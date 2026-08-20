const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Fail fast on missing critical config rather than running with an undefined
// JWT secret or silently never connecting to a database.
const REQUIRED_ENV_VARS = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variable(s): ${missingEnvVars.join(', ')}`);
  console.error('Set them in backend/.env before starting the server.');
  process.exit(1);
}

// Route imports
const authRoutes = require('./routes/auth');
const signalRoutes = require('./routes/signals');
const occasionRoutes = require('./routes/occasions');
const roadRoutes = require('./routes/roads');
const { authenticate } = require('./middleware/auth');
const { startScheduler } = require('./services/scheduler');

// Initialize express app
const app = express();

// Security/observability middleware
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((o) => o.trim());
app.use(cors({ origin: allowedOrigins }));

app.use(express.json());

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    startScheduler();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Routes — /api/auth/login is the only unauthenticated API route
app.use('/api/auth', authRoutes);
app.use('/api/signals', authenticate, signalRoutes);
app.use('/api/occasions', authenticate, occasionRoutes);
app.use('/api/roads', authenticate, roadRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Traffic Signal Management API is running');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

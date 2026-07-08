const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Route imports
const authRoutes = require('./routes/auth');
const signalRoutes = require('./routes/signals');
const occasionRoutes = require('./routes/occasions');
const routeRoutes = require('./routes/routes');
const Officer = require('./models/Officer');
const Signal = require('./models/Signal');
const Route = require('./models/Route');
const { buildRouteCoordinates } = require('./utils/routeGeometry');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trafficSignals')
  .then(() => console.log('MongoDB connected successfully'))
  .then(() => seedDefaultOfficer())
  .then(() => seedDefaultSignals())
  .then(() => seedDefaultRoutes())
  .catch(err => console.error('MongoDB connection error:', err));

async function seedDefaultOfficer() {
  try {
    const officerCount = await Officer.countDocuments();

    if (officerCount > 0) {
      return;
    }

    const username = process.env.DEFAULT_OFFICER_USERNAME || 'officer';
    const password = process.env.DEFAULT_OFFICER_PASSWORD || 'Officer@123';
    const fullName = process.env.DEFAULT_OFFICER_FULL_NAME || 'Traffic Officer';

    const passwordHash = await bcrypt.hash(password, 10);

    await Officer.create({
      username,
      passwordHash,
      fullName,
      role: 'officer'
    });

    console.log(`Seeded default officer account: ${username}`);
    console.log(`Default password: ${password}`);
  } catch (error) {
    console.error('Error seeding default officer:', error);
  }
}

async function seedDefaultSignals() {
  try {
    const signalCount = await Signal.countDocuments();

    if (signalCount > 0) {
      return;
    }

    const signalsFile = path.join(__dirname, '..', 'signals sample.txt');
    const fileContents = fs.readFileSync(signalsFile, 'utf8');
    const signalsData = JSON.parse(fileContents);
    const signalsArray = Array.isArray(signalsData) ? signalsData : [signalsData];

    await Signal.insertMany(signalsArray);
    console.log(`Seeded ${signalsArray.length} default signals`);
  } catch (error) {
    console.error('Error seeding default signals:', error);
  }
}

async function seedDefaultRoutes() {
  try {
    const routeCount = await Route.countDocuments();

    if (routeCount > 0) {
      return;
    }

    const routesFile = path.join(__dirname, '..', 'routes sample.txt');
    const fileContents = fs.readFileSync(routesFile, 'utf8');
    const routesData = JSON.parse(fileContents);
    const routesArray = Array.isArray(routesData) ? routesData : [routesData];
    const resolvedRoutes = [];

    for (const routeSeed of routesArray) {
      const pathCoordinates = await buildRouteCoordinates(routeSeed);
      resolvedRoutes.push({
        ...routeSeed,
        pathCoordinates
      });
    }

    await Route.insertMany(resolvedRoutes);
    console.log(`Seeded ${resolvedRoutes.length} default routes`);
  } catch (error) {
    console.error('Error seeding default routes:', error);
  }
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/signals', signalRoutes);
app.use('/api/occasions', occasionRoutes);
app.use('/api/routes', routeRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Traffic Signal Management API is running');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// Import models
const Officer = require('./models/Officer');
const Signal = require('./models/Signal');
const Occasion = require('./models/Occasion');
const Route = require('./models/Route');
const { buildRouteCoordinates } = require('./utils/routeGeometry');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trafficSignals')
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Sample data files
const signalsFile = path.join(__dirname, '..', 'signals sample.txt');
const occasionsFile = path.join(__dirname, '..', 'occasions sample.txt');
const routesFile = path.join(__dirname, '..', 'routes sample.txt');

const defaultOfficer = {
  username: process.env.DEFAULT_OFFICER_USERNAME || 'officer',
  password: process.env.DEFAULT_OFFICER_PASSWORD || 'Officer@123',
  fullName: process.env.DEFAULT_OFFICER_FULL_NAME || 'Traffic Officer',
  role: 'officer'
};

// Function to read and parse JSON data
const readJsonFile = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
};

// Import signals data
const importSignals = async () => {
  try {
    const signalsData = readJsonFile(signalsFile);
    
    if (!signalsData) {
      console.log('No signals data to import');
      return;
    }
    
    // Convert to array if it's a single object
    const signalsArray = Array.isArray(signalsData) ? signalsData : [signalsData];
    
    // Delete existing signals
    await Signal.deleteMany({});
    
    // Import signals
    const result = await Signal.insertMany(signalsArray);
    console.log(`${result.length} signals imported successfully`);
  } catch (error) {
    console.error('Error importing signals:', error);
  }
};

// Import routes data
const importRoutes = async () => {
  try {
    const routesData = readJsonFile(routesFile);

    if (!routesData) {
      console.log('No routes data to import');
      return;
    }

    const routesArray = Array.isArray(routesData) ? routesData : [routesData];
    const resolvedRoutes = [];

    for (const routeSeed of routesArray) {
      const pathCoordinates = await buildRouteCoordinates(routeSeed);
      resolvedRoutes.push({
        ...routeSeed,
        pathCoordinates
      });
    }

    await Route.deleteMany({});

    const result = await Route.insertMany(resolvedRoutes);
    console.log(`${result.length} routes imported successfully`);
  } catch (error) {
    console.error('Error importing routes:', error);
  }
};

// Import occasions data
const importOccasions = async () => {
  try {
    const occasionsData = readJsonFile(occasionsFile);
    
    if (!occasionsData) {
      console.log('No occasions data to import');
      return;
    }
    
    // Convert to array if it's a single object
    const occasionsArray = Array.isArray(occasionsData) ? occasionsData : [occasionsData];
    
    // Delete existing occasions
    await Occasion.deleteMany({});
    
    // Import occasions
    const result = await Occasion.insertMany(occasionsArray);
    console.log(`${result.length} occasions imported successfully`);
  } catch (error) {
    console.error('Error importing occasions:', error);
  }
};

// Import default officer account
const importOfficer = async () => {
  try {
    await Officer.deleteMany({});

    const passwordHash = await bcrypt.hash(defaultOfficer.password, 10);

    await Officer.create({
      username: defaultOfficer.username,
      passwordHash,
      fullName: defaultOfficer.fullName,
      role: defaultOfficer.role
    });

    console.log(`Default officer account imported: ${defaultOfficer.username}`);
  } catch (error) {
    console.error('Error importing officer account:', error);
  }
};

// Clear existing demo data so Atlas is repopulated cleanly
const clearDemoData = async () => {
  await Promise.all([
    Officer.deleteMany({}),
    Signal.deleteMany({}),
    Route.deleteMany({}),
    Occasion.deleteMany({})
  ]);
};

// Run import process
const importData = async () => {
  try {
    await clearDemoData();
    await importOfficer();
    await importSignals();
    await importRoutes();
    await importOccasions();
    console.log('Data import completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during import process:', error);
    process.exit(1);
  }
};

importData(); 
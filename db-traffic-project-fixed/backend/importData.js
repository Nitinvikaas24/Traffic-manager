const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Import models
const Signal = require('./models/Signal');
const Occasion = require('./models/Occasion');

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

// Run import process
const importData = async () => {
  try {
    await importSignals();
    await importOccasions();
    console.log('Data import completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during import process:', error);
    process.exit(1);
  }
};

importData(); 
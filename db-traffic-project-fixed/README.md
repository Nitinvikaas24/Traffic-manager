# Traffic Signal Management System

A MERN (MongoDB, Express, React, Node.js) stack application for managing traffic signals during special occasions and events. This system allows traffic police to automate changes to traffic signal timing based on scheduled events.

## Features

- **Dashboard**: Overview of traffic signals and active occasions
- **Interactive Map**: Visualize traffic signals on a map with real-time status
- **Signal Management**: View and modify traffic signal timing
- **Occasion Management**: Create and schedule special occasions/events
- **Time-based Automation**: Automatically adjust traffic signals during specified time windows
- **CRUD Operations**: Full Create, Read, Update, Delete operations for signals and occasions

## Technologies Used

### Backend
- Node.js
- Express.js
- MongoDB (with Mongoose)
- RESTful API

### Frontend
- React
- React Router
- Material UI
- Leaflet (for maps)
- Axios

## Getting Started

### Prerequisites
- Node.js (v14+)
- MongoDB (local or Atlas)

### Installation

1. Clone the repository
```
git clone https://github.com/yourusername/traffic-signal-management.git
cd traffic-signal-management
```

2. Install backend dependencies
```
cd backend
npm install
```

3. Install frontend dependencies
```
cd ../frontend
npm install
```

4. Create .env file in the backend directory with:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/trafficSignals
```

### Running the Application

1. Start the backend server
```
cd backend
npm run dev
```

2. Start the frontend
```
cd frontend
npm start
```

3. Open your browser and navigate to `http://localhost:3000`

### Officer Access

The create/edit/reset flows are protected and require officer login.

If the database has no officers yet, the backend seeds a default account on startup:

- Username: `officer`
- Password: `Officer@123`

You can override those values with `DEFAULT_OFFICER_USERNAME`, `DEFAULT_OFFICER_PASSWORD`, and `DEFAULT_OFFICER_FULL_NAME` in the backend environment.

### Default Signals

If the signals collection is empty, the backend seeds the sample signals from `signals sample.txt` on startup so the occasion form has signals to select and route changes can affect real records.

## Project Structure

### Backend
- `/backend/server.js` - Main server file
- `/backend/models/` - Database models (Signal.js, Occasion.js)
- `/backend/routes/` - API routes (signals.js, occasions.js)

### Frontend
- `/frontend/src/components/` - Reusable UI components
- `/frontend/src/pages/` - Main application pages
- `/frontend/src/App.js` - Main application component with routing

## API Endpoints

### Signals
- `GET /api/signals` - Get all signals
- `GET /api/signals/:id` - Get a specific signal
- `POST /api/signals` - Create a new signal
- `PUT /api/signals/:id` - Update a signal
- `DELETE /api/signals/:id` - Delete a signal
- `POST /api/signals/:id/reset` - Reset a signal to default timing

### Occasions
- `GET /api/occasions` - Get all occasions
- `GET /api/occasions/:id` - Get a specific occasion
- `POST /api/occasions` - Create a new occasion
- `PUT /api/occasions/:id` - Update an occasion
- `DELETE /api/occasions/:id` - Delete an occasion
- `PATCH /api/occasions/:id/activate` - Activate an occasion
- `PATCH /api/occasions/:id/deactivate` - Deactivate an occasion

## Data Models

### Signal
- `signalId`: Unique identifier
- `intersectionName`: Name of the intersection
- `location`: Geographic coordinates
- `defaultTiming`: Default traffic light timing
- `currentTiming`: Current (possibly altered) timing
- `status`: Signal status (normal, altered, etc.)

### Occasion
- `occasionId`: Unique identifier
- `name`: Event name
- `dates`: Array of event dates
- `timeWindows`: Specific times when the event is active
- `affectedSignalIds`: Signals affected by this occasion
- `adjustmentRules`: How to adjust signal timing during this occasion

## License
MIT 
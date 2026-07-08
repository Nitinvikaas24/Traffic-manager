import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import SignalsList from './pages/SignalsList';
import OccasionsList from './pages/OccasionsList';
import CreateOccasion from './pages/CreateOccasion';
import EditOccasion from './pages/EditOccasion';
import SignalDetails from './pages/SignalDetails';
import AuthPage from './pages/AuthPage';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <div className="app">
      <Router>
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/signals" element={<SignalsList />} />
            <Route
              path="/signals/:id"
              element={
                <ProtectedRoute>
                  <SignalDetails />
                </ProtectedRoute>
              }
            />
            <Route path="/occasions" element={<OccasionsList />} />
            <Route
              path="/occasions/create"
              element={
                <ProtectedRoute>
                  <CreateOccasion />
                </ProtectedRoute>
              }
            />
            <Route
              path="/occasions/edit/:id"
              element={
                <ProtectedRoute>
                  <EditOccasion />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </Router>
    </div>
  );
}

export default App;

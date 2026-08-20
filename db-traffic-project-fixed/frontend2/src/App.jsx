import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Box, CircularProgress } from '@mui/material';
import CommandCenter from './layouts/CommandCenter';
import LegacyPageLayout from './layouts/LegacyPageLayout';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import PageTransition from './components/PageTransition';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Route-level code splitting: only the command center (the default landing
// view) and login are in the main bundle; everything else loads on demand.
const SignalsList = lazy(() => import('./pages/SignalsList'));
const SignalDetails = lazy(() => import('./pages/SignalDetails'));
const OccasionsList = lazy(() => import('./pages/OccasionsList'));
const CreateOccasion = lazy(() => import('./pages/CreateOccasion'));
const EditOccasion = lazy(() => import('./pages/EditOccasion'));

const RouteFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
    <CircularProgress />
  </Box>
);

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/login"
          element={
            <PageTransition>
              <Login />
            </PageTransition>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <PageTransition>
                <CommandCenter />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/signals"
          element={
            <ProtectedRoute>
              <PageTransition>
                <LegacyPageLayout>
                  <Suspense fallback={<RouteFallback />}>
                    <SignalsList />
                  </Suspense>
                </LegacyPageLayout>
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/signals/:id"
          element={
            <ProtectedRoute>
              <PageTransition>
                <LegacyPageLayout>
                  <Suspense fallback={<RouteFallback />}>
                    <SignalDetails />
                  </Suspense>
                </LegacyPageLayout>
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/occasions"
          element={
            <ProtectedRoute>
              <PageTransition>
                <LegacyPageLayout>
                  <Suspense fallback={<RouteFallback />}>
                    <OccasionsList />
                  </Suspense>
                </LegacyPageLayout>
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/occasions/create"
          element={
            <ProtectedRoute>
              <PageTransition>
                <LegacyPageLayout>
                  <Suspense fallback={<RouteFallback />}>
                    <CreateOccasion />
                  </Suspense>
                </LegacyPageLayout>
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/occasions/edit/:id"
          element={
            <ProtectedRoute>
              <PageTransition>
                <LegacyPageLayout>
                  <Suspense fallback={<RouteFallback />}>
                    <EditOccasion />
                  </Suspense>
                </LegacyPageLayout>
              </PageTransition>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <NotificationProvider>
        <Router>
          <AuthProvider>
            <AnimatedRoutes />
          </AuthProvider>
        </Router>
      </NotificationProvider>
    </LocalizationProvider>
  );
}

export default App;

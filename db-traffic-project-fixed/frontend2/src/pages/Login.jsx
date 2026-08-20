import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Alert, Stack } from '@mui/material';
import TrafficIcon from '@mui/icons-material/Traffic';
import { motion } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tamilFontFamily } from '../theme';

const titleWords = ['TRAFFIC', 'SIGNAL', 'COMMAND', 'CENTER'];

const wordContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const wordItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
        gap: 5,
      }}
    >
      <Box sx={{ textAlign: 'center' }}>
        <motion.div
          variants={wordContainer}
          initial="hidden"
          animate="visible"
          style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}
        >
          {titleWords.map((word) => (
            <motion.span
              key={word}
              variants={wordItem}
              style={{ display: 'inline-block', fontWeight: 800, fontSize: 34, letterSpacing: '-0.02em' }}
            >
              {word}
            </motion.span>
          ))}
        </motion.div>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
          style={{ height: 3, background: '#e30613', margin: '18px auto 0', width: 120, transformOrigin: 'left' }}
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <Typography
            sx={{ mt: 1.5, fontFamily: tamilFontFamily, fontSize: 18, color: 'text.secondary', letterSpacing: '0.02em' }}
          >
            சென்னை · போக்குவரத்து
          </Typography>
        </motion.div>
      </Box>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5, ease: 'easeOut' }}
      >
        <Paper elevation={4} sx={{ p: 4, width: 360 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <TrafficIcon fontSize="large" color="primary" />
            <Typography variant="h6">Sign In</Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button type="submit" variant="contained" size="large" disabled={submitting}>
                {submitting ? 'Signing in…' : 'Sign In'}
              </Button>
            </Stack>
          </Box>
        </Paper>
      </motion.div>
    </Box>
  );
};

export default Login;

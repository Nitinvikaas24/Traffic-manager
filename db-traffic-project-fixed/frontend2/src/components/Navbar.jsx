import React from 'react';
import { AppBar, Toolbar, Typography, Button, Stack } from '@mui/material';
import TrafficIcon from '@mui/icons-material/Traffic';
import LogoutIcon from '@mui/icons-material/Logout';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const menuItems = [
    { text: 'Command Center', path: '/' },
    { text: 'Signals', path: '/signals' },
    { text: 'Occasions', path: '/occasions' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <AppBar position="static" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Toolbar>
        <TrafficIcon sx={{ mr: 1.5 }} />
        <Typography variant="h6" sx={{ flexGrow: 1, fontSize: 18 }}>
          Traffic Signal Management
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          {menuItems.map((item) => (
            <Button
              key={item.text}
              component={Link}
              to={item.path}
              color={location.pathname === item.path ? 'primary' : 'inherit'}
              variant={location.pathname === item.path ? 'outlined' : 'text'}
            >
              {item.text}
            </Button>
          ))}
          {user && (
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              {user.username}
            </Typography>
          )}
          <Button size="small" color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout}>
            Logout
          </Button>
        </Stack>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;

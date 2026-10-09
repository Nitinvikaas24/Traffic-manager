import React from 'react';
import { AppBar, Toolbar, Box, Button, Stack, Chip, Avatar } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandMark from './BrandMark';

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
    <AppBar position="static" elevation={0}>
      <Toolbar sx={{ minHeight: 60 }}>
        <Box sx={{ flexGrow: 1 }}>
          <BrandMark title="Traffic Signal Management" />
        </Box>
        <Stack direction="row" spacing={0.75} alignItems="center">
          {menuItems.map((item) => {
            // Nested pages (e.g. /signals/<id>) keep their section highlighted
            const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
            return (
              <Button
                key={item.text}
                component={Link}
                to={item.path}
                color={active ? 'primary' : 'inherit'}
                variant={active ? 'contained' : 'text'}
                size="small"
                sx={{ borderRadius: 999, px: 1.75, ...(!active && { color: 'text.secondary' }) }}
              >
                {item.text}
              </Button>
            );
          })}
          {user && (
            <Chip
              variant="outlined"
              size="small"
              sx={{ ml: 1 }}
              avatar={<Avatar sx={{ fontWeight: 800 }}>{user.username?.[0]?.toUpperCase()}</Avatar>}
              label={user.username}
            />
          )}
          <Button size="small" color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout} sx={{ color: 'text.secondary' }}>
            Logout
          </Button>
        </Stack>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;

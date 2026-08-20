import React from 'react';
import Box from '@mui/material/Box';
import Navbar from '../components/Navbar';

const LegacyPageLayout = ({ children }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
    <Navbar />
    <Box component="main" sx={{ maxWidth: 1280, width: '100%', mx: 'auto', p: { xs: 2, sm: 3 }, flex: 1 }}>
      {children}
    </Box>
  </Box>
);

export default LegacyPageLayout;

import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import TrafficIcon from '@mui/icons-material/Traffic';
import { chennai, tamilBrushFontFamily } from '../theme';

// App-bar brand: a turmeric badge (ink outline + rust offset, like a sticker),
// the English product title, and "சென்னை" in the same brush script as the
// login poster.
const BrandMark = ({ title }) => (
  <Stack direction="row" alignItems="center" spacing={1.5}>
    <Box
      aria-hidden
      sx={{
        width: 34,
        height: 34,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        bgcolor: chennai.sun,
        border: `2px solid ${chennai.ink}`,
        borderRadius: '10px',
        boxShadow: `2px 2px 0 ${chennai.terracotta}`,
        transform: 'rotate(-4deg)',
      }}
    >
      <TrafficIcon sx={{ color: chennai.ink, fontSize: 21 }} />
    </Box>
    <Stack direction="row" spacing={1.25} alignItems="baseline">
      <Typography component="span" sx={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
        {title}
      </Typography>
      <Typography
        component="span"
        lang="ta"
        sx={{ fontFamily: tamilBrushFontFamily, fontSize: 23, lineHeight: 1, color: chennai.terracotta, display: { xs: 'none', sm: 'inline' } }}
      >
        சென்னை
      </Typography>
    </Stack>
  </Stack>
);

export default BrandMark;

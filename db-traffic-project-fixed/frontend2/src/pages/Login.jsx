import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Alert, Stack, IconButton, InputAdornment, useMediaQuery } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { motion, useReducedMotion } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChennaiScene from '../components/ChennaiScene';
import { chennai, tamilFontFamily, tamilBrushFontFamily, tamilDisplayFontFamily } from '../theme';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const DEMO_USERNAME = 'officer1';
const DEMO_PASSWORD = 'ChangeMe123!';

const { ink, paper, sun, sunDeep, rust } = chennai;

// Crumpled-paper texture: fractal noise lit from the upper left, multiplied
// over the cream base color so the creases read as soft shading.
const PAPER_SVG = encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='900' height='900'>" +
    "<filter id='p' x='0' y='0' width='100%' height='100%'>" +
    "<feTurbulence type='fractalNoise' baseFrequency='0.011 0.014' numOctaves='5' seed='11' result='n'/>" +
    "<feDiffuseLighting in='n' lighting-color='#fff9e8' surfaceScale='3.6'>" +
    "<feDistantLight azimuth='230' elevation='60'/></feDiffuseLighting></filter>" +
    "<rect width='100%' height='100%' filter='url(#p)'/></svg>"
);

// Tamil primary line + small English line underneath (or beside, when inline)
const Bi = ({ ta, en, taSx, enSx, inline = false }) => (
  <Box component="span" sx={{ display: inline ? 'inline' : 'block' }}>
    <Box component="span" sx={{ fontFamily: tamilDisplayFontFamily, ...taSx }}>
      {ta}
    </Box>
    <Box
      component="span"
      sx={{
        display: inline ? 'inline' : 'block',
        ml: inline ? 0.5 : 0,
        fontSize: inline ? '0.88em' : '0.8em',
        fontWeight: 600,
        opacity: 0.75,
        ...enSx,
      }}
    >
      {inline ? `· ${en}` : en}
    </Box>
  </Box>
);

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#fff',
    color: ink,
    fontWeight: 600,
    borderRadius: '12px',
    '& fieldset': { border: `2.5px solid ${ink}` },
    '&:hover fieldset': { borderColor: ink },
    '&.Mui-focused fieldset': { borderColor: ink, borderWidth: '2.5px' },
    '&.Mui-focused': { boxShadow: `0 0 0 4px ${sun}` },
  },
  '& input': { py: 1.5 },
};

const labelSx = {
  display: 'block',
  mb: 0.75,
  color: ink,
  lineHeight: 1.25,
};

const chunkyButtonSx = (bg, fg, shadow) => ({
  py: 1.35,
  px: 2,
  bgcolor: bg,
  color: fg,
  border: `3px solid ${ink}`,
  borderRadius: '14px',
  boxShadow: `4px 4px 0 ${shadow}`,
  fontSize: 17,
  lineHeight: 1.25,
  transition: 'transform 120ms ease, box-shadow 120ms ease, background-color 120ms ease',
  '&:hover': { bgcolor: bg, boxShadow: `6px 6px 0 ${shadow}`, transform: 'translate(-2px, -2px)' },
  '&:active': { boxShadow: `1px 1px 0 ${shadow}`, transform: 'translate(3px, 3px)' },
  '&.Mui-disabled': { bgcolor: bg, color: fg, opacity: 0.6 },
  '&.Mui-focusVisible': { outline: `3px solid ${sun}`, outlineOffset: 3 },
});

const Login = () => {
  const { login, demoLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  // Autofocus would scroll a phone straight past the poster to the form
  const isDesktop = useMediaQuery((theme) => theme.breakpoints.up('md'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const handleDemo = async () => {
    setError('');
    setSubmitting(true);
    try {
      await demoLogin();
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start the demo');
    } finally {
      setSubmitting(false);
    }
  };

  const fadeUp = (delay) =>
    reduceMotion
      ? {}
      : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.55, delay, ease: 'easeOut' } };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        color: ink,
        backgroundColor: '#F5EDDA',
        backgroundImage: `url("data:image/svg+xml,${PAPER_SVG}")`,
        backgroundBlendMode: 'multiply',
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1.2fr) minmax(400px, 0.8fr)' },
        alignItems: 'center',
      }}
    >
      {/* soft warm vignette so the paper has depth */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse at 30% 40%, rgba(255,255,255,0.35), transparent 60%), radial-gradient(ellipse at 100% 100%, rgba(180,68,31,0.10), transparent 55%)',
        }}
      />

      {/* ───────── poster scene + Tamil title ───────── */}
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', alignSelf: 'end', pt: { xs: 2, md: 0 }, pb: { md: '1.5vh' }, position: 'relative' }}>
        <Box
          sx={{
            position: 'relative',
            containerType: 'inline-size',
            aspectRatio: '760 / 930',
            flex: 'none',
            width: { xs: 'min(82vw, 340px)', md: 'auto' },
            height: { xs: 'auto', md: 'min(96vh, 940px)' },
          }}
        >
          <ChennaiScene />

          <Box sx={{ position: 'absolute', top: '0.5%', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none', zIndex: 2 }}>
            <motion.h1
              {...(reduceMotion
                ? {}
                : {
                    initial: { clipPath: 'inset(0 100% 0 0)', opacity: 0 },
                    animate: { clipPath: 'inset(0 0% 0 0)', opacity: 1 },
                    transition: { duration: 1.1, delay: 0.2, ease: 'easeInOut' },
                  })}
              style={{
                margin: 0,
                fontFamily: tamilBrushFontFamily,
                fontWeight: 400,
                fontSize: '21cqw',
                lineHeight: 1.3,
                color: rust,
                transform: 'rotate(-3deg)',
                filter: 'drop-shadow(2px 3px 0 rgba(255, 251, 240, 0.9))',
              }}
              lang="ta"
            >
              சென்னை
            </motion.h1>
            <Typography
              component="p"
              lang="ta"
              sx={{ m: 0, mt: '0.4cqw', fontFamily: tamilDisplayFontFamily, fontWeight: 800, fontSize: '4.1cqw', lineHeight: 1.25, color: ink }}
            >
              போக்குவரத்து சிக்னல் கட்டுப்பாட்டு மையம்
            </Typography>
            <Typography
              component="p"
              sx={{ m: 0, fontWeight: 700, fontSize: '2cqw', letterSpacing: '0.22em', color: ink, opacity: 0.7 }}
            >
              TRAFFIC SIGNAL COMMAND CENTER
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ───────── sign-in card ───────── */}
      <Box sx={{ display: 'flex', justifyContent: 'center', px: 2, py: { xs: 5, md: 4 }, position: 'relative', zIndex: 1 }}>
        <motion.div {...fadeUp(0.35)} style={{ width: '100%', maxWidth: 440 }}>
          <Box
            sx={{
              position: 'relative',
              bgcolor: paper,
              color: ink,
              border: `3px solid ${ink}`,
              borderRadius: '22px',
              boxShadow: `8px 8px 0 ${ink}`,
              p: { xs: 3, sm: 4 },
              pt: { xs: 4, sm: 5 },
            }}
          >
            {/* sticker tab */}
            <Box
              sx={{
                position: 'absolute',
                top: -20,
                left: 24,
                px: 2,
                py: 0.5,
                bgcolor: sun,
                border: `3px solid ${ink}`,
                borderRadius: 999,
                transform: 'rotate(-3deg)',
                boxShadow: `3px 3px 0 ${ink}`,
                fontFamily: tamilDisplayFontFamily,
                fontWeight: 800,
                fontSize: 15,
                letterSpacing: '0.02em',
              }}
            >
              <Bi inline ta={DEMO_MODE ? 'நேரடி டெமோ' : 'உள்நுழைவு'} en={DEMO_MODE ? 'LIVE DEMO' : 'SIGN IN'} enSx={{ fontFamily: 'inherit', fontSize: '0.8em' }} />
            </Box>

            <Typography
              component="h2"
              lang="ta"
              sx={{ fontFamily: tamilDisplayFontFamily, fontWeight: 800, fontSize: 30, lineHeight: 1.15, color: ink }}
            >
              வணக்கம்!
            </Typography>
            <Typography sx={{ fontWeight: 600, fontSize: 13.5, opacity: 0.7, mb: 2 }}>
              <Box component="span" lang="ta" sx={{ fontFamily: tamilFontFamily }}>
                உள்நுழையவும்
              </Box>{' '}
              · Sign in to the command center
            </Typography>

            {DEMO_MODE && (
              <Box sx={{ mb: 2.25 }}>
                <Typography component="div" sx={{ fontSize: 13, lineHeight: 1.5, mb: 1.5 }}>
                  <Box component="span" lang="ta" sx={{ fontFamily: tamilFontFamily, fontWeight: 600, display: 'block' }}>
                    கணக்கு தேவையில்லை — டெமோ அதிகாரியாக முழு மையத்தையும் பார்க்கலாம்.
                  </Box>
                  <Box component="span" sx={{ display: 'block', opacity: 0.7, fontSize: 12.5 }}>
                    No account needed. Data is shared and resets periodically.
                  </Box>
                </Typography>
                <Button fullWidth onClick={handleDemo} disabled={submitting} sx={chunkyButtonSx(sun, ink, ink)}>
                  {submitting ? (
                    <Bi ta="தொடங்குகிறது…" en="Starting…" taSx={{ fontSize: 18, fontWeight: 800 }} />
                  ) : (
                    <Bi ta="நேரடி டெமோவில் நுழை" en="Enter Live Demo" taSx={{ fontSize: 18, fontWeight: 800 }} />
                  )}
                </Button>

                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 2.25 }}>
                  <Box sx={{ flex: 1, height: 0, borderTop: `2px dashed ${ink}`, opacity: 0.35 }} />
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    <Bi inline ta="பணியாளர் உள்நுழைவு" en="Staff sign-in" taSx={{ fontFamily: tamilFontFamily, fontWeight: 700 }} />
                  </Typography>
                  <Box sx={{ flex: 1, height: 0, borderTop: `2px dashed ${ink}`, opacity: 0.35 }} />
                </Stack>
              </Box>
            )}

            {error && (
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                  bgcolor: '#FDE4DD',
                  color: ink,
                  border: `2.5px solid ${ink}`,
                  borderRadius: '12px',
                  fontWeight: 600,
                  '& .MuiAlert-icon': { color: '#C0341D' },
                }}
              >
                {error}
              </Alert>
            )}

            <Box
              sx={{
                mb: 2,
                p: 1.5,
                bgcolor: '#FFF3C4',
                border: `2px dashed ${ink}`,
                borderRadius: '12px',
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 0.75 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap' }}>
                  <Bi
                    inline
                    ta="டெமோ அணுகல்"
                    en="Demo access"
                    taSx={{ fontFamily: tamilFontFamily, fontWeight: 800 }}
                    enSx={{ display: { xs: 'none', sm: 'inline' } }}
                  />
                </Typography>
                <Button
                  size="small"
                  onClick={() => {
                    setUsername(DEMO_USERNAME);
                    setPassword(DEMO_PASSWORD);
                  }}
                  sx={{
                    px: 1.25,
                    py: 0.1,
                    flexShrink: 0,
                    color: ink,
                    border: `2px solid ${ink}`,
                    borderRadius: 999,
                    bgcolor: paper,
                    fontWeight: 700,
                    fontSize: 12.5,
                    '&:hover': { bgcolor: sun },
                  }}
                >
                  <Bi inline ta="நிரப்பு" en="Fill in" taSx={{ fontFamily: tamilFontFamily, fontWeight: 700 }} />
                </Button>
              </Stack>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 1.5, rowGap: 0.1, fontFamily: 'monospace', fontSize: 13.5 }}>
                <Box component="span" lang="ta" sx={{ fontFamily: tamilFontFamily, fontSize: 12.5, opacity: 0.75 }}>
                  பயனர்
                </Box>
                <Box component="span" sx={{ fontWeight: 700 }}>
                  {DEMO_USERNAME}
                </Box>
                <Box component="span" lang="ta" sx={{ fontFamily: tamilFontFamily, fontSize: 12.5, opacity: 0.75 }}>
                  கடவுச்சொல்
                </Box>
                <Box component="span" sx={{ fontWeight: 700 }}>
                  {DEMO_PASSWORD}
                </Box>
              </Box>
            </Box>

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <Box>
                  <Typography component="label" htmlFor="login-username" sx={labelSx}>
                    <Bi inline ta="பயனர் பெயர்" en="Username" taSx={{ fontFamily: tamilFontFamily, fontWeight: 800, fontSize: 14.5 }} />
                  </Typography>
                  <TextField
                    id="login-username"
                    fullWidth
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    autoFocus={isDesktop}
                    required
                    sx={fieldSx}
                  />
                </Box>
                <Box>
                  <Typography component="label" htmlFor="login-password" sx={labelSx}>
                    <Bi inline ta="கடவுச்சொல்" en="Password" taSx={{ fontFamily: tamilFontFamily, fontWeight: 800, fontSize: 14.5 }} />
                  </Typography>
                  <TextField
                    id="login-password"
                    fullWidth
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    sx={fieldSx}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            edge="end"
                            size="small"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            onClick={() => setShowPassword((s) => !s)}
                            sx={{ color: ink }}
                          >
                            {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
                <Button
                  type="submit"
                  fullWidth
                  disabled={submitting}
                  sx={DEMO_MODE ? chunkyButtonSx(ink, paper, sunDeep) : chunkyButtonSx(sun, ink, ink)}
                >
                  {submitting ? (
                    <Bi ta="உள்நுழைகிறது…" en="Signing in…" taSx={{ fontSize: 18, fontWeight: 800 }} />
                  ) : (
                    <Bi ta="உள்நுழை" en="Sign in" taSx={{ fontSize: 18, fontWeight: 800 }} />
                  )}
                </Button>
              </Stack>
            </Box>
          </Box>
        </motion.div>
      </Box>
    </Box>
  );
};

export default Login;

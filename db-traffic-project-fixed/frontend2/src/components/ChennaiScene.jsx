import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

// Original, hand-authored flat illustration of Chennai in the style of a
// paper-cutout travel poster: turmeric sun disc, a Dravidian gopuram, the
// striped lighthouse, an auto-rickshaw, idli + sambar, filter coffee, a cycle
// rickshaw and drifting clouds. Every landmark is a "sticker" — a white paper
// border plus a soft drop shadow (the #cutout filter) over the page's paper
// texture. Pure SVG, no external art.

const W = 760;
const H = 860;
const GROUND = 772;
// Extra headroom above the artwork, where the page overlays the Tamil title.
// The viewBox is therefore 760 x 930 — keep Login.jsx's aspect ratio in sync.
const SCENE_HEADROOM = 70;

const GOLD = '#E7B53A';
const TIER_COLORS = ['#D26A4B', '#E2A241', '#C85A6E', '#4C9AA5', '#D26A4B', '#E2A241', '#C85A6E'];
const FIGURE_COLORS = ['#FFF3D6', '#4C9AA5', '#E2A241', '#C85A6E', '#FFF3D6', '#7BB661'];

const GOPURAM_X = 285;
const LIGHTHOUSE_X = 596;

function GopuramTier({ cx, top, w, h, color, index }) {
  const count = Math.max(3, Math.floor((w - 20) / 17));
  const gap = (w - 20) / count;
  return (
    <g>
      <rect x={cx - w / 2} y={top} width={w} height={h} fill={color} />
      <rect x={cx + w / 2 - 14} y={top} width={14} height={h} fill="rgba(60,20,10,0.16)" />
      {Array.from({ length: count }, (_, k) => {
        const x = cx - w / 2 + 10 + gap * (k + 0.5);
        const figure = FIGURE_COLORS[(k + index) % FIGURE_COLORS.length];
        return (
          <g key={k}>
            <path d={`M${x - 5} ${top + h - 7} V${top + 14} Q${x} ${top + 7} ${x + 5} ${top + 14} V${top + h - 7} Z`} fill="#3a1f16" />
            <circle cx={x} cy={top + 20} r={2.8} fill={figure} />
            <rect x={x - 2.4} y={top + 23} width={4.8} height={Math.max(4, h - 33)} rx={2} fill={figure} />
          </g>
        );
      })}
      <rect x={cx - w / 2 - 6} y={top - 5} width={w + 12} height={7} rx={2} fill="#F5E3B8" />
      <rect x={cx - w / 2 - 6} y={top + 2} width={w + 12} height={3} fill="#D9A22B" />
    </g>
  );
}

function Gopuram() {
  const cx = GOPURAM_X;
  const tiers = [];
  let top = 590;
  for (let i = 0; i < 7; i += 1) {
    const h = 52 - i * 3;
    top -= h;
    tiers.push({ i, top, w: 218 - i * 24, h });
  }
  const crownTop = top; // 289

  const vaultY = (t) => 262 - 80 * t * (1 - t);
  const ribs = Array.from({ length: 9 }, (_, k) => {
    const t = k / 8;
    return { x: cx - 42 + 84 * t, y: vaultY(t) };
  });
  const finials = Array.from({ length: 7 }, (_, k) => {
    const x = cx - 36 + k * 12;
    const t = (x - (cx - 42)) / 84;
    return { x, y: vaultY(t) };
  });

  return (
    <g>
      {/* kavi-striped prakara walls either side */}
      <rect x={cx - 196} y={722} width={392} height={50} fill="url(#kavi)" />
      <rect x={cx - 200} y={714} width={400} height={9} rx={2} fill="#F5E3B8" />
      <rect x={cx - 200} y={721} width={400} height={3} fill="#D9A22B" />

      {/* stone ground tier with the doorway */}
      <rect x={cx - 116} y={590} width={232} height={182} fill="#D9B891" />
      {[612, 634, 656, 678].map((y) => (
        <line key={y} x1={cx - 116} x2={cx + 116} y1={y} y2={y} stroke="#B8956C" strokeWidth="1.5" />
      ))}
      <rect x={cx + 96} y={590} width={20} height={182} fill="rgba(60,30,10,0.14)" />
      <rect x={cx - 126} y={582} width={252} height={10} rx={2} fill="#F5E3B8" />
      <rect x={cx - 126} y={590} width={252} height={3} fill="#D9A22B" />
      <path d={`M${cx - 36} 772 V712 Q${cx} 668 ${cx + 36} 712 V772 Z`} fill="#2a1710" />
      <path d={`M${cx - 26} 772 V716 Q${cx} 684 ${cx + 26} 716 V772 Z`} fill="#4a2a1a" />
      <rect x={cx - 50} y={700} width={100} height={8} rx={2} fill={GOLD} />

      {[...tiers].reverse().map((t) => (
        <GopuramTier key={t.i} cx={cx} top={t.top} w={t.w} h={t.h} color={TIER_COLORS[t.i]} index={t.i} />
      ))}

      {/* barrel-vault crown and kalasam finials */}
      <rect x={cx - 46} y={crownTop - 11} width={92} height={12} rx={2} fill="#F5E3B8" />
      <path d={`M${cx - 42} ${crownTop - 10} V262 Q${cx} 222 ${cx + 42} 262 V${crownTop - 10} Z`} fill="#B84A36" />
      {ribs.map((p) => (
        <line key={p.x} x1={p.x} x2={p.x} y1={crownTop - 10} y2={p.y + 3} stroke="#F5E3B8" strokeWidth="1.6" />
      ))}
      {finials.map((f) => (
        <g key={f.x}>
          <path d={`M${f.x - 3.2} ${f.y} V${f.y - 4} Q${f.x} ${f.y - 15} ${f.x + 3.2} ${f.y - 4} V${f.y} Z`} fill={GOLD} />
          <circle cx={f.x} cy={f.y - 15} r={2} fill={GOLD} />
        </g>
      ))}
    </g>
  );
}

function Lighthouse({ glow }) {
  const cx = LIGHTHOUSE_X;
  const bottom = 772;
  const top = 345;
  const bandH = (bottom - top) / 8;
  const posts = Array.from({ length: 11 }, (_, k) => cx - 30 + k * 6);
  return (
    <g>
      <clipPath id="towerClip">
        <polygon points={`${cx - 37},${bottom} ${cx + 37},${bottom} ${cx + 23},${top} ${cx - 23},${top}`} />
      </clipPath>
      <g clipPath="url(#towerClip)">
        {Array.from({ length: 8 }, (_, k) => (
          <rect key={k} x={cx - 40} y={bottom - (k + 1) * bandH} width={80} height={bandH + 0.5} fill={k % 2 === 0 ? '#F08A24' : '#FFFFFF'} />
        ))}
        <rect x={cx - 40} y={top} width={80} height={bottom - top} fill="url(#towerShade)" />
        {[1, 3, 5].map((k) => (
          <rect key={k} x={cx - 4} y={bottom - (k + 0.5) * bandH - 7} width={8} height={14} rx={2} fill="#3b3b44" />
        ))}
      </g>
      <rect x={cx - 46} y={750} width={92} height={22} rx={2} fill="#B6573A" />
      <rect x={cx - 8} y={758} width={16} height={14} fill="#3a1f16" />

      {/* gallery, railing, lantern room, dome */}
      <rect x={cx - 34} y={337} width={68} height={9} rx={2} fill="#44444c" />
      <line x1={cx - 31} x2={cx + 31} y1={322} y2={322} stroke="#44444c" strokeWidth="2" />
      {posts.map((x) => (
        <line key={x} x1={x} x2={x} y1={322} y2={337} stroke="#44444c" strokeWidth="1.6" />
      ))}
      <motion.circle cx={cx} cy={308} r={46} fill="url(#lampGlow)" {...glow} />
      <rect x={cx - 17} y={296} width={34} height={27} rx={2} fill="#FFF3B8" stroke="#44444c" strokeWidth="2" />
      <line x1={cx - 6} x2={cx - 6} y1={296} y2={323} stroke="#44444c" strokeWidth="1.6" />
      <line x1={cx + 6} x2={cx + 6} y1={296} y2={323} stroke="#44444c" strokeWidth="1.6" />
      <path d={`M${cx - 21} 297 Q${cx} 264 ${cx + 21} 297 Z`} fill="#3a3a44" />
      <line x1={cx} x2={cx} y1={272} y2={252} stroke="#3a3a44" strokeWidth="2" />
      <circle cx={cx} cy={251} r={2.6} fill="#3a3a44" />
    </g>
  );
}

function Cloud({ x, y, s = 1, tint = '#FFFFFF' }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path
        d="M-26 22 C-48 22 -48 -6 -22 -6 C-22 -30 14 -34 26 -16 C40 -34 80 -26 78 -2 C102 -2 104 22 82 22 Z"
        fill={tint}
      />
      <path d="M-26 22 H82 C98 22 102 8 92 2 C84 14 20 12 -26 22 Z" fill="#E3DACA" opacity="0.7" />
    </g>
  );
}

function AutoRickshaw() {
  return (
    <g>
      {/* passenger compartment: dark interior, rust seat */}
      <rect x={56} y={34} width={100} height={40} fill="#2a2420" />
      <rect x={66} y={58} width={86} height={14} rx={4} fill="#A8431F" />
      {/* rear black canvas panel with fold lines */}
      <path d="M150 28 H210 Q218 40 218 74 H150 Z" fill="#1c1b20" />
      <path d="M166 30 V72 M182 30 V72 M198 30 V72" stroke="#34323a" strokeWidth="2" />
      {/* arched black hood */}
      <path d="M48 36 Q50 6 104 6 H192 Q220 8 222 46 Q196 24 150 26 H62 Q54 28 48 36 Z" fill="#1c1b20" />
      {/* slanted windscreen and A-pillar */}
      <polygon points="40,74 54,36 62,36 62,74" fill="rgba(190,232,242,0.72)" />
      <line x1={55} x2={47} y1={42} y2={68} stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
      <polygon points="52,34 60,34 52,74 42,74" fill="#F5A800" />
      {/* body */}
      <path d="M6 128 V104 Q6 86 24 78 L42 72 H192 Q216 72 218 96 V128 Z" fill="#FFC21A" />
      <path d="M6 118 V104 Q6 86 24 78 L36 74 Q16 88 16 106 V118 Z" fill="#FFD95E" />
      <rect x={8} y={101} width={210} height={6} fill="#1c1b20" opacity="0.88" />
      {/* lights */}
      <circle cx={17} cy={91} r={11} fill="#FFF3B8" opacity="0.5" />
      <circle cx={17} cy={91} r={7.5} fill="#FFFBE0" stroke="#3a3a44" strokeWidth="2" />
      <rect x={213} y={86} width={7} height={12} rx={2} fill="#D8332A" />
      {/* mudguards and wheels */}
      <path d="M5 130 Q5 100 30 100 Q55 100 55 130 Z" fill="#E59A00" />
      <path d="M150 128 Q150 98 176 98 Q202 98 202 128 Z" fill="#E59A00" />
      <circle cx={30} cy={128} r={22} fill="#1c1b20" />
      <circle cx={30} cy={128} r={11} fill="#9a9aa4" />
      <circle cx={30} cy={128} r={4} fill="#3a3a44" />
      <circle cx={176} cy={126} r={24} fill="#1c1b20" />
      <circle cx={176} cy={126} r={12} fill="#9a9aa4" />
      <circle cx={176} cy={126} r={4.5} fill="#3a3a44" />
    </g>
  );
}

function CycleRickshaw() {
  const spokes = (cx, cy, r) =>
    Array.from({ length: 8 }, (_, k) => {
      const a = (k * Math.PI) / 4;
      return <line key={k} x1={cx} y1={cy} x2={cx + Math.cos(a) * r} y2={cy + Math.sin(a) * r} stroke="#8a8a94" strokeWidth="1" />;
    });
  return (
    <g>
      {/* carriage: hood, seat box, floorboard */}
      <path d="M78 64 Q94 22 142 34 L144 66 Z" fill="#9E3636" />
      <path d="M92 52 Q104 30 136 38" fill="none" stroke="#F5E3B8" strokeWidth="3" />
      <rect x={82} y={62} width={60} height={30} rx={3} fill="#C85A3A" />
      <rect x={72} y={90} width={76} height={5} rx={2} fill="#2f2b33" />
      {/* wheels */}
      <circle cx={24} cy={107} r={21} fill="none" stroke="#2f2b33" strokeWidth="3.5" />
      {spokes(24, 107, 19)}
      <circle cx={122} cy={107} r={21} fill="none" stroke="#2f2b33" strokeWidth="3.5" />
      {spokes(122, 107, 19)}
      {/* frame */}
      <g stroke="#2f2b33" strokeWidth="3.4" strokeLinecap="round" fill="none">
        <path d="M24 107 L34 62 L58 66 L62 100 L122 107" />
        <path d="M34 62 L26 56" />
      </g>
      <ellipse cx={58} cy={64} rx={9} ry={3} fill="#2f2b33" />
      {/* rider: pale checked shirt, light dhoti */}
      <g strokeLinecap="round" fill="none">
        <path d="M58 62 L72 84 L64 102" stroke="#F4EFE0" strokeWidth="8" />
        <path d="M64 102 L72 104" stroke="#A86A3F" strokeWidth="5" />
        <path d="M60 40 L36 58" stroke="#A86A3F" strokeWidth="5" />
      </g>
      <path d="M52 66 L60 66 L66 36 L56 34 Z" fill="#EFE5CE" />
      <path d="M54 44 H64 M53 52 H63 M52 60 H61" stroke="#C9B98F" strokeWidth="1.2" />
      <circle cx={62} cy={24} r={8} fill="#A86A3F" />
      <path d="M54 22 Q62 12 70 22 Q64 18 54 22 Z" fill="#2a1d18" />
    </g>
  );
}

function IdliPlate() {
  return (
    <g>
      <ellipse cx={60} cy={30} rx={64} ry={18} fill="#E8DFC8" stroke="#B79B5E" strokeWidth="2.5" />
      <ellipse cx={60} cy={29} rx={51} ry={12} fill="#FBF6E8" />
      {[[40, 24], [64, 22], [86, 27]].map(([x, y]) => (
        <g key={x}>
          <ellipse cx={x} cy={y + 3} rx={15} ry={8} fill="#E2DAC4" />
          <ellipse cx={x} cy={y} rx={15} ry={8.5} fill="#FFFDF6" />
          <ellipse cx={x - 4} cy={y - 2} rx={6} ry={2.6} fill="#FFFFFF" />
        </g>
      ))}
      {/* sambar and chutney katoris */}
      <ellipse cx={8} cy={18} rx={17} ry={10} fill="#C8C8CE" />
      <ellipse cx={8} cy={17} rx={13} ry={7} fill="#E0701A" />
      <circle cx={4} cy={16} r={1.6} fill="#8a3d0a" />
      <circle cx={11} cy={18} r={1.6} fill="#8a3d0a" />
      <ellipse cx={114} cy={22} rx={14} ry={8.5} fill="#C8C8CE" />
      <ellipse cx={114} cy={21} rx={10.5} ry={6} fill="#5BA04A" />
    </g>
  );
}

function FilterCoffee({ steam }) {
  return (
    <g>
      <motion.g {...steam}>
        <path d="M-6 -14 Q-12 -26 -6 -36 Q0 -46 -6 -56" fill="none" stroke="#B7AB96" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
        <path d="M7 -12 Q1 -22 7 -32 Q12 -40 7 -48" fill="none" stroke="#B7AB96" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
      </motion.g>
      <path d="M-34 36 Q-34 52 0 52 Q34 52 34 36 Z" fill="url(#gold)" />
      <ellipse cx={0} cy={36} rx={34} ry={8} fill="#8f6414" />
      <path d="M-15 -4 L15 -4 L11 42 L-11 42 Z" fill="url(#gold)" />
      <path d="M-9 0 L-6 40" stroke="rgba(255,255,255,0.45)" strokeWidth="2.4" strokeLinecap="round" />
      <ellipse cx={0} cy={-4} rx={15} ry={4} fill="#5a2f14" />
      <ellipse cx={0} cy={-4.5} rx={11} ry={2.6} fill="#C99A62" />
    </g>
  );
}

function TrafficLight({ glow }) {
  return (
    <g>
      <rect x={505} y={668} width={6} height={104} fill="#2b2623" />
      <rect x={494} y={606} width={28} height={64} rx={7} fill="#2b2623" />
      <circle cx={508} cy={622} r={6.5} fill="#5c2424" />
      <circle cx={508} cy={638} r={6.5} fill="#5c4a1c" />
      <motion.circle cx={508} cy={654} r={15} fill="#2fe0a0" opacity={0.35} {...glow} />
      <circle cx={508} cy={654} r={6.5} fill="#2fe0a0" />
    </g>
  );
}

const ChennaiScene = () => {
  const reduce = useReducedMotion();
  const loop = (animate, transition) => (reduce ? {} : { animate, transition: { repeat: Infinity, ease: 'easeInOut', ...transition } });
  const enter = (delay, from = {}) =>
    reduce ? {} : { initial: { opacity: 0, ...from }, animate: { opacity: 1, x: 0, y: 0 }, transition: { duration: 0.7, delay, ease: 'easeOut' } };

  return (
    <svg
      viewBox={`0 ${-SCENE_HEADROOM} ${W} ${H + SCENE_HEADROOM}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMax meet"
      role="img"
      aria-label="சென்னை — கோபுரம், கலங்கரை விளக்கம், ஆட்டோ"
    >
      <title>சென்னை — Chennai</title>
      <defs>
        <radialGradient id="sunGrad" cx="38%" cy="34%" r="75%">
          <stop offset="0%" stopColor="#FFD84F" />
          <stop offset="70%" stopColor="#FFC21A" />
          <stop offset="100%" stopColor="#F5A800" />
        </radialGradient>
        <radialGradient id="lampGlow">
          <stop offset="0%" stopColor="#FFF3A8" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#FFF3A8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="towerShade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="55%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#3a1c08" stopOpacity="0.28" />
        </linearGradient>
        <linearGradient id="gold" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#B8801A" />
          <stop offset="45%" stopColor="#F6D169" />
          <stop offset="100%" stopColor="#B8801A" />
        </linearGradient>
        <linearGradient id="beamL" x1="1" x2="0" y1="0" y2="0">
          <stop offset="0%" stopColor="#FFF0A0" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FFF0A0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="beamR" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#FFF0A0" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FFF0A0" stopOpacity="0" />
        </linearGradient>
        <pattern id="kavi" width="18" height="10" patternUnits="userSpaceOnUse">
          <rect width="9" height="10" fill="#B4441F" />
          <rect x="9" width="9" height="10" fill="#F4EEDF" />
        </pattern>
        {/* paper-cutout sticker: white border + soft drop shadow */}
        <filter id="cutout" x="-8%" y="-8%" width="116%" height="116%">
          <feMorphology in="SourceAlpha" operator="dilate" radius="3.5" result="grow" />
          <feFlood floodColor="#FFFDF6" result="paper" />
          <feComposite in="paper" in2="grow" operator="in" result="border" />
          <feMerge result="sticker">
            <feMergeNode in="border" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
          <feDropShadow in="sticker" dx="2" dy="5" stdDeviation="4" floodColor="#4a2f12" floodOpacity="0.3" />
        </filter>
        <filter id="softShadow" x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id="cloudShadow" x="-10%" y="-20%" width="120%" height="150%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#8a7350" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* sun disc with an offset ring, like a second cut sheet */}
      <motion.g
        style={{ transformOrigin: '370px 400px' }}
        {...(reduce ? {} : { initial: { scale: 0.85, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { duration: 0.9, ease: 'easeOut' } })}
      >
        <circle cx={384} cy={414} r={278} fill="none" stroke="#FFC21A" strokeWidth="3" opacity="0.45" />
        <circle cx={370} cy={400} r={270} fill="url(#sunGrad)" filter="url(#cloudShadow)" />
      </motion.g>

      {/* lighthouse beams, behind everything */}
      <g {...(reduce ? {} : {})}>
        <motion.g {...loop({ opacity: [0.35, 0.85, 0.35] }, { duration: 3.6 })}>
          <polygon points={`${LIGHTHOUSE_X - 6},308 ${LIGHTHOUSE_X - 250},252 ${LIGHTHOUSE_X - 250},366`} fill="url(#beamL)" />
          <polygon points={`${LIGHTHOUSE_X + 6},308 ${LIGHTHOUSE_X + 170},262 ${LIGHTHOUSE_X + 170},356`} fill="url(#beamR)" />
        </motion.g>
      </g>

      {/* back clouds */}
      <motion.g {...loop({ x: [0, 16, 0] }, { duration: 14 })}>
        <g filter="url(#cloudShadow)">
          <Cloud x={70} y={352} s={1.05} />
        </g>
      </motion.g>
      <motion.g {...loop({ x: [0, -14, 0] }, { duration: 17 })}>
        <g filter="url(#cloudShadow)">
          <Cloud x={430} y={296} s={0.8} />
        </g>
      </motion.g>

      <motion.g {...enter(0.2, { y: 30 })}>
        <g filter="url(#cutout)">
          <Gopuram />
        </g>
      </motion.g>
      <motion.g {...enter(0.35, { y: 30 })}>
        <g filter="url(#cutout)">
          <Lighthouse glow={loop({ opacity: [0.55, 1, 0.55] }, { duration: 3.6 })} />
        </g>
      </motion.g>

      {/* front clouds drifting across the towers */}
      <motion.g {...loop({ x: [0, 20, 0] }, { duration: 16 })}>
        <g filter="url(#cloudShadow)">
          <Cloud x={118} y={556} s={1.35} />
        </g>
      </motion.g>
      <motion.g {...loop({ x: [0, -18, 0] }, { duration: 19 })}>
        <g filter="url(#cloudShadow)">
          <Cloud x={560} y={448} s={1.2} />
        </g>
      </motion.g>

      <g filter="url(#cutout)">
        <TrafficLight glow={loop({ opacity: [0.15, 0.55, 0.15], scale: [0.9, 1.15, 0.9] }, { duration: 2.4 })} />
      </g>

      {/* ground shadows and a hand-drawn dashed road line */}
      <line x1={20} x2={740} y1={GROUND + 22} y2={GROUND + 22} stroke="#231815" strokeWidth="2.5" strokeDasharray="14 12" strokeLinecap="round" opacity="0.28" />
      <ellipse cx={300} cy={GROUND + 4} rx={140} ry={9} fill="#3a2410" opacity="0.28" filter="url(#softShadow)" />
      <ellipse cx={520} cy={GROUND + 4} rx={80} ry={8} fill="#3a2410" opacity="0.28" filter="url(#softShadow)" />

      <motion.g {...enter(0.5, { x: -90 })}>
        <motion.g {...loop({ y: [0, -2, 0] }, { duration: 1.6 })}>
          <g transform={`translate(168 ${GROUND - 150 * 1.28}) scale(1.28)`} filter="url(#cutout)">
            <AutoRickshaw />
          </g>
        </motion.g>
      </motion.g>
      <motion.g {...enter(0.7, { x: 90 })}>
        <motion.g {...loop({ y: [0, -1.5, 0] }, { duration: 2.1 })}>
          <g transform={`translate(486 ${GROUND - 128 * 1.12}) scale(1.12)`} filter="url(#cutout)">
            <CycleRickshaw />
          </g>
        </motion.g>
      </motion.g>
      <motion.g {...enter(0.8, { y: 20 })}>
        <g transform={`translate(8 ${GROUND - 36 * 1.2}) scale(1.2)`} filter="url(#cutout)">
          <IdliPlate />
        </g>
      </motion.g>
      <motion.g {...enter(0.9, { y: 20 })}>
        <g transform={`translate(704 ${GROUND - 52 * 1.2}) scale(1.2)`} filter="url(#cutout)">
          <FilterCoffee steam={loop({ opacity: [0.2, 0.8, 0.2], y: [4, -4, 4] }, { duration: 3 })} />
        </g>
      </motion.g>
    </svg>
  );
};

export default ChennaiScene;

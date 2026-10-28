import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Confetti() {
  const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
      {Array.from({ length: 26 }, (_, i) => (
        <motion.div
          key={i}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{ y: 540, opacity: [1, 1, 0], rotate: Math.floor(Math.random() * 360) + 360 }}
          transition={{ duration: 1.3 + Math.random() * 0.8, delay: i * 0.07, ease: 'easeIn' }}
          style={{
            position: 'absolute',
            left: `${(i / 26) * 100}%`,
            width: 6 + Math.floor(Math.random() * 5),
            height: (7 + Math.floor(Math.random() * 5)) * 1.5,
            background: colors[i % colors.length],
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}

export function StepDots({ current, total }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {Array.from({ length: total }, (_, i) => (
        <motion.div
          key={i}
          animate={{
            width: i + 1 === current ? 20 : 6,
            background: i + 1 === current ? '#0c2340' : i + 1 < current ? '#64748b' : '#e2e8f0',
          }}
          transition={{ duration: 0.25 }}
          style={{ height: 5, borderRadius: 3 }}
        />
      ))}
    </div>
  );
}

export function StarRating({ value, onChange, theme: t }) {
  const [hov, setHov] = useState(0);
  const labels = ['', 'Poco probable', 'Algo posible', 'Neutral', 'Bastante probable', '¡Seguro!'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ display: 'flex', gap: 5 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <motion.button
            key={n}
            whileTap={{ scale: 0.8 }}
            onMouseEnter={() => setHov(n)}
            onMouseLeave={() => setHov(0)}
            onClick={() => onChange(n)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: n <= (hov || value) ? '#f59e0b' : t.border,
              transition: 'color 0.14s',
            }}
          >
            <Star size={33} fill={n <= (hov || value) ? '#f59e0b' : 'none'} strokeWidth={1.5} />
          </motion.button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {hov || value ? (
          <motion.p
            key={hov || value}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f59e0b', margin: 0 }}
          >
            {labels[hov || value]}
          </motion.p>
        ) : (
          <motion.p
            key="e"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ fontSize: '0.76rem', color: t.textMuted, margin: 0 }}
          >
            Toca una estrella
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Toggle({ on, onToggle, label, sub, icon: Icon, activeColor = '#10b981', theme: t }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        background: t.bgSurface,
        border: `1.5px solid ${t.border}`,
        borderRadius: 8,
        cursor: 'pointer',
        marginBottom: 10,
      }}
      onClick={onToggle}
    >
      <Icon size={20} color={on ? activeColor : t.textMuted} />
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 600, fontSize: '0.87rem', color: t.text, margin: 0 }}>{label}</p>
        {sub && <p style={{ fontSize: '0.72rem', color: t.textMuted, margin: 0 }}>{sub}</p>}
      </div>
      <div
        style={{
          width: 44,
          height: 26,
          borderRadius: 99,
          padding: 3,
          background: on ? activeColor : t.border,
          transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        <motion.div
          animate={{ x: on ? 18 : 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 26 }}
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 4px rgba(0,0,0,0.22)',
          }}
        />
      </div>
    </div>
  );
}

export function HBar({ label, val, pct, color, total, hideCount, theme: t }) {
  const pOf = total > 0 ? Math.round((val / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: '0.77rem', fontWeight: 600, color: t.text }}>{label}</span>
        <span style={{ fontSize: '0.77rem', fontWeight: 600, color }}>
          {!hideCount && `${val} `}
          <span style={{ color: hideCount ? color : t.textMuted, fontWeight: hideCount ? 700 : 500 }}>
            {hideCount ? `${pOf}%` : `(${pOf}%)`}
          </span>
        </span>
      </div>
      <div style={{ height: 8, background: t.border, borderRadius: 99, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: '100%', background: color, borderRadius: 99 }}
        />
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { ChevronRight, UserCheck, Target, Navigation } from 'lucide-react';
import { motion } from 'framer-motion';
import { Toggle } from './UI';

export function SetupScreen({ onDone, theme: t }) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('20');
  const [gps, setGps] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '52px 28px 36px', overflowY: 'auto' }}
    >
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <motion.div
          animate={{ rotate: [0, 8, -8, 0] }}
          transition={{ duration: 1.2, delay: 0.5 }}
          style={{ fontSize: 52, marginBottom: 14, display: 'inline-block' }}
        >
          
        </motion.div>
        <h1 style={{ fontWeight: 600, fontSize: '1.85rem', color: t.text, letterSpacing: '-0.03em', marginBottom: 10 }}>
          ¡Hola, Encuestador!
        </h1>
        <p style={{ fontSize: '0.9rem', color: t.textSec, lineHeight: 1.65, maxWidth: 290, margin: '0 auto' }}>
          Configura tu perfil para organizar el trabajo de campo del Sondeo Electoral 2026.
        </p>
      </div>

      <p style={{ fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: t.textMuted, marginBottom: 10 }}>
        Tu nombre completo
      </p>
      <div style={{ position: 'relative', width: '100%', marginBottom: 20 }}>
        <UserCheck size={16} color={t.textMuted} style={{ position: 'absolute', left: 17, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          autoFocus
          style={{
            width: '100%',
            height: 54,
            padding: '0 20px 0 44px',
            borderRadius: 8,
            fontSize: '0.92rem',
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            display: 'block',
            background: t.bgSurface,
            border: `2px solid ${t.border}`,
            color: t.text,
          }}
          placeholder="Ej: María García"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <p style={{ fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: t.textMuted, marginBottom: 10 }}>
        Meta diaria de encuestas
      </p>
      <div style={{ position: 'relative', width: '100%', marginBottom: 20 }}>
        <Target size={16} color={t.textMuted} style={{ position: 'absolute', left: 17, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          type="number"
          min="1"
          max="200"
          style={{
            width: '100%',
            height: 54,
            padding: '0 20px 0 44px',
            borderRadius: 8,
            fontSize: '0.92rem',
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            display: 'block',
            background: t.bgSurface,
            border: `2px solid ${t.border}`,
            color: t.text,
          }}
          placeholder="20"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />
      </div>

      <Toggle
        on={gps}
        onToggle={() => setGps((g) => !g)}
        icon={Navigation}
        label="Capturar ubicación GPS"
        sub="Guarda coordenadas satelitales con cada encuesta"
        activeColor="#10b981"
        theme={t}
      />

      <div style={{ flex: 1 }} />

      <button
        disabled={!name.trim() || !goal}
        onClick={() => onDone({ name: name.trim(), goal: parseInt(goal) || 20, gps })}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
          height: 52,
          marginTop: 6,
          borderRadius: 99,
          border: 'none',
          background: '#0c2340',
          color: '#fff',
          fontWeight: 600,
          fontSize: '0.97rem',
          cursor: 'pointer',
          boxShadow: '0 10px 28px -8px rgba(15,23,42,0.33)',
          transition: 'all 0.24s ease',
        }}
        className="btn-pill-hover"
      >
        Comenzar campaña <ChevronRight size={18} strokeWidth={2.5} />
      </button>
    </motion.div>
  );
}

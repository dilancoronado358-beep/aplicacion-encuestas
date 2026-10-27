import React, { useState, useEffect } from 'react';
import {
  ClipboardList, PieChart, Settings, X, Target, BarChart3, Users,
  Moon, Sun, Download, Trash2, RefreshCw, Cloud, Smartphone, CheckCircle2, AlertCircle, LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CANDIDATOS, PARROQUIAS } from '../constants';
import { HBar, Toggle } from './UI';
import { fetchCloudSurveys } from '../services/supabase';

const todayKey = () => new Date().toISOString().slice(0, 10);
const countToday = (list) => list.filter((s) => (s.ts || s.created_at)?.startsWith(todayKey())).length;

const makeChart = (list, key, opts) => {
  const c = {};
  opts.forEach((o) => (c[o] = 0));
  list.forEach((s) => {
    if (s[key] && c[s[key]] !== undefined) c[s[key]]++;
  });
  const mx = Math.max(...Object.values(c), 1);
  return Object.entries(c).map(([label, val]) => ({
    label,
    val,
    pct: Math.round((val / mx) * 100),
  }));
};

export function AdminPanel({
  surveys,
  config,
  onClose,
  onExport,
  onClearAll,
  onUpdateConfig,
  darkMode,
  onToggleDark,
  onSyncPending,
  onLogout,
  theme: t,
}) {
  const [tab, setTab] = useState('resumen');
  const [dataSource, setDataSource] = useState('local'); // 'local' | 'cloud'
  const [cloudSurveys, setCloudSurveys] = useState([]);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [cloudError, setCloudError] = useState(null);
  const [includeBaseVotes, setIncludeBaseVotes] = useState(false);

  const [confirmClear, setConfirmClear] = useState(false);
  const [eName, setEName] = useState(config?.name || '');
  const [eGoal, setEGoal] = useState(String(config?.goal || 20));

  const loadCloud = async () => {
    setLoadingCloud(true);
    setCloudError(null);
    const data = await fetchCloudSurveys();
    if (data) {
      setCloudSurveys(data);
    } else {
      setCloudError('No se pudo conectar a la nube. Revisa tu conexión.');
    }
    setLoadingCloud(false);
  };

  useEffect(() => {
    if (dataSource === 'cloud' && cloudSurveys.length === 0) {
      loadCloud();
    }
  }, [dataSource]);

  // Selección de datos activos
  const activeSurveys = dataSource === 'cloud' ? cloudSurveys : surveys;
  const pendingCount = surveys.filter((s) => !s.uploaded).length;

  const BASE_VOTES = {
    'Lic. Luz Álvarez': 61,
    'ING. Nancy Goyes': 52,
    'Sr. Bayardo Moreno': 50,
    'Made Luna': 18,
    'Sr. Luis Ceron': 15,
    'srta. Vanesa Chunes': 12,
    'Sr. Juan Figueroa': 10,
    'Lic. Jesenia Pinchao': 5,
    'ING. Verónica Taramuel': 3,
    'Jesica Flores': 2,
  };
  const BASE_TOTAL = 228;

  const today = countToday(activeSurveys);
  const totalRaw = activeSurveys.length;
  const total = includeBaseVotes ? totalRaw + BASE_TOTAL : totalRaw;
  const pctGoal = config ? Math.min(100, Math.round((today / (config.goal || 20)) * 100)) : 0;

  const parqData = makeChart(activeSurveys, 'parroquia', PARROQUIAS.map((p) => p.name));

  // Votos por candidato
  let candCounts = {};
  CANDIDATOS.forEach((c) => {
    candCounts[c.name] = includeBaseVotes ? (BASE_VOTES[c.name] || 0) : 0;
  });
  activeSurveys.forEach((s) => {
    if (s.candidato && candCounts[s.candidato] !== undefined) {
      candCounts[s.candidato]++;
    }
  });

  const candMax = Math.max(...Object.values(candCounts), 1);
  const candData = Object.entries(candCounts)
    .map(([label, val]) => ({
      label,
      val,
      pct: Math.round((val / candMax) * 100),
    }))
    .sort((a, b) => b.val - a.val);

  const TABS = [
    { id: 'resumen', label: 'Resumen', Icon: ClipboardList },
    { id: 'analisis', label: 'Análisis', Icon: PieChart },
    { id: 'config', label: 'Config', Icon: Settings },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(10px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 120, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 310 }}
        style={{
          width: '100%',
          maxWidth: 480,
          margin: '0 auto',
          borderRadius: '28px 28px 0 0',
          padding: '0 20px 30px',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.22)',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: t.adminSheet,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 40, height: 5, borderRadius: 99, background: t.border, margin: '12px auto 18px' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 13,
                background: 'rgba(99,102,241,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Settings size={18} color="#6366f1" />
            </div>
            <div>
              <p style={{ fontWeight: 800, fontSize: '1rem', color: t.text, margin: 0 }}>Panel de Control</p>
              <p style={{ fontSize: '0.73rem', color: t.textMuted, margin: 0 }}>
                {config.name} · {dataSource === 'cloud' ? 'Vista Consolidada (Nube)' : 'Vista Local'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: 'none',
              background: t.bgSurface,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: t.textSec,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Selector de origen de datos: Local vs Nube */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button
            onClick={() => setDataSource('local')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              height: 34,
              borderRadius: 12,
              border: `1.5px solid ${dataSource === 'local' ? '#ef4444' : t.border}`,
              background: dataSource === 'local' ? 'rgba(239,68,68,0.08)' : t.bgSurface,
              color: dataSource === 'local' ? '#ef4444' : t.textMuted,
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            <Smartphone size={14} /> Este Dispositivo ({surveys.length})
          </button>
          <button
            onClick={() => setDataSource('cloud')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              height: 34,
              borderRadius: 12,
              border: `1.5px solid ${dataSource === 'cloud' ? '#3b82f6' : t.border}`,
              background: dataSource === 'cloud' ? 'rgba(59,130,246,0.08)' : t.bgSurface,
              color: dataSource === 'cloud' ? '#3b82f6' : t.textMuted,
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            <Cloud size={14} /> Consolidado Nube {cloudSurveys.length > 0 && `(${cloudSurveys.length})`}
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 5, padding: 4, background: t.tabBg, borderRadius: 16, marginBottom: 18 }}>
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                height: 36,
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.76rem',
                transition: 'all 0.2s',
                background: tab === id ? '#fff' : 'transparent',
                color: tab === id ? '#0f172a' : t.textMuted,
                boxShadow: tab === id ? '0 2px 8px rgba(0,0,0,0.09)' : 'none',
              }}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* ── RESUMEN ───────────────────────────────────────────── */}
        {tab === 'resumen' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
            {/* Meta bar */}
            <div style={{ background: t.statCardBg, border: `1.5px solid ${t.border}`, borderRadius: 18, padding: '16px 18px', marginBottom: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Target size={17} color="#ef4444" />
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: t.text }}>Meta del día</span>
                </div>
                <span style={{ fontWeight: 900, fontSize: '1.05rem', color: pctGoal >= 100 ? '#10b981' : '#ef4444' }}>
                  {today} / {config.goal}
                </span>
              </div>
              <div style={{ height: 10, background: t.border, borderRadius: 99, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pctGoal}%` }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    height: '100%',
                    borderRadius: 99,
                    background: pctGoal >= 100 ? 'linear-gradient(to right,#10b981,#059669)' : 'linear-gradient(to right,#ef4444,#dc2626)',
                  }}
                />
              </div>
              <p style={{ fontSize: '0.7rem', color: t.textMuted, marginTop: 6, textAlign: 'right' }}>
                {pctGoal >= 100 ? '🎉 ¡Meta alcanzada!' : `Faltan ${Math.max(0, config.goal - today)} encuestas`}
              </p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9, marginBottom: 13 }}>
              {[
                { Icon: ClipboardList, val: today, lbl: 'Hoy', color: '#ef4444' },
                { Icon: BarChart3, val: total, lbl: 'Total Muestra', color: '#3b82f6' },
                { Icon: Users, val: activeSurveys.filter((s) => s.candidato).length, lbl: 'Votos Reg.', color: '#10b981' },
              ].map(({ Icon, val, lbl, color }) => (
                <div
                  key={lbl}
                  style={{
                    background: t.statCardBg,
                    border: `1.5px solid ${t.border}`,
                    borderRadius: 16,
                    padding: '12px 10px',
                    textAlign: 'center',
                  }}
                >
                  <Icon size={18} color={color} style={{ margin: '0 auto 6px' }} />
                  <div style={{ fontWeight: 900, fontSize: '1.25rem', color: t.text, lineHeight: 1 }}>{val}</div>
                  <div style={{ fontSize: '0.66rem', fontWeight: 700, color: t.textMuted, marginTop: 4, textTransform: 'uppercase' }}>{lbl}</div>
                </div>
              ))}
            </div>

            {/* Estado de sincronización */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: pendingCount > 0 ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)',
                border: `1.5px solid ${pendingCount > 0 ? '#fca5a5' : '#bbf7d0'}`,
                borderRadius: 16,
                marginBottom: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {pendingCount > 0 ? <AlertCircle size={17} color="#ef4444" /> : <CheckCircle2 size={17} color="#10b981" />}
                <div>
                  <p style={{ fontWeight: 700, fontSize: '0.8rem', color: pendingCount > 0 ? '#b91c1c' : '#047857', margin: 0 }}>
                    {pendingCount > 0 ? `${pendingCount} encuestas pendientes por subir` : 'Todas las encuestas están en la nube'}
                  </p>
                  <p style={{ fontSize: '0.68rem', color: t.textMuted, margin: 0 }}>
                    {pendingCount > 0 ? 'Toca para sincronizar en lote' : 'Sincronización activa con Supabase'}
                  </p>
                </div>
              </div>
              {pendingCount > 0 && onSyncPending && (
                <button
                  onClick={onSyncPending}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 99,
                    border: 'none',
                    background: '#ef4444',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                  }}
                >
                  Subir ya
                </button>
              )}
            </div>

            {/* Refrescar Nube si estamos en modo nube */}
            {dataSource === 'cloud' && (
              <button
                disabled={loadingCloud}
                onClick={loadCloud}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  height: 44,
                  borderRadius: 14,
                  border: `1.5px solid ${t.border}`,
                  background: t.bgSurface,
                  color: t.text,
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  marginBottom: 10,
                }}
              >
                <RefreshCw size={14} className={loadingCloud ? 'spin' : ''} />
                {loadingCloud ? 'Cargando datos de la nube…' : 'Refrescar datos de Supabase'}
              </button>
            )}
            {cloudError && <p style={{ fontSize: '0.74rem', color: '#ef4444', textAlign: 'center' }}>{cloudError}</p>}
          </motion.div>
        )}

        {/* ── ANÁLISIS ─────────────────────────────────────────── */}
        {tab === 'analisis' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ fontWeight: 800, fontSize: '0.85rem', color: t.text, margin: 0 }}>
                Intención de Voto ({dataSource === 'cloud' ? 'Nube' : 'Local'})
              </p>
              <span style={{ fontSize: '0.7rem', color: t.textMuted }}>Total: {total}</span>
            </div>

            <div style={{ background: t.statCardBg, border: `1.5px solid ${t.border}`, borderRadius: 18, padding: '16px 16px 8px', marginBottom: 16 }}>
              {candData.map(({ label, val, pct }) => {
                const candObj = CANDIDATOS.find((c) => c.name === label);
                const color = candObj ? candObj.color : '#64748b';
                return <HBar key={label} label={label} val={val} pct={pct} color={color} total={total} theme={t} />;
              })}
            </div>

            <p style={{ fontWeight: 800, fontSize: '0.85rem', color: t.text, marginBottom: 10 }}>Por Parroquia</p>
            <div style={{ background: t.statCardBg, border: `1.5px solid ${t.border}`, borderRadius: 18, padding: '16px 16px 8px' }}>
              {parqData.map(({ label, val, pct }) => (
                <HBar key={label} label={label} val={val} pct={pct} color="#3b82f6" total={total} theme={t} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── CONFIG ───────────────────────────────────────────── */}
        {tab === 'config' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
            <p style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: t.textMuted, marginBottom: 6 }}>
              Nombre del Encuestador
            </p>
            <input
              style={{
                width: '100%',
                height: 48,
                padding: '0 16px',
                borderRadius: 14,
                fontSize: '0.9rem',
                outline: 'none',
                background: t.bgSurface,
                border: `2px solid ${t.border}`,
                color: t.text,
                marginBottom: 14,
                boxSizing: 'border-box',
              }}
              value={eName}
              onChange={(e) => setEName(e.target.value)}
            />

            <p style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: t.textMuted, marginBottom: 6 }}>
              Meta Diaria
            </p>
            <input
              type="number"
              style={{
                width: '100%',
                height: 48,
                padding: '0 16px',
                borderRadius: 14,
                fontSize: '0.9rem',
                outline: 'none',
                background: t.bgSurface,
                border: `2px solid ${t.border}`,
                color: t.text,
                marginBottom: 16,
                boxSizing: 'border-box',
              }}
              value={eGoal}
              onChange={(e) => setEGoal(e.target.value)}
            />

            <button
              onClick={() => onUpdateConfig({ ...config, name: eName.trim() || config.name, goal: parseInt(eGoal) || config.goal })}
              style={{
                width: '100%',
                height: 44,
                borderRadius: 12,
                border: 'none',
                background: '#0f172a',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                marginBottom: 18,
              }}
            >
              Guardar Configuración
            </button>

            <Toggle
              on={darkMode}
              onToggle={onToggleDark}
              icon={darkMode ? Moon : Sun}
              label="Modo Oscuro"
              sub="Ahorro de batería y visualización nocturna"
              activeColor="#6366f1"
              theme={t}
            />

            <Toggle
              on={includeBaseVotes}
              onToggle={() => setIncludeBaseVotes((v) => !v)}
              icon={BarChart3}
              label="Muestra base de prueba (228 votos)"
              sub="Activa para simular análisis comparativo previo"
              activeColor="#f59e0b"
              theme={t}
            />

            <div style={{ height: 1, background: t.border, margin: '18px 0' }} />

            <button
              onClick={onExport}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                height: 46,
                borderRadius: 14,
                border: `1.5px solid ${t.border}`,
                background: t.bgSurface,
                color: t.text,
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
                marginBottom: 12,
              }}
            >
              <Download size={16} /> Exportar CSV a este dispositivo ({surveys.length})
            </button>

            <button
              onClick={() => {
                if (!confirmClear) setConfirmClear(true);
                else {
                  onClearAll();
                  setConfirmClear(false);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                height: 46,
                borderRadius: 14,
                border: 'none',
                background: confirmClear ? '#ef4444' : 'rgba(239,68,68,0.08)',
                color: confirmClear ? '#fff' : '#ef4444',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={16} />
              {confirmClear ? '¿Seguro? Toca para confirmar borrado local' : 'Vaciar datos locales de este celular'}
            </button>
            {confirmClear && (
              <button
                onClick={() => setConfirmClear(false)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  color: t.textMuted,
                  fontSize: '0.78rem',
                  padding: 8,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            )}

            <div style={{ height: 1, background: t.border, margin: '16px 0' }} />

            <button
              onClick={() => {
                if (onLogout) {
                  onLogout();
                  onClose();
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                height: 44,
                borderRadius: 14,
                border: `1.5px solid ${t.border}`,
                background: 'transparent',
                color: t.textSec,
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              <LogOut size={16} /> Cerrar Sesión del Encuestador
            </button>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  ChevronRight, MapPin, User, CheckCircle2, Send, BarChart3,
  ArrowLeft, Award, Settings, WifiOff, Users, TrendingUp,
  Phone, Download, RefreshCw, Navigation, Zap, Calendar, Hash,
  FileText, Check, AlertCircle, Home, FileSpreadsheet, Sparkles, Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import {
  PARROQUIAS,
  OPCIONES_VOTO_ROBLES,
  PROBLEMAS_COMUNES,
  OPCIONES_APOYO,
  OPCIONES_REGRESAR,
  PROBLEMAS_MUNICIPALES_PRIORITARIOS,
  TOTAL_STEPS,
  BLANK,
  LIGHT,
  DARK
} from './constants';
import { Confetti, StepDots } from './components/UI';
import { AuthScreen } from './components/AuthScreen';
import { SetupScreen } from './components/SetupScreen';
import { AdminPanel } from './components/AdminPanel';
import { AdminDashboard } from './components/AdminDashboard';
import {
  uploadSurvey,
  uploadSurveysBatch,
  calculateResultadoVoto,
  sendEncuestadorHeartbeat,
  fetchCloudSurveys
} from './services/supabase';
import { findManzanaByCoords } from './services/geoUtils';

const ThemeCtx = createContext(LIGHT);
const useT = () => useContext(ThemeCtx);

const todayKey = () => new Date().toISOString().slice(0, 10);
const countToday = (list) => list.filter((s) => s.ts?.startsWith(todayKey())).length;

/* ════════════════════════════════════════════════════════════════════
   ANIMATION VARIANTS
════════════════════════════════════════════════════════════════════ */
const pageVar = {
  hidden: { opacity: 0, x: 38, scale: 0.97 },
  visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, x: -38, scale: 0.97, transition: { duration: 0.24, ease: 'easeIn' } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.09, duration: 0.44, ease: [0.22, 1, 0.36, 1] } }),
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05, delayChildren: 0.03 } } };
const itemV = { hidden: { opacity: 0, y: 12, scale: 0.97 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } } };

/* ════════════════════════════════════════════════════════════════════
   MAIN APP COMPONENT
════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [step, setStep] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [surveys, setSurveys] = useState([]);

  // Todos los datos de encuestas provienen 100% de Supabase
  useEffect(() => {
    localStorage.removeItem('pending_surveys');
    localStorage.removeItem('survey_records');
    localStorage.removeItem('encuestas_offline');

    fetchCloudSurveys().then((list) => {
      if (Array.isArray(list)) {
        setSurveys(list);
      }
    });
  }, []);
  const [config, setConfig] = useState(() => JSON.parse(localStorage.getItem('campaign_config') || 'null'));
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('dark_mode') === 'true');
  const [formData, setFormData] = useState(BLANK);
  const [showAdmin, setShowAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adminInFieldMode, setAdminInFieldMode] = useState(false);

  // Estados para rastreo GPS en tiempo real y solicitud de permisos
  const [geoPermission, setGeoPermission] = useState('prompt'); // 'prompt' | 'granted' | 'denied'
  const [geoError, setGeoError] = useState(null);
  const [liveTrackingActive, setLiveTrackingActive] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [userCoords, setUserCoords] = useState(null);

  const t = darkMode ? DARK : LIGHT;

  // Solicitar permiso de geolocalización al encuestador
  // Auto-detección inteligente del código de manzana CPV por coordenadas GPS
  const autoDetectManzana = (lat, lng) => {
    if (!lat || !lng) return null;
    const match = findManzanaByCoords(lat, lng);
    return match?.manzana || null;
  };

  const requestLocationPermission = () => {
    if (!navigator.geolocation) {
      setGeoError('Tu dispositivo o navegador no soporta geolocalización GPS.');
      return;
    }

    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setUserCoords({ lat: latitude, lng: longitude, accuracy });
        setGeoPermission('granted');
        setLiveTrackingActive(true);
        setShowLocationPrompt(false);
        const detectedManzana = autoDetectManzana(latitude, longitude);
        if (detectedManzana) {
          setFormData((prev) => (!prev.manzana ? { ...prev, manzana: detectedManzana } : prev));
        }
        if (config?.email) {
          sendEncuestadorHeartbeat(config.email, config.name, latitude, longitude, accuracy);
        }
      },
      (err) => {
        console.warn('Error al solicitar permiso de ubicación:', err);
        if (err.code === 1) {
          setGeoPermission('denied');
          setGeoError('Permiso de ubicación denegado. Permite el GPS en tu navegador para que el Centro de Mando pueda identificarte.');
        } else {
          setGeoError('No se pudo obtener señal satelital en este momento.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Comprobar estado de permisos de geolocalización al iniciar sesión
  useEffect(() => {
    if (!config || !config.loggedIn) return;
    if (!navigator.geolocation) return;

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((status) => {
        setGeoPermission(status.state);
        if (status.state === 'granted') {
          setLiveTrackingActive(true);
        } else {
          // Mostrar modal pidiendo permiso si aún no ha sido concedido
          setShowLocationPrompt(true);
        }
        status.onchange = () => {
          setGeoPermission(status.state);
          if (status.state === 'granted') {
            setLiveTrackingActive(true);
            setShowLocationPrompt(false);
          }
        };
      }).catch(() => {
        setShowLocationPrompt(true);
      });
    } else {
      setShowLocationPrompt(true);
    }
  }, [config?.loggedIn]);

  // Transmisión continua en tiempo real (watchPosition y latidos periódicos cada 12 segundos)
  useEffect(() => {
    if (!liveTrackingActive || !config?.loggedIn || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setUserCoords({ lat: latitude, lng: longitude, accuracy });
        const detectedManzana = autoDetectManzana(latitude, longitude);
        if (detectedManzana) {
          setFormData((prev) => (!prev.manzana ? { ...prev, manzana: detectedManzana } : prev));
        }
        if (config?.email) {
          sendEncuestadorHeartbeat(config.email, config.name, latitude, longitude, accuracy);
        }
      },
      (err) => {
        console.warn('watchPosition error:', err);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    const intervalId = setInterval(() => {
      if (userCoords && config?.email) {
        sendEncuestadorHeartbeat(config.email, config.name, userCoords.lat, userCoords.lng, userCoords.accuracy);
      }
    }, 12000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(intervalId);
    };
  }, [liveTrackingActive, config?.email, config?.name, userCoords]);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
  }, [darkMode]);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const persistSurveys = (list) => {
    setSurveys(list);
  };

  const persistConfig = (cfg) => {
    localStorage.setItem('campaign_config', JSON.stringify(cfg));
    setConfig(cfg);
  };

  const toggleDark = () => {
    const n = !darkMode;
    setDarkMode(n);
    localStorage.setItem('dark_mode', n);
  };

  // Sincronización en lote con Supabase
  const syncPending = async () => {
    const pending = surveys.filter((s) => !s.uploaded);
    if (!pending.length) return;
    const isSuccess = await uploadSurveysBatch(pending);
    if (isSuccess) {
      const updated = surveys.map((s) => ({ ...s, uploaded: true }));
      persistSurveys(updated);
    }
  };

  useEffect(() => {
    if (isOnline) {
      syncPending();
    }
  }, [isOnline, surveys.length]);

  // Alternar selección de problemas del sector
  const toggleProblem = (prob) => {
    setFormData((prev) => {
      const current = Array.isArray(prev.problemas) ? prev.problemas : [];
      if (current.includes(prob)) {
        return { ...prev, problemas: current.filter((p) => p !== prob) };
      } else {
        return { ...prev, problemas: [...current, prob] };
      }
    });
  };

  // Manejo de la pregunta: ¿Contamos con su apoyo? (ligado a semaforización)
  const handleSelectApoyo = (apoyoId) => {
    let semaforo = 'indeciso';
    let regresar = formData.podemos_regresar;
    if (apoyoId === 'si') {
      semaforo = 'voto_seguro';
      if (!regresar) regresar = 'si';
    } else if (apoyoId === 'no') {
      semaforo = 'no_vota';
      regresar = 'no';
    } else if (apoyoId === 'tal_vez') {
      semaforo = 'indeciso';
      if (!regresar) regresar = 'quizas';
    }
    setFormData((f) => ({
      ...f,
      apoyo_robles: apoyoId,
      votaria_robles: semaforo,
      podemos_regresar: regresar,
    }));
  };

  // Manejo de la pregunta: ¿Podemos regresar? (ligado a semaforización)
  const handleSelectRegresar = (regresarId) => {
    let semaforo = formData.votaria_robles;
    if (regresarId === 'no') {
      semaforo = 'no_vota';
    } else if (regresarId === 'si' && formData.apoyo_robles === 'si') {
      semaforo = 'voto_seguro';
    }
    setFormData((f) => ({
      ...f,
      podemos_regresar: regresarId,
      votaria_robles: semaforo,
    }));
  };

  // Manejo directo de la tarjeta de semaforización
  const handleSelectSemaforo = (semaforoId) => {
    let apoyo = formData.apoyo_robles;
    let regresar = formData.podemos_regresar;
    if (semaforoId === 'voto_seguro') {
      apoyo = 'si';
      regresar = 'si';
    } else if (semaforoId === 'no_vota') {
      apoyo = 'no';
      regresar = 'no';
    } else if (semaforoId === 'indeciso') {
      apoyo = 'tal_vez';
      regresar = 'quizas';
    }
    setFormData((f) => ({
      ...f,
      votaria_robles: semaforoId,
      apoyo_robles: apoyo,
      podemos_regresar: regresar,
    }));
  };

  // Captura satelital GPS en tiempo real con máxima precisión y sin cache
  const getAccurateGPS = async () => {
    if (navigator.geolocation) {
      try {
        const pos = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (p) => resolve({
              lat: Number(p.coords.latitude).toFixed(6),
              lng: Number(p.coords.longitude).toFixed(6),
              accuracy: p.coords.accuracy
            }),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
          );
        });
        if (pos) return pos;
      } catch (e) {
        console.warn('GPS directo:', e);
      }
    }
    if (userCoords && userCoords.lat && userCoords.lng) {
      return {
        lat: Number(userCoords.lat).toFixed(6),
        lng: Number(userCoords.lng).toFixed(6),
        accuracy: userCoords.accuracy || 10
      };
    }
    return null;
  };

  const saveToLocal = async () => {
    setSaving(true);
    const coords = await getAccurateGPS();

    if (navigator.vibrate) navigator.vibrate([80, 40, 140]);

    const finalParroquia = formData.parroquia === 'Otra (Especificar)'
      ? formData.parroquiaInput?.trim() || 'Otra'
      : (formData.parroquia || 'San Gabriel (Centro)');

    const resultado = formData.votaria_robles || 'indeciso';
    const tipoVisita = (resultado === 'nadie_en_casa' || resultado === 'no_trabajable') ? resultado : 'efectiva';
    const nombreAsignado = formData.nombre?.trim() || (formData.manzana ? `Mz. ${formData.manzana}` : 'Vivienda');

    const newSurvey = {
      ...formData,
      nombre: nombreAsignado,
      tipo_visita: tipoVisita,
      resultado_voto: resultado,
      candidato: resultado === 'voto_seguro' ? 'Dr. Fabián Robles' : (resultado === 'no_vota' ? 'Otro / Rechazo' : (resultado === 'indeciso' ? 'Indeciso' : 'N/A')),
      parroquia: finalParroquia,
      encuestador_id: null,
      encuestador: config?.name || '',
      ...(coords || {}),
      ts: formData.fecha ? new Date(formData.fecha).toISOString() : new Date().toISOString(),
      uploaded: false,
    };
    delete newSurvey.parroquiaInput;

    const isSuccess = await uploadSurvey(newSurvey);
    newSurvey.uploaded = isSuccess;

    const updated = [...surveys, newSurvey];
    persistSurveys(updated);
    setSaving(false);
    setStep(3);
  };

  // Guardado de incidencia directo desde adentro de la encuesta (Paso 1) con ubicación exacta
  const saveIncidentFromStep1 = async (tipo) => {
    setSaving(true);
    const coords = await getAccurateGPS();
    if (navigator.vibrate) navigator.vibrate([60, 30, 90]);

    let detectedManzana = formData.manzana?.trim();
    if (!detectedManzana && coords) {
      detectedManzana = autoDetectManzana(coords.lat, coords.lng) || '';
    }

    const assignedName = formData.numero_medidor_casa?.trim()
      ? `Casa / Medidor: ${formData.numero_medidor_casa.trim()}`
      : (detectedManzana ? `Mz. ${detectedManzana}` : (tipo === 'nadie_en_casa' ? 'Nadie en domicilio' : 'Zona no trabajable'));

    const incidentRecord = {
      ...formData,
      nombre: assignedName,
      manzana: detectedManzana || 'En territorio',
      numero_medidor_casa: formData.numero_medidor_casa || 'S/N',
      descripcion_casa: formData.descripcion_casa || (tipo === 'nadie_en_casa' ? 'No se obtuvo respuesta en la vivienda' : 'Predio o zona sin viviendas habitadas'),
      problemas: [],
      votaria_robles: tipo,
      tipo_visita: tipo,
      resultado_voto: tipo,
      candidato: tipo === 'nadie_en_casa' ? 'Nadie en domicilio' : 'Zona no trabajable',
      encuestador: config?.name || 'Encuestador',
      parroquia: formData.parroquia || 'San Gabriel (Centro)',
      ...(coords || {}),
      ts: formData.fecha ? new Date(formData.fecha).toISOString() : new Date().toISOString(),
      uploaded: false,
    };
    delete incidentRecord.parroquiaInput;

    const isSuccess = await uploadSurvey(incidentRecord);
    incidentRecord.uploaded = isSuccess;

    const updated = [...surveys, incidentRecord];
    persistSurveys(updated);
    setSaving(false);
    setStep(3);
  };

  const handleStartSurvey = () => {
    let autoManzana = formData.manzana;
    if (!autoManzana && userCoords) {
      autoManzana = autoDetectManzana(userCoords.lat, userCoords.lng);
    }
    setFormData((prev) => ({
      ...prev,
      fecha: prev.fecha || new Date().toISOString().slice(0, 16),
      manzana: autoManzana || prev.manzana || '',
    }));
    setStep(1);
  };

  const nextSurvey = () => {
    let autoManzana = '';
    if (userCoords) {
      autoManzana = autoDetectManzana(userCoords.lat, userCoords.lng) || '';
    }
    setFormData({
      ...BLANK,
      fecha: new Date().toISOString().slice(0, 16),
      manzana: autoManzana,
    });
    setStep(1);
  };
  const goHome = () => {
    setFormData({
      ...BLANK,
      fecha: new Date().toISOString().slice(0, 16),
    });
    setStep(0);
  };
  const setField = (k, v) => setFormData((f) => ({ ...f, [k]: v }));
  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => s - 1);

  // Exportar datos a CSV compatible con Excel
  const exportData = () => {
    if (!surveys.length) {
      alert('No hay encuestas guardadas en este dispositivo.');
      return;
    }
    const hs = Array.from(new Set(surveys.flatMap((r) => Object.keys(r))));
    const csv = [hs.join(','), ...surveys.map((r) => hs.map((h) => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `encuestas_sondeo_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const total = surveys.length;
  const todayCt = countToday(surveys);
  const pctGoal = config ? Math.min(100, Math.round((todayCt / (config.goal || 20)) * 100)) : 0;
  const isInSurvey = step > 0 && step < 3;

  const canSaveStep1 = !!formData.manzana?.trim();
  const canSaveStep2 = !saving && formData.votaria_robles;

  /* ── Login / Auth Screen ──────────────────────────────────────── */
  if (!config || !config.loggedIn) {
    return (
      <ThemeCtx.Provider value={t}>
        <div style={{ ...S.app, background: t.bgApp }}>
          <AuthScreen onLogin={(cfg) => persistConfig(cfg)} theme={t} />
        </div>
      </ThemeCtx.Provider>
    );
  }

  /* ── Centro de Mando del Administrador (Mapa en Tiempo Real) ── */
  if (config?.rol === 'admin' && !adminInFieldMode) {
    return (
      <AdminDashboard
        user={config}
        onLogout={() => {
          persistConfig({ ...config, loggedIn: false });
          setAdminInFieldMode(false);
        }}
        onSwitchToFieldView={() => setAdminInFieldMode(true)}
        theme={t}
      />
    );
  }

  /* ── Render steps ─────────────────────────────────────────────── */
  const renderStep = () => {
    switch (step) {
      /* PORTADA DEL ENCUESTADOR - DISEÑO FORMAL E INSTITUCIONAL */
      case 0:
        return (
          <motion.div key="s0" variants={pageVar} initial="hidden" animate="visible" exit="exit" style={{ ...S.hero, padding: '24px 20px', background: '#f8fafc' }}>
            {/* Botón de configuración/administración discreto */}
            <button
              onClick={() => setShowAdmin(true)}
              style={{
                position: 'absolute',
                top: 14,
                left: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                borderRadius: 8,
                padding: '6px 12px',
                cursor: 'pointer',
                zIndex: 50,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#475569',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              <Settings size={13} color="#475569" />
              <span>Configuración</span>
              {total > 0 && (
                <span style={{ background: '#0f172a', color: '#fff', borderRadius: 4, padding: '1px 5px', fontSize: 10, fontWeight: 800 }}>
                  {total}
                </span>
              )}
            </button>

            {/* Tarjeta de Encabezado Institucional Oficial */}
            <div
              style={{
                width: '100%',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: '20px 18px',
                marginBottom: 14,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                textAlign: 'center',
                marginTop: 28,
              }}
            >
              <div
                style={{
                  width: 130,
                  height: 64,
                  margin: '0 auto 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#ffffff',
                  padding: '4px 8px',
                  borderRadius: 8,
                }}
              >
                <img
                  src="/logo.png"
                  alt="Renovación Montufareña"
                  style={{ width: '100%', height: 'auto', maxHeight: 56, objectFit: 'contain' }}
                />
              </div>

              <h1 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                BRIGADA RENOVACIÓN (pap)
              </h1>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, fontWeight: 600 }}>
                Despliegue Territorial Puerta a Puerta
              </p>
            </div>

            {/* Ficha Oficial de Identificación del Brigadista */}
            <div
              style={{
                width: '100%',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '12px 16px',
                marginBottom: 12,
                boxSizing: 'border-box',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  BRIGADISTA ASIGNADO:
                </span>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0f172a' }}>
                  Montúfar / San Gabriel
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a', fontWeight: 800, fontSize: '0.92rem' }}>
                <User size={16} color="#0f172a" />
                <span>{config?.name || 'Encuestador Oficial'}</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                ID Operativo: {config?.email || 'brigada@montufar.gob.ec'}
              </div>
            </div>

            {/* Estado GPS Discreto y Profesional */}
            {/* Estado GPS Discreto y Profesional */}
            <div
              onClick={() => {
                if (!liveTrackingActive) requestLocationPermission();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 14px',
                borderRadius: 8,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                marginBottom: 14,
                boxSizing: 'border-box',
                cursor: liveTrackingActive ? 'default' : 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: liveTrackingActive ? '#15803d' : '#94a3b8' }} />
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155' }}>
                  {liveTrackingActive ? 'Señal Satelital GPS: Conectado en Tiempo Real' : 'Señal Satelital GPS: Inactiva'}
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.64rem',
                  fontWeight: 800,
                  color: liveTrackingActive ? '#15803d' : '#475569',
                  background: liveTrackingActive ? '#f0fdf4' : '#f1f5f9',
                  border: `1px solid ${liveTrackingActive ? '#bbf7d0' : '#cbd5e1'}`,
                  padding: '2px 8px',
                  borderRadius: 4,
                  textTransform: 'uppercase',
                }}
              >
                {liveTrackingActive ? 'ACTIVO' : 'ACTIVAR'}
              </span>
            </div>

            {/* Barra de Avance de la Jornada */}
            <div
              style={{
                width: '100%',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '12px 16px',
                marginBottom: 16,
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: 6 }}>
                <span style={{ color: '#64748b' }}>Meta diaria en territorio:</span>
                <span style={{ color: '#0f172a', fontWeight: 800 }}>{todayCt} de {config?.goal || 20} encuestas ({pctGoal}%)</span>
              </div>
              <div style={{ height: 6, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pctGoal}%`, background: '#0f172a', borderRadius: 4 }} />
              </div>
            </div>

            {/* Botón Principal de Acción (Súper Formal y Serio) */}
            <button
              onClick={handleStartSurvey}
              style={{
                width: '100%',
                height: 48,
                borderRadius: 10,
                border: 'none',
                background: '#0f172a',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.92rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 2px 6px rgba(15,23,42,0.15)',
              }}
            >
              <FileText size={16} />
              <span>INICIAR REGISTRO DE ENCUESTA</span>
            </button>
          </motion.div>
        );

      /* PASO 1 · DATOS PRINCIPALES DEL ENCUESTADO Y VIVIENDA */
      case 1:
        return (
          <motion.div key="s1" variants={pageVar} initial="hidden" animate="visible" exit="exit" style={{ ...S.page, background: '#f8fafc' }}>
            <div style={S.pageHeader}>
              <div style={S.stepIcon}>
                <FileText size={18} color="#0f172a" />
              </div>
              <div>
                <h2 style={{ ...S.pageTitle, color: '#0f172a', margin: 0 }}>Paso 1 · Ubicación y Vivienda</h2>
                <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>Ficha técnica de registro territorial puerta a puerta</p>
              </div>
            </div>

            {/* INDICADOR DE POSICIÓN SATELITAL GPS EN TIEMPO REAL */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: '7px 12px',
                marginBottom: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.73rem', fontWeight: 700, color: '#0f172a' }}>
                <Navigation size={13} color="#2563eb" />
                <span>
                  {userCoords
                    ? `GPS Exacto: ${Number(userCoords.lat).toFixed(5)}, ${Number(userCoords.lng).toFixed(5)}`
                    : 'Obteniendo GPS satelital...'}
                </span>
                {userCoords?.accuracy && (
                  <span style={{ fontSize: '0.65rem', color: '#16a34a', fontWeight: 800 }}>
                    (±{Math.round(userCoords.accuracy)}m)
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={requestLocationPermission}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: 4,
                  padding: '2px 8px',
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  cursor: 'pointer',
                }}
              >
                Refrescar GPS
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 12 }} className="custom-scrollbar">
              {/* CAMPO 1: FECHA Y HORA */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <Calendar size={13} color="#64748b" />
                  <span>FECHA Y HORA DE VISITA</span>
                </label>
                <div style={S.inputWrap}>
                  <Calendar size={15} color="#94a3b8" style={S.inputIcon} />
                  <input
                    type="datetime-local"
                    style={{ ...S.input, background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                    value={formData.fecha || ''}
                    onChange={(e) => setField('fecha', e.target.value)}
                  />
                </div>
              </div>

              {/* CAMPO 3: MANZANA (CÓDIGO CENSAL AUTOMÁTICO POR GPS) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Hash size={13} color="#64748b" />
                    <span>MANZANA CENSAL (CPV) *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (userCoords) {
                        const code = autoDetectManzana(userCoords.lat, userCoords.lng);
                        if (code) {
                          setField('manzana', code);
                        } else {
                          alert('Estás fuera del perímetro censal de San Gabriel o el GPS aún está calibrando.');
                        }
                      } else {
                        requestLocationPermission();
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      borderRadius: 6,
                      padding: '3px 8px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    <Navigation size={11} color="#0f172a" />
                    <span>Auto-detectar GPS</span>
                  </button>
                </div>
                <div style={S.inputWrap}>
                  <Hash size={15} color="#94a3b8" style={S.inputIcon} />
                  <input
                    style={{ ...S.input, background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                    placeholder="Código de Manzana CPV (ej. 040550001010002)"
                    value={formData.manzana}
                    onChange={(e) => setField('manzana', e.target.value)}
                  />
                </div>
                {formData.manzana ? (
                  <div style={{ marginTop: 4, fontSize: '0.7rem', color: '#15803d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={12} color="#15803d" />
                    <span>Manzana identificada en territorio: {formData.manzana}</span>
                  </div>
                ) : (
                  <div style={{ marginTop: 4, fontSize: '0.68rem', color: '#64748b' }}>
                    Se detecta automáticamente por GPS al posicionarse en la manzana.
                  </div>
                )}
              </div>

              {/* CAMPO 4: NÚMERO DE MEDIDOR O CASA */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <Home size={13} color="#64748b" />
                  <span>NÚMERO DE MEDIDOR O CASA</span>
                </label>
                <div style={S.inputWrap}>
                  <Home size={15} color="#94a3b8" style={S.inputIcon} />
                  <input
                    style={{ ...S.input, background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                    placeholder="Ej. Medidor #04921 / Casa #14B"
                    value={formData.numero_medidor_casa}
                    onChange={(e) => setField('numero_medidor_casa', e.target.value)}
                  />
                </div>
              </div>

              {/* CAMPO 5: DESCRIPCIÓN DE LA CASA */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <FileText size={13} color="#64748b" />
                  <span>DESCRIPCIÓN DE LA VIVIENDA</span>
                </label>
                <textarea
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.82rem',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    outline: 'none',
                    resize: 'none',
                  }}
                  placeholder="Color de la fachada, número de pisos, rejas, portón o señas de la vivienda..."
                  value={formData.descripcion_casa}
                  onChange={(e) => setField('descripcion_casa', e.target.value)}
                />
              </div>

              {/* PREGUNTA SOLICITADA: PROBLEMA MÁS IMPORTANTE */}
              <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 10, padding: '12px 14px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, lineHeight: 1.35 }}>
                  <AlertCircle size={15} color="#475569" />
                  <span>¿Cuál cree usted que es el problema más importante que debe atender la próxima administración municipal?</span>
                </label>
                <select
                  value={formData.problema_prioritario || ''}
                  onChange={(e) => setField('problema_prioritario', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    marginBottom: 6,
                  }}
                >
                  <option value="">-- Seleccione la prioridad principal --</option>
                  {PROBLEMAS_MUNICIPALES_PRIORITARIOS.map((prob) => (
                    <option key={prob} value={prob}>{prob}</option>
                  ))}
                </select>

                {formData.problema_prioritario === '🏛️ Otro (especificar)' && (
                  <input
                    style={{ ...S.input, background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', height: 40, fontSize: '0.8rem', marginTop: 6 }}
                    placeholder="Especifique el problema municipal prioritario..."
                    value={formData.problema_prioritario_otro || ''}
                    onChange={(e) => setField('problema_prioritario_otro', e.target.value)}
                  />
                )}
              </div>

              {/* OTRAS NECESIDADES REPORTADAS */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                  <span>Otras necesidades secundarias expresadas por el ciudadano:</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                  {PROBLEMAS_COMUNES.map((prob) => {
                    const isSelected = Array.isArray(formData.problemas) && formData.problemas.includes(prob);
                    return (
                      <button
                        key={prob}
                        type="button"
                        onClick={() => toggleProblem(prob)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 6,
                          border: `1px solid ${isSelected ? '#0f172a' : '#cbd5e1'}`,
                          background: isSelected ? '#0f172a' : '#ffffff',
                          color: isSelected ? '#ffffff' : '#334155',
                          fontSize: '0.72rem',
                          fontWeight: isSelected ? 800 : 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        {isSelected && <Check size={12} color="#ffffff" strokeWidth={3} />}
                        <span>{prob}</span>
                      </button>
                    );
                  })}
                </div>
                <input
                  style={{ ...S.input, background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', height: 40, fontSize: '0.8rem' }}
                  placeholder="Otro requerimiento específico del sector..."
                  value={formData.problemas_otro || ''}
                  onChange={(e) => setField('problemas_otro', e.target.value)}
                />
              </div>
            </div>

            {/* INCIDENCIAS DIRECTAS EN TERRITORIO (ADENTRO DE LA ENCUESTA) */}
            <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 10, padding: '12px 14px', marginTop: 10 }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 8, textAlign: 'center' }}>
                ¿Se encuentra alguien en el domicilio?
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => saveIncidentFromStep1('nadie_en_casa')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    height: 44,
                    borderRadius: 8,
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#334155',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <span>⚪ Nadie en Domicilio</span>
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => saveIncidentFromStep1('no_trabajable')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    height: 44,
                    borderRadius: 8,
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#334155',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <span>🔘 Zona No Trabajable</span>
                </button>
              </div>
            </div>

            <button
              disabled={!formData.manzana?.trim()}
              onClick={handleNext}
              style={{
                ...S.btnPill,
                background: formData.manzana?.trim() ? '#0f172a' : '#cbd5e1',
                marginTop: 8,
              }}
            >
              <span>CONTINUAR A CONSULTA CIUDADANA</span>
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </motion.div>
        );

      /* PASO 2 · PREGUNTAS LIGADAS A LA SEMAFORIZACIÓN */
      case 2:
        return (
          <motion.div key="s2" variants={pageVar} initial="hidden" animate="visible" exit="exit" style={{ ...S.page, background: '#f8fafc' }}>
            <div style={S.pageHeader}>
              <div style={S.stepIcon}>
                <Award size={18} color="#0f172a" />
              </div>
              <div>
                <h2 style={{ ...S.pageTitle, color: '#0f172a', margin: 0 }}>Paso 2 · Consulta Ciudadana</h2>
                <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>Intención de respaldo y semaforización oficial</p>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 12 }} className="custom-scrollbar">
              {/* PREGUNTA 1: ¿CONTAMOS CON SU APOYO? */}
              <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 10, padding: '12px 14px' }}>
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 2 }}>
                  1. INTENCIÓN DE APOYO CIUDADANO
                </span>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '0.92rem', fontWeight: 900, color: '#0f172a' }}>
                  ¿Contamos con su apoyo?
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {OPCIONES_APOYO.map((op) => {
                    const isSelected = formData.apoyo_robles === op.id;
                    const dotColor = op.id === 'si' ? '#15803d' : op.id === 'tal_vez' ? '#d97706' : '#dc2626';
                    return (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => handleSelectApoyo(op.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '9px 12px',
                          borderRadius: 8,
                          border: `1.5px solid ${isSelected ? '#0f172a' : '#e2e8f0'}`,
                          background: isSelected ? '#f8fafc' : '#ffffff',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: isSelected ? 800 : 600, color: isSelected ? '#0f172a' : '#334155' }}>
                          {op.label}
                        </span>
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            border: `1.5px solid ${isSelected ? '#0f172a' : '#cbd5e1'}`,
                            background: isSelected ? '#0f172a' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {isSelected && <Check size={11} color="#ffffff" strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PREGUNTA 2: ¿PODEMOS REGRESAR? */}
              <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 10, padding: '12px 14px' }}>
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 2 }}>
                  2. PROTOCOLO DE REVISITA EN TERRITORIO
                </span>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '0.92rem', fontWeight: 900, color: '#0f172a' }}>
                  ¿Podemos regresar a seguirle contando la propuesta del Dr. Fabián Robles?
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {OPCIONES_REGRESAR.map((op) => {
                    const isSelected = formData.podemos_regresar === op.id;
                    const dotColor = op.id === 'si' ? '#15803d' : op.id === 'quizas' ? '#d97706' : '#dc2626';
                    return (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => handleSelectRegresar(op.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '9px 12px',
                          borderRadius: 8,
                          border: `1.5px solid ${isSelected ? '#0f172a' : '#e2e8f0'}`,
                          background: isSelected ? '#f8fafc' : '#ffffff',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: isSelected ? 800 : 600, color: isSelected ? '#0f172a' : '#334155' }}>
                          {op.label}
                        </span>
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            border: `1.5px solid ${isSelected ? '#0f172a' : '#cbd5e1'}`,
                            background: isSelected ? '#0f172a' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {isSelected && <Check size={11} color="#ffffff" strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PREGUNTA 3: SEMAFORIZACIÓN FORMAL */}
              <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 10, padding: '12px 14px' }}>
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 2 }}>
                  3. EVALUACIÓN Y SEMAFORIZACIÓN OFICIAL
                </span>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '0.92rem', fontWeight: 900, color: '#0f172a' }}>
                  ¿Votaría usted por el Dr. Fabián Robles?
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {OPCIONES_VOTO_ROBLES.map((op) => {
                    const isSelected = formData.votaria_robles === op.id;
                    const statusDot = op.id === 'voto_seguro' ? '#15803d' : op.id === 'indeciso' ? '#d97706' : op.id === 'no_vota' ? '#dc2626' : op.id === 'nadie_en_casa' ? '#64748b' : '#334155';
                    return (
                      <div
                        key={op.id}
                        onClick={() => handleSelectSemaforo(op.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 12px',
                          borderRadius: 8,
                          background: isSelected ? '#f8fafc' : '#ffffff',
                          border: `1.5px solid ${isSelected ? '#0f172a' : '#e2e8f0'}`,
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: statusDot, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 800, fontSize: '0.84rem', color: '#0f172a' }}>
                              {op.label}
                            </span>
                            <span
                              style={{
                                fontSize: '0.6rem',
                                fontWeight: 800,
                                padding: '1px 5px',
                                borderRadius: 4,
                                background: isSelected ? '#0f172a' : '#f1f5f9',
                                color: isSelected ? '#ffffff' : '#64748b',
                                textTransform: 'uppercase',
                              }}
                            >
                              {op.badgeText}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginTop: 1 }}>
                            {op.sublabel}
                          </span>
                        </div>

                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            border: `1.5px solid ${isSelected ? '#0f172a' : '#cbd5e1'}`,
                            background: isSelected ? '#0f172a' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {isSelected && <Check size={11} color="#ffffff" strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Observaciones adicionales */}
              <div>
                <input
                  style={{ ...S.input, background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', height: 42, fontSize: '0.78rem' }}
                  placeholder="Observaciones formales de la visita (Opcional)"
                  value={formData.observaciones || ''}
                  onChange={(e) => setField('observaciones', e.target.value)}
                />
              </div>

              {config.gps && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                  }}
                >
                  <Navigation size={13} color="#475569" />
                  <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>
                    Georreferenciación satelital activa para el registro en mapa
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={saveToLocal}
              disabled={!formData.votaria_robles || saving}
              style={{
                width: '100%',
                height: 48,
                borderRadius: 8,
                border: 'none',
                background: formData.votaria_robles ? '#0f172a' : '#cbd5e1',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: formData.votaria_robles && !saving ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {saving ? (
                <>
                  <Zap size={16} /> Guardando en Base Central…
                </>
              ) : (
                <>
                  <Send size={16} strokeWidth={2.2} /> GUARDAR REGISTRO DE ENCUESTA
                </>
              )}
            </button>
          </motion.div>
        );

      /* PASO 3 · CONFIRMACIÓN FORMAL DE REGISTRO */
      case 3:
        return (
          <motion.div key="s3" variants={pageVar} initial="hidden" animate="visible" exit="exit" style={{ ...S.hero, padding: '24px 20px', background: '#f8fafc' }}>
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: 12,
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '20px auto 14px',
              }}
            >
              <CheckCircle2 size={32} color="#0f172a" strokeWidth={2} />
            </div>

            <h1 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
              Encuesta Registrada Exitosamente
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 16px 0', maxWidth: 300, textAlign: 'center' }}>
              La información georreferenciada ha sido incorporada al Centro de Mando Territorial.
            </p>

            {/* Ficha Resumen de Comprobante */}
            <div
              style={{
                width: '100%',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 10,
                padding: '14px 16px',
                marginBottom: 16,
                textAlign: 'left',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #f1f5f9' }}>
                COMPROBANTE DE REGISTRO TERRITORIAL
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 6 }}>
                <span style={{ color: '#64748b' }}>Predio / Vivienda:</span>
                <strong style={{ color: '#0f172a' }}>{formData.numero_medidor_casa ? `Casa / Medidor: ${formData.numero_medidor_casa}` : (formData.manzana ? `Manzana ${formData.manzana}` : 'Vivienda')}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 6 }}>
                <span style={{ color: '#64748b' }}>Manzana CPV:</span>
                <strong style={{ color: '#0f172a' }}>{formData.manzana || 'No registrada'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 6 }}>
                <span style={{ color: '#64748b' }}>Semaforización Oficial:</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>
                  {formData.votaria_robles === 'voto_seguro' ? 'VERDE · Voto Seguro' : formData.votaria_robles === 'no_vota' ? 'ROJO · No Vota / Rechazo' : formData.votaria_robles === 'nadie_en_casa' ? 'GRIS · Nadie en Casa' : formData.votaria_robles === 'no_trabajable' ? 'PIZARRA · No Trabajable' : 'AMARILLO · Indeciso'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: '#64748b' }}>Brigadista:</span>
                <span style={{ color: '#475569', fontWeight: 700 }}>{config?.name || 'Encuestador Oficial'}</span>
              </div>
            </div>

            {/* Botones de Navegación Formales */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={nextSurvey}
                style={{
                  width: '100%',
                  height: 46,
                  borderRadius: 8,
                  border: 'none',
                  background: '#0f172a',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <FileText size={15} />
                <span>REGISTRAR SIGUIENTE VIVIENDA</span>
              </button>

              <button
                onClick={goHome}
                style={{
                  width: '100%',
                  height: 40,
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <RefreshCw size={13} />
                <span>Volver al Menú Principal</span>
              </button>

              <button
                onClick={exportData}
                style={{
                  width: '100%',
                  height: 36,
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  color: '#64748b',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Download size={13} />
                <span>Exportar Registros Locales CSV ({total})</span>
              </button>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <ThemeCtx.Provider value={t}>
      <div style={{ ...S.app, background: t.bgApp }}>
        {/* Banner de Modo Prueba de Campo para Admin (Totalmente Blanco) */}
        {adminInFieldMode && (
          <div
            style={{
              background: '#ffffff',
              borderBottom: '1px solid #e2e8f0',
              color: '#0f172a',
              padding: '10px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.78rem',
              fontWeight: 800,
              zIndex: 1000,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} />
              <span style={{ color: '#0f172a' }}>Vista de Encuestador en Territorio (Administrador)</span>
            </div>
            <button
              onClick={() => setAdminInFieldMode(false)}
              style={{
                background: '#f8fafc',
                color: '#0f172a',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                padding: '5px 12px',
                fontWeight: 800,
                fontSize: '0.74rem',
                cursor: 'pointer',
              }}
            >
              Volver al Centro de Mando
            </button>
          </div>
        )}

        {/* Offline banner */}
        <AnimatePresence>
          {!isOnline && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ ...S.offlineBanner, background: t.offlineBg, color: t.offlineText }}>
              <WifiOff size={14} />
              <span>Modo Sin Conexión — las encuestas se guardan localmente</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de Solicitud de Permiso de Ubicación para Encuestadores */}
        <AnimatePresence>
          {showLocationPrompt && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                background: 'rgba(15, 23, 42, 0.75)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20,
              }}
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 14,
                  padding: '24px 22px',
                  maxWidth: 390,
                  width: '100%',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 10,
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 14px',
                  }}
                >
                  <Navigation size={22} color="#0f172a" />
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', marginBottom: 6, letterSpacing: '-0.02em' }}>
                  Activación de Ubicación Satelital GPS
                </h3>

                <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, marginBottom: 18 }}>
                  El <strong>Centro de Mando Territorial</strong> requiere la señal satelital para georreferenciar las fichas censales y registrar la ruta de visita en el mapa de control.
                </p>

                {geoError && (
                  <div
                    style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: 8,
                      padding: '8px 12px',
                      fontSize: '0.76rem',
                      color: '#b91c1c',
                      marginBottom: 14,
                      textAlign: 'left',
                    }}
                  >
                    {geoError}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    onClick={requestLocationPermission}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: 'none',
                      background: '#0f172a',
                      color: '#ffffff',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <Navigation size={16} />
                    <span>PERMITIR Y ACTIVAR GPS</span>
                  </button>

                  <button
                    onClick={() => setShowLocationPrompt(false)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#64748b',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Continuar sin GPS por ahora
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Online badge formal */}
        {isOnline && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={S.badge}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#15803d', flexShrink: 0 }} />
            <span style={{ color: '#334155', fontWeight: 800 }}>EN LÍNEA</span>
            {total > 0 && <span style={S.badgePill}>{total}</span>}
          </motion.div>
        )}

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
        </div>

        {/* Footer */}
        <AnimatePresence>
          {isInSurvey && (
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ duration: 0.27 }} style={{ ...S.footer, background: t.footerBg, borderTop: `1px solid ${t.border}` }}>
              <div style={{ ...S.progressTrack, background: t.border }}>
                <motion.div animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }} style={S.progressFill} />
              </div>
              <div style={S.footerRow}>
                <button onClick={handleBack} style={{ ...S.btnBack, color: t.textMuted }} className="btn-back-hover">
                  <ArrowLeft size={14} strokeWidth={2.5} /> Atrás
                </button>
                <StepDots current={step} total={TOTAL_STEPS} />
                <span style={S.footerBrand}>BRIGADA RENOVACIÓN (pap)</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Admin panel */}
        <AnimatePresence>
          {showAdmin && (
            <AdminPanel
              surveys={surveys}
              config={config}
              onClose={() => setShowAdmin(false)}
              onExport={exportData}
              onClearAll={() => persistSurveys([])}
              onUpdateConfig={persistConfig}
              darkMode={darkMode}
              onToggleDark={toggleDark}
              onSyncPending={syncPending}
              onLogout={() => persistConfig({ ...config, loggedIn: false })}
              theme={t}
            />
          )}
        </AnimatePresence>
      </div>
    </ThemeCtx.Provider>
  );
}

/* ════════════════════════════════════════════════════════════════════
   STYLES
════════════════════════════════════════════════════════════════════ */
const S = {
  app: { display: 'flex', flexDirection: 'column', flex: 1, position: 'relative', height: '100%', overflow: 'hidden', background: '#f8fafc' },
  offlineBanner: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.78rem', fontWeight: 700, padding: '9px 16px', overflow: 'hidden', background: '#334155', color: '#ffffff' },
  badge: { position: 'absolute', top: 14, right: 14, display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, fontSize: 10, fontWeight: 800, letterSpacing: '0.04em', zIndex: 50, background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  badgePill: { background: '#0f172a', color: '#fff', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 800 },
  adminBtn: { position: 'absolute', top: 14, left: 14, display: 'flex', alignItems: 'center', gap: 5, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', zIndex: 50, background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', fontSize: '0.75rem', fontWeight: 700 },
  adminCount: { background: '#0f172a', color: '#fff', borderRadius: 4, padding: '1px 5px', fontSize: 10, fontWeight: 800 },
  metaStrip: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, marginBottom: 10, width: '100%', zIndex: 1, background: '#ffffff', border: '1px solid #e2e8f0' },
  hero: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '16px 20px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden', background: '#f8fafc' },
  orbRed: { display: 'none' },
  orbBlue: { display: 'none' },
  photoWrap: { position: 'relative', marginBottom: 14, zIndex: 1 },
  photoGlow: { display: 'none' },
  photoBadge: { position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 5, background: '#ffffff', borderRadius: 6, padding: '3px 10px', fontSize: 10, fontWeight: 800, color: '#334155', letterSpacing: '0.04em', border: '1px solid #cbd5e1', whiteSpace: 'nowrap', zIndex: 2 },
  nameTag: { marginTop: 12, marginBottom: 4, fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b', zIndex: 1 },
  heroTitle: { fontWeight: 900, fontSize: '1.35rem', letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: 6, zIndex: 1, color: '#0f172a' },
  gradientRed: { color: '#0f172a' },
  heroSub: { fontSize: '0.82rem', lineHeight: 1.5, marginBottom: 16, maxWidth: 300, zIndex: 1, color: '#475569' },
  statsRow: { display: 'flex', width: '100%', marginTop: 12, borderRadius: 10, overflow: 'hidden', zIndex: 1, background: '#ffffff', border: '1px solid #e2e8f0' },
  statItem: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '10px 6px', borderRight: '1px solid #f1f5f9' },
  statVal: { fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' },
  statLabel: { fontSize: '0.62rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' },
  btnCTA: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', height: 48, borderRadius: 10, border: 'none', background: '#0f172a', color: '#ffffff', fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer', boxShadow: '0 2px 6px rgba(15,23,42,0.15)' },
  btnIconWrap: { width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  page: { display: 'flex', flexDirection: 'column', flex: 1, padding: '56px 20px 14px', overflowY: 'auto', background: '#f8fafc' },
  pageHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
  stepIcon: { width: 38, height: 38, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#0f172a' },
  pageTitle: { fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.02em', margin: 0, color: '#0f172a' },
  label: { fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 6 },
  scrollList: { overflowY: 'auto', maxHeight: 244, paddingRight: 4, marginBottom: 6, display: 'flex', flexDirection: 'column', gap: 6 },
  option: { display: 'flex', alignItems: 'center', gap: 10, borderRadius: 10, padding: '11px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '0.86rem', border: '1px solid #e2e8f0', background: '#ffffff', color: '#1e293b' },
  optionProb: { display: 'flex', alignItems: 'center', gap: 10, borderRadius: 10, padding: '11px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '0.86rem', border: '1px solid #e2e8f0', background: '#ffffff', color: '#1e293b' },
  probIcon: { width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: '#f1f5f9' },
  inputWrap: { position: 'relative', width: '100%' },
  inputIcon: { position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' },
  input: { width: '100%', height: 46, padding: '0 16px 0 42px', borderRadius: 10, fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', display: 'block', border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#0f172a' },
  btnPill: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', height: 48, marginTop: 8, borderRadius: 10, border: 'none', background: '#0f172a', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 2px 6px rgba(15,23,42,0.15)' },
  btnSecondary: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', height: 42, borderRadius: 10, border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' },
  successCircle: { width: 72, height: 72, borderRadius: 16, background: '#f1f5f9', border: '1.5px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, zIndex: 1 },
  footer: { padding: '10px 20px calc(14px + env(safe-area-inset-bottom, 0px))', background: '#ffffff', borderTop: '1px solid #e2e8f0' },
  progressTrack: { height: 4, borderRadius: 4, overflow: 'hidden', marginBottom: 10, background: '#e2e8f0' },
  progressFill: { height: '100%', background: '#0f172a', borderRadius: 4 },
  footerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  btnBack: { display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '6px 0', color: '#475569' },
  footerBrand: { fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#94a3b8' },
};

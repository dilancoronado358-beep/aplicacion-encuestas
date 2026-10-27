import React, { useState } from 'react';
import { Eye, EyeOff, Check, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { registerEncuestadorCloud, loginUserCloud } from '../services/supabase';

export function AuthScreen({ onLogin, theme: t }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Logo geométrico idéntico al wireframe de la foto
  const GeometricLogo = () => (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
      <svg width="42" height="42" viewBox="0 0 38 38" fill="none">
        {/* Superior izquierda: Cápsula vertical redondeada */}
        <path
          d="M6 8C6 4.68629 8.68629 2 12 2C15.3137 2 18 4.68629 18 8V11C18 14.3137 15.3137 17 12 17C8.68629 17 6 14.3137 6 11V8Z"
          fill="#ffffff"
        />
        {/* Superior derecha: D semicircular */}
        <path
          d="M21 2H27C32.5228 2 37 6.47715 37 12C37 17.5228 32.5228 22 27 22H21V2Z"
          fill="#ffffff"
        />
        {/* Inferior izquierda: Círculo completo */}
        <circle cx="12" cy="27" r="7" fill="#ffffff" />
        {/* Inferior derecha: Cuadrante de cuarto de círculo */}
        <path
          d="M21 21H35C35 28.732 28.732 35 21 35V21Z"
          fill="#ffffff"
        />
      </svg>
    </div>
  );

  // Icono de Google oficial en SVG
  const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );

  // Icono de Facebook oficial en SVG
  const FacebookIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );

  // Manejo de Iniciar Sesión
  const handleLoginSubmit = async (e) => {
    e?.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Por favor completa tu correo y contraseña.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);

    const result = await loginUserCloud(email, password);
    setLoading(false);

    if (result.success) {
      onLogin(result.user);
    } else {
      setErrorMsg(result.error || 'Credenciales no válidas.');
    }
  };

  // Manejo de Registro / Crear Cuenta
  const handleRegisterSubmit = (e) => {
    e?.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMsg('Por favor completa todos los campos.');
      return;
    }
    if (!agreeTerms) {
      setErrorMsg('Debes aceptar la política de privacidad y términos.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);

    // Guarda en Supabase en segundo plano y autentica al encuestador
    registerEncuestadorCloud({
      name: name.trim(),
      email: email.trim(),
      password: password.trim(),
    });

    setTimeout(() => {
      setLoading(false);
      onLogin({
        name: name.trim(),
        email: email.trim(),
        rol: 'encuestador',
        goal: 20,
        gps: true,
        loggedIn: true,
      });
    }, 450);
  };

  // Acceso Rápido / Demo
  const handleQuickDemo = (providerName) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin({
        name: `Encuestador ${providerName}`,
        email: `${providerName.toLowerCase()}@robles2026.com`,
        rol: 'encuestador',
        goal: 20,
        gps: true,
        loggedIn: true,
      });
    }, 300);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        height: '100%',
        background: '#090d16',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── SECCIÓN SUPERIOR NEGRA (CABECERA EXACTA AL DISEÑO) ── */}
      <div
        style={{
          padding: '24px 28px 26px',
          background: '#090d16',
          color: '#ffffff',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Barra superior minimalista estilo teléfono */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.82rem',
            fontWeight: 700,
            color: '#ffffff',
            marginBottom: 20,
            opacity: 0.9,
          }}
        >
          <span>9:41</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>5G</span>
            <div
              style={{
                width: 22,
                height: 11,
                border: '1.5px solid #ffffff',
                borderRadius: 3,
                padding: 1.5,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <div style={{ width: '80%', height: '100%', background: '#ffffff', borderRadius: 1 }} />
            </div>
          </div>
        </div>

        {/* Logo Oficial de la Marca: BRIGADA RENOVACIÓN */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              padding: '8px 16px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src="/logo.png"
              alt="BRIGADA RENOVACIÓN"
              style={{
                height: 42,
                width: 'auto',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 20,
              padding: '5px 12px',
              color: '#38bdf8',
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            BRIGADA RENOVACIÓN (pap)
          </div>
        </div>

        {/* Título y subtítulo dinámico */}
        <AnimatePresence mode="wait">
          {mode === 'login' && (
            <motion.div
              key="login-title"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.24 }}
            >
              <h1
                style={{
                  fontSize: '2.1rem',
                  fontWeight: 900,
                  letterSpacing: '-0.035em',
                  lineHeight: 1.15,
                  margin: '0 0 8px',
                  color: '#ffffff',
                }}
              >
                ¡Bienvenido!
              </h1>
              <p
                style={{
                  fontSize: '0.86rem',
                  color: '#94a3b8',
                  lineHeight: 1.5,
                  margin: 0,
                  fontWeight: 400,
                }}
              >
                Inicia sesión para continuar tu trabajo de campo en Montúfar.
              </p>
            </motion.div>
          )}

          {mode === 'register' && (
            <motion.div
              key="register-title"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.24 }}
            >
              <h1
                style={{
                  fontSize: '2.1rem',
                  fontWeight: 900,
                  letterSpacing: '-0.035em',
                  lineHeight: 1.15,
                  margin: '0 0 8px',
                  color: '#ffffff',
                }}
              >
                Crear tu Cuenta
              </h1>
              <p
                style={{
                  fontSize: '0.86rem',
                  color: '#94a3b8',
                  lineHeight: 1.5,
                  margin: 0,
                  fontWeight: 400,
                }}
              >
                Únete al equipo oficial de encuestadores de campo 2026.
              </p>
            </motion.div>
          )}

          {mode === 'forgot' && (
            <motion.div
              key="forgot-title"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.24 }}
            >
              <h1
                style={{
                  fontSize: '2.1rem',
                  fontWeight: 900,
                  letterSpacing: '-0.035em',
                  lineHeight: 1.15,
                  margin: '0 0 8px',
                  color: '#ffffff',
                }}
              >
                Recuperación
              </h1>
              <p
                style={{
                  fontSize: '0.86rem',
                  color: '#94a3b8',
                  lineHeight: 1.5,
                  margin: 0,
                  fontWeight: 400,
                }}
              >
                Ingresa tu correo para recibir las instrucciones de acceso.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── TARJETA INFERIOR BLANCA CON BORDES REDONDEADOS (EXACTA A LA FOTO) ── */}
      <div
        style={{
          flex: 1,
          background: '#ffffff',
          borderRadius: '38px 38px 0 0',
          padding: '30px 24px 28px',
          boxShadow: '0 -15px 45px rgba(0,0,0,0.3)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 2,
        }}
        className="custom-scrollbar"
      >
        <AnimatePresence mode="wait">
          {/* ══════════ FORMULARIO DE INICIO DE SESIÓN ══════════ */}
          {mode === 'login' && (
            <motion.form
              key="login-form"
              onSubmit={handleLoginSubmit}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.24 }}
              style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
            >
              {/* Campo Correo */}
              <div style={{ marginBottom: 18 }}>
                <label style={S.fieldLabel}>Correo</label>
                <input
                  type="text"
                  required
                  placeholder="Ingresa tu correo o número de celular"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={S.pillInput}
                />
              </div>

              {/* Campo Contraseña con enlace a ¿Olvidaste tu contraseña? */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                  <label style={{ ...S.fieldLabel, marginBottom: 0 }}>Contraseña</label>
                  <button
                    type="button"
                    onClick={() => { setErrorMsg(null); setMode('forgot'); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0f172a',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline',
                    }}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ ...S.pillInput, paddingRight: 48 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 18,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94a3b8',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>

              {/* Checkbox Recordarme */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.84rem', color: '#334155', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{
                      width: 18,
                      height: 18,
                      accentColor: '#0f172a',
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                  />
                  Recordarme
                </label>
              </div>

              {errorMsg && (
                <div style={S.errorBox}>
                  {errorMsg}
                </div>
              )}

              {/* Botón Principal Negro de Alto Contraste (Sign In) */}
              <button
                type="submit"
                disabled={loading}
                style={S.mainBlackButton}
                className="btn-pill-hover"
              >
                {loading ? 'Iniciando sesión…' : 'Iniciar Sesión'}
              </button>

              <div style={{ flex: 1, minHeight: 24 }} />

              {/* Switch a Crear Cuenta */}
              <div style={{ textAlign: 'center', marginTop: 12, fontSize: '0.86rem', color: '#64748b' }}>
                ¿No tienes una cuenta?{' '}
                <button
                  type="button"
                  onClick={() => { setErrorMsg(null); setMode('register'); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0f172a',
                    fontWeight: 800,
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '0.86rem',
                  }}
                >
                  Regístrate
                </button>
              </div>
            </motion.form>
          )}

          {/* ══════════ FORMULARIO DE CREAR CUENTA (SIGN UP) ══════════ */}
          {mode === 'register' && (
            <motion.form
              key="register-form"
              onSubmit={handleRegisterSubmit}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.24 }}
              style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
            >
              {/* Campo Nombre */}
              <div style={{ marginBottom: 16 }}>
                <label style={S.fieldLabel}>Nombre</label>
                <input
                  type="text"
                  required
                  placeholder="Ingresa tu nombre completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={S.pillInput}
                />
              </div>

              {/* Campo Correo */}
              <div style={{ marginBottom: 16 }}>
                <label style={S.fieldLabel}>Correo</label>
                <input
                  type="email"
                  required
                  placeholder="Ingresa tu correo o número de celular"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={S.pillInput}
                />
              </div>

              {/* Campo Contraseña */}
              <div style={{ marginBottom: 16 }}>
                <label style={S.fieldLabel}>Contraseña</label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ ...S.pillInput, paddingRight: 48 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 18,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94a3b8',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>

              {/* Términos y condiciones con checkbox */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20 }}>
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  style={{
                    width: 18,
                    height: 18,
                    accentColor: '#0f172a',
                    borderRadius: 4,
                    marginTop: 2,
                    cursor: 'pointer',
                  }}
                />
                <label htmlFor="agreeTerms" style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4, cursor: 'pointer' }}>
                  Acepto la <strong style={{ color: '#0f172a' }}>política de privacidad</strong> y los términos de recolección de datos.
                </label>
              </div>

              {errorMsg && (
                <div style={S.errorBox}>
                  {errorMsg}
                </div>
              )}

              {/* Botón Principal Negro de Alto Contraste (Sign Up) */}
              <button
                type="submit"
                disabled={loading}
                style={S.mainBlackButton}
                className="btn-pill-hover"
              >
                {loading ? 'Creando cuenta…' : 'Crear Cuenta'}
              </button>

              <div style={{ flex: 1, minHeight: 24 }} />

              {/* Switch a Iniciar Sesión */}
              <div style={{ textAlign: 'center', marginTop: 12, fontSize: '0.86rem', color: '#64748b' }}>
                ¿Ya tienes una cuenta?{' '}
                <button
                  type="button"
                  onClick={() => { setErrorMsg(null); setMode('login'); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0f172a',
                    fontWeight: 800,
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '0.86rem',
                  }}
                >
                  Iniciar Sesión
                </button>
              </div>
            </motion.form>
          )}

          {/* ══════════ RECUPERAR CONTRASEÑA ══════════ */}
          {mode === 'forgot' && (
            <motion.div
              key="forgot-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.24 }}
              style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
            >
              <div style={{ marginBottom: 20 }}>
                <label style={S.fieldLabel}>Correo Electrónico</label>
                <input
                  type="email"
                  required
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={S.pillInput}
                />
              </div>

              {errorMsg && (
                <div style={{ ...S.errorBox, background: 'rgba(16,185,129,0.08)', color: '#047857', border: '1px solid #bbf7d0' }}>
                  {errorMsg}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setErrorMsg('Se ha enviado el enlace de recuperación a tu correo.');
                  setTimeout(() => setMode('login'), 2000);
                }}
                style={S.mainBlackButton}
                className="btn-pill-hover"
              >
                Enviar Enlace
              </button>

              <button
                type="button"
                onClick={() => { setErrorMsg(null); setMode('login'); }}
                style={{
                  marginTop: 16,
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                Volver a Iniciar Sesión
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const S = {
  fieldLabel: {
    display: 'block',
    fontSize: '0.84rem',
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 8,
  },
  pillInput: {
    width: '100%',
    height: 52,
    padding: '0 22px',
    borderRadius: 99,
    border: '1.5px solid #e2e8f0',
    background: '#ffffff',
    fontSize: '0.92rem',
    color: '#0f172a',
    outline: 'none',
    boxSizing: 'border-box',
    display: 'block',
    transition: 'all 0.18s ease',
  },
  mainBlackButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 52,
    borderRadius: 99,
    border: 'none',
    background: '#000000',
    color: '#ffffff',
    fontWeight: 800,
    fontSize: '0.96rem',
    cursor: 'pointer',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
    transition: 'all 0.2s ease',
  },
  socialPillButton: {
    flex: 1,
    height: 48,
    borderRadius: 99,
    border: '1.5px solid #e2e8f0',
    background: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer',
    transition: 'all 0.18s ease',
  },
  errorBox: {
    padding: '10px 14px',
    borderRadius: 12,
    background: 'rgba(239,68,68,0.08)',
    color: '#ef4444',
    fontSize: '0.8rem',
    fontWeight: 600,
    marginBottom: 14,
    border: '1px solid rgba(239,68,68,0.2)',
    textAlign: 'center',
  },
};

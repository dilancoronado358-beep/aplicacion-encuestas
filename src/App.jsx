import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  ChevronRight, MapPin, User, CheckCircle2, Send, BarChart3,
  MessageSquare, ArrowLeft, Star, Shield, Heart, Briefcase,
  HelpCircle, Phone, Download, RefreshCw, Users, TrendingUp,
  Award, Settings, X, Trash2, WifiOff, ClipboardList, Tractor,
  Moon, Sun, Navigation, Target, PieChart, Zap, UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ════════════════════════════════════════════════════════════════════
   CONSTANTS
════════════════════════════════════════════════════════════════════ */
const PARROQUIAS = [
  { name: "San Gabriel (Centro)",       emoji: "🏛️" },
  { name: "Cristóbal Colón",            emoji: "⛪" },
  { name: "Chitán de los Navarretes",   emoji: "🌄" },
  { name: "Fernández Salvador",         emoji: "🌿" },
  { name: "La Paz",                     emoji: "☮️" },
  { name: "Piartal",                    emoji: "🏔️" },
];
const EDADES = [
  { label: "16-18", sub: "Joven" },
  { label: "19-35", sub: "Adulto Joven" },
  { label: "36-55", sub: "Adulto" },
  { label: "55+",   sub: "Mayor" },
];
const PROBLEMAS = [
  { label: "Seguridad Ciudadana",  icon: Shield,    color: "#3b82f6" },
  { label: "Apoyo al Sector Agro", icon: Tractor,   color: "#10b981" },
  { label: "Vialidad y Caminos",   icon: Navigation, color: "#f59e0b" },
  { label: "Salud y Medicinas",    icon: Heart,     color: "#ef4444" },
  { label: "Empleo Joven",         icon: Briefcase, color: "#8b5cf6" },
  { label: "Otro",                 icon: HelpCircle, color: "#64748b" },
];
const TOTAL_STEPS = 5;
const BLANK = { parroquia:'', edad:'', conoceCandidato:'', votoProbabilidad:0, problemaPrincipal:'', comentario:'', nombre:'', whatsapp:'' };

/* ════════════════════════════════════════════════════════════════════
   THEME
════════════════════════════════════════════════════════════════════ */
const LIGHT = {
  bg:'#ffffff', bgSurface:'#f8fafc', bgApp:'rgba(255,255,255,0.95)',
  text:'#0f172a', textSec:'#64748b', textMuted:'#94a3b8', border:'#f1f5f9',
  footerBg:'rgba(255,255,255,0.85)', ratingBg:'linear-gradient(135deg,#fffbeb,#fef9c3)',
  ratingBd:'#fcd34d', tipBg:'#f8f7ff', tipBd:'rgba(99,102,241,0.18)',
  adminSheet:'#ffffff', statCardBg:'#f8fafc', badgeBg:'rgba(240,253,244,0.96)',
  offlineBg:'#fef2f2', offlineText:'#b91c1c', tabBg:'#f1f5f9',
};
const DARK = {
  bg:'#1e293b', bgSurface:'#0f172a', bgApp:'rgba(9,14,26,0.97)',
  text:'#f1f5f9', textSec:'#94a3b8', textMuted:'#475569', border:'#334155',
  footerBg:'rgba(9,14,26,0.92)', ratingBg:'linear-gradient(135deg,#422006,#451a03)',
  ratingBd:'#92400e', tipBg:'#1e1b4b', tipBd:'rgba(99,102,241,0.38)',
  adminSheet:'#1e293b', statCardBg:'#0f172a', badgeBg:'rgba(9,40,24,0.96)',
  offlineBg:'#2d1212', offlineText:'#fca5a5', tabBg:'#0f172a',
};
const ThemeCtx = createContext(LIGHT);
const useT = () => useContext(ThemeCtx);

/* ════════════════════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════════════════════ */
const todayKey = () => new Date().toISOString().slice(0, 10);
const countToday = list => list.filter(s => s.ts?.startsWith(todayKey())).length;
const avgRating  = list => {
  const w = list.filter(s => s.conoceCandidato === 'Sí' && s.votoProbabilidad > 0);
  return w.length ? (w.reduce((a,s) => a + s.votoProbabilidad, 0) / w.length).toFixed(1) : '—';
};
const makeChart = (list, key, opts) => {
  const c = {}; opts.forEach(o => c[o] = 0);
  list.forEach(s => { if (s[key] && c[s[key]] !== undefined) c[s[key]]++; });
  const mx = Math.max(...Object.values(c), 1);
  return Object.entries(c).map(([label,val]) => ({ label, val, pct: Math.round((val/mx)*100) }));
};

/* ════════════════════════════════════════════════════════════════════
   ANIMATION VARIANTS
════════════════════════════════════════════════════════════════════ */
const pageVar = {
  hidden:  { opacity:0, x:38, scale:0.97 },
  visible: { opacity:1, x:0,  scale:1, transition:{ duration:0.34, ease:[0.22,1,0.36,1] } },
  exit:    { opacity:0, x:-38, scale:0.97, transition:{ duration:0.24, ease:'easeIn' } },
};
const fadeUp = {
  hidden:  { opacity:0, y:20 },
  visible: (i=0) => ({ opacity:1, y:0, transition:{ delay:i*0.09, duration:0.44, ease:[0.22,1,0.36,1] } }),
};
const stagger = { hidden:{}, visible:{ transition:{ staggerChildren:0.06, delayChildren:0.04 } } };
const itemV   = { hidden:{ opacity:0, y:12, scale:0.97 }, visible:{ opacity:1, y:0, scale:1, transition:{ duration:0.3, ease:[0.22,1,0.36,1] } } };

/* ════════════════════════════════════════════════════════════════════
   SMALL COMPONENTS
════════════════════════════════════════════════════════════════════ */
function Confetti() {
  const colors = ['#ef4444','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899'];
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden', zIndex:0 }}>
      {Array.from({length:26},(_,i) => (
        <motion.div key={i}
          initial={{ y:-20, opacity:1, rotate:0 }}
          animate={{ y:540, opacity:[1,1,0], rotate:Math.floor(Math.random()*360)+360 }}
          transition={{ duration:1.3+Math.random()*0.8, delay:i*0.07, ease:'easeIn' }}
          style={{ position:'absolute', left:`${(i/26)*100}%`, width:6+Math.floor(Math.random()*5), height:(7+Math.floor(Math.random()*5))*1.5, background:colors[i%colors.length], borderRadius:2 }}
        />
      ))}
    </div>
  );
}

function StepDots({ current, total }) {
  return (
    <div style={{ display:'flex', gap:5, alignItems:'center' }}>
      {Array.from({length:total},(_,i) => (
        <motion.div key={i}
          animate={{ width:i+1===current?22:7, background:i+1===current?'#ef4444':i+1<current?'#10b981':'#e2e8f0' }}
          transition={{ duration:0.3 }} style={{ height:7, borderRadius:99 }} />
      ))}
    </div>
  );
}

function StarRating({ value, onChange }) {
  const [hov, setHov] = useState(0);
  const t = useT();
  const labels = ['','Poco probable','Algo posible','Neutral','Bastante probable','¡Seguro!'];
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
      <div style={{ display:'flex', gap:5 }}>
        {[1,2,3,4,5].map(n => (
          <motion.button key={n} whileTap={{ scale:0.8 }}
            onMouseEnter={()=>setHov(n)} onMouseLeave={()=>setHov(0)} onClick={()=>onChange(n)}
            style={{ background:'none', border:'none', cursor:'pointer', padding:4, color:n<=(hov||value)?'#f59e0b':t.border, transition:'color 0.14s' }}>
            <Star size={33} fill={n<=(hov||value)?'#f59e0b':'none'} strokeWidth={1.5}/>
          </motion.button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {(hov||value) ? (
          <motion.p key={hov||value} initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} transition={{duration:0.18}}
            style={{ fontSize:'0.8rem', fontWeight:700, color:'#f59e0b', margin:0 }}>{labels[hov||value]}</motion.p>
        ) : (
          <motion.p key="e" initial={{opacity:0}} animate={{opacity:1}}
            style={{ fontSize:'0.76rem', color:t.textMuted, margin:0 }}>Toca una estrella</motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function Toggle({ on, onToggle, label, sub, icon: Icon, activeColor = '#10b981' }) {
  const t = useT();
  return (
    <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:t.bgSurface,
      border:`1.5px solid ${t.border}`, borderRadius:16, cursor:'pointer', marginBottom:10 }} onClick={onToggle}>
      <Icon size={20} color={on ? activeColor : t.textMuted}/>
      <div style={{ flex:1 }}>
        <p style={{ fontWeight:700, fontSize:'0.87rem', color:t.text, margin:0 }}>{label}</p>
        {sub && <p style={{ fontSize:'0.72rem', color:t.textMuted, margin:0 }}>{sub}</p>}
      </div>
      <div style={{ width:44, height:26, borderRadius:99, padding:3, background:on?activeColor:t.border, transition:'background 0.2s', flexShrink:0 }}>
        <motion.div animate={{ x:on?18:0 }} transition={{ type:'spring', stiffness:420, damping:26 }}
          style={{ width:20, height:20, borderRadius:'50%', background:'#fff', boxShadow:'0 1px 4px rgba(0,0,0,0.22)' }}/>
      </div>
    </div>
  );
}

function HBar({ label, val, pct, color, total }) {
  const t = useT();
  const pOf = total > 0 ? Math.round((val/total)*100) : 0;
  return (
    <div style={{ marginBottom:11 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <span style={{ fontSize:'0.77rem', fontWeight:600, color:t.text }}>{label}</span>
        <span style={{ fontSize:'0.77rem', fontWeight:700, color }}>{val} <span style={{ color:t.textMuted, fontWeight:500 }}>({pOf}%)</span></span>
      </div>
      <div style={{ height:8, background:t.border, borderRadius:99, overflow:'hidden' }}>
        <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:0.7, ease:[0.22,1,0.36,1] }}
          style={{ height:'100%', background:color, borderRadius:99 }}/>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   SETUP SCREEN
════════════════════════════════════════════════════════════════════ */
function SetupScreen({ onDone }) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('20');
  const [gps,  setGps]  = useState(true);
  const t = useT();

  return (
    <motion.div initial={{ opacity:0, y:32 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}
      style={{ display:'flex', flexDirection:'column', flex:1, padding:'52px 28px 36px', overflowY:'auto' }}>

      <div style={{ textAlign:'center', marginBottom:36 }}>
        <motion.div animate={{ rotate:[0,8,-8,0] }} transition={{ duration:1.2, delay:0.5 }}
          style={{ fontSize:52, marginBottom:14, display:'inline-block' }}>👋</motion.div>
        <h1 style={{ fontWeight:900, fontSize:'1.85rem', color:t.text, letterSpacing:'-0.03em', marginBottom:10 }}>
          ¡Hola, Encuestador!
        </h1>
        <p style={{ fontSize:'0.9rem', color:t.textSec, lineHeight:1.65, maxWidth:290, margin:'0 auto' }}>
          Configura tu perfil para organizar el trabajo de campo de la campaña Robles 2026.
        </p>
      </div>

      <p style={{ ...S.label, color:t.textMuted }}>Tu nombre completo</p>
      <div style={{ ...S.inputWrap, marginBottom:20 }}>
        <UserCheck size={15} color={t.textMuted} style={S.inputIcon}/>
        <input autoFocus style={{ ...S.input, background:t.bgSurface, border:`2px solid ${t.border}`, color:t.text }}
          placeholder="Ej: María García" value={name} onChange={e=>setName(e.target.value)}/>
      </div>

      <p style={{ ...S.label, color:t.textMuted }}>Meta diaria de encuestas</p>
      <div style={{ ...S.inputWrap, marginBottom:20 }}>
        <Target size={15} color={t.textMuted} style={S.inputIcon}/>
        <input type="number" min="1" max="200"
          style={{ ...S.input, background:t.bgSurface, border:`2px solid ${t.border}`, color:t.text }}
          placeholder="20" value={goal} onChange={e=>setGoal(e.target.value)}/>
      </div>

      <Toggle on={gps} onToggle={()=>setGps(g=>!g)} icon={Navigation}
        label="Capturar ubicación GPS" sub="Guarda coordenadas con cada encuesta" activeColor="#10b981"/>

      <div style={{ flex:1 }}/>

      <button disabled={!name.trim() || !goal}
        onClick={()=>onDone({ name:name.trim(), goal:parseInt(goal)||20, gps })}
        style={S.btnPill} className="btn-pill-hover">
        Comenzar campaña <ChevronRight size={18} strokeWidth={2.5}/>
      </button>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   ADMIN PANEL
════════════════════════════════════════════════════════════════════ */
function AdminPanel({ surveys, config, onClose, onExport, onClearAll, onUpdateConfig, darkMode, onToggleDark }) {
  const [tab,  setTab]  = useState('resumen');
  const [confirmClear, setConfirmClear] = useState(false);
  const [eName, setEName] = useState(config.name);
  const [eGoal, setEGoal] = useState(String(config.goal));
  const t = useT();

  const today   = countToday(surveys);
  const total   = surveys.length;
  const avg     = avgRating(surveys);
  const pctGoal = Math.min(100, Math.round((today/(config.goal||20))*100));

  const parqData = makeChart(surveys, 'parroquia', PARROQUIAS.map(p=>p.name));
  const probData = makeChart(surveys, 'problemaPrincipal', PROBLEMAS.map(p=>p.label));
  const edadData = makeChart(surveys, 'edad', EDADES.map(e=>e.label));
  const conoceData = makeChart(surveys, 'conoceCandidato', ['Sí','No']);

  const TABS = [
    { id:'resumen',  label:'Resumen',  Icon:ClipboardList },
    { id:'analisis', label:'Análisis', Icon:PieChart },
    { id:'config',   label:'Config',   Icon:Settings },
  ];

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      style={P.overlay} onClick={onClose}>
      <motion.div
        initial={{ y:120, opacity:0 }} animate={{ y:0, opacity:1 }} exit={{ y:120, opacity:0 }}
        transition={{ type:'spring', damping:28, stiffness:310 }}
        style={{ ...P.sheet, background:t.adminSheet }}
        onClick={e=>e.stopPropagation()}>

        <div style={{ width:40, height:5, borderRadius:99, background:t.border, margin:'12px auto 18px' }}/>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:40, height:40, borderRadius:13, background:'rgba(99,102,241,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Settings size={18} color="#6366f1"/>
            </div>
            <div>
              <p style={{ fontWeight:800, fontSize:'1rem', color:t.text, margin:0 }}>Panel del Encuestador</p>
              <p style={{ fontSize:'0.73rem', color:t.textMuted, margin:0 }}>{config.name} · Robles 2026</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width:36, height:36, borderRadius:'50%', border:'none', background:t.bgSurface, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:t.textSec }}>
            <X size={18}/>
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display:'flex', gap:5, padding:4, background:t.tabBg, borderRadius:16, marginBottom:18 }}>
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} onClick={()=>setTab(id)}
              style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5, height:36, borderRadius:12, border:'none', cursor:'pointer', fontWeight:700, fontSize:'0.76rem', transition:'all 0.2s',
                background: tab===id ? '#fff' : 'transparent',
                color: tab===id ? '#0f172a' : t.textMuted,
                boxShadow: tab===id ? '0 2px 8px rgba(0,0,0,0.09)' : 'none' }}>
              <Icon size={13}/> {label}
            </button>
          ))}
        </div>

        {/* ── RESUMEN ───────────────────────────────────────────── */}
        {tab === 'resumen' && (
          <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.22 }}>
            {/* Meta bar */}
            <div style={{ background:t.statCardBg, border:`1.5px solid ${t.border}`, borderRadius:18, padding:'16px 18px', marginBottom:13 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <Target size={17} color="#ef4444"/>
                  <span style={{ fontWeight:800, fontSize:'0.9rem', color:t.text }}>Meta de hoy</span>
                </div>
                <span style={{ fontWeight:900, fontSize:'1.05rem', color:pctGoal>=100?'#10b981':'#ef4444' }}>{today} / {config.goal}</span>
              </div>
              <div style={{ height:10, background:t.border, borderRadius:99, overflow:'hidden' }}>
                <motion.div initial={{ width:0 }} animate={{ width:`${pctGoal}%` }} transition={{ duration:0.9, ease:[0.22,1,0.36,1] }}
                  style={{ height:'100%', borderRadius:99, background:pctGoal>=100?'linear-gradient(to right,#10b981,#059669)':'linear-gradient(to right,#ef4444,#dc2626)' }}/>
              </div>
              <p style={{ fontSize:'0.7rem', color:t.textMuted, marginTop:6, textAlign:'right' }}>
                {pctGoal>=100 ? '🎉 ¡Meta alcanzada!' : `Faltan ${config.goal - today} encuesta${config.goal - today !== 1 ? 's' : ''}`}
              </p>
            </div>

            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:9, marginBottom:13 }}>
              {[
                { Icon:ClipboardList, val:today, lbl:'Hoy',    color:'#ef4444' },
                { Icon:BarChart3,     val:total, lbl:'Total',  color:'#3b82f6' },
                { Icon:Star,         val:avg,   lbl:'Apoyo ★', color:'#f59e0b' },
              ].map(({ Icon, val, lbl, color }) => (
                <div key={lbl} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, padding:'14px 8px', background:t.statCardBg, borderRadius:18, border:`1.5px solid ${t.border}` }}>
                  <Icon size={18} color={color}/>
                  <span style={{ fontSize:'1.4rem', fontWeight:900, color:t.text, lineHeight:1 }}>{val}</span>
                  <span style={{ fontSize:'0.62rem', fontWeight:700, color:t.textMuted, textTransform:'uppercase', letterSpacing:'0.06em' }}>{lbl}</span>
                </div>
              ))}
            </div>

            {/* Last survey */}
            {total > 0 && (() => {
              const last = surveys[total-1];
              return (
                <div style={{ background:t.bgSurface, border:`1.5px solid ${t.border}`, borderRadius:14, padding:'12px 16px', marginBottom:14 }}>
                  <p style={{ fontSize:'0.66rem', fontWeight:700, color:t.textMuted, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Última encuesta</p>
                  <p style={{ fontSize:'0.85rem', fontWeight:700, color:t.text, margin:0 }}>{last.nombre||'Anónimo'} · {last.parroquia||'—'}</p>
                  <p style={{ fontSize:'0.74rem', color:t.textMuted, margin:'2px 0 0' }}>
                    {last.ts ? new Date(last.ts).toLocaleTimeString('es-EC',{hour:'2-digit',minute:'2-digit'}) : ''}
                    {last.lat ? ' · 📍 GPS capturado' : ''}
                    {last.encuestador ? ` · ${last.encuestador}` : ''}
                  </p>
                </div>
              );
            })()}

            <button onClick={onExport} style={{ ...P.actionBtn, background:'#0f172a' }} className="btn-pill-hover">
              <Download size={17}/> Exportar CSV ({total} registro{total!==1?'s':''})
            </button>
          </motion.div>
        )}

        {/* ── ANÁLISIS ──────────────────────────────────────────── */}
        {tab === 'analisis' && (
          <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.22 }}
            style={{ maxHeight:400, overflowY:'auto', paddingRight:2 }} className="custom-scrollbar">
            {total === 0 ? (
              <div style={{ textAlign:'center', padding:'36px 0', color:t.textMuted }}>
                <BarChart3 size={44} color={t.border} style={{ marginBottom:14 }}/>
                <p style={{ fontWeight:700, color:t.textSec, marginBottom:6 }}>Sin datos todavía</p>
                <p style={{ fontSize:'0.8rem' }}>Registra encuestas para ver el análisis aquí</p>
              </div>
            ) : (
              <>
                <p style={{ ...S.label, color:t.textMuted, marginBottom:10 }}>Por parroquia</p>
                {parqData.filter(d=>d.val>0).sort((a,b)=>b.val-a.val).map(d=>(
                  <HBar key={d.label} {...d} color="#ef4444" total={total}/>
                ))}

                <div style={{ height:1, background:t.border, margin:'16px 0' }}/>
                <p style={{ ...S.label, color:t.textMuted, marginBottom:10 }}>Problemas urgentes</p>
                {probData.filter(d=>d.val>0).sort((a,b)=>b.val-a.val).map(d=>{
                  const prob = PROBLEMAS.find(p=>p.label===d.label);
                  return <HBar key={d.label} {...d} color={prob?.color||'#64748b'} total={total}/>;
                })}

                <div style={{ height:1, background:t.border, margin:'16px 0' }}/>
                <p style={{ ...S.label, color:t.textMuted, marginBottom:10 }}>Rango de edad</p>
                {edadData.filter(d=>d.val>0).map(d=>(
                  <HBar key={d.label} {...d} color="#8b5cf6" total={total}/>
                ))}

                <div style={{ height:1, background:t.border, margin:'16px 0' }}/>
                <p style={{ ...S.label, color:t.textMuted, marginBottom:10 }}>¿Conoce al candidato?</p>
                {conoceData.map(d=>(
                  <HBar key={d.label} {...d} color={d.label==='Sí'?'#10b981':'#f59e0b'} total={total}/>
                ))}
              </>
            )}
          </motion.div>
        )}

        {/* ── CONFIG ────────────────────────────────────────────── */}
        {tab === 'config' && (
          <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.22 }}>
            <Toggle on={darkMode} onToggle={onToggleDark} icon={darkMode?Moon:Sun}
              label="Modo oscuro" sub="Ideal para trabajar de noche o bajo el sol" activeColor="#6366f1"/>

            <p style={{ ...S.label, color:t.textMuted }}>Tu nombre</p>
            <div style={{ ...S.inputWrap, marginBottom:14 }}>
              <UserCheck size={15} color={t.textMuted} style={S.inputIcon}/>
              <input style={{ ...S.input, background:t.bgSurface, border:`2px solid ${t.border}`, color:t.text }}
                value={eName} onChange={e=>setEName(e.target.value)} placeholder="Nombre"/>
            </div>

            <p style={{ ...S.label, color:t.textMuted }}>Meta diaria</p>
            <div style={{ ...S.inputWrap, marginBottom:18 }}>
              <Target size={15} color={t.textMuted} style={S.inputIcon}/>
              <input type="number" style={{ ...S.input, background:t.bgSurface, border:`2px solid ${t.border}`, color:t.text }}
                value={eGoal} onChange={e=>setEGoal(e.target.value)} placeholder="20"/>
            </div>

            <button onClick={()=>onUpdateConfig({...config,name:eName.trim()||config.name,goal:parseInt(eGoal)||config.goal})}
              style={{ ...P.actionBtn, background:'#0f172a', marginBottom:10 }} className="btn-pill-hover">
              <CheckCircle2 size={17}/> Guardar cambios
            </button>

            <button onClick={()=>{ if(confirmClear){ onClearAll(); setConfirmClear(false); onClose(); } else setConfirmClear(true); }}
              style={{ ...P.actionBtn, background:confirmClear?'#ef4444':'transparent',
                color:confirmClear?'#fff':'#ef4444', border:`2px solid ${confirmClear?'#ef4444':'#fecaca'}`, marginBottom:confirmClear?10:0 }}>
              <Trash2 size={17}/>
              {confirmClear?'⚠️ Confirmar: borrar todos los datos':'Borrar todos los datos'}
            </button>
            {confirmClear && (
              <button onClick={()=>setConfirmClear(false)}
                style={{ ...P.actionBtn, background:'transparent', color:t.textMuted, border:`2px solid ${t.border}`, fontSize:'0.82rem', marginBottom:0 }}>
                Cancelar
              </button>
            )}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   MAIN APP
════════════════════════════════════════════════════════════════════ */
function App() {
  const [step,     setStep]     = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [surveys,  setSurveys]  = useState(()=>JSON.parse(localStorage.getItem('pending_surveys')||'[]'));
  const [config,   setConfig]   = useState(()=>JSON.parse(localStorage.getItem('campaign_config')||'null'));
  const [darkMode, setDarkMode] = useState(()=>localStorage.getItem('dark_mode')==='true');
  const [formData, setFormData] = useState(BLANK);
  const [showAdmin,setShowAdmin]= useState(false);
  const [saving,   setSaving]   = useState(false);

  const t = darkMode ? DARK : LIGHT;

  useEffect(() => { document.body.classList.toggle('dark-mode', darkMode); }, [darkMode]);

  useEffect(() => {
    const on  = ()=>setIsOnline(true);
    const off = ()=>setIsOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return ()=>{ window.removeEventListener('online',on); window.removeEventListener('offline',off); };
  }, []);

  const persistSurveys = list=>{ localStorage.setItem('pending_surveys',JSON.stringify(list)); setSurveys(list); };
  const persistConfig  = cfg =>{ localStorage.setItem('campaign_config', JSON.stringify(cfg));  setConfig(cfg);  };
  const toggleDark = () => { const n=!darkMode; setDarkMode(n); localStorage.setItem('dark_mode',n); };

  const saveToLocal = async () => {
    setSaving(true);
    let coords = null;
    if (config?.gps && navigator.geolocation) {
      coords = await new Promise(resolve =>
        navigator.geolocation.getCurrentPosition(
          p => resolve({ lat:p.coords.latitude.toFixed(6), lng:p.coords.longitude.toFixed(6) }),
          ()=> resolve(null),
          { timeout:4000, maximumAge:60000 }
        )
      );
    }
    if (navigator.vibrate) navigator.vibrate([80,40,140]);
    const updated = [...surveys, { ...formData, encuestador:config?.name||'', ...(coords||{}), ts:new Date().toISOString() }];
    persistSurveys(updated);
    setSaving(false);
    setStep(6);
  };

  const nextSurvey = ()=>{ setFormData(BLANK); setStep(1); };
  const goHome     = ()=>{ setFormData(BLANK); setStep(0); };
  const setField   = (k,v)=>setFormData(f=>({...f,[k]:v}));
  const handleNext = ()=>setStep(s=>s+1);
  const handleBack = ()=>setStep(s=>s-1);

  const exportData = () => {
    if (!surveys.length){ alert('No hay encuestas guardadas.'); return; }
    const hs = Array.from(new Set(surveys.flatMap(r=>Object.keys(r))));
    const csv= [hs.join(','),...surveys.map(r=>hs.map(h=>JSON.stringify(r[h]??'')).join(','))].join('\n');
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
    a.download=`encuestas_robles_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const total    = surveys.length;
  const todayCt  = countToday(surveys);
  const pctGoal  = config ? Math.min(100, Math.round((todayCt/(config.goal||20))*100)) : 0;
  const isInSurvey = step > 0 && step < 6;

  /* ── Setup screen ─────────────────────────────────────────────── */
  if (!config) return (
    <ThemeCtx.Provider value={t}>
      <div style={{ ...S.app, background:t.bgApp }}>
        <SetupScreen onDone={cfg=>persistConfig(cfg)}/>
      </div>
    </ThemeCtx.Provider>
  );

  /* ── Render steps ─────────────────────────────────────────────── */
  const renderStep = () => {
    switch(step) {

      /* PORTADA */
      case 0: return (
        <motion.div key="s0" variants={pageVar} initial="hidden" animate="visible" exit="exit" style={S.hero}>
          <div style={S.orbRed}/><div style={S.orbBlue}/>

          {/* Admin button */}
          <motion.button initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.8}}
            onClick={()=>setShowAdmin(true)} style={{ ...S.adminBtn, background:t.bg, border:`1.5px solid ${t.border}` }} className="admin-btn-hover">
            <Settings size={14} color={t.textMuted}/>
            {total>0 && <span style={S.adminCount}>{total}</span>}
          </motion.button>

          {/* Meta strip */}
          <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} transition={{delay:0.3}}
            style={{ ...S.metaStrip, background:t.bgSurface, border:`1.5px solid ${t.border}` }}>
            <Target size={14} color={pctGoal>=100?'#10b981':'#ef4444'} style={{flexShrink:0}}/>
            <div style={{flex:1}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                <span style={{fontSize:'0.68rem',fontWeight:700,color:t.textMuted,textTransform:'uppercase',letterSpacing:'0.07em'}}>
                  {pctGoal>=100?'🎉 ¡Meta alcanzada!':'Meta diaria'}
                </span>
                <span style={{fontSize:'0.73rem',fontWeight:900,color:t.text}}>{todayCt}/{config.goal}</span>
              </div>
              <div style={{height:6,background:t.border,borderRadius:99,overflow:'hidden'}}>
                <motion.div animate={{width:`${pctGoal}%`}} transition={{duration:1,delay:0.5}}
                  style={{height:'100%',background:pctGoal>=100?'linear-gradient(to right,#10b981,#059669)':'linear-gradient(to right,#ef4444,#dc2626)',borderRadius:99}}/>
              </div>
            </div>
          </motion.div>

          <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible" style={S.photoWrap}>
            <div style={S.photoGlow}/>
            <img src="https://res.cloudinary.com/dtmqftcsr/image/upload/q_auto/f_auto/v1776302644/WhatsApp_Image_2026-04-15_at_11.28.42_AM_ieuo0z.jpg"
              style={S.photo} alt="Dr. Fabián Robles"/>
            <div style={S.photoBadge}><Award size={12} color="#ef4444"/><span>Candidato 2026</span></div>
          </motion.div>

          <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible" style={{...S.nameTag,color:t.textSec}}>
            Dr. Fabián Robles
          </motion.div>
          <motion.h1 custom={2} variants={fadeUp} initial="hidden" animate="visible" style={{...S.heroTitle,color:t.text}}>
            Transformación<br/><span style={S.gradientRed}>Para Montúfar</span>
          </motion.h1>
          <motion.p custom={3} variants={fadeUp} initial="hidden" animate="visible" style={{...S.heroSub,color:t.textSec}}>
            Tu voz impulsa el cambio.<br/>Únete a la consulta ciudadana 2026.
          </motion.p>

          <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible" style={{width:'100%',zIndex:1}}>
            <button onClick={handleNext} style={S.btnCTA} className="btn-cta-hover">
              <span>Iniciar Encuesta</span>
              <div style={S.btnIconWrap}><ChevronRight size={20} strokeWidth={3}/></div>
            </button>
          </motion.div>

          <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible"
            style={{...S.statsRow,background:t.bgSurface,border:`1.5px solid ${t.border}`}}>
            {[
              { Icon:Users,        val:'6',               label:'Parroquias' },
              { Icon:ClipboardList, val:String(todayCt),  label:'Hoy' },
              { Icon:TrendingUp,   val:`${pctGoal}%`,     label:'Meta' },
            ].map(({Icon,val,label})=>(
              <div key={label} style={S.statItem}>
                <Icon size={14} color="#ef4444"/>
                <span style={{...S.statVal,color:t.text}}>{val}</span>
                <span style={S.statLabel}>{label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      );

      /* PASO 1 · ZONA */
      case 1: return (
        <motion.div key="s1" variants={pageVar} initial="hidden" animate="visible" exit="exit" style={{...S.page,background:t.bgApp}}>
          <div style={S.pageHeader}>
            <div style={{...S.stepIcon,background:'rgba(239,68,68,0.1)'}}><MapPin size={20} color="#ef4444"/></div>
            <h2 style={{...S.pageTitle,color:t.text}}>Zona y Edad</h2>
          </div>
          <p style={{...S.label,color:t.textMuted}}>¿Parroquia de residencia?</p>
          <motion.div variants={stagger} initial="hidden" animate="visible" style={S.scrollList} className="custom-scrollbar">
            {PARROQUIAS.map(({name,emoji})=>(
              <motion.div key={name} variants={itemV}
                onClick={()=>setField('parroquia',name)}
                style={{...S.option, background:formData.parroquia===name?'rgba(239,68,68,0.06)':t.bg,
                  border:`2px solid ${formData.parroquia===name?'#ef4444':t.border}`,
                  color:formData.parroquia===name?'#ef4444':t.text}}
                className="option-hover">
                <span style={{fontSize:22,flexShrink:0}}>{emoji}</span>
                <span style={{flex:1}}>{name}</span>
                {formData.parroquia===name && (
                  <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:'spring',stiffness:420}}>
                    <CheckCircle2 size={19} color="#ef4444"/>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </motion.div>
          <p style={{...S.label,color:t.textMuted,marginTop:18}}>Rango de edad</p>
          <div style={S.ageGrid}>
            {EDADES.map(({label:age,sub})=>(
              <button key={age} onClick={()=>setField('edad',age)}
                style={{...S.ageChip, background:formData.edad===age?'#0f172a':t.bg,
                  border:`2px solid ${formData.edad===age?'#0f172a':t.border}`,
                  color:formData.edad===age?'#fff':t.textSec,
                  boxShadow:formData.edad===age?'0 8px 20px -6px rgba(15,23,42,0.36)':'none'}}
                className="age-chip-hover">
                <span style={{fontSize:'1.05rem',fontWeight:800}}>{age}</span>
                <span style={{fontSize:'0.68rem',opacity:0.7}}>{sub}</span>
              </button>
            ))}
          </div>
          <button disabled={!formData.parroquia||!formData.edad} onClick={handleNext} style={S.btnPill} className="btn-pill-hover">
            Siguiente <ChevronRight size={18} strokeWidth={2.5}/>
          </button>
        </motion.div>
      );

      /* PASO 2 · CANDIDATO */
      case 2: return (
        <motion.div key="s2" variants={pageVar} initial="hidden" animate="visible" exit="exit" style={{...S.page,background:t.bgApp}}>
          <div style={S.pageHeader}>
            <div style={{...S.stepIcon,background:'rgba(59,130,246,0.1)'}}><User size={20} color="#3b82f6"/></div>
            <h2 style={{...S.pageTitle,color:t.text}}>Candidato</h2>
          </div>
          <p style={{...S.label,color:t.textMuted}}>¿Conoce al Dr. Fabián Robles?</p>
          <motion.div variants={stagger} initial="hidden" animate="visible" style={S.grid2}>
            {[['Sí','👍','Sí lo conozco'],['No','🔍','Aún no lo conozco']].map(([val,emoji,txt])=>(
              <motion.div key={val} variants={itemV}
                onClick={()=>setField('conoceCandidato',val)}
                style={{...S.optionCard, background:formData.conoceCandidato===val?'rgba(239,68,68,0.06)':t.bg,
                  border:`2px solid ${formData.conoceCandidato===val?'#ef4444':t.border}`}}
                className="option-card-hover" whileTap={{scale:0.95}}>
                <span style={{fontSize:36}}>{emoji}</span>
                <span style={{fontSize:'0.88rem',fontWeight:700,marginTop:10,color:formData.conoceCandidato===val?'#ef4444':t.text}}>{txt}</span>
              </motion.div>
            ))}
          </motion.div>
          <AnimatePresence>
            {formData.conoceCandidato==='Sí' && (
              <motion.div initial={{opacity:0,y:14,height:0}} animate={{opacity:1,y:0,height:'auto'}} exit={{opacity:0,height:0}} style={{overflow:'hidden',marginBottom:4}}>
                <div style={{...S.ratingCard,background:t.ratingBg,border:`1.5px solid ${t.ratingBd}`}}>
                  <p style={{...S.label,color:t.textMuted,textAlign:'center',marginBottom:14}}>¿Cuánto lo apoyaría en las urnas?</p>
                  <StarRating value={formData.votoProbabilidad} onChange={v=>setField('votoProbabilidad',v)}/>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <button disabled={!formData.conoceCandidato} onClick={handleNext} style={S.btnPill} className="btn-pill-hover">
            Siguiente <ChevronRight size={18} strokeWidth={2.5}/>
          </button>
        </motion.div>
      );

      /* PASO 3 · PRIORIDADES */
      case 3: return (
        <motion.div key="s3" variants={pageVar} initial="hidden" animate="visible" exit="exit" style={{...S.page,background:t.bgApp}}>
          <div style={S.pageHeader}>
            <div style={{...S.stepIcon,background:'rgba(16,185,129,0.1)'}}><BarChart3 size={20} color="#10b981"/></div>
            <h2 style={{...S.pageTitle,color:t.text}}>Prioridades</h2>
          </div>
          <p style={{...S.label,color:t.textMuted}}>¿Cuál es el problema más urgente del cantón?</p>
          <motion.div variants={stagger} initial="hidden" animate="visible"
            style={{flex:1,overflowY:'auto',marginBottom:14,display:'flex',flexDirection:'column',gap:8}} className="custom-scrollbar">
            {PROBLEMAS.map(({label:prob,icon:Icon,color})=>(
              <motion.div key={prob} variants={itemV}
                onClick={()=>setField('problemaPrincipal',prob)}
                style={{...S.optionProb,
                  background:formData.problemaPrincipal===prob?`${color}0d`:t.bg,
                  border:`2px solid ${formData.problemaPrincipal===prob?color:t.border}`}}
                className="option-hover">
                <div style={{...S.probIcon,background:`${color}18`,border:`1.5px solid ${color}35`}}>
                  <Icon size={18} color={color}/>
                </div>
                <span style={{flex:1,fontWeight:600,color:formData.problemaPrincipal===prob?color:t.text}}>{prob}</span>
                {formData.problemaPrincipal===prob && (
                  <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:'spring',stiffness:420}}>
                    <CheckCircle2 size={19} color={color}/>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </motion.div>
          <button disabled={!formData.problemaPrincipal} onClick={handleNext} style={S.btnPill} className="btn-pill-hover">
            Siguiente <ChevronRight size={18} strokeWidth={2.5}/>
          </button>
        </motion.div>
      );

      /* PASO 4 · SUGERENCIAS */
      case 4: return (
        <motion.div key="s4" variants={pageVar} initial="hidden" animate="visible" exit="exit" style={{...S.page,background:t.bgApp}}>
          <div style={S.pageHeader}>
            <div style={{...S.stepIcon,background:'rgba(99,102,241,0.1)'}}><MessageSquare size={20} color="#6366f1"/></div>
            <h2 style={{...S.pageTitle,color:t.text}}>Tu Voz</h2>
          </div>
          <p style={{...S.label,color:t.textMuted}}>Mensaje para el Dr. Robles (opcional)</p>
          <div style={S.textareaWrap}>
            <textarea maxLength={300} style={{...S.textarea,background:t.bgSurface,border:`2px solid ${t.border}`,color:t.text}}
              placeholder="Ideas, inquietudes o propuestas…"
              value={formData.comentario} onChange={e=>setField('comentario',e.target.value)}/>
            <div style={{...S.charCount,color:t.textMuted}}>{formData.comentario.length}/300</div>
          </div>
          <div style={{...S.tipBox,background:t.tipBg,border:`1.5px solid ${t.tipBd}`}}>
            <span style={{fontSize:18}}>💡</span>
            <p style={{fontSize:'0.78rem',color:'#6366f1',margin:0,lineHeight:1.5}}>
              Sé específico para que el candidato entienda mejor la comunidad.
            </p>
          </div>
          <button onClick={handleNext} style={S.btnPill} className="btn-pill-hover">
            Último Paso <ChevronRight size={18} strokeWidth={2.5}/>
          </button>
        </motion.div>
      );

      /* PASO 5 · CONTACTO */
      case 5: return (
        <motion.div key="s5" variants={pageVar} initial="hidden" animate="visible" exit="exit" style={{...S.page,background:t.bgApp}}>
          <div style={S.pageHeader}>
            <div style={{...S.stepIcon,background:'rgba(239,68,68,0.1)'}}><Phone size={20} color="#ef4444"/></div>
            <h2 style={{...S.pageTitle,color:t.text}}>Contacto</h2>
          </div>
          <p style={{...S.label,color:t.textMuted}}>Datos del encuestado (opcionales)</p>
          <div style={S.inputWrap}>
            <User size={15} color={t.textMuted} style={S.inputIcon}/>
            <input style={{...S.input,background:t.bgSurface,border:`2px solid ${t.border}`,color:t.text}}
              placeholder="Nombre completo" value={formData.nombre} onChange={e=>setField('nombre',e.target.value)}/>
          </div>
          <div style={{...S.inputWrap,marginTop:13}}>
            <Phone size={15} color={t.textMuted} style={S.inputIcon}/>
            <input type="tel" style={{...S.input,background:t.bgSurface,border:`2px solid ${t.border}`,color:t.text}}
              placeholder="Número de WhatsApp" value={formData.whatsapp} onChange={e=>setField('whatsapp',e.target.value)}/>
          </div>
          {config.gps && (
            <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',marginTop:13,
              background:t.bgSurface,border:`1.5px solid ${t.border}`,borderRadius:14}}>
              <Navigation size={14} color="#10b981"/>
              <span style={{fontSize:'0.74rem',color:t.textMuted}}>Se capturará la ubicación GPS al guardar</span>
            </div>
          )}
          <div style={{...S.tipBox,marginTop:13,marginBottom:0,background:t.bgSurface,border:`1.5px solid ${t.border}`}}>
            <span style={{fontSize:16}}>🔒</span>
            <p style={{fontSize:'0.75rem',color:t.textMuted,margin:0,lineHeight:1.5}}>
              Datos confidenciales. Solo para seguimiento de campaña.
            </p>
          </div>
          <div style={{flex:1}}/>
          <button onClick={saveToLocal} disabled={saving}
            style={{...S.btnPill,background:'linear-gradient(135deg,#ef4444,#b91c1c)',marginTop:14}}
            className="btn-cta-hover">
            {saving
              ? <><Zap size={18}/> Guardando…</>
              : <><Send size={18} strokeWidth={2.5}/> Guardar Encuesta</>}
          </button>
        </motion.div>
      );

      /* ÉXITO */
      case 6: return (
        <motion.div key="s6" variants={pageVar} initial="hidden" animate="visible" exit="exit"
          style={{...S.hero,position:'relative',overflow:'hidden',background:t.bgApp}}>
          <Confetti/>
          <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible" style={S.successCircle}>
            <motion.div animate={{scale:[1,1.1,1]}} transition={{duration:2,repeat:Infinity,ease:'easeInOut'}}>
              <CheckCircle2 size={54} color="#059669" strokeWidth={1.5}/>
            </motion.div>
          </motion.div>
          <motion.h1 custom={1} variants={fadeUp} initial="hidden" animate="visible"
            style={{...S.heroTitle,fontSize:'2.1rem',zIndex:1,color:t.text}}>¡Guardada!</motion.h1>

          <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible"
            style={{display:'flex',alignItems:'center',gap:8,
              background:pctGoal>=100?'#f0fdf4':'rgba(239,68,68,0.06)',
              border:`1.5px solid ${pctGoal>=100?'#bbf7d0':'#fecaca'}`,
              borderRadius:16,padding:'10px 20px',marginBottom:16,zIndex:1}}>
            {pctGoal>=100?<Award size={18} color="#059669"/>:<ClipboardList size={18} color="#ef4444"/>}
            <span style={{fontWeight:800,fontSize:'0.9rem',color:pctGoal>=100?'#059669':'#ef4444'}}>
              {pctGoal>=100
                ? `🎉 ¡Meta alcanzada! ${todayCt} encuestas hoy`
                : `${todayCt} de ${config.goal} encuestas (${pctGoal}%)`}
            </span>
          </motion.div>

          <motion.p custom={3} variants={fadeUp} initial="hidden" animate="visible"
            style={{...S.heroSub,zIndex:1,marginBottom:22,color:t.textSec}}>
            La opinión del ciudadano quedó guardada.
          </motion.p>

          <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible"
            style={{width:'100%',display:'flex',flexDirection:'column',gap:10,zIndex:1}}>
            <button onClick={nextSurvey} style={{...S.btnCTA,background:'linear-gradient(135deg,#0f172a,#1e293b)'}} className="btn-cta-hover">
              <span>Siguiente Ciudadano</span>
              <div style={S.btnIconWrap}><ChevronRight size={20} strokeWidth={3}/></div>
            </button>
            <button onClick={goHome} style={{...S.btnSecondary,borderColor:t.border,color:t.textSec}} className="btn-secondary-hover">
              <RefreshCw size={16}/> Volver a la portada
            </button>
            <button onClick={exportData} style={{...S.btnSecondary,fontSize:'0.79rem',height:42,borderColor:t.border,color:t.textMuted}} className="btn-secondary-hover">
              <Download size={14}/> Exportar CSV ({total})
            </button>
          </motion.div>
        </motion.div>
      );

      default: return null;
    }
  };

  return (
    <ThemeCtx.Provider value={t}>
      <div style={{...S.app,background:t.bgApp}}>
        {/* Offline banner */}
        <AnimatePresence>
          {!isOnline && (
            <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}
              style={{...S.offlineBanner,background:t.offlineBg,color:t.offlineText}}>
              <WifiOff size={14}/><span>Sin conexión — encuestas guardadas localmente</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Online badge */}
        {isOnline && (
          <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} transition={{delay:0.5}}
            style={{...S.badge,background:t.badgeBg,border:'1.5px solid #bbf7d0'}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:'#10b981',animation:'pulse 2s infinite',flexShrink:0}}/>
            <span style={{color:'#059669'}}>EN LÍNEA</span>
            {total>0 && <span style={S.badgePill}>{total}</span>}
          </motion.div>
        )}

        {/* Content */}
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',position:'relative'}}>
          <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
        </div>

        {/* Footer */}
        <AnimatePresence>
          {isInSurvey && (
            <motion.div initial={{y:60,opacity:0}} animate={{y:0,opacity:1}} exit={{y:60,opacity:0}} transition={{duration:0.27}}
              style={{...S.footer,background:t.footerBg,borderTop:`1px solid ${t.border}`}}>
              <div style={{...S.progressTrack,background:t.border}}>
                <motion.div animate={{width:`${(step/TOTAL_STEPS)*100}%`}} transition={{duration:0.55,ease:[0.22,1,0.36,1]}}
                  style={S.progressFill}/>
              </div>
              <div style={S.footerRow}>
                <button onClick={handleBack} style={{...S.btnBack,color:t.textMuted}} className="btn-back-hover">
                  <ArrowLeft size={14} strokeWidth={2.5}/> Atrás
                </button>
                <StepDots current={step} total={TOTAL_STEPS}/>
                <span style={S.footerBrand}>ROBLES 2026</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Admin panel */}
        <AnimatePresence>
          {showAdmin && (
            <AdminPanel surveys={surveys} config={config}
              onClose={()=>setShowAdmin(false)}
              onExport={exportData} onClearAll={()=>persistSurveys([])}
              onUpdateConfig={persistConfig}
              darkMode={darkMode} onToggleDark={toggleDark}/>
          )}
        </AnimatePresence>
      </div>
    </ThemeCtx.Provider>
  );
}

/* ════════════════════════════════════════════════════════════════════
   STYLES  (layout & shape — colors injected from theme via t.xxx)
════════════════════════════════════════════════════════════════════ */
const S = {
  app:         { display:'flex', flexDirection:'column', flex:1, position:'relative', height:'100%', overflow:'hidden', backdropFilter:'blur(28px) saturate(180%)', WebkitBackdropFilter:'blur(28px) saturate(180%)' },
  offlineBanner:{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontSize:'0.78rem', fontWeight:700, padding:'9px 16px', overflow:'hidden' },
  badge:       { position:'absolute', top:14, right:14, display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:99, fontSize:10, fontWeight:800, letterSpacing:'0.06em', zIndex:50, boxShadow:'0 2px 12px rgba(0,0,0,0.07)' },
  badgePill:   { background:'#ef4444', color:'#fff', borderRadius:99, padding:'1px 7px', fontSize:9, fontWeight:900 },
  adminBtn:    { position:'absolute', top:14, left:14, display:'flex', alignItems:'center', gap:5, borderRadius:99, padding:'6px 12px', cursor:'pointer', zIndex:50, boxShadow:'0 2px 8px rgba(0,0,0,0.06)', transition:'all 0.2s ease' },
  adminCount:  { background:'#ef4444', color:'#fff', borderRadius:99, padding:'0 6px', fontSize:9, fontWeight:900, lineHeight:'16px' },
  metaStrip:   { display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:16, marginBottom:10, width:'100%', zIndex:1 },
  hero:        { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, padding:'16px 26px 26px', textAlign:'center', position:'relative', overflow:'hidden' },
  orbRed:      { position:'absolute', top:-80, right:-80, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(239,68,68,0.1) 0%,transparent 70%)', pointerEvents:'none' },
  orbBlue:     { position:'absolute', bottom:-60, left:-60, width:170, height:170, borderRadius:'50%', background:'radial-gradient(circle,rgba(99,102,241,0.08) 0%,transparent 70%)', pointerEvents:'none' },
  photoWrap:   { position:'relative', marginBottom:16, zIndex:1 },
  photoGlow:   { position:'absolute', inset:-20, background:'radial-gradient(circle,rgba(239,68,68,0.14) 0%,transparent 70%)', borderRadius:'50%' },
  photo:       { width:130, height:130, objectFit:'cover', objectPosition:'top', borderRadius:30, border:'4px solid white', boxShadow:'0 18px 42px -10px rgba(0,0,0,0.2),0 0 0 6px rgba(239,68,68,0.07)', position:'relative', zIndex:1, display:'block' },
  photoBadge:  { position:'absolute', bottom:-10, left:'50%', transform:'translateX(-50%)', display:'flex', alignItems:'center', gap:5, background:'#fff', borderRadius:99, padding:'4px 12px', fontSize:10, fontWeight:800, color:'#ef4444', letterSpacing:'0.04em', boxShadow:'0 4px 14px rgba(0,0,0,0.1)', border:'1.5px solid rgba(239,68,68,0.2)', whiteSpace:'nowrap', zIndex:2 },
  nameTag:     { marginTop:14, marginBottom:5, fontSize:'0.8rem', fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase', zIndex:1 },
  heroTitle:   { fontWeight:900, fontSize:'clamp(1.65rem,8vw,2.35rem)', letterSpacing:'-0.04em', lineHeight:1.15, marginBottom:10, zIndex:1 },
  gradientRed: { background:'linear-gradient(135deg,#ef4444 0%,#dc2626 50%,#991b1b 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' },
  heroSub:     { fontSize:'0.95rem', lineHeight:1.65, marginBottom:20, maxWidth:265, zIndex:1 },
  statsRow:    { display:'flex', width:'100%', marginTop:16, borderRadius:16, overflow:'hidden', zIndex:1 },
  statItem:    { flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'11px 6px', borderRight:'1px solid rgba(0,0,0,0.05)' },
  statVal:     { fontSize:'0.96rem', fontWeight:800 },
  statLabel:   { fontSize:'0.6rem', fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em' },
  btnCTA:      { display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', height:55, padding:'0 8px 0 22px', borderRadius:99, border:'none', background:'linear-gradient(135deg,#0f172a,#1e293b)', color:'#fff', fontWeight:800, fontSize:'1rem', cursor:'pointer', boxShadow:'0 12px 28px -6px rgba(15,23,42,0.38)', transition:'all 0.24s ease' },
  btnIconWrap: { width:38, height:38, borderRadius:'50%', background:'rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center' },
  page:        { display:'flex', flexDirection:'column', flex:1, padding:'60px 22px 14px', overflowY:'auto' },
  pageHeader:  { display:'flex', alignItems:'center', gap:12, marginBottom:18 },
  stepIcon:    { width:40, height:40, borderRadius:13, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  pageTitle:   { fontWeight:800, fontSize:'1.4rem', letterSpacing:'-0.03em', margin:0 },
  label:       { fontWeight:700, fontSize:10, textTransform:'uppercase', letterSpacing:'0.12em', color:'#94a3b8', marginBottom:10 },
  scrollList:  { overflowY:'auto', maxHeight:244, paddingRight:4, marginBottom:6, display:'flex', flexDirection:'column', gap:8 },
  option:      { display:'flex', alignItems:'center', gap:13, borderRadius:17, padding:'13px 17px', cursor:'pointer', fontWeight:600, fontSize:'0.9rem', transition:'all 0.17s ease' },
  optionProb:  { display:'flex', alignItems:'center', gap:13, borderRadius:17, padding:'13px 17px', cursor:'pointer', fontWeight:600, fontSize:'0.9rem', transition:'all 0.17s ease' },
  probIcon:    { width:36, height:36, borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  ageGrid:     { display:'grid', gridTemplateColumns:'1fr 1fr', gap:9, marginBottom:22 },
  ageChip:     { display:'flex', flexDirection:'column', alignItems:'center', padding:'13px 12px', borderRadius:17, fontWeight:700, fontSize:'0.83rem', cursor:'pointer', gap:2, transition:'all 0.17s ease' },
  grid2:       { display:'grid', gridTemplateColumns:'1fr 1fr', gap:13, marginBottom:14 },
  optionCard:  { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'20px 12px', gap:4, borderRadius:20, cursor:'pointer', fontWeight:600, fontSize:'0.88rem', transition:'all 0.17s ease', minHeight:100 },
  ratingCard:  { borderRadius:20, padding:'16px 14px', marginBottom:16 },
  textareaWrap:{ position:'relative', marginBottom:14 },
  textarea:    { width:'100%', minHeight:132, padding:'14px 18px', borderRadius:20, fontSize:'0.92rem', resize:'none', outline:'none', fontFamily:'inherit', lineHeight:1.65, boxSizing:'border-box' },
  charCount:   { position:'absolute', bottom:10, right:13, fontSize:'0.7rem', fontWeight:600 },
  tipBox:      { display:'flex', alignItems:'flex-start', gap:11, borderRadius:16, padding:'12px 14px', marginBottom:18 },
  inputWrap:   { position:'relative', width:'100%' },
  inputIcon:   { position:'absolute', left:17, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' },
  input:       { width:'100%', height:54, padding:'0 20px 0 44px', borderRadius:17, fontSize:'0.92rem', outline:'none', fontFamily:'inherit', boxSizing:'border-box', display:'block', transition:'all 0.17s ease' },
  btnPill:     { display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', height:52, marginTop:6, borderRadius:99, border:'none', background:'#0f172a', color:'#fff', fontWeight:700, fontSize:'0.97rem', cursor:'pointer', boxShadow:'0 10px 28px -8px rgba(15,23,42,0.33)', transition:'all 0.24s ease' },
  btnSecondary:{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', height:46, borderRadius:99, border:'2px solid', background:'transparent', fontWeight:700, fontSize:'0.83rem', cursor:'pointer', transition:'all 0.17s ease' },
  successCircle:{ width:106, height:106, borderRadius:'50%', background:'linear-gradient(135deg,#d1fae5,#a7f3d0)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20, boxShadow:'0 16px 38px -10px rgba(16,185,129,0.28)', zIndex:1 },
  footer:      { padding:'10px 22px 18px', backdropFilter:'blur(12px)' },
  progressTrack:{ height:5, borderRadius:99, overflow:'hidden', marginBottom:11 },
  progressFill:{ height:'100%', background:'linear-gradient(to right,#0f172a,#ef4444)', borderRadius:99 },
  footerRow:   { display:'flex', justifyContent:'space-between', alignItems:'center' },
  btnBack:     { display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', padding:'6px 0' },
  footerBrand: { fontSize:9, fontWeight:900, letterSpacing:'0.22em', color:'#cbd5e1' },
};

const P = {
  overlay:    { position:'fixed', inset:0, background:'rgba(15,23,42,0.52)', backdropFilter:'blur(10px)', zIndex:200, display:'flex', alignItems:'flex-end' },
  sheet:      { width:'100%', maxWidth:480, margin:'0 auto', borderRadius:'28px 28px 0 0', padding:'0 20px 30px', boxShadow:'0 -20px 60px rgba(0,0,0,0.22)', maxHeight:'92vh', overflowY:'auto' },
  actionBtn:  { display:'flex', alignItems:'center', justifyContent:'center', gap:9, width:'100%', height:50, borderRadius:99, border:'none', color:'#fff', fontWeight:700, fontSize:'0.9rem', cursor:'pointer', transition:'all 0.22s ease', marginBottom:10 },
};

export default App;

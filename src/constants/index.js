export const PARROQUIAS = [
  { name: "San Gabriel (Centro)",       emoji: "🏛️" },
  { name: "Cristóbal Colón",            emoji: "⛪" },
  { name: "Chitán de los Navarretes",   emoji: "🌄" },
  { name: "Fernández Salvador",         emoji: "🌿" },
  { name: "La Paz",                     emoji: "☮️" },
  { name: "Piartal",                    emoji: "🏔️" },
  { name: "Otra (Especificar)",         emoji: "✍️" },
];

export const CANDIDATOS = [
  { name: "Dr. Fabián Robles", color: "#10b981", party: "Renovación Montufareña", isFav: true },
  { name: "Indeciso / No sabe", color: "#f59e0b", isNeutral: true },
  { name: "No vota / En blanco", color: "#ef4444", isNeutral: true },
];

// Opciones de respuesta para la pregunta principal: ¿Votaría por Fabián Robles?
export const OPCIONES_VOTO_ROBLES = [
  {
    id: 'voto_seguro',
    label: 'Voto Seguro',
    sublabel: 'Apoya con firmeza al Dr. Fabián Robles',
    color: '#10b981',
    border: '#059669',
    bg: '#ecfdf5',
    emoji: '🟢',
    badgeText: 'SEGURO'
  },
  {
    id: 'indeciso',
    label: 'Indeciso / Por Definir',
    sublabel: 'Aún no decide, abierto a propuestas o información',
    color: '#f59e0b',
    border: '#d97706',
    bg: '#fffbeb',
    emoji: '🟡',
    badgeText: 'INDECISO'
  },
  {
    id: 'no_vota',
    label: 'No Regresar / No Vota',
    sublabel: 'No apoyará o solicitó expresamente no volver a visitar',
    color: '#ef4444',
    border: '#dc2626',
    bg: '#fef2f2',
    emoji: '🔴',
    badgeText: 'NO VOTA'
  },
  {
    id: 'nadie_en_casa',
    label: 'Nadie en Domicilio',
    sublabel: 'No salió nadie en el domicilio al momento de la visita',
    color: '#ffffff',
    border: '#334155',
    bg: '#ffffff',
    emoji: '⚪',
    badgeText: 'SIN RESPUESTA'
  },
  {
    id: 'no_trabajable',
    label: 'Zona no Trabajable',
    sublabel: 'Terreno baldío, comercio cerrado o zona deshabitada',
    color: '#64748b',
    border: '#334155',
    bg: '#f1f5f9',
    emoji: '🔘',
    badgeText: 'NO TRABAJABLE'
  },
];

export const PROBLEMAS_COMUNES = [
  '💧 Agua Potable y Alcantarillado',
  '👮 Seguridad Ciudadana y Vigilancia',
  '🛣️ Vialidad, Vías Rurales y Adoquinado',
  '💡 Alumbrado Público',
  '🏥 Salud y Dispensarios Médicos',
  '🚜 Apoyo al Agro y Ganadería',
  '💼 Empleo y Reactivación Económica',
  '🗑️ Recolección de Basura y Limpieza',
  '🏞️ Espacios Verdes, Parques y Recreación',
];

// Opciones de respuesta para: ¿Contamos con su apoyo?
export const OPCIONES_APOYO = [
  { id: 'si', label: 'Sí, contamos con su apoyo', emoji: '🟢', color: '#10b981', semaforo: 'voto_seguro' },
  { id: 'tal_vez', label: 'Tal vez / Por definir', emoji: '🟡', color: '#f59e0b', semaforo: 'indeciso' },
  { id: 'no', label: 'No apoya la candidatura', emoji: '🔴', color: '#ef4444', semaforo: 'no_vota' },
];

// Problemas más importantes para la próxima administración municipal
export const PROBLEMAS_MUNICIPALES_PRIORITARIOS = [
  '💧 Agua Potable y Alcantarillado',
  '👮 Seguridad Ciudadana y Vigilancia',
  '🛣️ Vialidad, Vías Rurales y Adoquinado',
  '💡 Alumbrado Público y Mantenimiento',
  '🏥 Salud y Dispensarios Médicos Barriales',
  '🚜 Fomento Productivo, Agro y Ganadería',
  '💼 Generación de Empleo y Emprendimiento Local',
  '🗑️ Recolección de Basura y Gestión Ambiental',
  '🏞️ Espacios Verdes, Parques y Deporte',
  '🏛️ Otro (especificar)',
];

// Opciones de respuesta para: ¿Podemos regresar a seguirle contando la propuesta del Dr. Fabián Robles?
export const OPCIONES_REGRESAR = [
  { id: 'si', label: 'Sí, con gusto puede regresar', emoji: '🟢', color: '#10b981', semaforo: 'voto_seguro' },
  { id: 'quizas', label: 'Quizás más adelante', emoji: '🟡', color: '#f59e0b', semaforo: 'indeciso' },
  { id: 'no', label: 'No regresar (no insistir)', emoji: '🔴', color: '#ef4444', semaforo: 'no_vota' },
];

export const TOTAL_STEPS = 2;

export const getLocalDatetimeString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Valores iniciales de la encuesta actualizada
export const BLANK = {
  fecha: '',
  nombre: '',
  manzana: '',
  numero_medidor_casa: '',
  descripcion_casa: '',
  problemas: [],
  problemas_otro: '',
  // Nuevas preguntas ligadas a semaforización:
  apoyo_robles: '', // 'si' | 'tal_vez' | 'no'
  problema_prioritario: '',
  problema_prioritario_otro: '',
  podemos_regresar: '', // 'si' | 'quizas' | 'no'
  votaria_robles: '', // 'voto_seguro' | 'indeciso' | 'no_vota' | 'nadie_en_casa' | 'no_trabajable'
  parroquia: 'San Gabriel (Centro)',
  observaciones: '',
};

export const LIGHT = {
  bg: '#ffffff',
  bgSurface: '#f8fafc',
  bgApp: '#f8fafc',
  text: '#0f172a',
  textSec: '#475569',
  textMuted: '#64748b',
  border: '#e2e8f0',
  footerBg: '#ffffff',
  ratingBg: '#f8fafc',
  ratingBd: '#e2e8f0',
  tipBg: '#f8fafc',
  tipBd: '#e2e8f0',
  adminSheet: '#ffffff',
  statCardBg: '#ffffff',
  badgeBg: '#f1f5f9',
  offlineBg: '#ffffff',
  offlineText: '#0f172a',
  tabBg: '#f8fafc',
};

export const DARK = {
  bg: '#ffffff',
  bgSurface: '#f8fafc',
  bgApp: '#f8fafc',
  text: '#0f172a',
  textSec: '#475569',
  textMuted: '#64748b',
  border: '#e2e8f0',
  footerBg: '#ffffff',
  ratingBg: '#f8fafc',
  ratingBd: '#e2e8f0',
  tipBg: '#f8fafc',
  tipBd: '#e2e8f0',
  adminSheet: '#ffffff',
  statCardBg: '#ffffff',
  badgeBg: '#f1f5f9',
  offlineBg: '#ffffff',
  offlineText: '#0f172a',
  tabBg: '#f8fafc',
};


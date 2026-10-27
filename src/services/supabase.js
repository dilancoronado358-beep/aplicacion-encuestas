export const SUPABASE_URL = 'https://kvkqvjqbqkmupqawealh.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_Xvmldjz6nShHwu8HLn0M2w_RpF2Wbx3';

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

/**
 * Determina el estado del punto en el mapa según las especificaciones del sondeo:
 * 🟢 Verde: Voto seguro
 * 🟡 Amarillo: Indeciso
 * 🔴 Rojo: No vota
 * ⚪ Blanco: Nadie en domicilio / No salió nadie
 * 🔘 Plomo: Punto no trabajable (sin viviendas)
 */
export const calculateResultadoVoto = (survey) => {
  if (survey.tipo_visita === 'nadie_en_casa' || survey.votaria_robles === 'nadie_en_casa') return 'nadie_en_casa';
  if (survey.tipo_visita === 'no_trabajable' || survey.votaria_robles === 'no_trabajable') return 'no_trabajable';

  // Vinculación directa con respuestas:
  if (survey.podemos_regresar === 'no' || survey.apoyo_robles === 'no') return 'no_vota';
  if (survey.apoyo_robles === 'si' && survey.podemos_regresar === 'si') return 'voto_seguro';
  if (survey.votaria_robles) return survey.votaria_robles;
  if (survey.apoyo_robles === 'tal_vez' || survey.podemos_regresar === 'quizas') return 'indeciso';
  if (survey.resultado_voto) return survey.resultado_voto;
  if (survey.votaria_candidato === 'Sí') return 'voto_seguro';
  if (survey.candidato === 'Indeciso / No sabe') return 'indeciso';
  if (survey.candidato === 'Ninguno / Blanco' || survey.candidato === 'Nulo' || survey.votaria_candidato === 'No') return 'no_vota';
  return 'indeciso';
};

/**
 * Formatea y empaqueta una encuesta asegurando compatibilidad total con el esquema de Supabase.
 * Empaqueta preguntas detalladas (manzana, medidor, descripción, problemas, prioridades)
 * dentro de conoce_candidato como JSON para que PostgREST jamás rechace el insert por columnas faltantes.
 */
export const formatSurveyForSupabase = (survey) => {
  const resultado_voto = survey.resultado_voto || calculateResultadoVoto(survey);
  const tipo_visita = survey.tipo_visita || (resultado_voto === 'nadie_en_casa' || resultado_voto === 'no_trabajable' ? resultado_voto : 'efectiva');

  const extendedData = {
    manzana: survey.manzana || '',
    numero_medidor_casa: survey.numero_medidor_casa || survey.numero_casa || '',
    numero_casa: survey.numero_medidor_casa || survey.numero_casa || '',
    descripcion_casa: survey.descripcion_casa || '',
    problemas: survey.problemas || [],
    problemas_otro: survey.problemas_otro || '',
    apoyo_robles: survey.apoyo_robles || '',
    problema_prioritario: survey.problema_prioritario || '',
    problema_prioritario_otro: survey.problema_prioritario_otro || '',
    podemos_regresar: survey.podemos_regresar || '',
    votaria_robles: survey.votaria_robles || resultado_voto || '',
    observaciones: survey.observaciones || '',
  };

  return {
    ts: survey.ts || (survey.fecha ? new Date(survey.fecha).toISOString() : new Date().toISOString()),
    tipo_visita,
    resultado_voto,
    nombre: survey.nombre || 'Ciudadano',
    whatsapp: survey.whatsapp || survey.numero_medidor_casa || '',
    parroquia: survey.parroquia || 'San Gabriel (Centro)',
    candidato: survey.candidato || (resultado_voto === 'voto_seguro' ? 'Dr. Fabián Robles' : (resultado_voto === 'no_vota' ? 'Otro / Rechazo' : 'Indeciso')),
    conoce_candidato: JSON.stringify(extendedData),
    votaria_candidato: survey.votaria_robles || survey.apoyo_robles || resultado_voto,
    encuestador: survey.encuestador || 'Encuestador',
    encuestador_id: survey.encuestador_id || null,
    lat: survey.lat != null ? String(survey.lat) : '0.5936',
    lng: survey.lng != null ? String(survey.lng) : '-77.8306',
    uploaded: true,
  };
};

/**
 * Desempaqueta una encuesta leída desde Supabase, restaurando todos los campos JSON
 */
export const unpackSurveyFromSupabase = (raw) => {
  if (!raw) return raw;
  let parsed = {};
  if (raw.conoce_candidato && typeof raw.conoce_candidato === 'string' && raw.conoce_candidato.trim().startsWith('{')) {
    try {
      parsed = JSON.parse(raw.conoce_candidato);
    } catch (e) {
      console.warn('Error parsing survey extra fields:', e);
    }
  }
  const resultado = parsed.votaria_robles || raw.resultado_voto || calculateResultadoVoto({ ...raw, ...parsed });
  return {
    ...raw,
    ...parsed,
    lat: parseFloat(raw.lat) || 0.5936,
    lng: parseFloat(raw.lng) || -77.8306,
    resultado_voto: resultado,
    votaria_robles: parsed.votaria_robles || resultado,
  };
};

/**
 * Sube una encuesta a Supabase asegurando uploaded: true y compatibilidad completa
 */
export const uploadSurvey = async (survey) => {
  try {
    const payload = formatSurveyForSupabase(survey);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/encuestas`, {
      method: 'POST',
      headers,
      body: JSON.stringify([payload]),
    });
    const isOk = res.ok;
    if (!isOk) {
      const errTxt = await res.text();
      console.warn('❗️ Supabase upload failed:', res.status, errTxt);
    }
    return isOk;
  } catch (e) {
    console.warn('❗️ Error al subir encuesta a Supabase →', e);
    return false;
  }
};

/**
 * Sube un lote de encuestas pendientes en una sola petición HTTP
 */
export const uploadSurveysBatch = async (surveyList) => {
  if (!surveyList || !surveyList.length) return true;
  try {
    const payloads = surveyList.map(formatSurveyForSupabase);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/encuestas`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payloads),
    });
    return res.ok;
  } catch (e) {
    console.warn('❗️ Error al subir lote de encuestas a Supabase →', e);
    return false;
  }
};

/**
 * Consulta todas las encuestas guardadas en la nube para el Centro de Mando del Admin
 */
export const fetchCloudSurveys = async () => {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/encuestas?select=*&order=created_at.desc`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });
    if (!res.ok) {
      console.warn('Error fetching cloud surveys, status:', res.status);
      return null;
    }
    const data = await res.json();
    // Excluir registros de telemetría GPS del cálculo de encuestas electorales y desempaquetar campos
    const validSurveys = Array.isArray(data)
      ? data
          .filter((s) => s.candidato !== 'GPS_TRACKING' && s.tipo_visita !== 'posicion_encuestador')
          .map(unpackSurveyFromSupabase)
      : [];
    return validSurveys;
  } catch (e) {
    console.warn('❗️ Error de conexión al consultar encuestas en la nube →', e);
    return null;
  }
};

/**
 * Inicia sesión verificando credenciales y rol en Supabase (o acceso maestro)
 */
export const loginUserCloud = async (email, password) => {
  const cleanEmail = email.trim().toLowerCase();

  // Acceso de superadministrador maestro (garantizado online u offline)
  if (
    cleanEmail === 'admin@robles2026.com' ||
    cleanEmail === 'admin' ||
    (cleanEmail.startsWith('admin') && password === 'admin2026')
  ) {
    return {
      success: true,
      user: {
        name: 'Dr. Fabián Robles (Admin)',
        email: 'admin@robles2026.com',
        rol: 'admin',
        goal: 100,
        gps: true,
        loggedIn: true,
      },
    };
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/encuestadores?email=eq.${encodeURIComponent(cleanEmail)}&select=*`,
      {
        method: 'GET',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    if (res.ok) {
      const users = await res.json();
      if (users && users.length > 0) {
        const u = users[0];
        // Si tiene contraseña configurada, validar que coincida
        if (u.password && u.password !== password) {
          return { success: false, error: 'Contraseña incorrecta.' };
        }
        return {
          success: true,
          user: {
            name: u.nombre,
            email: u.email,
            rol: u.rol || 'encuestador',
            goal: 20,
            gps: true,
            loggedIn: true,
          },
        };
      }
    }
  } catch (e) {
    console.warn('No se pudo verificar en Supabase, recurriendo a modo offline:', e);
  }

  // Fallback offline / local
  const inferredName = cleanEmail.includes('@')
    ? cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : cleanEmail;

  return {
    success: true,
    user: {
      name: inferredName,
      email: cleanEmail,
      rol: 'encuestador',
      goal: 20,
      gps: true,
      loggedIn: true,
    },
  };
};

/**
 * Consulta la lista de encuestadores y administradores registrados
 */
export const fetchEncuestadoresList = async () => {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/encuestadores?select=*&order=created_at.desc`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.warn('Error fetching encuestadores:', e);
    return [];
  }
};

/**
 * Registra un encuestador o nuevo administrador en Supabase
 */
export const registerEncuestadorCloud = async (userData) => {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/encuestadores`, {
      method: 'POST',
      headers,
      body: JSON.stringify([
        {
          nombre: userData.name,
          email: userData.email.toLowerCase().trim(),
          password: userData.password,
          rol: userData.rol || 'encuestador',
          activo: true,
        },
      ]),
    });
    return res.ok;
  } catch (e) {
    console.warn('❗️ Error registrando en Supabase →', e);
    return false;
  }
};

/**
 * Envía la ubicación GPS en tiempo real del encuestador a Supabase.
 * Soporta tanto la tabla dedicada 'encuestadores_ubicaciones' como el canal de 'encuestas'
 */
export const sendEncuestadorHeartbeat = async (email, nombre, lat, lng, accuracy = 0) => {
  if (!email || !lat || !lng) return false;
  const cleanEmail = email.toLowerCase().trim();
  const now = new Date().toISOString();

  // 1. Intentar upsert en encuestadores_ubicaciones
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/encuestadores_ubicaciones?on_conflict=email`, {
      method: 'POST',
      headers: {
        ...headers,
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify([
        {
          email: cleanEmail,
          nombre: nombre || cleanEmail,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          accuracy: parseFloat(accuracy || 0),
          updated_at: now,
          activo: true,
        },
      ]),
    });
    if (res.ok) return true;
  } catch (err) {
    // Si la tabla aún no existe, usar el canal de encuestas
  }

  // 2. Canal de telemetría GPS en encuestas
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/encuestas`, {
      method: 'POST',
      headers,
      body: JSON.stringify([
        {
          nombre: 'Ubicación GPS Encuestador',
          parroquia: 'San Gabriel',
          candidato: 'GPS_TRACKING',
          encuestador: nombre || cleanEmail,
          encuestador_id: cleanEmail,
          lat: String(lat),
          lng: String(lng),
          uploaded: true,
          ts: now,
        },
      ]),
    });
    return res.ok;
  } catch (e) {
    console.warn('Error enviando heartbeat GPS de encuestador:', e);
    return false;
  }
};

/**
 * Consulta la ubicación en tiempo real de todos los encuestadores activos en campo
 */
export const fetchLiveEncuestadoresLocations = async () => {
  const encuestadoresMap = new Map();

  // 1. Intentar consultar tabla dedicada encuestadores_ubicaciones
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/encuestadores_ubicaciones?select=*&order=updated_at.desc`,
      {
        method: 'GET',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        rows.forEach((r) => {
          if (!encuestadoresMap.has(r.email) && r.lat && r.lng) {
            const updatedAt = new Date(r.updated_at || r.created_at || Date.now());
            const minutesDiff = (Date.now() - updatedAt.getTime()) / (1000 * 60);
            encuestadoresMap.set(r.email, {
              id: r.id || r.email,
              email: r.email,
              nombre: r.nombre || r.email,
              lat: parseFloat(r.lat),
              lng: parseFloat(r.lng),
              accuracy: r.accuracy || 10,
              updatedAt,
              isOnline: minutesDiff < 5,
              source: 'encuestadores_ubicaciones',
            });
          }
        });
        return Array.from(encuestadoresMap.values());
      }
    }
  } catch (err) {
    // Continuar al canal de encuestas
  }

  // 2. Consultar registros recientes de GPS_TRACKING en encuestas
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/encuestas?candidato=eq.GPS_TRACKING&order=ts.desc&limit=100`,
      {
        method: 'GET',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows)) {
        rows.forEach((r) => {
          const key = r.encuestador_id || r.encuestador;
          if (key && !encuestadoresMap.has(key) && r.lat && r.lng) {
            const lat = parseFloat(r.lat);
            const lng = parseFloat(r.lng);
            if (!isNaN(lat) && !isNaN(lng)) {
              const updatedAt = new Date(r.ts || r.created_at || Date.now());
              const minutesDiff = (Date.now() - updatedAt.getTime()) / (1000 * 60);
              encuestadoresMap.set(key, {
                id: r.id || key,
                email: r.encuestador_id || key,
                nombre: r.encuestador || 'Encuestador',
                lat,
                lng,
                accuracy: 12,
                updatedAt,
                isOnline: minutesDiff < 5,
                source: 'encuestas',
              });
            }
          }
        });
      }
    }
  } catch (err) {
    console.warn('Error consultando ubicaciones en vivo:', err);
  }

  return Array.from(encuestadoresMap.values());
};

/**
 * Elimina todas las encuestas registradas en la nube y en base de datos.
 * Permite purgar datos de prueba y restablecer el sistema en 0.
 */
export const deleteAllSurveysCloud = async () => {
  try {
    let res = await fetch(`${SUPABASE_URL}/rest/v1/encuestas?id=neq.00000000-0000-0000-0000-000000000000`, {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      res = await fetch(`${SUPABASE_URL}/rest/v1/encuestas?ts=gte.1970-01-01`, {
        method: 'DELETE',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
      });
    }
    return res.ok;
  } catch (e) {
    console.warn('❗️ Error al eliminar encuestas en Supabase →', e);
    return false;
  }
};



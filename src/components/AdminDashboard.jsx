import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin, Users, BarChart3, RefreshCw, LogOut, Filter, Download,
  UserPlus, Shield, Eye, Calendar, Clock, Navigation, CheckCircle2,
  AlertCircle, Home, X, ChevronRight, Search, Layers, Compass, Upload,
  FileSpreadsheet, Award, TrendingUp, Trophy, CheckCircle, Info, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';

import {
  fetchCloudSurveys,
  fetchEncuestadoresList,
  registerEncuestadorCloud,
  calculateResultadoVoto,
  fetchLiveEncuestadoresLocations,
  sendEncuestadorHeartbeat,
  deleteAllSurveysCloud
} from '../services/supabase';
import { exportSurveysToExcel } from '../services/excelExport';
import { CANDIDATOS, PARROQUIAS } from '../constants';
import defaultManzanasGeoJSON from '../data/manzanas_san_gabriel.json';

// Coordenadas centrales de Montúfar / San Gabriel (Carchi, Ecuador)
const MONTUFAR_CENTER = [0.5936, -77.8306];

// Mapeo exacto de colores institucional según especificación
export const COLOR_CONFIG = {
  voto_seguro:   { label: 'Voto Seguro',       color: '#10b981', border: '#059669', bgLight: '#ecfdf5', emoji: '🟢', text: '#065f46' },
  indeciso:      { label: 'Indeciso',          color: '#f59e0b', border: '#d97706', bgLight: '#fffbeb', emoji: '🟡', text: '#92400e' },
  no_vota:       { label: 'No Vota / Rechazo', color: '#ef4444', border: '#dc2626', bgLight: '#fef2f2', emoji: '🔴', text: '#991b1b' },
  nadie_en_casa: { label: 'Nadie en Casa',     color: '#64748b', border: '#cbd5e1', bgLight: '#f8fafc', emoji: '⚪', text: '#334155' },
  no_trabajable: { label: 'Zona no Trabajable', color: '#475569', border: '#94a3b8', bgLight: '#f1f5f9', emoji: '🔘', text: '#1e293b' },
};

export function AdminDashboard({ user, onLogout, onSwitchToFieldView }) {
  const [activeTab, setActiveTab] = useState('map'); // 'map' | 'stats' | 'users'
  const [surveys, setSurveys] = useState([]);
  const [encuestadores, setEncuestadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Filtros del mapa
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterEncuestador, setFilterEncuestador] = useState('all');
  const [selectedPoint, setSelectedPoint] = useState(null);

  // Filtros y búsqueda para la base de datos territorial completa de encuestas
  const [tableSearch, setTableSearch] = useState('');
  const [tableFilterStatus, setTableFilterStatus] = useState('all');
  const [tableFilterEncuestador, setTableFilterEncuestador] = useState('all');
  const [tableFilterApoyo, setTableFilterApoyo] = useState('all');

  // Modal para crear nuevo administrador o encuestador
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('admin');
  const [userModalStatus, setUserModalStatus] = useState(null);

  // Referencias de Leaflet
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const encuestadoresLayerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const geojsonLayerRef = useRef(null);
  const fileInputRef = useRef(null);

  const initialFittedRef = useRef(false);

  const [liveEncuestadores, setLiveEncuestadores] = useState([]);
  const [showEncuestadores, setShowEncuestadores] = useState(true);
  const [selectedEncuestador, setSelectedEncuestador] = useState(null);

  const [mapStyle, setMapStyle] = useState('satellite'); // Satélite de alta definición con casas visibles
  const [showManzanas, setShowManzanas] = useState(true);
  const [manzanasData, setManzanasData] = useState(() => {
    try {
      const cached = localStorage.getItem('manzanas_geojson_custom');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.features && parsed.features.length >= 292) {
          return parsed;
        }
        localStorage.removeItem('manzanas_geojson_custom');
      }
      return defaultManzanasGeoJSON;
    } catch (e) {
      return defaultManzanasGeoJSON;
    }
  });

  // Carga exclusiva desde Supabase: todos los datos provienen 100% de la nube
  const loadData = async () => {
    setLoading(true);
    // Limpiar residuos de encuestas en localStorage según especificación
    localStorage.removeItem('pending_surveys');
    localStorage.removeItem('survey_records');
    localStorage.removeItem('encuestas_offline');

    const [cloudSurveys, encList] = await Promise.all([
      fetchCloudSurveys(),
      fetchEncuestadoresList(),
    ]);

    if (Array.isArray(cloudSurveys)) {
      const mapped = cloudSurveys.map((s, idx) => {
        let lat = parseFloat(s.lat);
        let lng = parseFloat(s.lng);
        if (isNaN(lat) || isNaN(lng)) {
          lat = MONTUFAR_CENTER[0] + (Math.sin(idx) * 0.0035);
          lng = MONTUFAR_CENTER[1] + (Math.cos(idx) * 0.0035);
        }
        const resultado = s.votaria_robles || s.resultado_voto || calculateResultadoVoto(s);
        return { ...s, lat, lng, resultado_voto: resultado };
      });
      setSurveys(mapped);
    } else {
      setSurveys([]);
    }

    if (encList) {
      setEncuestadores(encList);
    }
    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    document.body.classList.add('admin-view');
    return () => {
      document.body.classList.remove('admin-view');
    };
  }, []);

  // Función para alternar entre vista satelital (con casas) y calles
  const applyTileLayer = (map, style) => {
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    if (style === 'satellite') {
      tileLayerRef.current = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google Maps &mdash; Vista Satelital de Viviendas',
        maxZoom: 22,
        maxNativeZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      }).addTo(map);
    } else {
      tileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);
    }
  };

  // Inicializar Leaflet Map (persistente, jamás se destruye al alternar pestañas)
  useEffect(() => {
    if (mapContainerRef.current && !mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        maxZoom: 22,
      }).setView(MONTUFAR_CENTER, 17);

      applyTileLayer(map, mapStyle);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      const encuestadoresGroup = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
      markersLayerRef.current = markersGroup;
      encuestadoresLayerRef.current = encuestadoresGroup;
    }

    if (activeTab === 'map' && mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 50);
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 250);
    }
  }, [activeTab]);

  // Recargar datos y refrescar marcadores al cambiar de pestaña
  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      applyTileLayer(mapInstanceRef.current, mapStyle);
    }
  }, [mapStyle]);

  // Renderizar o actualizar polígonos de manzanas censales
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (geojsonLayerRef.current) {
      mapInstanceRef.current.removeLayer(geojsonLayerRef.current);
      geojsonLayerRef.current = null;
    }

    if (showManzanas && manzanasData && manzanasData.features && manzanasData.features.length > 0) {
      const geoLayer = L.geoJSON(manzanasData, {
        style: () => ({
          color: '#dc2626',
          weight: 2.2,
          opacity: 0.95,
          fillColor: '#ef4444',
          fillOpacity: 0.08,
        }),
        onEachFeature: (feature, layer) => {
          const p = feature.properties || {};
          const manCode = p.man || p.name || 'Manzana';
          const parroquia = p.par || 'SAN GABRIEL';
          const cant = p.can || 'MONTÚFAR';

          layer.bindTooltip(`
            <div style="font-family: inherit; font-size: 11px; padding: 2px 4px; line-height: 1.3;">
              <strong style="color: #dc2626;">🏛️ Manzana: ${manCode}</strong><br/>
              <span style="color: #475569;">${parroquia} &bull; ${cant}</span>
            </div>
          `, { sticky: true });

          layer.on({
            mouseover: (e) => {
              const l = e.target;
              l.setStyle({
                color: '#ca8a04',
                weight: 3.5,
                fillOpacity: 0.22,
              });
              l.bringToFront();
            },
            mouseout: (e) => {
              if (geoLayer) {
                geoLayer.resetStyle(e.target);
              }
            },
            click: (e) => {
              const bounds = e.target.getBounds();
              mapInstanceRef.current?.fitBounds(bounds, { padding: [40, 40], maxZoom: 19 });

              L.popup()
                .setLatLng(bounds.getCenter())
                .setContent(`
                  <div style="font-family: inherit; font-size: 13px; min-width: 210px; padding: 4px;">
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                      <span style="font-size: 16px;">🏛️</span>
                      <strong style="color: #dc2626; font-size: 14px;">Manzana: ${manCode}</strong>
                    </div>
                    <div style="font-size: 12px; color: #334155; margin-bottom: 3px;">
                      📍 <strong>Parroquia:</strong> ${parroquia}
                    </div>
                    <div style="font-size: 12px; color: #334155; margin-bottom: 3px;">
                      🏙️ <strong>Cantón:</strong> ${cant} (CARCHI)
                    </div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 5px; padding-top: 4px; border-top: 1px dashed #cbd5e1;">
                      Fuente: CPV (${p.anio || '2022'}) &bull; Perímetro: ${p.Shape_Leng ? parseFloat(p.Shape_Leng).toFixed(1) + 'm' : 'N/A'}
                    </div>
                  </div>
                `)
                .openOn(mapInstanceRef.current);
            }
          });
        }
      }).addTo(mapInstanceRef.current);

      geojsonLayerRef.current = geoLayer;

      if (!initialFittedRef.current) {
        try {
          const bounds = geoLayer.getBounds();
          if (bounds.isValid()) {
            mapInstanceRef.current.fitBounds(bounds, { padding: [25, 25] });
            initialFittedRef.current = true;
          }
        } catch (err) {
          console.warn('Error ajustando límites del mapa:', err);
        }
      }
    }
  }, [showManzanas, manzanasData, activeTab]);

  const handleFitAllManzanas = () => {
    if (geojsonLayerRef.current && mapInstanceRef.current) {
      try {
        const bounds = geojsonLayerRef.current.getBounds();
        if (bounds.isValid()) {
          mapInstanceRef.current.fitBounds(bounds, { padding: [25, 25] });
          return;
        }
      } catch (e) {
        console.warn(e);
      }
    }
    mapInstanceRef.current?.setView([0.5925, -77.8220], 14);
  };

  const handleGeoJSONUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result);
        if (parsed?.type === 'FeatureCollection' && Array.isArray(parsed?.features)) {
          setManzanasData(parsed);
          try {
            localStorage.setItem('manzanas_geojson_custom', JSON.stringify(parsed));
          } catch (storageErr) {
            console.warn('GeoJSON muy grande para localStorage:', storageErr);
          }
          alert(`¡GeoJSON cargado exitosamente con ${parsed.features.length} manzanas censales!`);
        } else {
          alert('El archivo no parece ser un FeatureCollection GeoJSON válido.');
        }
      } catch (err) {
        alert('Error al leer el archivo JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Renderizar Marcadores de Visitas con Colores de Semaforización
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    const filtered = surveys.filter((s) => {
      const matchStatus = filterStatus === 'all' || s.resultado_voto === filterStatus;
      const matchEnc = filterEncuestador === 'all' || s.encuestador === filterEncuestador;
      return matchStatus && matchEnc;
    });

    const bounds = [];

    filtered.forEach((s) => {
      if (!s.lat || !s.lng) return;
      bounds.push([s.lat, s.lng]);

      const conf = COLOR_CONFIG[s.resultado_voto] || COLOR_CONFIG.indeciso;

      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: ${conf.color};
            border: 3px solid ${conf.border};
            box-shadow: 0 0 10px ${conf.color}99, 0 3px 6px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.2s ease;
          ">
            <div style="width: 6px; height: 6px; border-radius: 50%; background: ${s.resultado_voto === 'nadie_en_casa' ? '#0f172a' : '#ffffff'};"></div>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -12],
      });

      const marker = L.marker([s.lat, s.lng], { icon: customIcon });

      marker.on('click', () => {
        setSelectedPoint(s);
        mapInstanceRef.current?.flyTo([s.lat, s.lng], 19, { animate: true, duration: 0.8 });
      });

      const dateStr = s.fecha || s.ts || s.created_at || '';
      const formattedTime = dateStr
        ? new Date(dateStr).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })
        : 'Hora no disp.';
      const formattedDate = dateStr
        ? new Date(dateStr).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })
        : '';

      const personTitle = s.tipo_visita === 'nadie_en_casa'
        ? '⚪ Nadie en Domicilio'
        : s.tipo_visita === 'no_trabajable'
        ? '🔘 Zona no Trabajable'
        : s.nombre || 'Ciudadano encuestado';

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; min-width: 225px; padding: 4px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="font-size: 15px;">${conf.emoji}</span>
            <strong style="color: #0f172a; font-size: 14px;">${personTitle}</strong>
          </div>
          <div style="color: #475569; font-size: 12px; margin-bottom: 3px;">
            👤 <strong>Encuestador:</strong> ${s.encuestador || 'No asignado'}
          </div>
          <div style="color: #475569; font-size: 12px; margin-bottom: 3px;">
            🏛️ <strong>Manzana CPV:</strong> ${s.manzana || 'No registrada'}
          </div>
          <div style="color: #475569; font-size: 12px; margin-bottom: 3px;">
            🏠 <strong>Medidor / Casa:</strong> ${s.numero_medidor_casa || s.numero_casa || 'S/N'}
          </div>
          ${s.descripcion_casa ? `<div style="color: #475569; font-size: 12px; margin-bottom: 3px;">📋 <strong>Vivienda:</strong> ${s.descripcion_casa}</div>` : ''}
          ${s.apoyo_robles ? `<div style="color: #475569; font-size: 12px; margin-bottom: 3px;">🤝 <strong>¿Apoyo Robles?:</strong> ${s.apoyo_robles === 'si' ? 'Sí' : s.apoyo_robles === 'no' ? 'No' : 'Tal vez'}</div>` : ''}
          ${s.problema_prioritario ? `<div style="color: #475569; font-size: 12px; margin-bottom: 3px;">⚠️ <strong>Prioridad Municipio:</strong> ${s.problema_prioritario}</div>` : ''}
          ${s.podemos_regresar ? `<div style="color: #475569; font-size: 12px; margin-bottom: 3px;">🚶 <strong>¿Podemos regresar?:</strong> ${s.podemos_regresar === 'si' ? 'Sí' : s.podemos_regresar === 'no' ? 'No' : 'Quizás'}</div>` : ''}
          <div style="color: #475569; font-size: 12px; margin-bottom: 3px;">
            🕒 <strong>Hora:</strong> ${formattedTime} (${formattedDate})
          </div>
          <div style="color: ${conf.color}; font-weight: 800; font-size: 12px; margin-top: 6px; padding-top: 4px; border-top: 1px dashed #cbd5e1;">
            Semaforización: ${conf.label}
          </div>
        </div>
      `);

      marker.addTo(markersLayerRef.current);
    });

    if (bounds.length > 0 && mapInstanceRef.current && !initialFittedRef.current) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 });
    }
  }, [surveys, filterStatus, filterEncuestador]);

  // Sondeo periódico de la posición en tiempo real de los encuestadores
  useEffect(() => {
    let isMounted = true;
    const fetchPositions = async () => {
      const locs = await fetchLiveEncuestadoresLocations();
      if (isMounted && locs) {
        setLiveEncuestadores(locs);
      }
    };
    fetchPositions();
    const interval = setInterval(fetchPositions, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Renderizar Puntos Azules de Encuestadores en Tiempo Real
  useEffect(() => {
    if (!mapInstanceRef.current || !encuestadoresLayerRef.current) return;

    encuestadoresLayerRef.current.clearLayers();
    if (!showEncuestadores) return;

    liveEncuestadores.forEach((enc) => {
      if (!enc.lat || !enc.lng) return;

      const encIcon = L.divIcon({
        className: 'custom-enc-pin-wrapper',
        html: `
          <div class="blue-dot-marker">
            <div class="blue-dot-radar-ring"></div>
            <div class="blue-dot-radar-ring second"></div>
            <div class="blue-dot-tag">
              <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#10b981; box-shadow:0 0 6px #10b981;"></span>
              <span>${enc.nombre.split(' ')[0]}</span>
            </div>
            <div class="blue-dot-core">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -20],
      });

      const marker = L.marker([enc.lat, enc.lng], { icon: encIcon });

      marker.on('click', () => {
        setSelectedEncuestador(enc);
        mapInstanceRef.current?.flyTo([enc.lat, enc.lng], 19, { animate: true, duration: 0.8 });
      });

      const timeAgo = enc.updatedAt
        ? Math.max(0, Math.floor((Date.now() - new Date(enc.updatedAt).getTime()) / 1000))
        : 0;
      const timeStr = timeAgo < 60 ? `Hace ${timeAgo} seg` : `Hace ${Math.floor(timeAgo / 60)} min`;

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; min-width: 220px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <div style="width: 10px; height: 10px; border-radius: 50%; background: #2563eb; box-shadow: 0 0 8px #2563eb;"></div>
              <strong style="color: #1d4ed8; font-size: 14px;">${enc.nombre}</strong>
            </div>
            <span style="background: rgba(16,185,129,0.15); color: #059669; font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 6px;">
              EN VIVO
            </span>
          </div>
          <div style="font-size: 12px; color: #475569; margin-bottom: 4px;">
            📧 <strong>Email:</strong> ${enc.email}
          </div>
          <div style="font-size: 12px; color: #475569; margin-bottom: 4px;">
            ⏱️ <strong>Última señal:</strong> ${timeStr}
          </div>
          <div style="font-size: 12px; color: #475569; margin-bottom: 6px;">
            📍 <strong>GPS:</strong> ${enc.lat.toFixed(5)}, ${enc.lng.toFixed(5)}
          </div>
          <div style="font-size: 11px; color: #64748b; background: #f1f5f9; padding: 5px 8px; border-radius: 6px;">
            🛰️ Monitoreo activo de encuestador en territorio
          </div>
        </div>
      `);

      marker.addTo(encuestadoresLayerRef.current);
    });
  }, [liveEncuestadores, showEncuestadores]);

  // Manejo de creación de administradores y encuestadores
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      setUserModalStatus({ ok: false, msg: 'Completa todos los campos.' });
      return;
    }
    setUserModalStatus({ ok: true, msg: 'Creando usuario en la base de datos…' });

    const success = await registerEncuestadorCloud({
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      password: newUserPassword.trim(),
      rol: newUserRole,
    });

    if (success) {
      setUserModalStatus({ ok: true, msg: `¡${newUserRole === 'admin' ? 'Administrador' : 'Encuestador'} registrado exitosamente!` });
      setTimeout(() => {
        setShowUserModal(false);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        setUserModalStatus(null);
        loadData();
      }, 1200);
    } else {
      setUserModalStatus({ ok: false, msg: 'No se pudo crear. Verifica si el correo ya existe.' });
    }
  };

  // Contadores de visitas por estado de semaforización
  const statsCounts = {
    voto_seguro: surveys.filter((s) => (s.votaria_robles || s.resultado_voto) === 'voto_seguro').length,
    indeciso: surveys.filter((s) => (s.votaria_robles || s.resultado_voto) === 'indeciso').length,
    no_vota: surveys.filter((s) => (s.votaria_robles || s.resultado_voto) === 'no_vota').length,
    nadie_en_casa: surveys.filter((s) => (s.votaria_robles || s.resultado_voto) === 'nadie_en_casa').length,
    no_trabajable: surveys.filter((s) => (s.votaria_robles || s.resultado_voto) === 'no_trabajable').length,
  };

  // Cálculo de "Cuál va ganando" en la semaforización
  const semaforoCategories = [
    { key: 'voto_seguro', label: 'Voto Seguro', count: statsCounts.voto_seguro, conf: COLOR_CONFIG.voto_seguro },
    { key: 'indeciso', label: 'Indeciso', count: statsCounts.indeciso, conf: COLOR_CONFIG.indeciso },
    { key: 'no_vota', label: 'No Vota / Rechazo', count: statsCounts.no_vota, conf: COLOR_CONFIG.no_vota },
    { key: 'nadie_en_casa', label: 'Nadie en Casa', count: statsCounts.nadie_en_casa, conf: COLOR_CONFIG.nadie_en_casa },
    { key: 'no_trabajable', label: 'No Trabajable', count: statsCounts.no_trabajable, conf: COLOR_CONFIG.no_trabajable },
  ];

  const totalSurveys = surveys.length;
  const sortedCategories = [...semaforoCategories].sort((a, b) => b.count - a.count);
  const winningCategory = totalSurveys > 0 ? sortedCategories[0] : null;
  const winningPct = totalSurveys > 0 ? Math.round((winningCategory.count / totalSurveys) * 100) : 0;

  // Estadísticas de la nueva pregunta: ¿Contamos con su apoyo?
  const apoyoCounts = {
    si: surveys.filter((s) => s.apoyo_robles === 'si').length,
    tal_vez: surveys.filter((s) => s.apoyo_robles === 'tal_vez').length,
    no: surveys.filter((s) => s.apoyo_robles === 'no').length,
  };
  const totalApoyoRespuestas = apoyoCounts.si + apoyoCounts.tal_vez + apoyoCounts.no;

  // Estadísticas de la nueva pregunta: ¿Podemos regresar a seguirle contando la propuesta?
  const regresarCounts = {
    si: surveys.filter((s) => s.podemos_regresar === 'si').length,
    quizas: surveys.filter((s) => s.podemos_regresar === 'quizas').length,
    no: surveys.filter((s) => s.podemos_regresar === 'no').length,
  };
  const totalRegresarRespuestas = regresarCounts.si + regresarCounts.quizas + regresarCounts.no;

  // Ranking de Problemas Prioritarios para la próxima administración municipal
  const problemasPrioritariosStats = React.useMemo(() => {
    const counts = {};
    surveys.forEach((s) => {
      const p = s.problema_prioritario;
      if (p) {
        const key = p === '🏛️ Otro (especificar)' && s.problema_prioritario_otro
          ? `Otro: ${s.problema_prioritario_otro}`
          : p;
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    const totalCounted = Object.values(counts).reduce((a, b) => a + b, 0);
    return Object.entries(counts)
      .map(([problema, count]) => ({
        problema,
        count,
        pct: totalCounted > 0 ? Math.round((count / totalCounted) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [surveys]);

  // Estadísticas consolidadas por encuestador con cobertura de manzanas
  const encuestadoresStats = React.useMemo(() => {
    const list = [...encuestadores];
    // Asegurar que si un encuestador está en encuestas pero no en la lista de usuarios, también aparezca
    const registeredEmails = new Set(list.map((u) => u.email?.toLowerCase()));
    surveys.forEach((s) => {
      if (s.encuestador && !registeredEmails.has(s.encuestador.toLowerCase())) {
        registeredEmails.add(s.encuestador.toLowerCase());
        list.push({
          id: s.encuestador,
          nombre: s.encuestador,
          email: s.encuestador,
          rol: 'encuestador'
        });
      }
    });

    return list.map((e) => {
      const encSurveys = surveys.filter((s) =>
        (s.encuestador && s.encuestador.toLowerCase() === (e.nombre || '').toLowerCase()) ||
        (s.encuestador && s.encuestador.toLowerCase() === (e.email || '').toLowerCase())
      );
      const total = encSurveys.length;
      const voto_seguro = encSurveys.filter((s) => (s.votaria_robles || s.resultado_voto) === 'voto_seguro').length;
      const indeciso = encSurveys.filter((s) => (s.votaria_robles || s.resultado_voto) === 'indeciso').length;
      const no_vota = encSurveys.filter((s) => (s.votaria_robles || s.resultado_voto) === 'no_vota').length;
      const nadie_en_casa = encSurveys.filter((s) => (s.votaria_robles || s.resultado_voto) === 'nadie_en_casa').length;
      const no_trabajable = encSurveys.filter((s) => (s.votaria_robles || s.resultado_voto) === 'no_trabajable').length;
      const efectividad = total > 0 ? Math.round((voto_seguro / total) * 100) : 0;

      // Manzanas censales cubiertas por este encuestador
      const manzanas = [...new Set(encSurveys.map((s) => s.manzana).filter((m) => m && m !== 'En territorio'))];

      const isOnline = liveEncuestadores.some(
        (l) => l.email?.toLowerCase() === e.email?.toLowerCase() || l.nombre?.toLowerCase() === e.nombre?.toLowerCase()
      );

      return {
        ...e,
        total,
        voto_seguro,
        indeciso,
        no_vota,
        nadie_en_casa,
        no_trabajable,
        efectividad,
        manzanasCount: manzanas.length,
        manzanasPreview: manzanas.slice(0, 3).join(', ') + (manzanas.length > 3 ? ` (+${manzanas.length - 3})` : ''),
        isOnline
      };
    }).sort((a, b) => b.total - a.total);
  }, [encuestadores, surveys, liveEncuestadores]);

  // Filtro de búsqueda y atributos para la tabla territorial completa
  const filteredTableSurveys = React.useMemo(() => {
    const q = tableSearch.toLowerCase().trim();
    return surveys.filter((s) => {
      if (tableFilterStatus !== 'all' && (s.votaria_robles || s.resultado_voto) !== tableFilterStatus) return false;
      if (tableFilterEncuestador !== 'all' && (s.encuestador || '').toLowerCase() !== tableFilterEncuestador.toLowerCase()) return false;
      if (tableFilterApoyo !== 'all' && s.apoyo_robles !== tableFilterApoyo) return false;
      if (!q) return true;
      const nombre = (s.nombre || '').toLowerCase();
      const enc = (s.encuestador || '').toLowerCase();
      const man = (s.manzana || '').toLowerCase();
      const medidor = (s.numero_medidor_casa || s.numero_casa || '').toLowerCase();
      const desc = (s.descripcion_casa || '').toLowerCase();
      const prob = (s.problema_prioritario || '').toLowerCase();
      return nombre.includes(q) || enc.includes(q) || man.includes(q) || medidor.includes(q) || desc.includes(q) || prob.includes(q);
    });
  }, [surveys, tableSearch, tableFilterStatus, tableFilterEncuestador, tableFilterApoyo]);

  const [purging, setPurging] = useState(false);

  // Exportar Excel profesional y estructurado con tablas, analítica y diseño
  const handleExportExcel = () => {
    try {
      exportSurveysToExcel(surveys, statsCounts, encuestadoresStats);
    } catch (err) {
      console.error('Error exportando Excel:', err);
      alert('Error al generar el archivo Excel: ' + (err.message || 'Error desconocido'));
    }
  };

  // Eliminar todas las encuestas y dejar el sistema en 0 para producción
  const handlePurgeAllData = async () => {
    const confirmDelete = window.confirm(
      '⚠️ ADVERTENCIA: ¿Está seguro de eliminar TODOS los datos de las encuestas?\n\n' +
      '• Se borrarán todas las visitas, datos geográficos y respuestas registradas en Supabase.\n' +
      '• Los contadores, balances estadísticos y el mapa quedarán en 0.\n' +
      '• Esta acción es irreversible.\n\n' +
      '¿Desea continuar y purgar todo el sistema a 0?'
    );
    if (!confirmDelete) return;

    setPurging(true);
    try {
      await deleteAllSurveysCloud();
      // Limpiar por completo cualquier rastro en LocalStorage
      localStorage.removeItem('pending_surveys');
      localStorage.removeItem('survey_records');
      localStorage.removeItem('encuestas_offline');
      setSurveys([]);
      markersLayerRef.current?.clearLayers();
      setSelectedPoint(null);
      alert('✅ Todos los datos han sido eliminados de Supabase. El sistema ha quedado en 0 y listo para operar.');
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error al purgar los datos: ' + err.message);
    } finally {
      setPurging(false);
      await loadData();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#f8fafc', color: '#0f172a', overflow: 'hidden', fontFamily: 'inherit' }}>
      {/* ── TOP BAR INSTITUCIONAL (FONDO BLANCO, FORMAL Y ELEGANTE) ── */}
      <header
        style={{
          padding: '10px 16px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          zIndex: 100,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              background: '#ffffff',
              borderRadius: 10,
              padding: '4px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: '1px solid #e2e8f0',
            }}
          >
            <img
              src="/logo.png"
              alt="BRIGADA RENOVACIÓN"
              style={{
                height: 30,
                width: 'auto',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.05rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em', color: '#0f172a' }}>
                BRIGADA RENOVACIÓN (pap)
              </h1>
              <span
                style={{
                  background: '#f1f5f9',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                CENTRO DE MANDO
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0, fontWeight: 500 }}>
              Monitoreo Territorial Puerta a Puerta · San Gabriel, Montúfar
            </p>
          </div>
        </div>

        {/* Acciones principales del Admin */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* BOTÓN PURGAR TODOS LOS DATOS (RESTABLECER EN 0) */}
          <button
            onClick={handlePurgeAllData}
            disabled={purging}
            title="Eliminar todos los datos de prueba y restablecer el sistema a 0"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 38,
              padding: '0 12px',
              borderRadius: 10,
              border: '1px solid #fecaca',
              background: '#fff1f2',
              color: '#b91c1c',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: purging ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Trash2 size={14} color="#b91c1c" />
            <span className="hide-mobile">{purging ? 'Purgando…' : 'Limpiar Todo (0)'}</span>
          </button>

          {/* BOTÓN DESCARGAR EXCEL ESTRUCTURADO */}
          <button
            onClick={handleExportExcel}
            title="Descargar base estructurada en formato Excel con hojas de datos y analíticas"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              height: 38,
              padding: '0 14px',
              borderRadius: 10,
              border: 'none',
              background: '#16a34a',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(22,163,74,0.25)',
              transition: 'background 0.15s ease',
            }}
          >
            <FileSpreadsheet size={16} />
            <span>Descargar Excel (.xlsx)</span>
          </button>

          <button
            onClick={loadData}
            title="Refrescar datos en vivo desde la base central"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 38,
              padding: '0 12px',
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span className="hide-mobile">Actualizar</span>
          </button>

          <button
            onClick={() => setShowUserModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 38,
              padding: '0 12px',
              borderRadius: 10,
              border: '1px solid #0f172a',
              background: '#0f172a',
              color: '#ffffff',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <UserPlus size={14} color="#38bdf8" />
            <span className="hide-mobile">Nuevo Usuario</span>
          </button>

          <button
            onClick={onSwitchToFieldView}
            title="Ver la interfaz móvil de encuestador"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 38,
              padding: '0 10px',
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Eye size={14} />
            <span className="hide-mobile">Modo Campo</span>
          </button>

          <button
            onClick={onLogout}
            title="Cerrar sesión segura"
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* ── BARRA RESUMEN DE SEMAFORIZACIÓN Y LÍDER ACTUAL (¿CUÁL VA GANANDO?) ── */}
      <div
        style={{
          background: '#ffffff',
          padding: '8px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          overflowX: 'auto',
          flexShrink: 0,
        }}
        className="custom-scrollbar"
      >
        {/* TOTAL PUNTOS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Total Puntos:
          </span>
          <strong style={{ color: '#0f172a', fontSize: '0.95rem', fontWeight: 900 }}>
            {surveys.length}
          </strong>
        </div>

        <div style={{ width: 1, height: 20, background: '#e2e8f0' }} />

        {/* WIDGET PROMINENTE: ¿CUÁL VA GANANDO? */}
        {winningCategory && totalSurveys > 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 12px',
              borderRadius: 8,
              background: winningCategory.conf.bgLight,
              border: `1.5px solid ${winningCategory.conf.border}`,
              whiteSpace: 'nowrap',
            }}
          >
            <Trophy size={14} color={winningCategory.conf.color} />
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: winningCategory.conf.text, textTransform: 'uppercase' }}>
              Va Ganando:
            </span>
            <strong style={{ fontSize: '0.8rem', fontWeight: 900, color: winningCategory.conf.text }}>
              {winningCategory.label} ({winningPct}%)
            </strong>
          </div>
        ) : (
          <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Sin datos aún</div>
        )}

        <div style={{ width: 1, height: 20, background: '#e2e8f0' }} />

        {/* CHIPS DE SEMAFORIZACIÓN CON FILTROS */}
        <button
          onClick={() => setFilterStatus(filterStatus === 'voto_seguro' ? 'all' : 'voto_seguro')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 8,
            background: filterStatus === 'voto_seguro' ? '#10b981' : '#ecfdf5',
            border: `1.5px solid ${COLOR_CONFIG.voto_seguro.border}`,
            color: filterStatus === 'voto_seguro' ? '#ffffff' : '#065f46',
            fontSize: '0.75rem',
            fontWeight: 800,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: filterStatus === 'voto_seguro' ? '#ffffff' : '#10b981' }} />
          🟢 Seguro: {statsCounts.voto_seguro}
        </button>

        <button
          onClick={() => setFilterStatus(filterStatus === 'indeciso' ? 'all' : 'indeciso')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 8,
            background: filterStatus === 'indeciso' ? '#f59e0b' : '#fffbeb',
            border: `1.5px solid ${COLOR_CONFIG.indeciso.border}`,
            color: filterStatus === 'indeciso' ? '#ffffff' : '#92400e',
            fontSize: '0.75rem',
            fontWeight: 800,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: filterStatus === 'indeciso' ? '#ffffff' : '#f59e0b' }} />
          🟡 Indeciso: {statsCounts.indeciso}
        </button>

        <button
          onClick={() => setFilterStatus(filterStatus === 'no_vota' ? 'all' : 'no_vota')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 8,
            background: filterStatus === 'no_vota' ? '#ef4444' : '#fef2f2',
            border: `1.5px solid ${COLOR_CONFIG.no_vota.border}`,
            color: filterStatus === 'no_vota' ? '#ffffff' : '#991b1b',
            fontSize: '0.75rem',
            fontWeight: 800,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: filterStatus === 'no_vota' ? '#ffffff' : '#ef4444' }} />
          🔴 No Vota: {statsCounts.no_vota}
        </button>

        <button
          onClick={() => setFilterStatus(filterStatus === 'nadie_en_casa' ? 'all' : 'nadie_en_casa')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 8,
            background: filterStatus === 'nadie_en_casa' ? '#64748b' : '#f8fafc',
            border: '1.5px solid #cbd5e1',
            color: filterStatus === 'nadie_en_casa' ? '#ffffff' : '#334155',
            fontSize: '0.75rem',
            fontWeight: 800,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: filterStatus === 'nadie_en_casa' ? '#ffffff' : '#94a3b8' }} />
          ⚪ Nadie en Casa: {statsCounts.nadie_en_casa}
        </button>

        <button
          onClick={() => setFilterStatus(filterStatus === 'no_trabajable' ? 'all' : 'no_trabajable')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 8,
            background: filterStatus === 'no_trabajable' ? '#475569' : '#f1f5f9',
            border: '1.5px solid #94a3b8',
            color: filterStatus === 'no_trabajable' ? '#ffffff' : '#1e293b',
            fontSize: '0.75rem',
            fontWeight: 800,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: filterStatus === 'no_trabajable' ? '#ffffff' : '#64748b' }} />
          🔘 No Trabajable: {statsCounts.no_trabajable}
        </button>

        {filterStatus !== 'all' && (
          <button
            onClick={() => setFilterStatus('all')}
            style={{
              background: 'none',
              border: 'none',
              color: '#2563eb',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Quitar filtro
          </button>
        )}
      </div>

      {/* ── SELECTOR DE PESTAÑAS (FORMAL Y CLARO) ── */}
      <div style={{ display: 'flex', background: '#f8fafc', padding: '6px 20px', borderBottom: '1px solid #e2e8f0', gap: 8 }}>
        <button
          onClick={() => setActiveTab('map')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 16px',
            borderRadius: 8,
            border: activeTab === 'map' ? '1px solid #cbd5e1' : '1px solid transparent',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '0.82rem',
            background: activeTab === 'map' ? '#ffffff' : 'transparent',
            color: activeTab === 'map' ? '#0f172a' : '#64748b',
            boxShadow: activeTab === 'map' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
          }}
        >
          <Compass size={16} color={activeTab === 'map' ? '#0f172a' : '#94a3b8'} />
          <span>Mapa en Tiempo Real</span>
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 16px',
            borderRadius: 8,
            border: activeTab === 'stats' ? '1px solid #cbd5e1' : '1px solid transparent',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '0.82rem',
            background: activeTab === 'stats' ? '#ffffff' : 'transparent',
            color: activeTab === 'stats' ? '#0f172a' : '#64748b',
            boxShadow: activeTab === 'stats' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
          }}
        >
          <BarChart3 size={16} color={activeTab === 'stats' ? '#0f172a' : '#94a3b8'} />
          <span>Analíticas & Base Territorial</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 16px',
            borderRadius: 8,
            border: activeTab === 'users' ? '1px solid #cbd5e1' : '1px solid transparent',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '0.82rem',
            background: activeTab === 'users' ? '#ffffff' : 'transparent',
            color: activeTab === 'users' ? '#0f172a' : '#64748b',
            boxShadow: activeTab === 'users' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
          }}
        >
          <Users size={16} color={activeTab === 'users' ? '#0f172a' : '#94a3b8'} />
          <span>Equipo & Roles ({encuestadores.length})</span>
        </button>
      </div>

      {/* ── CUERPO PRINCIPAL DEL TAB ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex' }}>
        {/* PESTAÑA 1: MAPA EN TIEMPO REAL (PERMANECE MONTADO EN EL DOM PARA EVITAR QUE DESAPAREZCA) */}
        <div
          style={{
            display: activeTab === 'map' ? 'flex' : 'none',
            flex: 1,
            position: 'relative',
            width: '100%',
            height: '100%',
          }}
        >
            {/* Contenedor del mapa Leaflet */}
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />

            {/* Selector de encuestador flotante sobre el mapa (Fondo blanco institucional) */}
            <div
              style={{
                position: 'absolute',
                top: 14,
                left: 14,
                zIndex: 400,
                background: 'rgba(255,255,255,0.96)',
                backdropFilter: 'blur(10px)',
                border: '1px solid #cbd5e1',
                borderRadius: 10,
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              }}
            >
              <Filter size={14} color="#475569" />
              <select
                value={filterEncuestador}
                onChange={(e) => setFilterEncuestador(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#0f172a',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="all" style={{ background: '#ffffff', color: '#0f172a' }}>Todos los encuestadores</option>
                {Array.from(new Set(surveys.map((s) => s.encuestador).filter(Boolean))).map((enc) => (
                  <option key={enc} value={enc} style={{ background: '#ffffff', color: '#0f172a' }}>
                    {enc}
                  </option>
                ))}
              </select>
            </div>

            {/* Controles de Capas flotantes sobre el mapa (Fondo blanco institucional) */}
            <div
              style={{
                position: 'absolute',
                top: 14,
                right: 60,
                zIndex: 400,
                background: 'rgba(255,255,255,0.96)',
                backdropFilter: 'blur(10px)',
                border: '1px solid #cbd5e1',
                borderRadius: 10,
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              }}
            >
              {/* Botón Satélite */}
              <button
                onClick={() => setMapStyle('satellite')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  borderRadius: 6,
                  border: 'none',
                  background: mapStyle === 'satellite' ? '#dc2626' : 'transparent',
                  color: mapStyle === 'satellite' ? '#ffffff' : '#334155',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                <Home size={13} />
                <span>Casas (Satélite)</span>
              </button>

              {/* Botón Calles */}
              <button
                onClick={() => setMapStyle('streets')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  borderRadius: 6,
                  border: 'none',
                  background: mapStyle === 'streets' ? '#dc2626' : 'transparent',
                  color: mapStyle === 'streets' ? '#ffffff' : '#334155',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                <Layers size={13} />
                <span>Calles</span>
              </button>

              <div style={{ width: 1, height: 16, background: '#e2e8f0' }} />

              {/* Toggle Manzanas */}
              <button
                onClick={() => setShowManzanas(!showManzanas)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  borderRadius: 6,
                  border: `1px solid ${showManzanas ? '#dc2626' : '#cbd5e1'}`,
                  background: showManzanas ? '#fef2f2' : 'transparent',
                  color: showManzanas ? '#dc2626' : '#64748b',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: showManzanas ? '#dc2626' : '#94a3b8' }} />
                <span>Manzanas ({manzanasData?.features?.length || 292})</span>
              </button>

              {/* Toggle Encuestadores en Vivo */}
              <button
                onClick={() => setShowEncuestadores(!showEncuestadores)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  borderRadius: 6,
                  border: `1px solid ${showEncuestadores ? '#2563eb' : '#cbd5e1'}`,
                  background: showEncuestadores ? '#eff6ff' : 'transparent',
                  color: showEncuestadores ? '#2563eb' : '#64748b',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: showEncuestadores ? '#2563eb' : '#94a3b8' }} />
                <span>Encuestadores ({liveEncuestadores.length})</span>
              </button>

              <button
                onClick={handleFitAllManzanas}
                title="Enfocar todo San Gabriel y Cristóbal Colón"
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  padding: '5px 8px',
                  color: '#0f172a',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Navigation size={13} />
              </button>
            </div>

            {/* Leyenda Geográfica Inferior Izquierda (Fondo blanco formal) */}
            <div
              style={{
                position: 'absolute',
                bottom: 20,
                left: 14,
                zIndex: 400,
                background: 'rgba(255,255,255,0.96)',
                backdropFilter: 'blur(8px)',
                border: '1px solid #cbd5e1',
                borderRadius: 12,
                padding: '10px 14px',
                fontSize: '0.72rem',
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                color: '#334155',
              }}
            >
              <span style={{ fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.04em' }}>
                Semaforización & Capas
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#10b981' }} />
                <span>Verde: Voto Seguro (Dr. Fabián Robles)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#f59e0b' }} />
                <span>Amarillo: Indeciso / Por definir</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#ef4444' }} />
                <span>Rojo: No Vota / Rechazo</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#ffffff', border: '1px solid #64748b' }} />
                <span>Blanco: Nadie en Domicilio</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#475569' }} />
                <span>Plomo: No Trabajable (Sin casas)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, paddingTop: 4, borderTop: '1px dashed #cbd5e1' }}>
                <span style={{ width: 12, height: 3, background: '#dc2626', borderRadius: 2 }} />
                <span style={{ color: '#dc2626', fontWeight: 700 }}>Líneas Rojas: 292 Manzanas (CPV)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#2563eb', border: '2px solid #ffffff', boxShadow: '0 0 6px #2563eb' }} />
                <span style={{ color: '#2563eb', fontWeight: 700 }}>Punto Azul: Encuestador en vivo</span>
              </div>
            </div>

            {/* Panel de detalle de punto seleccionado al presionar en el mapa (Fondo blanco) */}
            <AnimatePresence>
              {selectedPoint && (
                <motion.div
                  initial={{ opacity: 0, y: 50, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 50, scale: 0.95 }}
                  style={{
                    position: 'absolute',
                    bottom: 24,
                    right: 14,
                    zIndex: 500,
                    width: 330,
                    maxWidth: 'calc(100% - 28px)',
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: 16,
                    padding: '16px 18px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                    color: '#0f172a',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 22 }}>{COLOR_CONFIG[selectedPoint.resultado_voto]?.emoji || '📍'}</span>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                          {selectedPoint.tipo_visita === 'nadie_en_casa'
                            ? 'Nadie en Domicilio'
                            : selectedPoint.tipo_visita === 'no_trabajable'
                            ? 'Zona No Trabajable'
                            : selectedPoint.nombre || 'Ciudadano Encuestado'}
                        </h3>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            color: COLOR_CONFIG[selectedPoint.resultado_voto]?.color || '#2563eb',
                            textTransform: 'uppercase',
                          }}
                        >
                          {COLOR_CONFIG[selectedPoint.resultado_voto]?.label}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedPoint(null)}
                      style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2 }}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.78rem', color: '#334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Users size={14} color="#2563eb" />
                      <span><strong>Encuestador:</strong> {selectedPoint.encuestador || 'No asignado'}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Clock size={14} color="#2563eb" />
                      <span>
                        <strong>Fecha / Hora:</strong>{' '}
                        {new Date(selectedPoint.fecha || selectedPoint.ts || selectedPoint.created_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}{' '}
                        ({new Date(selectedPoint.fecha || selectedPoint.ts || selectedPoint.created_at).toLocaleDateString('es-EC')})
                      </span>
                    </div>

                    {selectedPoint.manzana && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <Home size={14} color="#2563eb" />
                        <span><strong>Manzana (CPV):</strong> {selectedPoint.manzana}</span>
                      </div>
                    )}

                    {selectedPoint.numero_medidor_casa && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <MapPin size={14} color="#2563eb" />
                        <span><strong>N° Medidor / Casa:</strong> {selectedPoint.numero_medidor_casa}</span>
                      </div>
                    )}

                    {selectedPoint.descripcion_casa && (
                      <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', marginTop: 2 }}>
                        <strong style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Descripción de la Vivienda:</strong>
                        <span style={{ fontSize: '0.76rem', color: '#0f172a' }}>{selectedPoint.descripcion_casa}</span>
                      </div>
                    )}

                    {selectedPoint.apoyo_robles && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 2 }}>
                        <span style={{ fontSize: 13 }}>🤝</span>
                        <span>
                          <strong>¿Contamos con su apoyo?:</strong>{' '}
                          <strong style={{ color: selectedPoint.apoyo_robles === 'si' ? '#16a34a' : selectedPoint.apoyo_robles === 'no' ? '#dc2626' : '#d97706' }}>
                            {selectedPoint.apoyo_robles === 'si' ? 'Sí' : selectedPoint.apoyo_robles === 'no' ? 'No' : 'Tal vez / Por definir'}
                          </strong>
                        </span>
                      </div>
                    )}

                    {selectedPoint.problema_prioritario && (
                      <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', marginTop: 2 }}>
                        <strong style={{ fontSize: '0.7rem', color: '#dc2626', display: 'block' }}>Problema Prioritario Municipio:</strong>
                        <span style={{ fontSize: '0.76rem', color: '#0f172a', fontWeight: 700 }}>
                          {selectedPoint.problema_prioritario}
                          {selectedPoint.problema_prioritario_otro ? ` (${selectedPoint.problema_prioritario_otro})` : ''}
                        </span>
                      </div>
                    )}

                    {selectedPoint.podemos_regresar && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 2 }}>
                        <span style={{ fontSize: 13 }}>🚶</span>
                        <span>
                          <strong>¿Podemos regresar?:</strong>{' '}
                          <span style={{ color: selectedPoint.podemos_regresar === 'si' ? '#16a34a' : selectedPoint.podemos_regresar === 'no' ? '#dc2626' : '#d97706', fontWeight: 700 }}>
                            {selectedPoint.podemos_regresar === 'si' ? 'Sí, con gusto' : selectedPoint.podemos_regresar === 'no' ? 'No regresar' : 'Quizás más adelante'}
                          </span>
                        </span>
                      </div>
                    )}

                    {selectedPoint.problemas && (
                      <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', marginTop: 2 }}>
                        <strong style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Otras Necesidades Reportadas:</strong>
                        <span style={{ fontSize: '0.76rem', color: '#0f172a' }}>
                          {Array.isArray(selectedPoint.problemas) ? selectedPoint.problemas.join(', ') : selectedPoint.problemas}
                          {selectedPoint.problemas_otro ? ` (Otro: ${selectedPoint.problemas_otro})` : ''}
                        </span>
                      </div>
                    )}

                    <div style={{ marginTop: 4, fontSize: '0.68rem', color: '#64748b' }}>
                      GPS: {selectedPoint.lat?.toFixed?.(5) || selectedPoint.lat}, {selectedPoint.lng?.toFixed?.(5) || selectedPoint.lng}
                    </div>

                    <button
                      onClick={() => {
                        mapInstanceRef.current?.flyTo([selectedPoint.lat, selectedPoint.lng], 20, { animate: true, duration: 0.8 });
                      }}
                      style={{
                        marginTop: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '8px 12px',
                        background: '#0f172a',
                        border: 'none',
                        borderRadius: 8,
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                      }}
                    >
                      <Home size={14} />
                      <span>Ver Casa de Cerca (Zoom HD)</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
        </div>

        {/* PESTAÑA 2: ANALÍTICAS, PARTE POR ENCUESTADOR Y DESCARGA EXCEL */}
        {activeTab === 'stats' && (
          <div style={{ flex: 1, padding: 24, overflowY: 'auto', background: '#f8fafc' }} className="custom-scrollbar">
            {/* ENCABEZADO DE LA SECCIÓN ESTADÍSTICA */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                  Parte Estadístico y Balance de Terreno
                </h2>
                <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '4px 0 0' }}>
                  Consolidado general de encuestas · {surveys.length} visitas procesadas en territorio
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* BOTÓN PURGAR DATOS */}
                <button
                  onClick={handlePurgeAllData}
                  disabled={purging}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '11px 16px',
                    borderRadius: 10,
                    border: '1px solid #fecaca',
                    background: '#fff1f2',
                    color: '#b91c1c',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: purging ? 'not-allowed' : 'pointer',
                  }}
                  title="Eliminar datos de prueba y restablecer a 0"
                >
                  <Trash2 size={16} color="#b91c1c" />
                  <span>{purging ? 'Purgando…' : 'Limpiar Todo (0)'}</span>
                </button>

                {/* BOTÓN DESCARGAR EXCEL (.XLSX) */}
                <button
                  onClick={handleExportExcel}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '11px 20px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#16a34a',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(22,163,74,0.25)',
                  }}
                >
                  <FileSpreadsheet size={18} />
                  <span>Descargar Excel Completo (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* ── CARD PRINCIPAL: ¿CUÁL VA GANANDO? (SEMAFORIZACIÓN) ── */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                padding: '20px 24px',
                marginBottom: 20,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trophy size={20} color="#d97706" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                      Estado de la Semaforización: ¿Cuál va ganando?
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                      Tendencia predominante entre todos los ciudadanos visitados en Montúfar
                    </p>
                  </div>
                </div>

                {winningCategory && totalSurveys > 0 && (
                  <div
                    style={{
                      padding: '6px 14px',
                      borderRadius: 8,
                      background: winningCategory.conf.bgLight,
                      border: `1.5px solid ${winningCategory.conf.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{winningCategory.conf.emoji}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                        Líder en Territorio
                      </div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 900, color: winningCategory.conf.text }}>
                        {winningCategory.label} ({winningPct}%)
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* BARRAS DE PROGRESO DE LA SEMAFORIZACIÓN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {semaforoCategories.map((cat) => {
                  const pct = totalSurveys > 0 ? Math.round((cat.count / totalSurveys) * 100) : 0;
                  const isWinner = winningCategory?.key === cat.key && cat.count > 0;
                  return (
                    <div key={cat.key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, marginBottom: 5 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0f172a' }}>
                          <span>{cat.conf.emoji}</span>
                          <span>{cat.label}</span>
                          {isWinner && (
                            <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.65rem', fontWeight: 800, padding: '1px 6px', borderRadius: 4 }}>
                              LÍDER
                            </span>
                          )}
                        </span>
                        <span style={{ color: cat.conf.text, fontWeight: 800 }}>
                          {cat.count} votos ({pct}%)
                        </span>
                      </div>
                      <div style={{ height: 10, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: cat.conf.color,
                            borderRadius: 99,
                            transition: 'width 0.6s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── DOS CARDS DE DESGLOSE: ¿CONTAMOS CON SU APOYO? & ¿PODEMOS REGRESAR? ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 20 }}>
              {/* WIDGET 1: ¿CONTAMOS CON SU APOYO? */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 16,
                  padding: '20px 22px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 20 }}>🤝</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 900, color: '#0f172a' }}>
                      ¿Contamos con su apoyo?
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>
                      Respaldo ciudadano explícito a la candidatura del Dr. Fabián Robles
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                  <div style={{ background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase' }}>🟢 Sí Apoya</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#166534', margin: '2px 0' }}>{apoyoCounts.si}</div>
                    <div style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 700 }}>
                      {totalApoyoRespuestas > 0 ? Math.round((apoyoCounts.si / totalApoyoRespuestas) * 100) : 0}%
                    </div>
                  </div>
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>🟡 Tal vez</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#92400e', margin: '2px 0' }}>{apoyoCounts.tal_vez}</div>
                    <div style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 700 }}>
                      {totalApoyoRespuestas > 0 ? Math.round((apoyoCounts.tal_vez / totalApoyoRespuestas) * 100) : 0}%
                    </div>
                  </div>
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#b91c1c', textTransform: 'uppercase' }}>🔴 No Apoya</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#991b1b', margin: '2px 0' }}>{apoyoCounts.no}</div>
                    <div style={{ fontSize: '0.7rem', color: '#b91c1c', fontWeight: 700 }}>
                      {totalApoyoRespuestas > 0 ? Math.round((apoyoCounts.no / totalApoyoRespuestas) * 100) : 0}%
                    </div>
                  </div>
                </div>

                <div style={{ height: 8, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ height: '100%', width: `${totalApoyoRespuestas > 0 ? (apoyoCounts.si / totalApoyoRespuestas) * 100 : 0}%`, background: '#10b981' }} />
                  <div style={{ height: '100%', width: `${totalApoyoRespuestas > 0 ? (apoyoCounts.tal_vez / totalApoyoRespuestas) * 100 : 0}%`, background: '#f59e0b' }} />
                  <div style={{ height: '100%', width: `${totalApoyoRespuestas > 0 ? (apoyoCounts.no / totalApoyoRespuestas) * 100 : 0}%`, background: '#ef4444' }} />
                </div>
              </div>

              {/* WIDGET 2: ¿PODEMOS REGRESAR A SEGUIRLE CONTANDO LA PROPUESTA? */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 16,
                  padding: '20px 22px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 20 }}>🚶</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 900, color: '#0f172a' }}>
                      Disposición a Revisita Territorial
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>
                      ¿Podemos regresar a seguirle contando la propuesta del Dr. Fabián Robles?
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                  <div style={{ background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase' }}>🟢 Sí con gusto</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#166534', margin: '2px 0' }}>{regresarCounts.si}</div>
                    <div style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 700 }}>
                      {totalRegresarRespuestas > 0 ? Math.round((regresarCounts.si / totalRegresarRespuestas) * 100) : 0}%
                    </div>
                  </div>
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>🟡 Quizás</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#92400e', margin: '2px 0' }}>{regresarCounts.quizas}</div>
                    <div style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 700 }}>
                      {totalRegresarRespuestas > 0 ? Math.round((regresarCounts.quizas / totalRegresarRespuestas) * 100) : 0}%
                    </div>
                  </div>
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#b91c1c', textTransform: 'uppercase' }}>🔴 No Regresar</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#991b1b', margin: '2px 0' }}>{regresarCounts.no}</div>
                    <div style={{ fontSize: '0.7rem', color: '#b91c1c', fontWeight: 700 }}>
                      {totalRegresarRespuestas > 0 ? Math.round((regresarCounts.no / totalRegresarRespuestas) * 100) : 0}%
                    </div>
                  </div>
                </div>

                <div style={{ height: 8, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ height: '100%', width: `${totalRegresarRespuestas > 0 ? (regresarCounts.si / totalRegresarRespuestas) * 100 : 0}%`, background: '#10b981' }} />
                  <div style={{ height: '100%', width: `${totalRegresarRespuestas > 0 ? (regresarCounts.quizas / totalRegresarRespuestas) * 100 : 0}%`, background: '#f59e0b' }} />
                  <div style={{ height: '100%', width: `${totalRegresarRespuestas > 0 ? (regresarCounts.no / totalRegresarRespuestas) * 100 : 0}%`, background: '#ef4444' }} />
                </div>
              </div>
            </div>

            {/* ── CARD: RANKING DE PROBLEMAS PRIORITARIOS DEL MUNICIPIO ── */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                padding: '20px 24px',
                marginBottom: 20,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    Problema Más Importante a Atender por la Próxima Administración Municipal
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '3px 0 0' }}>
                    Prioridades directas identificadas por los ciudadanos de San Gabriel y Montúfar
                  </p>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a', background: '#f1f5f9', padding: '4px 10px', borderRadius: 8 }}>
                  {problemasPrioritariosStats.reduce((a, b) => a + b.count, 0)} respuestas registradas
                </span>
              </div>

              {problemasPrioritariosStats.length === 0 ? (
                <div style={{ padding: '16px 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                  No se han registrado respuestas sobre problemas prioritarios aún.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {problemasPrioritariosStats.map((item, idx) => (
                    <div key={item.problema}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4 }}>
                        <span style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 20, height: 20, borderRadius: 6, background: idx === 0 ? '#0f172a' : '#f1f5f9', color: idx === 0 ? '#fff' : '#64748b', fontSize: 10, fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            {idx + 1}
                          </span>
                          <span>{item.problema}</span>
                        </span>
                        <span style={{ color: '#0f172a', fontWeight: 800 }}>
                          {item.count} votos ({item.pct}%)
                        </span>
                      </div>
                      <div style={{ height: 8, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${item.pct}%`,
                            background: idx === 0 ? '#0f172a' : '#64748b',
                            borderRadius: 99,
                            transition: 'width 0.5s ease',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── PARTE ESTADÍSTICO POR ENCUESTADOR (TABLA DETALLADA) ── */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                padding: '20px 24px',
                marginBottom: 20,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    Parte Estadístico por Encuestador (Rendimiento Individual)
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '4px 0 0' }}>
                    Desglose de visitas efectivas, votos seguros, indecisos, cobertura de manzanas y efectividad
                  </p>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '12px 14px', fontWeight: 800 }}>Encuestador</th>
                      <th style={{ padding: '12px 14px', fontWeight: 800, textAlign: 'center' }}>Total</th>
                      <th style={{ padding: '12px 14px', fontWeight: 800, textAlign: 'center' }}>🟢 Voto Seguro</th>
                      <th style={{ padding: '12px 14px', fontWeight: 800, textAlign: 'center' }}>🟡 Indeciso</th>
                      <th style={{ padding: '12px 14px', fontWeight: 800, textAlign: 'center' }}>🔴 No Vota</th>
                      <th style={{ padding: '12px 14px', fontWeight: 800, textAlign: 'center' }}>⚪ Nadie Casa</th>
                      <th style={{ padding: '12px 14px', fontWeight: 800, textAlign: 'center' }}>🔘 No Trab.</th>
                      <th style={{ padding: '12px 14px', fontWeight: 800, textAlign: 'center' }}>Manzanas</th>
                      <th style={{ padding: '12px 14px', fontWeight: 800, textAlign: 'center' }}>% Respaldo</th>
                      <th style={{ padding: '12px 14px', fontWeight: 800, textAlign: 'center' }}>GPS Vivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {encuestadoresStats.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>
                          No hay registros de encuestadores aún.
                        </td>
                      </tr>
                    ) : (
                      encuestadoresStats.map((e, idx) => (
                        <tr
                          key={e.email || idx}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: idx % 2 === 0 ? '#ffffff' : '#fcfcfd',
                          }}
                        >
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>
                            <div>{e.nombre}</div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>{e.email}</div>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 900, fontSize: '0.9rem', color: '#0f172a' }}>
                            {e.total}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#15803d' }}>
                            {e.voto_seguro}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#b45309' }}>
                            {e.indeciso}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#b91c1c' }}>
                            {e.no_vota}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                            {e.nadie_en_casa}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                            {e.no_trabajable}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#0f172a', background: '#f1f5f9', padding: '2px 8px', borderRadius: 6 }}>
                              {e.manzanasCount || 0} mz
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: 6,
                                background: e.efectividad >= 50 ? '#ecfdf5' : '#fef2f2',
                                color: e.efectividad >= 50 ? '#059669' : '#dc2626',
                                fontWeight: 800,
                                fontSize: '0.78rem',
                              }}
                            >
                              {e.efectividad}%
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                color: e.isOnline ? '#2563eb' : '#94a3b8',
                              }}
                            >
                              <span
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  background: e.isOnline ? '#2563eb' : '#cbd5e1',
                                }}
                              />
                              {e.isOnline ? 'En vivo' : 'Inactivo'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── BASE DE DATOS TERRITORIAL & REGISTROS DE ENCUESTAS (TABLA EXHAUSTIVA PARA ADMIN) ── */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                padding: '20px 24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    Base de Datos Territorial & Registros de Encuestas (Vista Admin Completa)
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '3px 0 0' }}>
                    Información detallada de cada ciudadano: encuestador, manzana censal CPV, vivienda, apoyo y prioridades
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 700 }}>
                    Mostrando <strong>{filteredTableSurveys.length}</strong> de {surveys.length} visitas
                  </span>
                  <button
                    onClick={handlePurgeAllData}
                    disabled={purging}
                    title="Eliminar todos los datos de prueba y restablecer a 0"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px solid #fecaca',
                      background: '#fff1f2',
                      color: '#b91c1c',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: purging ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <Trash2 size={13} color="#b91c1c" />
                    <span>{purging ? 'Purgando…' : 'Limpiar Todo (0)'}</span>
                  </button>
                  <button
                    onClick={handleExportExcel}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px solid #16a34a',
                      background: '#ecfdf5',
                      color: '#15803d',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    <Download size={13} />
                    <span>Exportar Excel</span>
                  </button>
                </div>
              </div>

              {/* BARRA DE BÚSQUEDA Y FILTROS INTEGRADOS */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 10,
                  background: '#f8fafc',
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  marginBottom: 16,
                }}
              >
                {/* Búsqueda por texto libre */}
                <div style={{ position: 'relative', gridColumn: 'span 2' }}>
                  <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Buscar por ciudadano, encuestador, manzana, medidor o problema..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 12px 0 34px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: '0.8rem',
                      color: '#0f172a',
                      outline: 'none',
                    }}
                  />
                  {tableSearch && (
                    <button
                      onClick={() => setTableSearch('')}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Filtro por Semaforización */}
                <select
                  value={tableFilterStatus}
                  onChange={(e) => setTableFilterStatus(e.target.value)}
                  style={{
                    height: 38,
                    padding: '0 10px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '0.78rem',
                    color: '#0f172a',
                    fontWeight: 600,
                  }}
                >
                  <option value="all">Semaforización: Todas</option>
                  <option value="voto_seguro">🟢 Voto Seguro</option>
                  <option value="indeciso">🟡 Indeciso</option>
                  <option value="no_vota">🔴 No Vota / Rechazo</option>
                  <option value="nadie_en_casa">⚪ Nadie en Casa</option>
                  <option value="no_trabajable">🔘 No Trabajable</option>
                </select>

                {/* Filtro por Encuestador */}
                <select
                  value={tableFilterEncuestador}
                  onChange={(e) => setTableFilterEncuestador(e.target.value)}
                  style={{
                    height: 38,
                    padding: '0 10px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '0.78rem',
                    color: '#0f172a',
                    fontWeight: 600,
                  }}
                >
                  <option value="all">Encuestador: Todos</option>
                  {encuestadoresStats.map((e) => (
                    <option key={e.email || e.nombre} value={e.nombre}>
                      {e.nombre}
                    </option>
                  ))}
                </select>

                {/* Filtro por ¿Contamos con su apoyo? */}
                <select
                  value={tableFilterApoyo}
                  onChange={(e) => setTableFilterApoyo(e.target.value)}
                  style={{
                    height: 38,
                    padding: '0 10px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '0.78rem',
                    color: '#0f172a',
                    fontWeight: 600,
                  }}
                >
                  <option value="all">¿Apoyo?: Todos</option>
                  <option value="si">🟢 Sí apoya</option>
                  <option value="tal_vez">🟡 Tal vez</option>
                  <option value="no">🔴 No apoya</option>
                </select>
              </div>

              {/* TABLA PRINCIPAL DE REGISTROS COMPLETOS */}
              <div style={{ overflowX: 'auto', maxHeight: 600 }} className="custom-scrollbar">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '10px 12px', fontWeight: 800 }}>Estado</th>
                      <th style={{ padding: '10px 12px', fontWeight: 800 }}>Ciudadano</th>
                      <th style={{ padding: '10px 12px', fontWeight: 800 }}>Encuestador</th>
                      <th style={{ padding: '10px 12px', fontWeight: 800 }}>Manzana CPV</th>
                      <th style={{ padding: '10px 12px', fontWeight: 800 }}>Medidor / Casa</th>
                      <th style={{ padding: '10px 12px', fontWeight: 800 }}>Descripción Vivienda</th>
                      <th style={{ padding: '10px 12px', fontWeight: 800 }}>¿Apoyo Robles?</th>
                      <th style={{ padding: '10px 12px', fontWeight: 800 }}>Problema Prioritario</th>
                      <th style={{ padding: '10px 12px', fontWeight: 800 }}>¿Revisitar?</th>
                      <th style={{ padding: '10px 12px', fontWeight: 800 }}>Otras Necesidades</th>
                      <th style={{ padding: '10px 12px', fontWeight: 800 }}>Fecha / Hora</th>
                      <th style={{ padding: '10px 12px', fontWeight: 800, textAlign: 'center' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTableSurveys.length === 0 ? (
                      <tr>
                        <td colSpan={12} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
                          No se encontraron registros que coincidan con los filtros de búsqueda.
                        </td>
                      </tr>
                    ) : (
                      filteredTableSurveys.map((s, idx) => {
                        const conf = COLOR_CONFIG[s.resultado_voto] || COLOR_CONFIG.indeciso;
                        const dateStr = s.fecha || s.ts || s.created_at;
                        return (
                          <tr
                            key={s.id || idx}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                            }}
                          >
                            {/* ESTADO / SEMAFORIZACIÓN */}
                            <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  color: conf.text,
                                  background: conf.bgLight,
                                  border: `1px solid ${conf.border}`,
                                  padding: '2px 8px',
                                  borderRadius: 6,
                                  fontWeight: 800,
                                  fontSize: '0.72rem',
                                }}
                              >
                                <span>{conf.emoji}</span>
                                {conf.label}
                              </span>
                            </td>

                            {/* CIUDADANO */}
                            <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}>
                              <div>{s.nombre || (s.tipo_visita === 'nadie_en_casa' ? 'Nadie en domicilio' : s.tipo_visita === 'no_trabajable' ? 'Zona no trabajable' : 'Ciudadano')}</div>
                              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>{s.parroquia || 'Montúfar'}</div>
                            </td>

                            {/* ENCUESTADOR */}
                            <td style={{ padding: '10px 12px', color: '#0f172a', fontWeight: 700, whiteSpace: 'nowrap' }}>
                              {s.encuestador || 'No asignado'}
                            </td>

                            {/* MANZANA CPV */}
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0f172a', background: '#f1f5f9', padding: '3px 7px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.75rem' }}>
                                {s.manzana || 'S/N'}
                              </span>
                            </td>

                            {/* MEDIDOR O CASA */}
                            <td style={{ padding: '10px 12px', color: '#334155', fontWeight: 600 }}>
                              {s.numero_medidor_casa || s.numero_casa || '-'}
                            </td>

                            {/* DESCRIPCIÓN VIVIENDA */}
                            <td style={{ padding: '10px 12px', color: '#64748b', maxWidth: 180 }}>
                              <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.descripcion_casa}>
                                {s.descripcion_casa || '-'}
                              </span>
                            </td>

                            {/* ¿CONTAMOS CON SU APOYO? */}
                            <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                              {s.apoyo_robles === 'si' ? (
                                <span style={{ color: '#15803d', fontWeight: 800, background: '#ecfdf5', padding: '2px 8px', borderRadius: 6, border: '1px solid #bbf7d0', fontSize: '0.72rem' }}>
                                  🟢 Sí Apoya
                                </span>
                              ) : s.apoyo_robles === 'tal_vez' ? (
                                <span style={{ color: '#b45309', fontWeight: 800, background: '#fffbeb', padding: '2px 8px', borderRadius: 6, border: '1px solid #fde68a', fontSize: '0.72rem' }}>
                                  🟡 Tal vez
                                </span>
                              ) : s.apoyo_robles === 'no' ? (
                                <span style={{ color: '#b91c1c', fontWeight: 800, background: '#fef2f2', padding: '2px 8px', borderRadius: 6, border: '1px solid #fecaca', fontSize: '0.72rem' }}>
                                  🔴 No Apoya
                                </span>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>-</span>
                              )}
                            </td>

                            {/* PROBLEMA PRIORITARIO MUNICIPAL */}
                            <td style={{ padding: '10px 12px', color: '#0f172a', fontWeight: 600, maxWidth: 200 }}>
                              <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.problema_prioritario || ''}>
                                {s.problema_prioritario || '-'}
                              </span>
                            </td>

                            {/* ¿PODEMOS REGRESAR? */}
                            <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                              {s.podemos_regresar === 'si' ? (
                                <span style={{ color: '#15803d', fontWeight: 700, fontSize: '0.72rem' }}>🟢 Sí con gusto</span>
                              ) : s.podemos_regresar === 'quizas' ? (
                                <span style={{ color: '#b45309', fontWeight: 700, fontSize: '0.72rem' }}>🟡 Quizás</span>
                              ) : s.podemos_regresar === 'no' ? (
                                <span style={{ color: '#b91c1c', fontWeight: 700, fontSize: '0.72rem' }}>🔴 No regresar</span>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>-</span>
                              )}
                            </td>

                            {/* OTRAS NECESIDADES */}
                            <td style={{ padding: '10px 12px', color: '#64748b', maxWidth: 160 }}>
                              <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {Array.isArray(s.problemas) ? s.problemas.join(', ') : (s.problemas || '-')}
                              </span>
                            </td>

                            {/* FECHA / HORA */}
                            <td style={{ padding: '10px 12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                              {dateStr ? new Date(dateStr).toLocaleString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>

                            {/* ACCIÓN: VER EN MAPA */}
                            <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                              {s.lat && s.lng ? (
                                <button
                                  onClick={() => {
                                    setActiveTab('map');
                                    setSelectedPoint(s);
                                    setTimeout(() => {
                                      mapInstanceRef.current?.flyTo([s.lat, s.lng], 19, { animate: true, duration: 0.8 });
                                    }, 200);
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '4px 8px',
                                    borderRadius: 6,
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    color: '#0f172a',
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                  }}
                                  title="Localizar vivienda y punto en el Mapa"
                                >
                                  <MapPin size={12} color="#0f172a" />
                                  <span>Ver Mapa</span>
                                </button>
                              ) : (
                                <span style={{ color: '#cbd5e1', fontSize: '0.7rem' }}>Sin GPS</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 3: GESTIÓN DE ENCUESTADORES Y ADMINISTRADORES */}
        {activeTab === 'users' && (
          <div style={{ flex: 1, padding: 24, overflowY: 'auto', background: '#f8fafc' }} className="custom-scrollbar">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                  Equipo de Trabajo (Roles & Usuarios)
                </h2>
                <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '4px 0 0' }}>
                  Gestión centralizada de cuentas para Administradores y Brigadistas Encuestadores
                </p>
              </div>

              <button
                onClick={() => setShowUserModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#0f172a',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(15,23,42,0.2)',
                }}
              >
                <UserPlus size={16} /> Crear Administrador / Encuestador
              </button>
            </div>

            {/* Listado de usuarios */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
              {encuestadoresStats.map((u) => (
                <div
                  key={u.id || u.email}
                  style={{
                    background: '#ffffff',
                    border: `1.5px solid ${u.rol === 'admin' ? '#0f172a' : '#e2e8f0'}`,
                    borderRadius: 14,
                    padding: 18,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>{u.nombre}</h4>
                      <span style={{ fontSize: '0.76rem', color: '#64748b' }}>{u.email}</span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: u.rol === 'admin' ? '#fef2f2' : '#eff6ff',
                        color: u.rol === 'admin' ? '#dc2626' : '#2563eb',
                        border: `1px solid ${u.rol === 'admin' ? '#fecaca' : '#bfdbfe'}`,
                        textTransform: 'uppercase',
                      }}
                    >
                      {u.rol === 'admin' ? '🛡️ Administrador' : '📋 Encuestador'}
                    </span>
                  </div>

                  <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: 10, marginTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: '#64748b' }}>Visitas levantadas:</span>
                    <strong style={{ color: '#0f172a' }}>{u.total} encuestas</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginTop: 4 }}>
                    <span style={{ color: '#64748b' }}>🟢 Votos Seguros logrados:</span>
                    <strong style={{ color: '#16a34a' }}>{u.voto_seguro} ({u.efectividad}%)</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: CREAR NUEVO ADMINISTRADOR O ENCUESTADOR ── */}
      <AnimatePresence>
        {showUserModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.6)',
              backdropFilter: 'blur(8px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{
                width: 420,
                maxWidth: '100%',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 20,
                padding: '24px 28px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                color: '#0f172a',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserPlus size={18} color="#2563eb" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900 }}>Crear Usuario</h3>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>Registro oficial en la base de datos</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUserModal(false)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Rol del Usuario
                  </label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setNewUserRole('admin')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: 10,
                        border: `1.5px solid ${newUserRole === 'admin' ? '#dc2626' : '#cbd5e1'}`,
                        background: newUserRole === 'admin' ? '#fef2f2' : '#ffffff',
                        color: newUserRole === 'admin' ? '#dc2626' : '#64748b',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      🛡️ Administrador
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewUserRole('encuestador')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: 10,
                        border: `1.5px solid ${newUserRole === 'encuestador' ? '#2563eb' : '#cbd5e1'}`,
                        background: newUserRole === 'encuestador' ? '#eff6ff' : '#ffffff',
                        color: newUserRole === 'encuestador' ? '#2563eb' : '#64748b',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      📋 Encuestador
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Ing. Roberto Cadena"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1.5px solid #cbd5e1',
                      background: '#f8fafc',
                      color: '#0f172a',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="usuario@montufar.gob.ec"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1.5px solid #cbd5e1',
                      background: '#f8fafc',
                      color: '#0f172a',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Contraseña de Acceso
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1.5px solid #cbd5e1',
                      background: '#f8fafc',
                      color: '#0f172a',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>

                {userModalStatus && (
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: userModalStatus.ok ? '#ecfdf5' : '#fef2f2',
                      border: `1px solid ${userModalStatus.ok ? '#a7f3d0' : '#fecaca'}`,
                      color: userModalStatus.ok ? '#065f46' : '#991b1b',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                    }}
                  >
                    {userModalStatus.msg}
                  </div>
                )}

                <button
                  type="submit"
                  style={{
                    marginTop: 8,
                    padding: '12px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#0f172a',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                  }}
                >
                  Registrar en Base de Datos
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

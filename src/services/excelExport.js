import * as XLSX from 'xlsx';

/**
 * Genera y descarga un archivo Excel (.xlsx) estructurado profesionalmente
 * con 3 hojas: Encuestas Detalladas, Rendimiento por Encuestador y Balance de Semaforización.
 * Compatible con todos los navegadores móviles y de escritorio.
 */
export const exportSurveysToExcel = (surveys = [], statsCounts = {}, encuestadoresStats = []) => {
  try {
    const wb = XLSX.utils.book_new();

    // 1. HOJA DE ENCUESTAS DETALLADAS
    const rows = (surveys && surveys.length > 0)
      ? surveys.map((s, idx) => {
          const rawVoto = s.votaria_robles || s.resultado_voto || '';
          const labelVoto = (
            rawVoto === 'voto_seguro' ? 'Voto Seguro' :
            rawVoto === 'indeciso' ? 'Indeciso' :
            rawVoto === 'no_vota' ? 'No Vota / No Regresar' :
            rawVoto === 'nadie_en_casa' ? 'Nadie en Casa' :
            rawVoto === 'no_trabajable' ? 'No Trabajable' : 'Otro'
          );
          const semaforoIcon = (
            rawVoto === 'voto_seguro' ? '🟢 Verde (Seguro)' :
            rawVoto === 'indeciso' ? '🟡 Amarillo (Indeciso)' :
            rawVoto === 'no_vota' ? '🔴 Rojo (No Vota)' :
            rawVoto === 'nadie_en_casa' ? '⚪ Blanco (Nadie en Casa)' :
            rawVoto === 'no_trabajable' ? '🔘 Plomo (No Trabajable)' : 'Sin clasificar'
          );

          const problemasStr = Array.isArray(s.problemas)
            ? s.problemas.join(', ') + (s.problemas_otro ? ` | Otro: ${s.problemas_otro}` : '')
            : (s.problemas || s.problemas_otro || 'Ninguno reportado');

          const apoyoStr = s.apoyo_robles === 'si' ? 'Sí, contamos con su apoyo'
            : s.apoyo_robles === 'no' ? 'No apoya'
            : s.apoyo_robles === 'tal_vez' ? 'Tal vez / Por definir'
            : (s.tipo_visita === 'nadie_en_casa' ? 'Nadie en casa' : s.tipo_visita === 'no_trabajable' ? 'No trabajable' : 'N/A');

          const prioridadStr = s.problema_prioritario === '🏛️ Otro (especificar)'
            ? (s.problema_prioritario_otro ? `Otro: ${s.problema_prioritario_otro}` : 'Otro')
            : (s.problema_prioritario || 'No especificado');

          const regresarStr = s.podemos_regresar === 'si' ? 'Sí, con gusto'
            : s.podemos_regresar === 'no' ? 'No regresar (no insistir)'
            : s.podemos_regresar === 'quizas' ? 'Quizás más adelante'
            : (s.tipo_visita === 'nadie_en_casa' ? 'Nadie en casa' : s.tipo_visita === 'no_trabajable' ? 'No trabajable' : 'N/A');

          return {
            'N°': idx + 1,
            'Fecha / Hora': s.fecha || (s.ts ? new Date(s.ts).toLocaleString('es-EC') : 'N/A'),
            'Encuestador': s.encuestador || 'No asignado',
            'Ciudadano / Nombre': s.nombre || 'No registrado',
            'Manzana (CPV)': s.manzana || 'N/A',
            'N° Medidor / Casa': s.numero_medidor_casa || s.numero_casa || 'N/A',
            'Descripción de la Casa': s.descripcion_casa || 'N/A',
            '¿Contamos con su apoyo?': apoyoStr,
            'Problema Prioritario Próxima Administración': prioridadStr,
            '¿Podemos regresar a visitarle?': regresarStr,
            'Otras Necesidades del Sector': problemasStr,
            '¿Votaría por Fabián Robles?': labelVoto,
            'Semaforización': semaforoIcon,
            'Observaciones': s.observaciones || '',
            'Parroquia': s.parroquia || 'Montúfar',
            'Latitud (GPS)': s.lat || '',
            'Longitud (GPS)': s.lng || '',
            'ID de Registro': s.id || '',
          };
        })
      : [{
          'N°': 1,
          'Fecha / Hora': 'Sin registros aún',
          'Encuestador': 'N/A',
          'Ciudadano / Nombre': 'Plantilla lista para recepción de datos',
          'Manzana (CPV)': 'N/A',
          'N° Medidor / Casa': 'N/A',
          'Descripción de la Casa': 'N/A',
          '¿Contamos con su apoyo?': 'N/A',
          'Problema Prioritario Próxima Administración': 'N/A',
          '¿Podemos regresar a visitarle?': 'N/A',
          'Otras Necesidades del Sector': 'N/A',
          '¿Votaría por Fabián Robles?': 'N/A',
          'Semaforización': 'N/A',
          'Observaciones': '',
          'Parroquia': 'Montúfar',
          'Latitud (GPS)': '',
          'Longitud (GPS)': '',
          'ID de Registro': '',
        }];

    const wsEncuestas = XLSX.utils.json_to_sheet(rows);
    wsEncuestas['!cols'] = [
      { wch: 6 },  // N°
      { wch: 20 }, // Fecha
      { wch: 22 }, // Encuestador
      { wch: 26 }, // Nombre
      { wch: 18 }, // Manzana
      { wch: 20 }, // N° Medidor
      { wch: 30 }, // Desc Casa
      { wch: 24 }, // ¿Contamos con su apoyo?
      { wch: 38 }, // Problema Prioritario
      { wch: 24 }, // ¿Podemos regresar?
      { wch: 36 }, // Otras Necesidades
      { wch: 24 }, // ¿Votaría?
      { wch: 24 }, // Semaforización
      { wch: 26 }, // Observaciones
      { wch: 20 }, // Parroquia
      { wch: 15 }, // Lat
      { wch: 15 }, // Lng
      { wch: 36 }, // ID
    ];
    XLSX.utils.book_append_sheet(wb, wsEncuestas, 'Encuestas Detalladas');

    // 2. HOJA DE RENDIMIENTO POR ENCUESTADOR
    const encRows = (encuestadoresStats && encuestadoresStats.length > 0)
      ? encuestadoresStats.map((e, idx) => ({
          'N°': idx + 1,
          'Encuestador': e.nombre || 'N/A',
          'Correo Electrónico': e.email || 'N/A',
          'Total Visitas': e.total || 0,
          '🟢 Voto Seguro': e.voto_seguro || 0,
          '🟡 Indeciso': e.indeciso || 0,
          '🔴 No Vota': e.no_vota || 0,
          '⚪ Nadie en Casa': e.nadie_en_casa || 0,
          '🔘 No Trabajable': e.no_trabajable || 0,
          '% Efectividad (Voto Seguro)': `${e.efectividad || 0}%`,
          'Estado': e.isOnline ? 'En Línea (GPS)' : 'Inactivo',
        }))
      : [{ 'Aviso': 'No hay encuestadores registrados aún' }];

    const wsEnc = XLSX.utils.json_to_sheet(encRows);
    wsEnc['!cols'] = [
      { wch: 6 },
      { wch: 26 },
      { wch: 28 },
      { wch: 14 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
      { wch: 26 },
      { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, wsEnc, 'Rendimiento Encuestadores');

    // 3. HOJA DE BALANCE Y SEMAFORIZACIÓN GENERAL
    const total = surveys.length;
    const pct = (val) => (total > 0 ? ((val / total) * 100).toFixed(1) : '0.0');

    const semaforoRows = [
      { 'Categoría': '🟢 Voto Seguro', 'Total': statsCounts.voto_seguro || 0, 'Porcentaje': `${pct(statsCounts.voto_seguro || 0)}%` },
      { 'Categoría': '🟡 Indeciso / Abierto a propuestas', 'Total': statsCounts.indeciso || 0, 'Porcentaje': `${pct(statsCounts.indeciso || 0)}%` },
      { 'Categoría': '🔴 No Vota / No Regresar', 'Total': statsCounts.no_vota || 0, 'Porcentaje': `${pct(statsCounts.no_vota || 0)}%` },
      { 'Categoría': '⚪ Nadie en Domicilio', 'Total': statsCounts.nadie_en_casa || 0, 'Porcentaje': `${pct(statsCounts.nadie_en_casa || 0)}%` },
      { 'Categoría': '🔘 Zona No Trabajable (Sin Casas)', 'Total': statsCounts.no_trabajable || 0, 'Porcentaje': `${pct(statsCounts.no_trabajable || 0)}%` },
      { 'Categoría': 'TOTAL GENERAL DE VISITAS REGISTRADAS', 'Total': total, 'Porcentaje': '100.0%' },
    ];

    const wsSemaforo = XLSX.utils.json_to_sheet(semaforoRows);
    wsSemaforo['!cols'] = [{ wch: 42 }, { wch: 14 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsSemaforo, 'Balance Semaforización');

    // Descarga universal con Blob y enlace directo
    const fechaHoy = new Date().toISOString().slice(0, 10);
    const fileName = `Reporte_Oficial_Encuestas_Montufar_${fechaHoy}.xlsx`;

    try {
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return true;
    } catch (blobErr) {
      console.warn('Fallback a XLSX.writeFile:', blobErr);
      XLSX.writeFile(wb, fileName);
      return true;
    }
  } catch (error) {
    console.error('Error al exportar archivo Excel:', error);
    alert('Ocurrió un inconveniente al generar el archivo Excel: ' + (error?.message || error));
    return false;
  }
};

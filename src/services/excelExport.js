import * as XLSX from 'xlsx';

/**
 * Formatea fechas a hora local ecuatoriana legible DD/MM/AAAA HH:mm
 */
const formatLocalTime = (val) => {
  if (!val) return 'N/A';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (e) {
    return String(val);
  }
};

/**
 * Genera y descarga el reporte oficial institucional en formato Excel (.xlsx).
 * Contiene 4 hojas profesionales:
 * 1. Resumen Ejecutivo y Totales
 * 2. Base Completa de Encuestas (con links GPS a Google Maps)
 * 3. Rendimiento por Encuestador (con conteos y efectividad)
 * 4. Prioridades Ciudadanas (Ranking de problemas barriales)
 */
export const exportSurveysToExcel = (surveys = [], statsCounts = {}, encuestadoresStats = []) => {
  try {
    const wb = XLSX.utils.book_new();
    const total = surveys.length;
    const fechaReporte = formatLocalTime(new Date());

    // ════════════════════════════════════════════════════════════════════
    // HOJA 1: RESUMEN EJECUTIVO Y TOTALES
    // ════════════════════════════════════════════════════════════════════
    const pct = (val) => (total > 0 ? ((val / total) * 100).toFixed(1) : '0.0');
    const totalEfectivas = (statsCounts.voto_seguro || 0) + (statsCounts.indeciso || 0) + (statsCounts.no_vota || 0);
    const pctFavorableEfectivo = totalEfectivas > 0 ? (((statsCounts.voto_seguro || 0) / totalEfectivas) * 100).toFixed(1) : '0.0';

    const resumenRows = [
      { 'REPORTE TERRITORIAL OFICIAL': 'BRIGADA RENOVACIÓN - ALCALDÍA DE MONTÚFAR', 'VALOR / TOTAL': '', 'PORCENTAJE': '', 'OBSERVACIÓN': '' },
      { 'REPORTE TERRITORIAL OFICIAL': 'Campaña Oficial Dr. Fabián Robles', 'VALOR / TOTAL': '', 'PORCENTAJE': '', 'OBSERVACIÓN': '' },
      { 'REPORTE TERRITORIAL OFICIAL': `Fecha de Emisión: ${fechaReporte}`, 'VALOR / TOTAL': '', 'PORCENTAJE': '', 'OBSERVACIÓN': '' },
      { 'REPORTE TERRITORIAL OFICIAL': '', 'VALOR / TOTAL': '', 'PORCENTAJE': '', 'OBSERVACIÓN': '' },
      { 'REPORTE TERRITORIAL OFICIAL': '1. BALANCE GENERAL DE SEMAFORIZACIÓN', 'VALOR / TOTAL': '', 'PORCENTAJE': '', 'OBSERVACIÓN': '' },
      { 'REPORTE TERRITORIAL OFICIAL': 'VOTO SEGURO (Respaldo Firme)', 'VALOR / TOTAL': statsCounts.voto_seguro || 0, 'PORCENTAJE': `${pct(statsCounts.voto_seguro || 0)}%`, 'OBSERVACIÓN': 'Voto consolidado y favorable' },
      { 'REPORTE TERRITORIAL OFICIAL': 'INDECISO / POR DEFINIR', 'VALOR / TOTAL': statsCounts.indeciso || 0, 'PORCENTAJE': `${pct(statsCounts.indeciso || 0)}%`, 'OBSERVACIÓN': 'Requiere revisita y entrega de propuestas' },
      { 'REPORTE TERRITORIAL OFICIAL': 'NO VOTA / NO REGRESAR', 'VALOR / TOTAL': statsCounts.no_vota || 0, 'PORCENTAJE': `${pct(statsCounts.no_vota || 0)}%`, 'OBSERVACIÓN': 'Oposición o rechazo a la visita' },
      { 'REPORTE TERRITORIAL OFICIAL': 'NADIE EN DOMICILIO', 'VALOR / TOTAL': statsCounts.nadie_en_casa || 0, 'PORCENTAJE': `${pct(statsCounts.nadie_en_casa || 0)}%`, 'OBSERVACIÓN': 'Viviendas cerradas sin respuesta' },
      { 'REPORTE TERRITORIAL OFICIAL': 'ZONA NO TRABAJABLE', 'VALOR / TOTAL': statsCounts.no_trabajable || 0, 'PORCENTAJE': `${pct(statsCounts.no_trabajable || 0)}%`, 'OBSERVACIÓN': 'Predios baldíos, comercios o deshabitados' },
      { 'REPORTE TERRITORIAL OFICIAL': 'TOTAL GENERAL DE VISITAS EN TERRITORIO', 'VALOR / TOTAL': total, 'PORCENTAJE': '100.0%', 'OBSERVACIÓN': '100% registros georreferenciados' },
      { 'REPORTE TERRITORIAL OFICIAL': '', 'VALOR / TOTAL': '', 'PORCENTAJE': '', 'OBSERVACIÓN': '' },
      { 'REPORTE TERRITORIAL OFICIAL': '2. EFECTIVIDAD SOBRE CONTACTOS CIUDADANOS', 'VALOR / TOTAL': '', 'PORCENTAJE': '', 'OBSERVACIÓN': '' },
      { 'REPORTE TERRITORIAL OFICIAL': 'Total Entrevistas Efectivas (Ciudadanos contactados)', 'VALOR / TOTAL': totalEfectivas, 'PORCENTAJE': `${pct(totalEfectivas)}%`, 'OBSERVACIÓN': 'Excluye casas cerradas y zonas vacías' },
      { 'REPORTE TERRITORIAL OFICIAL': 'Porcentaje de Apoyo Favorable Efectivo', 'VALOR / TOTAL': `${pctFavorableEfectivo}%`, 'PORCENTAJE': `${pctFavorableEfectivo}%`, 'OBSERVACIÓN': 'Votos Seguros sobre total de ciudadanos atendidos' },
    ];

    const wsResumen = XLSX.utils.json_to_sheet(resumenRows);
    wsResumen['!cols'] = [
      { wch: 48 }, // Indicador
      { wch: 22 }, // Total
      { wch: 18 }, // Porcentaje
      { wch: 45 }, // Observación
    ];
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Ejecutivo');

    // ════════════════════════════════════════════════════════════════════
    // HOJA 2: BASE COMPLETA DE ENCUESTAS (DETALLE VIVIENDA A VIVIENDA)
    // ════════════════════════════════════════════════════════════════════
    const encuestasRows = (surveys && surveys.length > 0)
      ? surveys.map((s, idx) => {
          const rawVoto = s.votaria_robles || s.resultado_voto || '';
          const semaforoTexto = (
            rawVoto === 'voto_seguro' ? 'Voto Seguro' :
            rawVoto === 'indeciso' ? 'Indeciso' :
            rawVoto === 'no_vota' ? 'No Vota' :
            rawVoto === 'nadie_en_casa' ? 'Nadie en Domicilio' :
            rawVoto === 'no_trabajable' ? 'Zona No Trabajable' : 'Sin definir'
          );

          const apoyoStr = s.apoyo_robles === 'si' ? 'Sí, contamos con su apoyo'
            : s.apoyo_robles === 'no' ? 'No apoya la candidatura'
            : s.apoyo_robles === 'tal_vez' ? 'Tal vez / Por definir'
            : (s.tipo_visita === 'nadie_en_casa' ? 'Nadie en domicilio' : s.tipo_visita === 'no_trabajable' ? 'Zona no trabajable' : 'No consultado');

          const prioridadStr = s.problema_prioritario === 'Otro (especificar)'
            ? (s.problema_prioritario_otro ? `Otro: ${s.problema_prioritario_otro}` : 'Otro')
            : (s.problema_prioritario || 'No especificado');

          const regresarStr = s.podemos_regresar === 'si' ? 'Sí, con gusto puede regresar'
            : s.podemos_regresar === 'no' ? 'No regresar (no insistir)'
            : s.podemos_regresar === 'quizas' ? 'Quizás más adelante'
            : (s.tipo_visita === 'nadie_en_casa' ? 'Nadie en domicilio' : s.tipo_visita === 'no_trabajable' ? 'Zona no trabajable' : 'No consultado');

          const problemasStr = Array.isArray(s.problemas)
            ? s.problemas.join(', ') + (s.problemas_otro ? ` | Otro: ${s.problemas_otro}` : '')
            : (s.problemas || s.problemas_otro || 'Ninguna');

          const latNum = parseFloat(s.lat);
          const lngNum = parseFloat(s.lng);
          const mapsLink = (!isNaN(latNum) && !isNaN(lngNum))
            ? `https://www.google.com/maps?q=${latNum.toFixed(6)},${lngNum.toFixed(6)}`
            : 'Sin coordenadas';

          return {
            'N°': idx + 1,
            'Fecha y Hora': formatLocalTime(s.fecha || s.ts || s.created_at),
            'Encuestador': s.encuestador || 'No asignado',
            'Semaforización Oficial': semaforoTexto,
            'Vivienda / Nombre': s.nombre || 'Vivienda',
            'Manzana Censal (CPV)': s.manzana || 'S/N',
            'N° Medidor / Casa': s.numero_medidor_casa || s.numero_casa || 'S/N',
            'Descripción de la Vivienda': s.descripcion_casa || 'Sin descripción',
            '1. ¿Contamos con su apoyo?': apoyoStr,
            '2. ¿Podemos regresar?': regresarStr,
            '3. Problema Municipal Prioritario': prioridadStr,
            'Otras Necesidades del Sector': problemasStr,
            'Parroquia': s.parroquia || 'San Gabriel (Centro)',
            'Observaciones': s.observaciones || '',
            'Latitud (GPS)': latNum ? latNum.toFixed(6) : '',
            'Longitud (GPS)': lngNum ? lngNum.toFixed(6) : '',
            'Ver en Google Maps': mapsLink,
            'ID Registro': s.id || '',
          };
        })
      : [{
          'N°': 1,
          'Fecha y Hora': 'Sin registros aún',
          'Encuestador': 'N/A',
          'Semaforización Oficial': 'N/A',
          'Vivienda / Nombre': 'Plantilla lista',
          'Manzana Censal (CPV)': 'N/A',
          'N° Medidor / Casa': 'N/A',
          'Descripción de la Vivienda': 'N/A',
          '1. ¿Contamos con su apoyo?': 'N/A',
          '2. ¿Podemos regresar?': 'N/A',
          '3. Problema Municipal Prioritario': 'N/A',
          'Otras Necesidades del Sector': 'N/A',
          'Parroquia': 'Montúfar',
          'Observaciones': '',
          'Latitud (GPS)': '',
          'Longitud (GPS)': '',
          'Ver en Google Maps': '',
          'ID Registro': '',
        }];

    const wsEncuestas = XLSX.utils.json_to_sheet(encuestasRows);
    wsEncuestas['!cols'] = [
      { wch: 6 },  // N°
      { wch: 19 }, // Fecha y Hora
      { wch: 24 }, // Encuestador
      { wch: 24 }, // Semaforización Oficial
      { wch: 28 }, // Vivienda / Nombre
      { wch: 22 }, // Manzana CPV
      { wch: 20 }, // N° Medidor
      { wch: 34 }, // Descripción Vivienda
      { wch: 26 }, // ¿Contamos con su apoyo?
      { wch: 26 }, // ¿Podemos regresar?
      { wch: 40 }, // Problema Prioritario
      { wch: 38 }, // Otras Necesidades
      { wch: 22 }, // Parroquia
      { wch: 28 }, // Observaciones
      { wch: 15 }, // Latitud
      { wch: 15 }, // Longitud
      { wch: 44 }, // Google Maps Link
      { wch: 36 }, // ID Registro
    ];
    XLSX.utils.book_append_sheet(wb, wsEncuestas, 'Base Completa Encuestas');

    // ════════════════════════════════════════════════════════════════════
    // HOJA 3: RENDIMIENTO POR ENCUESTADOR
    // ════════════════════════════════════════════════════════════════════
    const encRows = (encuestadoresStats && encuestadoresStats.length > 0)
      ? encuestadoresStats.map((e, idx) => ({
          'N°': idx + 1,
          'Encuestador': e.nombre || 'N/A',
          'Correo Institucional': e.email || 'N/A',
          'Total Visitas': e.total || 0,
          'Voto Seguro': e.voto_seguro || 0,
          'Indeciso': e.indeciso || 0,
          'No Vota': e.no_vota || 0,
          'Nadie en Domicilio': e.nadie_en_casa || 0,
          'Zona No Trabajable': e.no_trabajable || 0,
          '% Efectividad Voto Seguro': `${e.efectividad || 0}%`,
          'Manzanas Cubiertas': e.manzanasCount || 0,
          'Detalle Manzanas Visitadas': e.manzanasPreview || 'S/N',
          'Estado GPS en Vivo': e.isOnline ? 'En Línea (Activo)' : 'Inactivo',
        }))
      : [{ 'Aviso': 'No hay encuestadores con visitas registradas aún' }];

    const wsEnc = XLSX.utils.json_to_sheet(encRows);
    wsEnc['!cols'] = [
      { wch: 6 },  // N°
      { wch: 26 }, // Encuestador
      { wch: 28 }, // Correo
      { wch: 16 }, // Total
      { wch: 16 }, // Voto Seguro
      { wch: 14 }, // Indeciso
      { wch: 14 }, // No Vota
      { wch: 22 }, // Nadie en Domicilio
      { wch: 22 }, // No Trabajable
      { wch: 26 }, // % Efectividad
      { wch: 20 }, // Manzanas Cubiertas
      { wch: 34 }, // Detalle Manzanas
      { wch: 20 }, // Estado GPS
    ];
    XLSX.utils.book_append_sheet(wb, wsEnc, 'Rendimiento Encuestadores');

    // ════════════════════════════════════════════════════════════════════
    // HOJA 4: PRIORIDADES CIUDADANAS (RANKING DE NECESIDADES)
    // ════════════════════════════════════════════════════════════════════
    const prioridadesMap = {};
    surveys.forEach((s) => {
      const p = s.problema_prioritario;
      if (p && p.trim() && p !== 'No especificado') {
        prioridadesMap[p] = (prioridadesMap[p] || 0) + 1;
      }
    });

    const sortedPrioridades = Object.entries(prioridadesMap)
      .map(([problema, conteo]) => ({
        problema,
        conteo,
        porcentaje: total > 0 ? ((conteo / total) * 100).toFixed(1) : '0.0',
      }))
      .sort((a, b) => b.conteo - a.conteo);

    const rankingRows = sortedPrioridades.length > 0
      ? sortedPrioridades.map((r, idx) => ({
          'Ranking': idx + 1,
          'Problema o Necesidad Prioritaria del Cantón': r.problema,
          'Votos / Menciones Ciudadanas': r.conteo,
          '% de Importancia Ciudadana': `${r.porcentaje}%`,
        }))
      : [{ 'Ranking': 1, 'Problema o Necesidad Prioritaria del Cantón': 'No hay prioridades registradas aún', 'Votos / Menciones Ciudadanas': 0, '% de Importancia Ciudadana': '0.0%' }];

    const wsPrioridades = XLSX.utils.json_to_sheet(rankingRows);
    wsPrioridades['!cols'] = [
      { wch: 10 }, // Ranking
      { wch: 55 }, // Problema
      { wch: 28 }, // Votos
      { wch: 26 }, // %
    ];
    XLSX.utils.book_append_sheet(wb, wsPrioridades, 'Prioridades Ciudadanas');

    // ════════════════════════════════════════════════════════════════════
    // DESCARGA DEL ARCHIVO EXCEL (.XLSX) GARANTIZANDO EXTENSIÓN Y NOMBRE
    // ════════════════════════════════════════════════════════════════════
    const dateStamp = new Date().toISOString().slice(0, 10);
    const fileName = `Reporte_Oficial_Brigada_Renovacion_Montufar_${dateStamp}.xlsx`;

    try {
      // Usar Data URI con Base64 para que Chrome/Windows jamás use un ID temporal y fuerce el nombre .xlsx
      const b64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
      const dataUri = 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' + b64;
      const link = document.createElement('a');
      link.href = dataUri;
      link.download = fileName;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
      }, 800);
      return true;
    } catch (writeErr) {
      console.warn('Fallback a XLSX.writeFile:', writeErr);
      XLSX.writeFile(wb, fileName);
      return true;
    }
  } catch (error) {
    console.error('Error al exportar archivo Excel:', error);
    alert('Ocurrió un inconveniente al generar el archivo Excel: ' + (error?.message || error));
    return false;
  }
};

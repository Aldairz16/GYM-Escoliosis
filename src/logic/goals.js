// Business logic — goals, weekly stats, messages
import { getDiasByRange, getEntrenamientosByRange, getSuenoByRange, getConfig } from '../db/operations.js';

export function getWeekRange(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun
    const monday = new Date(d);
    monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
        from: monday.toISOString().slice(0, 10),
        to: sunday.toISOString().slice(0, 10)
    };
}

export function getLastWeekRange(date = new Date()) {
    const d = new Date(date);
    d.setDate(d.getDate() - 7);
    return getWeekRange(d);
}

export async function getWeeklySummary(date = new Date()) {
    const { from, to } = getWeekRange(date);
    const lastWeek = getLastWeekRange(date);

    const dias = await getDiasByRange(from, to);
    const entrenamientos = await getEntrenamientosByRange(from, to);
    const suenos = await getSuenoByRange(from, to);
    const metaPasos = await getConfig('meta_pasos', 8000);
    const metaSesiones = await getConfig('meta_sesiones_semana', 3);

    // Last week data for comparison
    const diasLastWeek = await getDiasByRange(lastWeek.from, lastWeek.to);

    // Current week stats
    const pasosArr = dias.map(d => d.pasos_totales || 0).filter(p => p > 0);
    const pasosProm = pasosArr.length ? Math.round(pasosArr.reduce((a, b) => a + b, 0) / pasosArr.length) : 0;

    const dolorArr = dias.map(d => d.dolor_espalda_fin_dia).filter(d => d !== undefined && d !== null);
    const dolorProm = dolorArr.length ? (dolorArr.reduce((a, b) => a + b, 0) / dolorArr.length).toFixed(1) : null;

    const sesionesFuerza = entrenamientos.filter(e =>
        ['fuerza_tren_inferior', 'fuerza_tren_superior', 'full_body'].includes(e.tipo)
    ).length;

    const energiaArr = dias.map(d => d.energia_fin_dia).filter(d => d !== undefined && d !== null);
    const energiaProm = energiaArr.length ? (energiaArr.reduce((a, b) => a + b, 0) / energiaArr.length).toFixed(1) : null;

    const calidadSuenoArr = suenos.map(s => s.calidad_sueno).filter(c => c !== undefined && c !== null);
    const calidadSuenoProm = calidadSuenoArr.length ? (calidadSuenoArr.reduce((a, b) => a + b, 0) / calidadSuenoArr.length).toFixed(1) : null;

    // Last week pain for comparison
    const dolorLastArr = diasLastWeek.map(d => d.dolor_espalda_fin_dia).filter(d => d !== undefined && d !== null);
    const dolorLastProm = dolorLastArr.length ? (dolorLastArr.reduce((a, b) => a + b, 0) / dolorLastArr.length) : null;

    // Messages
    const messages = [];

    messages.push(`Esta semana llevas ${sesionesFuerza}/${metaSesiones} sesiones de fuerza`);

    if (dolorProm !== null && dolorLastProm !== null) {
        const diff = parseFloat(dolorProm) - dolorLastProm;
        if (diff < -0.5) {
            messages.push('🎉 Tu dolor promedio esta semana es menor que la anterior');
        } else if (diff > 0.5) {
            messages.push('⚠️ Tu dolor promedio esta semana es mayor que la anterior');
        } else {
            messages.push('Tu dolor se mantiene estable respecto a la semana anterior');
        }
    }

    if (pasosProm > 0 && pasosProm < metaPasos) {
        messages.push(`Tu promedio de pasos (${pasosProm.toLocaleString()}) está por debajo de tu meta (${metaPasos.toLocaleString()})`);
    } else if (pasosProm >= metaPasos) {
        messages.push(`🎯 ¡Estás cumpliendo tu meta de pasos!`);
    }

    return {
        from, to,
        pasosProm,
        dolorProm,
        sesionesFuerza,
        metaSesiones,
        metaPasos,
        energiaProm,
        calidadSuenoProm,
        messages,
        totalEntrenamientos: entrenamientos.length,
        diasRegistrados: dias.length
    };
}

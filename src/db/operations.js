// CRUD operations for all entities
import { getDB } from './database.js';

// ==================== Helpers ====================
export function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

export function nowTimeStr() {
    return new Date().toTimeString().slice(0, 5);
}

// ==================== DÍAS ====================
export async function getDia(fecha) {
    const db = await getDB();
    return db.get('dias', fecha);
}

export async function saveDia(dia) {
    const db = await getDB();
    return db.put('dias', dia);
}

export async function getAllDias() {
    const db = await getDB();
    return db.getAll('dias');
}

export async function getDiasByRange(from, to) {
    const db = await getDB();
    const all = await db.getAll('dias');
    return all.filter(d => d.fecha >= from && d.fecha <= to);
}

// ==================== ENTRENAMIENTOS ====================
export async function addEntrenamiento(ent) {
    const db = await getDB();
    return db.add('entrenamientos', ent);
}

export async function getEntrenamiento(id) {
    const db = await getDB();
    return db.get('entrenamientos', id);
}

export async function updateEntrenamiento(ent) {
    const db = await getDB();
    return db.put('entrenamientos', ent);
}

export async function deleteEntrenamiento(id) {
    const db = await getDB();
    // Also delete associated series
    const series = await getSeriesByEntrenamiento(id);
    const tx = db.transaction('series', 'readwrite');
    for (const s of series) {
        await tx.store.delete(s.id);
    }
    await tx.done;
    return db.delete('entrenamientos', id);
}

export async function getEntrenamientosByFecha(fecha) {
    const db = await getDB();
    return db.getAllFromIndex('entrenamientos', 'fecha', fecha);
}

export async function getAllEntrenamientos() {
    const db = await getDB();
    return db.getAll('entrenamientos');
}

export async function getEntrenamientosByRange(from, to) {
    const db = await getDB();
    const all = await db.getAll('entrenamientos');
    return all.filter(e => e.fecha >= from && e.fecha <= to);
}

// ==================== EJERCICIOS (catálogo) ====================
export async function addEjercicio(ej) {
    const db = await getDB();
    return db.add('ejercicios', ej);
}

export async function getAllEjercicios() {
    const db = await getDB();
    return db.getAll('ejercicios');
}

export async function deleteEjercicio(id) {
    const db = await getDB();
    return db.delete('ejercicios', id);
}

// ==================== SERIES ====================
export async function addSerie(serie) {
    const db = await getDB();
    return db.add('series', serie);
}

export async function getSeriesByEntrenamiento(idEntrenamiento) {
    const db = await getDB();
    return db.getAllFromIndex('series', 'id_entrenamiento', idEntrenamiento);
}

export async function updateSerie(serie) {
    const db = await getDB();
    return db.put('series', serie);
}

export async function deleteSerie(id) {
    const db = await getDB();
    return db.delete('series', id);
}

export async function getAllSeries() {
    const db = await getDB();
    return db.getAll('series');
}

// ==================== SUEÑO ====================
export async function getSueno(fechaNoche) {
    const db = await getDB();
    return db.get('sueno', fechaNoche);
}

export async function saveSueno(sueno) {
    const db = await getDB();
    return db.put('sueno', sueno);
}

export async function getAllSueno() {
    const db = await getDB();
    return db.getAll('sueno');
}

export async function getSuenoByRange(from, to) {
    const db = await getDB();
    const all = await db.getAll('sueno');
    return all.filter(s => s.fecha_noche >= from && s.fecha_noche <= to);
}

// ==================== ALIMENTACION ====================
export async function addAlimentacion(al) {
    const db = await getDB();
    return db.add('alimentacion', al);
}

export async function getAlimentacionByFecha(fecha) {
    const db = await getDB();
    return db.getAllFromIndex('alimentacion', 'fecha', fecha);
}

export async function deleteAlimentacion(id) {
    const db = await getDB();
    return db.delete('alimentacion', id);
}

export async function getAllAlimentacion() {
    const db = await getDB();
    return db.getAll('alimentacion');
}

// ==================== SUPLEMENTOS (catálogo) ====================
export async function addSuplemento(sup) {
    const db = await getDB();
    return db.add('suplementos', sup);
}

export async function getAllSupplementos() {
    const db = await getDB();
    return db.getAll('suplementos');
}

export async function deleteSuplemento(id) {
    const db = await getDB();
    return db.delete('suplementos', id);
}

// ==================== TOMAS DE SUPLEMENTO ====================
export async function addTomaSuplemento(toma) {
    const db = await getDB();
    return db.add('tomasSuplemento', toma);
}

export async function getTomasByFecha(fecha) {
    const db = await getDB();
    return db.getAllFromIndex('tomasSuplemento', 'fecha', fecha);
}

export async function deleteTomaSuplemento(id) {
    const db = await getDB();
    return db.delete('tomasSuplemento', id);
}

export async function getAllTomas() {
    const db = await getDB();
    return db.getAll('tomasSuplemento');
}

// ==================== MEDICIONES ====================
export async function saveMedicion(med) {
    const db = await getDB();
    return db.put('mediciones', med);
}

export async function getMedicion(fecha) {
    const db = await getDB();
    return db.get('mediciones', fecha);
}

export async function getAllMediciones() {
    const db = await getDB();
    return db.getAll('mediciones');
}

// ==================== NOTAS ====================
export async function addNota(nota) {
    const db = await getDB();
    return db.add('notas', nota);
}

export async function getNotasByFecha(fecha) {
    const db = await getDB();
    return db.getAllFromIndex('notas', 'fecha', fecha);
}

export async function deleteNota(id) {
    const db = await getDB();
    return db.delete('notas', id);
}

export async function getAllNotas() {
    const db = await getDB();
    return db.getAll('notas');
}

// ==================== CONFIG ====================
export async function getConfig(key, defaultValue = null) {
    const db = await getDB();
    const item = await db.get('config', key);
    return item ? item.value : defaultValue;
}

export async function setConfig(key, value) {
    const db = await getDB();
    return db.put('config', { key, value });
}

// Supabase Sync Layer — syncs IndexedDB data to Supabase
// Offline-first: always write to IndexedDB, then sync to cloud when online
import { supabase } from './supabaseClient.js';
import { getDB } from './database.js';

// Store name → Supabase table name mapping
const TABLE_MAP = {
    dias: 'dias',
    entrenamientos: 'entrenamientos',
    ejercicios: 'ejercicios',
    series: 'series',
    sueno: 'sueno',
    alimentacion: 'alimentacion',
    suplementos: 'suplementos',
    tomasSuplemento: 'tomas_suplemento',
    mediciones: 'mediciones',
    notas: 'notas',
    config: 'config'
};

// Key field for each table (used for upserts)
const KEY_MAP = {
    dias: 'fecha',
    entrenamientos: 'id',
    ejercicios: 'id',
    series: 'id',
    sueno: 'fecha_noche',
    alimentacion: 'id',
    suplementos: 'id',
    tomasSuplemento: 'id',
    mediciones: 'fecha',
    notas: 'id',
    config: 'key'
};

// Check if online
function isOnline() {
    return navigator.onLine;
}

// ==================== SYNC TO SUPABASE ====================

// Upload a single record to Supabase
export async function syncRecord(storeName, record) {
    if (!isOnline()) return;

    const tableName = TABLE_MAP[storeName];
    if (!tableName) return;

    try {
        // Clean record for Supabase (convert camelCase to snake_case where needed)
        const cleanRecord = prepareForSupabase(storeName, record);
        const keyField = KEY_MAP[storeName];

        const { error } = await supabase
            .from(tableName)
            .upsert(cleanRecord, { onConflict: keyField });

        if (error) {
            console.warn(`Sync error for ${tableName}:`, error.message);
        }
    } catch (e) {
        console.warn(`Sync failed for ${tableName}:`, e.message);
    }
}

// Delete a record from Supabase
export async function syncDelete(storeName, key) {
    if (!isOnline()) return;

    const tableName = TABLE_MAP[storeName];
    if (!tableName) return;

    try {
        const keyField = KEY_MAP[storeName];
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq(keyField, key);

        if (error) {
            console.warn(`Sync delete error for ${tableName}:`, error.message);
        }
    } catch (e) {
        console.warn(`Sync delete failed for ${tableName}:`, e.message);
    }
}

// Full sync — push all local data to Supabase
export async function pushAllToSupabase() {
    if (!isOnline()) throw new Error('Sin conexión a internet');

    const db = await getDB();
    const results = {};

    for (const [storeName, tableName] of Object.entries(TABLE_MAP)) {
        try {
            const localData = await db.getAll(storeName);
            if (localData.length === 0) {
                results[tableName] = { count: 0, status: 'empty' };
                continue;
            }

            const cleanData = localData.map(r => prepareForSupabase(storeName, r));

            const { error } = await supabase
                .from(tableName)
                .upsert(cleanData, { onConflict: KEY_MAP[storeName], ignoreDuplicates: false });

            if (error) {
                results[tableName] = { count: localData.length, status: 'error', message: error.message };
            } else {
                results[tableName] = { count: localData.length, status: 'ok' };
            }
        } catch (e) {
            results[tableName] = { count: 0, status: 'error', message: e.message };
        }
    }

    return results;
}

// Pull all data from Supabase to local IndexedDB
export async function pullFromSupabase() {
    if (!isOnline()) throw new Error('Sin conexión a internet');

    const db = await getDB();
    const results = {};

    for (const [storeName, tableName] of Object.entries(TABLE_MAP)) {
        try {
            const { data, error } = await supabase
                .from(tableName)
                .select('*');

            if (error) {
                results[tableName] = { status: 'error', message: error.message };
                continue;
            }

            if (data && data.length > 0) {
                const tx = db.transaction(storeName, 'readwrite');
                const localData = data.map(r => prepareForLocal(storeName, r));
                for (const record of localData) {
                    await tx.store.put(record);
                }
                await tx.done;
                results[tableName] = { count: data.length, status: 'ok' };
            } else {
                results[tableName] = { count: 0, status: 'empty' };
            }
        } catch (e) {
            results[tableName] = { status: 'error', message: e.message };
        }
    }

    return results;
}

// ==================== DATA TRANSFORMATION ====================

function prepareForSupabase(storeName, record) {
    const clean = { ...record };

    // Remove IndexedDB auto-increment id for tables that use serial IDs
    // (Supabase will auto-assign them)
    if (['entrenamientos', 'series', 'alimentacion', 'notas'].includes(storeName)) {
        // For auto-increment tables, keep the id if it exists (for updates)
        // but Supabase uses serial, so we need to be careful
    }

    // Convert camelCase fields to snake_case for specific stores
    if (storeName === 'tomasSuplemento') {
        return {
            id: clean.id,
            fecha: clean.fecha,
            id_suplemento: clean.id_suplemento,
            nombre_suplemento: clean.nombre_suplemento,
            hora: clean.hora,
            con_comida: clean.con_comida || 'sin_comida'
        };
    }

    if (storeName === 'dias') {
        return {
            fecha: clean.fecha,
            pasos_totales: clean.pasos_totales || 0,
            minutos_caminata: clean.minutos_caminata || 0,
            horas_sentado: clean.horas_sentado,
            dolor_espalda_fin_dia: clean.dolor_espalda_fin_dia,
            energia_fin_dia: clean.energia_fin_dia,
            notas_generales: clean.notas_generales,
            bloques_caminata: clean.bloques_caminata ? JSON.stringify(clean.bloques_caminata) : '[]'
        };
    }

    if (storeName === 'sueno') {
        return {
            fecha_noche: clean.fecha_noche,
            hora_acostarse: clean.hora_acostarse,
            hora_dormirse: clean.hora_dormirse,
            hora_despertar: clean.hora_despertar,
            calidad_sueno: clean.calidad_sueno,
            uso_melatonina: clean.uso_melatonina || false,
            dosis_melatonina_mg: clean.dosis_melatonina_mg || 0
        };
    }

    if (storeName === 'mediciones') {
        return {
            fecha: clean.fecha,
            peso_kg: clean.peso_kg,
            cintura_cm: clean.cintura_cm,
            cadera_cm: clean.cadera_cm,
            notas: clean.notas
        };
    }

    if (storeName === 'config') {
        return {
            key: clean.key,
            value: typeof clean.value === 'object' ? clean.value : JSON.stringify(clean.value)
        };
    }

    return clean;
}

function prepareForLocal(storeName, record) {
    const clean = { ...record };

    // Remove Supabase metadata
    delete clean.created_at;
    delete clean.updated_at;

    // Parse JSON fields
    if (storeName === 'dias' && typeof clean.bloques_caminata === 'string') {
        try { clean.bloques_caminata = JSON.parse(clean.bloques_caminata); } catch (e) { clean.bloques_caminata = []; }
    }

    if (storeName === 'config' && typeof clean.value === 'string') {
        try { clean.value = JSON.parse(clean.value); } catch (e) { /* keep as is */ }
    }

    return clean;
}

// ==================== AUTO SYNC ON ONLINE ====================

let syncListenerAdded = false;

export function enableAutoSync() {
    if (syncListenerAdded) return;
    syncListenerAdded = true;

    window.addEventListener('online', async () => {
        console.log('Back online — syncing to Supabase...');
        try {
            await pushAllToSupabase();
            console.log('Sync completed');
        } catch (e) {
            console.warn('Auto-sync failed:', e.message);
        }
    });
}

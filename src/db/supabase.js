// Supabase CRUD operations
import { supabase } from './supabaseClient.js';

// ==================== Auth helpers ====================
export async function getUser() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
}

export async function getUserId() {
    const user = await getUser();
    return user?.id || null;
}

// ==================== Exercises ====================
export async function getExercises(categoria = null) {
    let q = supabase.from('exercises').select('*').order('nombre');
    if (categoria) q = q.eq('categoria', categoria);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
}

export async function createExercise(ex) {
    const uid = await getUserId();
    const { data, error } = await supabase.from('exercises')
        .insert({ ...ex, user_id: uid }).select().single();
    if (error) throw error;
    return data;
}

export async function updateExercise(id, updates) {
    const { data, error } = await supabase.from('exercises')
        .update(updates).eq('id', id).select();
    if (error) throw error;
    return data?.[0] || null;
}

export async function uploadExerciseImage(exerciseId, file, existingImages = []) {
    if (existingImages.length >= 4) throw new Error('Máximo 4 imágenes por ejercicio');
    const mimeToExt = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/heic': 'heic' };
    const ext = mimeToExt[file.type] || file.name?.split('.').pop() || 'jpg';
    const path = `exercises/${exerciseId}_${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('ejercicios')
        .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
    if (upErr) throw upErr;
    const { data: { publicUrl } } = supabase.storage.from('ejercicios').getPublicUrl(path);
    const updated = [...existingImages, publicUrl];
    const jsonStr = JSON.stringify(updated);
    try {
        await supabase.from('exercises').update({ url_imagen: jsonStr }).eq('id', exerciseId);
    } catch (e) { /* RLS may block on globals */ }
    return updated;
}

// Parse url_imagen: handles both old single-URL strings and new JSON arrays
export function parseExerciseImages(urlImagen) {
    if (!urlImagen) return [];
    try {
        const parsed = JSON.parse(urlImagen);
        if (Array.isArray(parsed)) return parsed;
        return [String(parsed)];
    } catch (e) {
        return urlImagen ? [urlImagen] : []; // old format: plain URL string
    }
}

export async function deleteExerciseImage(exerciseId, imageUrl, existingImages) {
    const updated = existingImages.filter(u => u !== imageUrl);
    const jsonStr = updated.length > 0 ? JSON.stringify(updated) : null;
    try {
        await supabase.from('exercises').update({ url_imagen: jsonStr }).eq('id', exerciseId);
    } catch (e) { /* RLS */ }
    return updated;
}

// ==================== Workout Sessions ====================
export async function createSession(session) {
    const uid = await getUserId();
    const { data, error } = await supabase.from('workout_sessions')
        .insert({ ...session, user_id: uid }).select().single();
    if (error) throw error;
    return data;
}

export async function updateSession(id, updates) {
    const { data, error } = await supabase.from('workout_sessions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id).select().single();
    if (error) throw error;
    return data;
}

export async function getSession(id) {
    const { data, error } = await supabase.from('workout_sessions')
        .select('*').eq('id', id).single();
    if (error) throw error;
    return data;
}

export async function getSessions(from, to) {
    let q = supabase.from('workout_sessions')
        .select('*').order('fecha', { ascending: false });
    if (from) q = q.gte('fecha', from);
    if (to) q = q.lte('fecha', to);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
}

export async function deleteSession(id) {
    const { error } = await supabase.from('workout_sessions').delete().eq('id', id);
    if (error) throw error;
}

export async function getSessionDates(year, month) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = `${year}-${String(month).padStart(2, '0')}-31`;
    const { data, error } = await supabase.from('workout_sessions')
        .select('fecha').gte('fecha', start).lte('fecha', end);
    if (error) throw error;
    return (data || []).map(d => d.fecha);
}

export async function getWeekSessionCount() {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    const start = monday.toISOString().split('T')[0];
    const { data, error } = await supabase.from('workout_sessions')
        .select('id').gte('fecha', start).eq('completada', true);
    if (error) return 0;
    return data?.length || 0;
}

export async function getLastSession() {
    const { data, error } = await supabase.from('workout_sessions')
        .select('*').eq('completada', true).order('fecha', { ascending: false }).limit(1).single();
    if (error) return null;
    return data;
}

// ==================== Workout Sets ====================
export async function addSet(set) {
    const { data, error } = await supabase.from('workout_sets')
        .insert(set).select().single();
    if (error) throw error;
    return data;
}

export async function addSetsBulk(setsArr) {
    if (!setsArr || setsArr.length === 0) return [];
    const { data, error } = await supabase.from('workout_sets')
        .insert(setsArr).select();
    if (error) throw error;
    return data || [];
}

export async function updateSet(id, updates) {
    const { data, error } = await supabase.from('workout_sets')
        .update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
}

export async function deleteSet(id) {
    const { error } = await supabase.from('workout_sets').delete().eq('id', id);
    if (error) throw error;
}

export async function getSessionSets(sessionId) {
    const { data, error } = await supabase.from('workout_sets')
        .select('*').eq('session_id', sessionId).order('exercise_id').order('numero_serie');
    if (error) throw error;
    return data || [];
}

export async function getLastWeight(exerciseId) {
    const { data, error } = await supabase.from('workout_sets')
        .select('peso_kg')
        .eq('exercise_id', exerciseId)
        .gt('peso_kg', 0)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
    if (error) return 0;
    return data?.peso_kg || 0;
}

export async function getLastSet(exerciseId) {
    const { data, error } = await supabase.from('workout_sets')
        .select('peso_kg, repeticiones, duracion_seg')
        .eq('exercise_id', exerciseId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
    if (error) return null;
    return data;
}

export async function getMaxWeight(exerciseId) {
    const { data, error } = await supabase.from('workout_sets')
        .select('peso_kg')
        .eq('exercise_id', exerciseId)
        .order('peso_kg', { ascending: false })
        .limit(1)
        .single();
    if (error) return 0;
    return data?.peso_kg || 0;
}

// ==================== Routines ====================
export async function getRoutines() {
    const { data, error } = await supabase.from('routines')
        .select('*').order('nombre');
    if (error) throw error;
    return data || [];
}

export async function getRoutine(id) {
    const { data, error } = await supabase.from('routines')
        .select('*').eq('id', id).single();
    if (error) throw error;
    return data;
}

export async function createRoutine(routine) {
    const uid = await getUserId();
    const { data, error } = await supabase.from('routines')
        .insert({ ...routine, user_id: uid }).select().single();
    if (error) throw error;
    return data;
}

export async function updateRoutine(id, updates) {
    const { data, error } = await supabase.from('routines')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id).select().single();
    if (error) throw error;
    return data;
}

export async function deleteRoutine(id) {
    const { error } = await supabase.from('routines').delete().eq('id', id);
    if (error) throw error;
}

export async function getRoutineExercises(routineId) {
    const { data, error } = await supabase.from('routine_exercises')
        .select('*, exercises(*)').eq('routine_id', routineId).order('orden');
    if (error) throw error;
    return data || [];
}

export async function setRoutineExercises(routineId, exercises) {
    await supabase.from('routine_exercises').delete().eq('routine_id', routineId);
    if (exercises.length === 0) return;
    const rows = exercises.map((ex, i) => ({
        routine_id: routineId, exercise_id: ex.exercise_id,
        orden: i, series_sugeridas: ex.series_sugeridas || 3,
        reps_sugeridas: ex.reps_sugeridas || 10,
        peso_objetivo_kg: ex.peso_objetivo_kg || null,
        duracion_objetivo_seg: ex.duracion_objetivo_seg || null,
        descanso_seg: ex.descanso_seg || null,
        notas: ex.notas || null
    }));
    const { error } = await supabase.from('routine_exercises').insert(rows);
    if (error) throw error;
}

// ==================== Daily Logs ====================
export async function getDailyLog(fecha) {
    const uid = await getUserId();
    const { data, error } = await supabase.from('daily_logs')
        .select('*').eq('user_id', uid).eq('fecha', fecha).single();
    if (error) return null;
    return data;
}

export async function saveDailyLog(log) {
    const uid = await getUserId();
    const { data, error } = await supabase.from('daily_logs')
        .upsert({ ...log, user_id: uid }, { onConflict: 'user_id,fecha' }).select().single();
    if (error) throw error;
    return data;
}

export async function deleteDailyLog(fecha) {
    const uid = await getUserId();
    const { error } = await supabase.from('daily_logs')
        .delete().eq('user_id', uid).eq('fecha', fecha);
    if (error) throw error;
}

export async function getDailyLogs(from, to) {
    const uid = await getUserId();
    let q = supabase.from('daily_logs').select('*').eq('user_id', uid).order('fecha', { ascending: false });
    if (from) q = q.gte('fecha', from);
    if (to) q = q.lte('fecha', to);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
}

// ==================== Body Measurements ====================
export async function saveMeasurement(m) {
    const uid = await getUserId();
    const { data, error } = await supabase.from('body_measurements')
        .upsert({ ...m, user_id: uid }, { onConflict: 'user_id,fecha' }).select().single();
    if (error) throw error;
    return data;
}

export async function getMeasurements(limit = 30) {
    const uid = await getUserId();
    const { data, error } = await supabase.from('body_measurements')
        .select('*').eq('user_id', uid).order('fecha', { ascending: false }).limit(limit);
    if (error) throw error;
    return data || [];
}

// ==================== Supplement Logs ====================
export async function addSupplementLog(log) {
    const uid = await getUserId();
    const { data, error } = await supabase.from('supplement_logs')
        .insert({ ...log, user_id: uid }).select().single();
    if (error) throw error;
    return data;
}

export async function getSupplementLogs(fecha) {
    const uid = await getUserId();
    const { data, error } = await supabase.from('supplement_logs')
        .select('*').eq('user_id', uid).eq('fecha', fecha).order('hora');
    if (error) throw error;
    return data || [];
}

// ==================== User Config ====================
export async function getConfig(key, defaultValue = null) {
    const uid = await getUserId();
    if (!uid) return defaultValue;
    const { data, error } = await supabase.from('user_config')
        .select('value').eq('key', key).eq('user_id', uid).single();
    if (error || !data) return defaultValue;
    return data.value;
}

export async function setConfig(key, value) {
    const uid = await getUserId();
    const { error } = await supabase.from('user_config')
        .upsert({ key, user_id: uid, value, updated_at: new Date().toISOString() },
            { onConflict: 'key,user_id' });
    if (error) throw error;
}

// ==================== Export ====================
export async function exportData(from, to) {
    const uid = await getUserId();
    const range = (q) => {
        if (from) q = q.gte('fecha', from);
        if (to) q = q.lte('fecha', to);
        return q;
    };
    const [sessions, sets_raw, daily, measurements, supplements] = await Promise.all([
        range(supabase.from('workout_sessions').select('*').eq('user_id', uid).order('fecha')).then(r => r.data || []),
        range(supabase.from('workout_sets').select('*, workout_sessions!inner(user_id,fecha)').eq('workout_sessions.user_id', uid)).then(r => r.data || []),
        range(supabase.from('daily_logs').select('*').eq('user_id', uid).order('fecha')).then(r => r.data || []),
        range(supabase.from('body_measurements').select('*').eq('user_id', uid).order('fecha')).then(r => r.data || []),
        supabase.from('supplement_logs').select('*').eq('user_id', uid).order('fecha').then(r => r.data || []),
    ]);

    // Re-sort sets manually by session_id/created_at if needed, since inner join ordering can be tricky
    const sets = sets_raw.sort((a, b) => a.session_id.localeCompare(b.session_id) || a.numero_serie - b.numero_serie);
    return { sessions, sets, daily, measurements, supplements };
}

export function toCSV(data, columns) {
    if (!data.length) return '';
    const header = columns.join(',');
    const rows = data.map(r => columns.map(c => {
        const v = r[c];
        if (v === null || v === undefined) return '';
        const s = String(v).replace(/"/g, '""');
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
    }).join(','));
    return [header, ...rows].join('\n');
}

export function downloadFile(content, filename, mime = 'text/csv') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

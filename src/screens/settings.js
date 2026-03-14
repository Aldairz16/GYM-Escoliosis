// Settings Screen
import { getConfig, setConfig, exportData, toCSV, downloadFile } from '../db/supabase.js';
import { supabase } from '../db/supabaseClient.js';
import { showToast, createInput, today } from '../components/ui.js';
import { navigate } from '../router.js';

export async function renderSettings() {
    const s = document.createElement('div');
    s.className = 'screen';
    s.innerHTML = `<h1 class="screen-title">Configuración</h1><p class="screen-subtitle">Perfil, metas y datos</p>`;

    // Profile
    const user = await getConfig('usuario', { nombre: '', fecha_nacimiento: '', altura_cm: 0, peso_inicial_kg: 0 });
    const profileCard = document.createElement('div');
    profileCard.className = 'card';
    profileCard.innerHTML = '<h3 class="section-title">👤 Perfil</h3>';
    profileCard.appendChild(createInput({ label: 'Nombre', id: 'cfg-nombre', value: user.nombre }));
    profileCard.appendChild(createInput({ label: 'Fecha de nacimiento', type: 'date', id: 'cfg-nac', value: user.fecha_nacimiento }));
    profileCard.appendChild(createInput({ label: 'Altura (cm)', type: 'number', id: 'cfg-alt', value: user.altura_cm || '', min: 0 }));
    profileCard.appendChild(createInput({ label: 'Peso inicial (kg)', type: 'number', id: 'cfg-peso', value: user.peso_inicial_kg || '', min: 0, step: '0.1' }));
    const saveProfile = document.createElement('button');
    saveProfile.className = 'btn btn-primary btn-block';
    saveProfile.textContent = '💾 Guardar Perfil';
    saveProfile.onclick = async () => {
        await setConfig('usuario', {
            nombre: s.querySelector('#cfg-nombre').value,
            fecha_nacimiento: s.querySelector('#cfg-nac').value,
            altura_cm: parseFloat(s.querySelector('#cfg-alt').value) || 0,
            peso_inicial_kg: parseFloat(s.querySelector('#cfg-peso').value) || 0,
        });
        showToast('✅ Perfil guardado');
    };
    profileCard.appendChild(saveProfile);
    s.appendChild(profileCard);

    // Goals
    const metaSesiones = await getConfig('meta_sesiones', 3);
    const restDefault = await getConfig('rest_timer', 60);
    const soundUrl = await getConfig('rest_timer_sound_url', 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    const goalsCard = document.createElement('div');
    goalsCard.className = 'card';
    goalsCard.innerHTML = '<h3 class="section-title">🎯 Metas y Timers</h3>';
    goalsCard.appendChild(createInput({ label: 'Sesiones de fuerza / semana', type: 'number', id: 'cfg-sesiones', value: metaSesiones, min: 1, max: 7 }));
    goalsCard.appendChild(createInput({ label: 'Descanso entre series (seg)', type: 'number', id: 'cfg-rest', value: restDefault, min: 10, step: '5' }));

    // Audio options
    const audioGrp = document.createElement('div');
    audioGrp.className = 'input-group mb-md';
    audioGrp.innerHTML = `
        <label class="input-label">Sonido de descanso</label>
        <select class="input mb-sm" id="cfg-sound-sel">
            <option value="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3">Campana (Por defecto)</option>
            <option value="https://assets.mixkit.co/active_storage/sfx/1000/1000-preview.mp3">Notificación corta</option>
            <option value="custom">URL Personalizada / Subir</option>
        </select>
        <input type="text" class="input" id="cfg-sound-custom" value="${soundUrl}" placeholder="https://..." style="display:none">
        <button class="btn btn-sm btn-ghost mt-xs" id="cfg-sound-test">▶ Probar Sonido</button>
    `;

    const sel = audioGrp.querySelector('#cfg-sound-sel');
    const cus = audioGrp.querySelector('#cfg-sound-custom');

    // Set initial select state based on current config URL
    const isCustom = !Array.from(sel.options).slice(0, 2).some(o => o.value === soundUrl);
    if (isCustom) {
        sel.value = 'custom';
        cus.style.display = 'block';
    } else {
        sel.value = soundUrl;
    }

    sel.onchange = () => {
        if (sel.value === 'custom') {
            cus.style.display = 'block';
            cus.focus();
        } else {
            cus.style.display = 'none';
            cus.value = sel.value;
        }
    };

    audioGrp.querySelector('#cfg-sound-test').onclick = () => {
        const urlToPlay = sel.value === 'custom' ? cus.value : sel.value;
        if (!urlToPlay) return showToast('Coloca una URL válida');
        const audio = new Audio(urlToPlay);
        audio.play().catch(() => showToast('Error al reproducir el sonido'));
    };
    goalsCard.appendChild(audioGrp);

    const saveGoals = document.createElement('button');
    saveGoals.className = 'btn btn-primary btn-block';
    saveGoals.textContent = '💾 Guardar';
    saveGoals.onclick = async () => {
        await setConfig('meta_sesiones', parseInt(s.querySelector('#cfg-sesiones').value) || 3);
        await setConfig('rest_timer', parseInt(s.querySelector('#cfg-rest').value) || 60);
        const finalSound = s.querySelector('#cfg-sound-sel').value === 'custom' ? s.querySelector('#cfg-sound-custom').value : s.querySelector('#cfg-sound-sel').value;
        await setConfig('rest_timer_sound_url', finalSound);
        showToast('✅ Metas actualizadas');
    };
    goalsCard.appendChild(saveGoals);
    s.appendChild(goalsCard);

    // Theme toggle
    const themeCard = document.createElement('div');
    themeCard.className = 'card';
    themeCard.innerHTML = '<h3 class="section-title">🎨 Tema</h3>';
    const themeRow = document.createElement('div');
    themeRow.className = 'toggle-row';
    const currentTheme = document.documentElement.dataset.theme || 'dark';
    themeRow.innerHTML = `<span class="input-label">Modo claro</span><label class="toggle"><input type="checkbox" id="theme-toggle" ${currentTheme === 'light' ? 'checked' : ''}><span class="toggle-track"></span></label>`;
    themeRow.querySelector('#theme-toggle').onchange = async e => {
        const theme = e.target.checked ? 'light' : 'dark';
        document.documentElement.dataset.theme = theme;
        await setConfig('theme', theme);
    };
    themeCard.appendChild(themeRow);
    s.appendChild(themeCard);

    // Export
    const exportCard = document.createElement('div');
    exportCard.className = 'card';
    exportCard.innerHTML = '<h3 class="section-title">📦 Exportar Datos</h3>';
    exportCard.appendChild(createInput({ label: 'Desde', type: 'date', id: 'exp-from', value: '' }));
    exportCard.appendChild(createInput({ label: 'Hasta', type: 'date', id: 'exp-to', value: today() }));

    const exportJsonBtn = document.createElement('button');
    exportJsonBtn.className = 'btn btn-secondary btn-block mb-md';
    exportJsonBtn.textContent = '📦 Exportar JSON';
    exportJsonBtn.onclick = async () => {
        try {
            const from = s.querySelector('#exp-from').value || undefined;
            const to = s.querySelector('#exp-to').value || undefined;
            const data = await exportData(from, to);
            
            const d = new Date();
            const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            const fileName = `${d.getDate()} de ${months[d.getMonth()]} Mi avance fisico.json`;

            downloadFile(JSON.stringify(data, null, 2), fileName, 'application/json');
            showToast('✅ JSON descargado');
        } catch (e) {
            console.error('Error exportando JSON:', e);
            showToast('❌ Error al exportar: ' + e.message);
        }
    };
    exportCard.appendChild(exportJsonBtn);

    const exportCsvBtn = document.createElement('button');
    exportCsvBtn.className = 'btn btn-secondary btn-block mb-md';
    exportCsvBtn.textContent = '📄 Exportar CSV (sesiones + series)';
    exportCsvBtn.onclick = async () => {
        try {
            const from = s.querySelector('#exp-from').value || undefined;
            const to = s.querySelector('#exp-to').value || undefined;
            const data = await exportData(from, to);
            if (data.sessions.length) downloadFile(toCSV(data.sessions, ['fecha', 'tipo_sesion', 'duracion_min', 'rpe', 'dolor_espalda_durante', 'notas']), 'sesiones.csv');
            if (data.sets.length) downloadFile(toCSV(data.sets, ['session_id', 'exercise_name', 'numero_serie', 'peso_kg', 'repeticiones', 'duracion_seg', 'observaciones']), 'series.csv');
            if (data.daily.length) downloadFile(toCSV(data.daily, ['fecha', 'pasos_totales', 'dolor_espalda_fin_dia', 'energia_fin_dia', 'notas']), 'diario.csv');
            if (data.measurements.length) downloadFile(toCSV(data.measurements, ['fecha', 'peso_kg', 'cintura_cm', 'cadera_cm']), 'medidas.csv');
            showToast('✅ CSVs descargados');
        } catch (e) {
            console.error('Error exportando CSV:', e);
            showToast('❌ Error al exportar CSV: ' + e.message);
        }
    };
    exportCard.appendChild(exportCsvBtn);
    s.appendChild(exportCard);

    // Logout
    const logoutCard = document.createElement('div');
    logoutCard.className = 'card';
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn btn-danger btn-block';
    logoutBtn.textContent = '🚪 Cerrar Sesión';
    logoutBtn.onclick = async () => {
        if (!confirm('¿Cerrar sesión?')) return;
        await supabase.auth.signOut();
        location.reload();
    };
    logoutCard.appendChild(logoutBtn);
    s.appendChild(logoutCard);

    return s;
}

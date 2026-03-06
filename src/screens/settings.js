// Settings Screen
import { getConfig, setConfig } from '../db/operations.js';
import { exportToJSON, exportToCSV, importFromJSON, downloadJSON, downloadCSVFiles, readJSONFile } from '../db/exportImport.js';
import { pushAllToSupabase, pullFromSupabase } from '../db/supabaseSync.js';
import { createInputGroup, showToast } from '../components/ui.js';
import { navigate } from '../router.js';

export async function renderSettings() {
    const screen = document.createElement('div');
    screen.className = 'screen';

    const usuario = await getConfig('usuario', { nombre: '', fecha_nacimiento: '', sexo: 'M', altura_cm: 0, peso_inicial_kg: 0 });
    const metaPasos = await getConfig('meta_pasos', 8000);
    const metaSesiones = await getConfig('meta_sesiones_semana', 3);

    screen.innerHTML = `
    <div class="header-bar">
      <button class="back-btn" id="back-btn">←</button>
      <span class="header-title">Configuración</span>
    </div>
  `;

    screen.querySelector('#back-btn').addEventListener('click', () => navigate('/mas'));

    // Profile
    const profileCard = document.createElement('div');
    profileCard.className = 'card';
    profileCard.innerHTML = '<h3 class="section-title">👤 Perfil</h3>';
    profileCard.appendChild(createInputGroup({ label: 'Nombre', type: 'text', id: 'cfg-nombre', value: usuario.nombre }));
    profileCard.appendChild(createInputGroup({ label: 'Fecha de nacimiento', type: 'date', id: 'cfg-nacimiento', value: usuario.fecha_nacimiento }));
    profileCard.appendChild(createInputGroup({ label: 'Altura (cm)', type: 'number', id: 'cfg-altura', value: usuario.altura_cm || '', min: 0 }));
    profileCard.appendChild(createInputGroup({ label: 'Peso inicial (kg)', type: 'number', id: 'cfg-peso', value: usuario.peso_inicial_kg || '', min: 0, step: '0.1' }));

    const saveProfileBtn = document.createElement('button');
    saveProfileBtn.className = 'btn btn-primary btn-block';
    saveProfileBtn.textContent = '💾 Guardar Perfil';
    saveProfileBtn.addEventListener('click', async () => {
        await setConfig('usuario', {
            nombre: screen.querySelector('#cfg-nombre').value,
            fecha_nacimiento: screen.querySelector('#cfg-nacimiento').value,
            sexo: usuario.sexo,
            altura_cm: parseFloat(screen.querySelector('#cfg-altura').value) || 0,
            peso_inicial_kg: parseFloat(screen.querySelector('#cfg-peso').value) || 0
        });
        showToast('✅ Perfil guardado');
    });
    profileCard.appendChild(saveProfileBtn);
    screen.appendChild(profileCard);

    // Goals
    const goalsCard = document.createElement('div');
    goalsCard.className = 'card';
    goalsCard.innerHTML = '<h3 class="section-title">🎯 Metas</h3>';
    goalsCard.appendChild(createInputGroup({ label: 'Meta de pasos diarios', type: 'number', id: 'cfg-meta-pasos', value: metaPasos, min: 1000, step: 500 }));
    goalsCard.appendChild(createInputGroup({ label: 'Sesiones de fuerza por semana', type: 'number', id: 'cfg-meta-sesiones', value: metaSesiones, min: 1, max: 7 }));

    const saveGoalsBtn = document.createElement('button');
    saveGoalsBtn.className = 'btn btn-primary btn-block';
    saveGoalsBtn.textContent = '💾 Guardar Metas';
    saveGoalsBtn.addEventListener('click', async () => {
        await setConfig('meta_pasos', parseInt(screen.querySelector('#cfg-meta-pasos').value) || 8000);
        await setConfig('meta_sesiones_semana', parseInt(screen.querySelector('#cfg-meta-sesiones').value) || 3);
        showToast('✅ Metas actualizadas');
    });
    goalsCard.appendChild(saveGoalsBtn);
    screen.appendChild(goalsCard);

    // Supabase Sync
    const syncCard = document.createElement('div');
    syncCard.className = 'card';
    syncCard.innerHTML = '<h3 class="section-title">☁️ Sincronización en la Nube</h3><p class="text-xs text-secondary mb-md">Sincroniza tus datos con Supabase para respaldo en la nube</p>';

    const pushBtn = document.createElement('button');
    pushBtn.className = 'btn btn-secondary btn-block mb-md';
    pushBtn.textContent = '⬆️ Subir datos a la nube';
    pushBtn.addEventListener('click', async () => {
        pushBtn.textContent = '⏳ Sincronizando...';
        pushBtn.disabled = true;
        try {
            const results = await pushAllToSupabase();
            const okCount = Object.values(results).filter(r => r.status === 'ok').length;
            const errCount = Object.values(results).filter(r => r.status === 'error').length;
            showToast(errCount > 0 ? `⚠️ ${okCount} OK, ${errCount} errores` : `✅ ${okCount} tablas sincronizadas`);
        } catch (e) {
            showToast('❌ ' + e.message);
        }
        pushBtn.textContent = '⬆️ Subir datos a la nube';
        pushBtn.disabled = false;
    });
    syncCard.appendChild(pushBtn);

    const pullBtn = document.createElement('button');
    pullBtn.className = 'btn btn-secondary btn-block mb-md';
    pullBtn.textContent = '⬇️ Descargar datos de la nube';
    pullBtn.addEventListener('click', async () => {
        if (!confirm('Esto agregará datos de la nube a tu dispositivo. ¿Continuar?')) return;
        pullBtn.textContent = '⏳ Descargando...';
        pullBtn.disabled = true;
        try {
            const results = await pullFromSupabase();
            const okCount = Object.values(results).filter(r => r.status === 'ok').length;
            showToast(`✅ ${okCount} tablas descargadas`);
            navigate('/');
        } catch (e) {
            showToast('❌ ' + e.message);
        }
        pullBtn.textContent = '⬇️ Descargar datos de la nube';
        pullBtn.disabled = false;
    });
    syncCard.appendChild(pullBtn);
    screen.appendChild(syncCard);

    // Export / Import
    const dataCard = document.createElement('div');
    dataCard.className = 'card';
    dataCard.innerHTML = '<h3 class="section-title">💾 Datos Locales</h3>';

    // Export JSON
    const exportJsonBtn = document.createElement('button');
    exportJsonBtn.className = 'btn btn-secondary btn-block mb-md';
    exportJsonBtn.textContent = '📦 Exportar JSON (backup completo)';
    exportJsonBtn.addEventListener('click', async () => {
        const data = await exportToJSON();
        downloadJSON(data);
        showToast('✅ Archivo JSON descargado');
    });
    dataCard.appendChild(exportJsonBtn);

    // Export CSV
    const exportCsvBtn = document.createElement('button');
    exportCsvBtn.className = 'btn btn-secondary btn-block mb-md';
    exportCsvBtn.textContent = '📄 Exportar CSV (por entidad)';
    exportCsvBtn.addEventListener('click', async () => {
        const files = await exportToCSV();
        const count = Object.keys(files).length;
        downloadCSVFiles(files);
        showToast(`✅ ${count} archivos CSV descargados`);
    });
    dataCard.appendChild(exportCsvBtn);

    // Import JSON
    const importDiv = document.createElement('div');
    importDiv.innerHTML = `
    <label class="btn btn-secondary btn-block" style="cursor:pointer">
      📥 Importar JSON (restaurar)
      <input type="file" accept=".json" id="import-file" style="display:none" />
    </label>
  `;
    const fileInput = importDiv.querySelector('#import-file');
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const data = await readJSONFile(file);
            if (confirm('¿Esto reemplazará TODOS los datos actuales. ¿Continuar?')) {
                await importFromJSON(data);
                showToast('✅ Datos restaurados correctamente');
                navigate('/');
            }
        } catch (err) {
            showToast('❌ Error: ' + err.message);
        }
    });
    dataCard.appendChild(importDiv);
    screen.appendChild(dataCard);

    // Logout
    const logoutCard = document.createElement('div');
    logoutCard.className = 'card';
    logoutCard.innerHTML = '<h3 class="section-title">🚪 Sesión</h3>';
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn btn-danger btn-block';
    logoutBtn.textContent = '🚪 Cerrar Sesión';
    logoutBtn.addEventListener('click', async () => {
        if (!confirm('¿Cerrar sesión?')) return;
        const { supabase } = await import('../db/supabaseClient.js');
        await supabase.auth.signOut();
        showToast('Sesión cerrada');
        location.reload();
    });
    logoutCard.appendChild(logoutBtn);
    screen.appendChild(logoutCard);

    return screen;
}



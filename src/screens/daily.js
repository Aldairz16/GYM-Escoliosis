// Daily Log Screen
import { getDailyLog, saveDailyLog, getDailyLogs } from '../db/supabase.js';
import { showToast, today, createSlider, createInput, formatDate } from '../components/ui.js';
import { navigate } from '../router.js';

export async function renderDaily() {
    const s = document.createElement('div');
    s.className = 'screen';
    s.innerHTML = `
    <div class="header-bar">
      <button class="back-btn" id="back">←</button>
      <span class="header-title">Registro Diario</span>
    </div>`;
    s.querySelector('#back').onclick = () => navigate('/');

    let fecha = today();
    let pasos = 0, dolor = 0, energia = 5, notas = '';

    const dateInput = document.createElement('div');
    dateInput.className = 'input-group';
    dateInput.innerHTML = `<label class="input-label">Fecha</label><input type="date" class="input" id="dl-date" value="${fecha}">`;
    s.appendChild(dateInput);

    const formEl = document.createElement('div');
    s.appendChild(formEl);

    // History section
    const historySection = document.createElement('div');
    historySection.className = 'mt-xl';
    historySection.innerHTML = `<h2 class="section-label">Historial de Registros</h2><div id="dl-history-list"></div>`;
    s.appendChild(historySection);

    async function loadHistory() {
        const listEl = historySection.querySelector('#dl-history-list');
        listEl.innerHTML = '<div class="text-sm text-secondary">Cargando...</div>';
        try {
            const logs = await getDailyLogs();
            listEl.innerHTML = '';
            if (!logs || logs.length === 0) {
                listEl.innerHTML = '<div class="text-sm text-secondary">No hay registros pasados.</div>';
                return;
            }
            logs.forEach(log => {
                const item = document.createElement('div');
                item.className = 'list-item';
                item.innerHTML = `
                    <div class="list-item-body">
                        <div class="list-item-title">${formatDate(log.fecha)}</div>
                        <div class="list-item-sub">
                            ${log.pasos_totales ? `👣 ${log.pasos_totales} pasos ` : ''} 
                            ${log.energia_fin_dia ? `⚡️ Energía: ${log.energia_fin_dia}/10 ` : ''} 
                            ${log.dolor_espalda_fin_dia ? `🤕 Dolor: ${log.dolor_espalda_fin_dia}/10` : ''}
                        </div>
                        ${log.notas ? `<div class="text-xs text-secondary mt-xs">📝 ${log.notas}</div>` : ''}
                    </div>
                `;
                item.onclick = () => {
                    s.querySelector('#dl-date').value = log.fecha;
                    loadDay(log.fecha);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                };
                listEl.appendChild(item);
            });
        } catch (e) {
            listEl.innerHTML = '<div class="text-sm text-danger">Error al cargar historial.</div>';
        }
    }

    async function loadDay(d) {
        fecha = d;
        const log = await getDailyLog(fecha);
        pasos = log?.pasos_totales || 0;
        dolor = log?.dolor_espalda_fin_dia ?? 0;
        energia = log?.energia_fin_dia ?? 5;
        notas = log?.notas || '';
        renderForm();
    }

    function renderForm() {
        formEl.innerHTML = '';
        formEl.appendChild(createInput({ label: 'Pasos totales (de tu Band)', type: 'number', id: 'dl-pasos', value: pasos, placeholder: '0', min: 0 }));
        formEl.appendChild(createSlider({ label: 'Dolor de espalda fin del día', id: 'dl-dolor', min: 0, max: 10, value: dolor, onChange: v => dolor = v }));
        formEl.appendChild(createSlider({ label: 'Energía', id: 'dl-energia', min: 0, max: 10, value: energia, onChange: v => energia = v }));
        formEl.appendChild(createInput({ label: 'Notas', type: 'textarea', id: 'dl-notas', value: notas, placeholder: 'Mucho tiempo de pie, día de estudio, etc.' }));

        const btn = document.createElement('button');
        btn.className = 'btn btn-primary btn-block btn-lg mt-lg';
        btn.textContent = '💾 Guardar y Limpiar';
        btn.onclick = async () => {
            pasos = parseInt(formEl.querySelector('#dl-pasos').value) || 0;
            notas = formEl.querySelector('#dl-notas').value;
            try {
                await saveDailyLog({ fecha, pasos_totales: pasos, dolor_espalda_fin_dia: dolor, energia_fin_dia: energia, notas });
                showToast('✅ Registro guardado');

                // Clear the form for next input (defaulting to today if it was a past day)
                fecha = today();
                s.querySelector('#dl-date').value = fecha;
                pasos = 0; dolor = 0; energia = 5; notas = '';
                renderForm();

                // Refresh history
                loadHistory();
            } catch (e) { showToast('❌ ' + e.message); }
        };
        formEl.appendChild(btn);
    }

    s.querySelector('#dl-date').onchange = e => loadDay(e.target.value);
    await loadDay(fecha);
    await loadHistory();
    return s;
}

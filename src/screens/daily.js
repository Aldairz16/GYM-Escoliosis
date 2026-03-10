// Daily Log Screen
import { getDailyLog, saveDailyLog, getDailyLogs, deleteDailyLog, getSupplementLogs, addSupplementLog } from '../db/supabase.js';
import { showToast, showModal, today, createSlider, createInput, formatDate } from '../components/ui.js';
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
    let logExists = false;

    const dateInput = document.createElement('div');
    dateInput.className = 'input-group';
    dateInput.innerHTML = `<label class="input-label">Fecha</label><input type="date" class="input" id="dl-date" value="${fecha}">`;
    s.appendChild(dateInput);

    const formEl = document.createElement('div');
    s.appendChild(formEl);

    // Supplements section
    const suppSection = document.createElement('div');
    suppSection.className = 'card mt-lg';
    suppSection.innerHTML = `
        <h3 class="section-title">💊 Suplementos</h3>
        <div id="supp-list" class="mb-md text-sm"></div>
        <button class="btn btn-secondary btn-sm btn-block" id="add-supp-btn">+ Añadir Toma</button>
    `;
    s.appendChild(suppSection);

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
        logExists = !!log;
        pasos = log?.pasos_totales || 0;
        dolor = log?.dolor_espalda_fin_dia ?? 0;
        energia = log?.energia_fin_dia ?? 5;
        notas = log?.notas || '';
        renderForm();
        await loadSupplements();
    }

    async function loadSupplements() {
        const listEl = suppSection.querySelector('#supp-list');
        listEl.innerHTML = '<div class="text-secondary text-xs">Cargando...</div>';
        try {
            const supps = await getSupplementLogs(fecha);
            if (!supps || supps.length === 0) {
                listEl.innerHTML = '<div class="text-secondary text-xs mt-sm mb-sm text-center">No has registrado suplementos este día.</div>';
                return;
            }
            listEl.innerHTML = '';
            supps.forEach(s => {
                const item = document.createElement('div');
                item.className = 'flex justify-between items-center py-xs border-b border-light';
                item.innerHTML = `
                    <div>
                        <strong style="color:var(--text)">${s.nombre_suplemento}</strong>
                        <span class="text-xs text-secondary ml-sm">${s.cantidad} ${s.unidad}</span>
                    </div>
                    <div class="text-xs text-secondary">${s.hora.slice(0, 5)}</div>
                `;
                listEl.appendChild(item);
            });
        } catch (e) {
            listEl.innerHTML = '<div class="text-danger">Error al cargar</div>';
        }
    }

    suppSection.querySelector('#add-supp-btn').onclick = () => {
        const m = document.createElement('div');
        m.innerHTML = `
            <div class="input-group mb-sm"><label class="input-label">Suplemento</label><input type="text" class="input" id="s-name" placeholder="Ej: Proteína Whey, Creatina..."></div>
            <div class="flex gap-sm mb-sm">
                <div class="input-group" style="flex:1"><label class="input-label">Cantidad</label><input type="number" step="0.5" class="input" id="s-qty" value="1"></div>
                <div class="input-group" style="flex:1"><label class="input-label">Unidad</label><input type="text" class="input" id="s-unit" value="scoop"></div>
            </div>
            <div class="input-group mb-lg"><label class="input-label">Hora</label><input type="time" class="input" id="s-time" value="${new Date().toTimeString().slice(0, 5)}"></div>
            <button class="btn btn-primary btn-block" id="s-save">Guardar Toma</button>
        `;
        m.querySelector('#s-save').onclick = async () => {
            const nombre = m.querySelector('#s-name').value;
            const cantidad = parseFloat(m.querySelector('#s-qty').value) || 1;
            const unidad = m.querySelector('#s-unit').value || '';
            const hora = m.querySelector('#s-time').value;

            if (!nombre) return showToast('Agrega un nombre');

            try {
                await addSupplementLog({ fecha, hora, nombre_suplemento: nombre, cantidad, unidad });
                showToast('💊 Suplemento registrado');
                document.querySelector('.modal-overlay')?.remove();
                loadSupplements();
            } catch (e) { showToast('❌ Error al guardar'); }
        };
        showModal({ title: 'Registrar Suplemento', content: m });
    };

    function renderForm() {
        formEl.innerHTML = '';
        formEl.appendChild(createInput({ label: 'Pasos totales (de tu Band)', type: 'number', id: 'dl-pasos', value: pasos, placeholder: '0', min: 0 }));
        formEl.appendChild(createSlider({ label: 'Dolor de espalda fin del día', id: 'dl-dolor', min: 0, max: 10, value: dolor, onChange: v => dolor = v }));
        formEl.appendChild(createSlider({ label: 'Energía', id: 'dl-energia', min: 0, max: 10, value: energia, onChange: v => energia = v }));
        formEl.appendChild(createInput({ label: 'Notas', type: 'textarea', id: 'dl-notas', value: notas, placeholder: 'Mucho tiempo de pie, día de estudio, etc.' }));

        const btnGrp = document.createElement('div');
        btnGrp.className = 'flex gap-sm mt-lg';

        const btn = document.createElement('button');
        btn.className = 'btn btn-primary flex-1 btn-lg';
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
                logExists = false;
                renderForm();

                // Refresh history
                loadHistory();
            } catch (e) { showToast('❌ ' + e.message); }
        };
        btnGrp.appendChild(btn);

        if (logExists) {
            const delBtn = document.createElement('button');
            delBtn.className = 'btn btn-danger btn-lg';
            delBtn.textContent = '🗑️';
            delBtn.onclick = async () => {
                if (!confirm(`¿Eliminar el registro del ${formatDate(fecha)}?`)) return;
                try {
                    await deleteDailyLog(fecha);
                    showToast('🗑️ Registro eliminado');
                    fecha = today();
                    s.querySelector('#dl-date').value = fecha;
                    pasos = 0; dolor = 0; energia = 5; notas = '';
                    logExists = false;
                    renderForm();
                    loadHistory();
                } catch (e) { showToast('❌ ' + e.message); }
            };
            btnGrp.appendChild(delBtn);
        }

        formEl.appendChild(btnGrp);
    }

    s.querySelector('#dl-date').onchange = async e => {
        const newD = e.target.value;
        const log = await getDailyLog(newD);

        // Always save what the user had currently typed before switching dates
        if (formEl.querySelector('#dl-pasos')) {
            pasos = parseInt(formEl.querySelector('#dl-pasos').value) || 0;
            notas = formEl.querySelector('#dl-notas').value;
        }

        if (log) {
            // If the new date has data, overwrite the form to show that data
            fecha = newD;
            logExists = true;
            pasos = log.pasos_totales || 0;
            dolor = log.dolor_espalda_fin_dia ?? 0;
            energia = log.energia_fin_dia ?? 5;
            notas = log.notas || '';
        } else {
            // New date has no data, so just update the date but keep the user's typed inputs!
            fecha = newD;
            logExists = false;
        }
        renderForm();
    };

    await loadDay(fecha);
    await loadHistory();
    return s;
}

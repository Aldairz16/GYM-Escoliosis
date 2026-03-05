// Sleep Registration Screen
import { getSueno, saveSueno, getAllSueno } from '../db/operations.js';
import { createSlider, createInputGroup, createToggle, showToast, todayISO, formatDateShort } from '../components/ui.js';
import { navigate } from '../router.js';

export async function renderSleep() {
    const screen = document.createElement('div');
    screen.className = 'screen';

    screen.innerHTML = `
    <div class="header-bar">
      <button class="back-btn" id="back-btn">←</button>
      <span class="header-title">Sueño</span>
    </div>
    <div class="tab-bar">
      <button class="tab active" data-tab="registrar">Registrar</button>
      <button class="tab" data-tab="historial">Historial</button>
    </div>
    <div id="sleep-tab-content"></div>
  `;

    screen.querySelector('#back-btn').addEventListener('click', () => navigate('/'));

    const tabContent = screen.querySelector('#sleep-tab-content');

    function switchTab(tab) {
        screen.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
        if (tab === 'registrar') renderSleepForm(tabContent);
        else renderSleepHistory(tabContent);
    }

    screen.querySelectorAll('.tab').forEach(t => {
        t.addEventListener('click', () => switchTab(t.dataset.tab));
    });

    switchTab('registrar');
    return screen;
}

async function renderSleepForm(container) {
    container.innerHTML = '';
    const form = document.createElement('div');

    // Yesterday as default fecha_noche
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const fechaNoche = yesterday.toISOString().slice(0, 10);

    const existing = await getSueno(fechaNoche);

    form.appendChild(createInputGroup({
        label: 'Fecha de la noche',
        type: 'date',
        id: 'sueno-fecha',
        value: existing?.fecha_noche || fechaNoche
    }));

    form.appendChild(createInputGroup({
        label: 'Hora de acostarse',
        type: 'time',
        id: 'sueno-acostarse',
        value: existing?.hora_acostarse || '22:30'
    }));

    form.appendChild(createInputGroup({
        label: 'Hora de dormirse (aprox.)',
        type: 'time',
        id: 'sueno-dormirse',
        value: existing?.hora_dormirse || '23:00'
    }));

    form.appendChild(createInputGroup({
        label: 'Hora de despertar',
        type: 'time',
        id: 'sueno-despertar',
        value: existing?.hora_despertar || '07:00'
    }));

    form.appendChild(createSlider({
        label: 'Calidad de sueño',
        min: 0, max: 10,
        value: existing?.calidad_sueno ?? 5,
        id: 'sueno-calidad'
    }));

    form.appendChild(createToggle({
        label: 'Tomé melatonina',
        id: 'sueno-melatonina',
        checked: existing?.uso_melatonina || false
    }));

    form.appendChild(createInputGroup({
        label: 'Dosis melatonina (mg)',
        type: 'number',
        id: 'sueno-dosis',
        value: existing?.dosis_melatonina_mg ?? '1',
        min: 0, step: '0.5'
    }));

    // Load existing data when changing date
    const fechaInput = form.querySelector('#sueno-fecha');
    fechaInput.addEventListener('change', async () => {
        const data = await getSueno(fechaInput.value);
        if (data) {
            form.querySelector('#sueno-acostarse').value = data.hora_acostarse || '';
            form.querySelector('#sueno-dormirse').value = data.hora_dormirse || '';
            form.querySelector('#sueno-despertar').value = data.hora_despertar || '';
            form.querySelector('#sueno-calidad').value = data.calidad_sueno || 5;
            form.querySelector('#sueno-calidad-value').textContent = data.calidad_sueno || 5;
            form.querySelector('#sueno-melatonina').checked = data.uso_melatonina || false;
            form.querySelector('#sueno-dosis').value = data.dosis_melatonina_mg ?? 1;
        }
    });

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary btn-block btn-lg mt-lg';
    saveBtn.textContent = '💾 Guardar Sueño';
    saveBtn.addEventListener('click', async () => {
        await saveSueno({
            fecha_noche: form.querySelector('#sueno-fecha').value,
            hora_acostarse: form.querySelector('#sueno-acostarse').value,
            hora_dormirse: form.querySelector('#sueno-dormirse').value,
            hora_despertar: form.querySelector('#sueno-despertar').value,
            calidad_sueno: parseInt(form.querySelector('#sueno-calidad').value),
            uso_melatonina: form.querySelector('#sueno-melatonina').checked,
            dosis_melatonina_mg: parseFloat(form.querySelector('#sueno-dosis').value) || 0
        });
        showToast('✅ Sueño registrado');
        navigate('/');
    });
    form.appendChild(saveBtn);

    container.appendChild(form);
}

async function renderSleepHistory(container) {
    container.innerHTML = '';
    const all = (await getAllSueno()).sort((a, b) => b.fecha_noche.localeCompare(a.fecha_noche));

    if (all.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">😴</div><p class="empty-state-text">Sin registros de sueño</p></div>';
        return;
    }

    for (const s of all.slice(0, 30)) {
        const hours = calculateSleepHours(s.hora_dormirse || s.hora_acostarse, s.hora_despertar);
        const item = document.createElement('div');
        item.className = 'card';
        item.innerHTML = `
      <div class="flex justify-between items-center">
        <div>
          <span class="font-bold">${formatDateShort(s.fecha_noche)}</span>
          <p class="text-xs text-secondary">${s.hora_acostarse || '?'} → ${s.hora_despertar || '?'} ${hours ? `(${hours}h)` : ''}</p>
        </div>
        <div class="flex gap-sm items-center">
          <span class="badge badge-teal">Calidad ${s.calidad_sueno}/10</span>
          ${s.uso_melatonina ? '<span class="badge badge-purple">💊 Melat.</span>' : ''}
        </div>
      </div>
    `;
        container.appendChild(item);
    }
}

function calculateSleepHours(sleepTime, wakeTime) {
    if (!sleepTime || !wakeTime) return null;
    const [sh, sm] = sleepTime.split(':').map(Number);
    const [wh, wm] = wakeTime.split(':').map(Number);
    let sleepMin = sh * 60 + sm;
    let wakeMin = wh * 60 + wm;
    if (wakeMin < sleepMin) wakeMin += 24 * 60; // crosses midnight
    return ((wakeMin - sleepMin) / 60).toFixed(1);
}

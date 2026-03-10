// Measurements Screen
import { saveMeasurement, getMeasurements } from '../db/supabase.js';
import { showToast, today, createInput, formatDate } from '../components/ui.js';
import { navigate } from '../router.js';
import Chart from 'chart.js/auto';

export async function renderMeasurements() {
    const s = document.createElement('div');
    s.className = 'screen';
    s.innerHTML = `
    <div class="header-bar">
      <button class="back-btn" id="back">←</button>
      <span class="header-title">Medidas Corporales</span>
    </div>`;
    s.querySelector('#back').onclick = () => navigate('/');

    // Form
    const form = document.createElement('div');
    form.className = 'card';
    form.innerHTML = '<h3 class="section-title">📏 Nueva Medición</h3>';
    form.appendChild(createInput({ label: 'Fecha', type: 'date', id: 'bm-date', value: today() }));
    form.appendChild(createInput({ label: 'Peso (kg)', type: 'text', id: 'bm-peso', step: '0.1', min: 0 }));
    // Modify input attributes specifically for the generated inputs to support decimal mode well on mobile
    form.querySelector('#bm-peso').inputMode = 'decimal';

    form.appendChild(createInput({ label: 'Cintura (cm)', type: 'text', id: 'bm-cintura', step: '0.1', min: 0 }));
    form.querySelector('#bm-cintura').inputMode = 'decimal';

    form.appendChild(createInput({ label: 'Cadera (cm)', type: 'text', id: 'bm-cadera', step: '0.1', min: 0 }));
    form.querySelector('#bm-cadera').inputMode = 'decimal';
    form.appendChild(createInput({ label: 'Notas', type: 'textarea', id: 'bm-notas' }));

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary btn-block';
    saveBtn.textContent = '💾 Guardar';
    saveBtn.onclick = async () => {
        try {
            await saveMeasurement({
                fecha: s.querySelector('#bm-date').value || today(),
                peso_kg: parseFloat(s.querySelector('#bm-peso').value.replace(',', '.')) || null,
                cintura_cm: parseFloat(s.querySelector('#bm-cintura').value.replace(',', '.')) || null,
                cadera_cm: parseFloat(s.querySelector('#bm-cadera').value.replace(',', '.')) || null,
                notas: s.querySelector('#bm-notas').value || null,
            });
            showToast('✅ Medición guardada');
            await loadData();
        } catch (e) { showToast('❌ ' + e.message); }
    };
    form.appendChild(saveBtn);
    s.appendChild(form);

    // Chart
    const chartCard = document.createElement('div');
    chartCard.className = 'card';
    chartCard.innerHTML = '<h3 class="section-title">📈 Progreso</h3><canvas id="bm-chart" height="200"></canvas>';
    s.appendChild(chartCard);

    // History
    const histEl = document.createElement('div');
    s.appendChild(histEl);

    let chart = null;

    async function loadData() {
        const data = await getMeasurements(30);
        const sorted = [...data].reverse();

        // Chart
        if (chart) chart.destroy();
        const ctx = s.querySelector('#bm-chart');
        if (ctx && sorted.length > 0) {
            chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: sorted.map(d => d.fecha.slice(5)),
                    datasets: [
                        { label: 'Peso (kg)', data: sorted.map(d => d.peso_kg), borderColor: '#00d4aa', tension: 0.3, fill: false },
                        { label: 'Cintura (cm)', data: sorted.map(d => d.cintura_cm), borderColor: '#7c5cfc', tension: 0.3, fill: false },
                        { label: 'Cadera (cm)', data: sorted.map(d => d.cadera_cm), borderColor: '#ff9f43', tension: 0.3, fill: false },
                    ]
                },
                options: {
                    responsive: true, plugins: { legend: { labels: { color: '#8888a8', font: { size: 11 } } } },
                    scales: { x: { ticks: { color: '#555570' }, grid: { color: 'rgba(255,255,255,0.04)' } }, y: { ticks: { color: '#555570' }, grid: { color: 'rgba(255,255,255,0.04)' } } }
                }
            });
        }

        // History
        histEl.innerHTML = '';
        if (data.length > 0) {
            const label = document.createElement('div'); label.className = 'section-label mt-lg'; label.textContent = 'Historial'; histEl.appendChild(label);
            data.forEach(m => {
                const item = document.createElement('div');
                item.className = 'list-item';
                item.innerHTML = `<div class="list-item-body"><div class="list-item-title">${formatDate(m.fecha)}</div><div class="list-item-sub">${m.peso_kg ? m.peso_kg + 'kg' : ''} ${m.cintura_cm ? '• ' + m.cintura_cm + 'cm cin' : ''} ${m.cadera_cm ? '• ' + m.cadera_cm + 'cm cad' : ''}</div></div>`;
                histEl.appendChild(item);
            });
        }
    }

    await loadData();
    return s;
}

// Measurements & Progress Screen
import { saveMedicion, getAllMediciones } from '../db/operations.js';
import { createInputGroup, createTextarea, showToast, todayISO, formatDateShort } from '../components/ui.js';
import { navigate } from '../router.js';

let Chart;

async function loadChart() {
    if (!Chart) {
        const module = await import('chart.js/auto');
        Chart = module.default || module.Chart;
    }
    return Chart;
}

export async function renderMeasurements() {
    const screen = document.createElement('div');
    screen.className = 'screen';

    screen.innerHTML = `
    <div class="header-bar">
      <button class="back-btn" id="back-btn">←</button>
      <span class="header-title">Mediciones</span>
    </div>
    <div class="tab-bar">
      <button class="tab active" data-tab="registrar">Registrar</button>
      <button class="tab" data-tab="graficas">Gráficas</button>
    </div>
    <div id="meas-tab-content"></div>
  `;

    screen.querySelector('#back-btn').addEventListener('click', () => navigate('/'));
    const tabContent = screen.querySelector('#meas-tab-content');

    function switchTab(tab) {
        screen.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
        if (tab === 'registrar') renderMeasForm(tabContent);
        else renderMeasCharts(tabContent);
    }

    screen.querySelectorAll('.tab').forEach(t => {
        t.addEventListener('click', () => switchTab(t.dataset.tab));
    });

    switchTab('registrar');
    return screen;
}

async function renderMeasForm(container) {
    container.innerHTML = '';
    const form = document.createElement('div');

    form.appendChild(createInputGroup({ label: 'Fecha', type: 'date', id: 'med-fecha', value: todayISO() }));
    form.appendChild(createInputGroup({ label: 'Peso (kg)', type: 'number', id: 'med-peso', placeholder: '0', min: 0, step: '0.1' }));
    form.appendChild(createInputGroup({ label: 'Cintura (cm)', type: 'number', id: 'med-cintura', placeholder: '0', min: 0, step: '0.5' }));
    form.appendChild(createInputGroup({ label: 'Cadera (cm)', type: 'number', id: 'med-cadera', placeholder: '0', min: 0, step: '0.5' }));
    form.appendChild(createTextarea({ label: 'Notas', id: 'med-notas', placeholder: 'Ej: foto tomada, cambio de rutina...' }));

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary btn-block btn-lg mt-lg';
    saveBtn.textContent = '💾 Guardar Medición';
    saveBtn.addEventListener('click', async () => {
        await saveMedicion({
            fecha: form.querySelector('#med-fecha').value,
            peso_kg: parseFloat(form.querySelector('#med-peso').value) || 0,
            cintura_cm: parseFloat(form.querySelector('#med-cintura').value) || 0,
            cadera_cm: parseFloat(form.querySelector('#med-cadera').value) || 0,
            notas: form.querySelector('#med-notas').value
        });
        showToast('✅ Medición guardada');
    });
    form.appendChild(saveBtn);

    // History
    const all = (await getAllMediciones()).sort((a, b) => b.fecha.localeCompare(a.fecha));
    if (all.length > 0) {
        const histLabel = document.createElement('p');
        histLabel.className = 'section-label mt-xl';
        histLabel.textContent = 'Historial';
        form.appendChild(histLabel);

        for (const m of all.slice(0, 12)) {
            const item = document.createElement('div');
            item.className = 'card';
            item.innerHTML = `
        <span class="font-bold">${formatDateShort(m.fecha)}</span>
        <div class="flex gap-lg mt-sm">
          ${m.peso_kg ? `<div><span class="text-xs text-secondary">Peso</span><br><span class="font-bold">${m.peso_kg} kg</span></div>` : ''}
          ${m.cintura_cm ? `<div><span class="text-xs text-secondary">Cintura</span><br><span class="font-bold">${m.cintura_cm} cm</span></div>` : ''}
          ${m.cadera_cm ? `<div><span class="text-xs text-secondary">Cadera</span><br><span class="font-bold">${m.cadera_cm} cm</span></div>` : ''}
        </div>
        ${m.notas ? `<p class="text-xs text-secondary mt-sm">${m.notas}</p>` : ''}
      `;
            form.appendChild(item);
        }
    }

    container.appendChild(form);
}

async function renderMeasCharts(container) {
    container.innerHTML = '';
    const ChartJS = await loadChart();
    const all = (await getAllMediciones()).sort((a, b) => a.fecha.localeCompare(b.fecha));

    if (all.length < 2) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><p class="empty-state-text">Necesitas al menos 2 mediciones para ver gráficas</p></div>';
        return;
    }

    const labels = all.map(m => formatDateShort(m.fecha));
    const chartDefaults = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { ticks: { color: '#8888a8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: { ticks: { color: '#8888a8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } }
        }
    };

    // Weight chart
    if (all.some(m => m.peso_kg > 0)) {
        const weightSection = document.createElement('div');
        weightSection.className = 'chart-container';
        weightSection.innerHTML = '<h4 class="section-title">Peso (kg)</h4><div style="height:180px"><canvas id="chart-peso"></canvas></div>';
        container.appendChild(weightSection);

        setTimeout(() => {
            new ChartJS(document.getElementById('chart-peso'), {
                type: 'line',
                data: {
                    labels,
                    datasets: [{ data: all.map(m => m.peso_kg || null), borderColor: '#00d4aa', backgroundColor: 'rgba(0,212,170,0.1)', tension: 0.3, fill: true, pointRadius: 4, pointBackgroundColor: '#00d4aa' }]
                },
                options: chartDefaults
            });
        }, 50);
    }

    // Waist chart
    if (all.some(m => m.cintura_cm > 0)) {
        const waistSection = document.createElement('div');
        waistSection.className = 'chart-container';
        waistSection.innerHTML = '<h4 class="section-title">Cintura (cm)</h4><div style="height:180px"><canvas id="chart-cintura"></canvas></div>';
        container.appendChild(waistSection);

        setTimeout(() => {
            new ChartJS(document.getElementById('chart-cintura'), {
                type: 'line',
                data: {
                    labels,
                    datasets: [{ data: all.map(m => m.cintura_cm || null), borderColor: '#7c5cfc', backgroundColor: 'rgba(124,92,252,0.1)', tension: 0.3, fill: true, pointRadius: 4, pointBackgroundColor: '#7c5cfc' }]
                },
                options: chartDefaults
            });
        }, 100);
    }

    // Hip chart
    if (all.some(m => m.cadera_cm > 0)) {
        const hipSection = document.createElement('div');
        hipSection.className = 'chart-container';
        hipSection.innerHTML = '<h4 class="section-title">Cadera (cm)</h4><div style="height:180px"><canvas id="chart-cadera"></canvas></div>';
        container.appendChild(hipSection);

        setTimeout(() => {
            new ChartJS(document.getElementById('chart-cadera'), {
                type: 'line',
                data: {
                    labels,
                    datasets: [{ data: all.map(m => m.cadera_cm || null), borderColor: '#ff9f43', backgroundColor: 'rgba(255,159,67,0.1)', tension: 0.3, fill: true, pointRadius: 4, pointBackgroundColor: '#ff9f43' }]
                },
                options: chartDefaults
            });
        }, 150);
    }
}

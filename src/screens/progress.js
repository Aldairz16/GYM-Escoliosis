// Progress & Charts Screen
import { getAllDias, getAllEntrenamientos, getAllSueno } from '../db/operations.js';
import { formatDateShort, createInputGroup } from '../components/ui.js';
import { getWeeklySummary, getWeekRange } from '../logic/goals.js';

let Chart;

async function loadChart() {
    if (!Chart) {
        const module = await import('chart.js/auto');
        Chart = module.default || module.Chart;
    }
    return Chart;
}

export async function renderProgress() {
    const screen = document.createElement('div');
    screen.className = 'screen';

    screen.innerHTML = `
    <h1 class="screen-title">Progreso</h1>
    <p class="screen-subtitle">Tendencias y resumen semanal</p>
    <div id="progress-content"></div>
  `;

    await renderProgressContent(screen.querySelector('#progress-content'));
    return screen;
}

async function renderProgressContent(container) {
    const ChartJS = await loadChart();

    // Weekly summary
    const summary = await getWeeklySummary();

    const weekCard = document.createElement('div');
    weekCard.className = 'card';
    weekCard.innerHTML = `
    <h3 class="section-title">Esta Semana</h3>
    <p class="text-xs text-secondary mb-md">${formatDateShort(summary.from)} — ${formatDateShort(summary.to)}</p>
    <div class="weekly-grid">
      <div class="weekly-stat">
        <div class="value text-accent">${summary.pasosProm.toLocaleString()}</div>
        <div class="label">Pasos prom.</div>
      </div>
      <div class="weekly-stat">
        <div class="value" style="color: var(--accent-secondary)">${summary.sesionesFuerza}/${summary.metaSesiones}</div>
        <div class="label">Sesiones fuerza</div>
      </div>
      <div class="weekly-stat">
        <div class="value" style="color: ${summary.dolorProm && parseFloat(summary.dolorProm) > 5 ? 'var(--accent-danger)' : 'var(--accent-success)'}">${summary.dolorProm ?? '—'}</div>
        <div class="label">Dolor prom.</div>
      </div>
      <div class="weekly-stat">
        <div class="value" style="color: var(--accent-info)">${summary.energiaProm ?? '—'}</div>
        <div class="label">Energía prom.</div>
      </div>
    </div>
    ${summary.messages.map(m => `<p class="text-sm text-secondary mt-sm">${m}</p>`).join('')}
  `;
    container.appendChild(weekCard);

    // Load all data for charts
    const allDias = (await getAllDias()).sort((a, b) => a.fecha.localeCompare(b.fecha));
    const allEnts = (await getAllEntrenamientos()).sort((a, b) => a.fecha.localeCompare(b.fecha));
    const allSueno = (await getAllSueno()).sort((a, b) => a.fecha_noche.localeCompare(b.fecha_noche));

    const chartDefaults = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { ticks: { color: '#8888a8', font: { size: 9 }, maxRotation: 45 }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: { ticks: { color: '#8888a8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } }
        }
    };

    // Steps chart
    if (allDias.length > 1) {
        const last30 = allDias.slice(-30);
        const stepsSection = document.createElement('div');
        stepsSection.className = 'chart-container';
        stepsSection.innerHTML = '<h4 class="section-title">Pasos Diarios</h4><div style="height:180px"><canvas id="chart-steps"></canvas></div>';
        container.appendChild(stepsSection);

        setTimeout(() => {
            new ChartJS(document.getElementById('chart-steps'), {
                type: 'bar',
                data: {
                    labels: last30.map(d => formatDateShort(d.fecha)),
                    datasets: [{
                        data: last30.map(d => d.pasos_totales || 0),
                        backgroundColor: last30.map(d => (d.pasos_totales || 0) >= (summary.metaPasos) ? 'rgba(0,212,170,0.6)' : 'rgba(0,212,170,0.2)'),
                        borderColor: '#00d4aa',
                        borderWidth: 1,
                        borderRadius: 4
                    }]
                },
                options: { ...chartDefaults, plugins: { ...chartDefaults.plugins, annotation: {} } }
            });
        }, 50);
    }

    // Pain chart
    if (allDias.filter(d => d.dolor_espalda_fin_dia !== undefined).length > 1) {
        const painData = allDias.filter(d => d.dolor_espalda_fin_dia !== undefined).slice(-30);
        const painSection = document.createElement('div');
        painSection.className = 'chart-container';
        painSection.innerHTML = '<h4 class="section-title">Dolor de Espalda</h4><div style="height:180px"><canvas id="chart-pain"></canvas></div>';
        container.appendChild(painSection);

        setTimeout(() => {
            new ChartJS(document.getElementById('chart-pain'), {
                type: 'line',
                data: {
                    labels: painData.map(d => formatDateShort(d.fecha)),
                    datasets: [{
                        data: painData.map(d => d.dolor_espalda_fin_dia),
                        borderColor: '#ff6b6b',
                        backgroundColor: 'rgba(255,107,107,0.1)',
                        tension: 0.3,
                        fill: true,
                        pointRadius: 3,
                        pointBackgroundColor: '#ff6b6b'
                    }]
                },
                options: { ...chartDefaults, scales: { ...chartDefaults.scales, y: { ...chartDefaults.scales.y, min: 0, max: 10 } } }
            });
        }, 100);
    }

    // Sleep quality chart
    if (allSueno.length > 1) {
        const sleepData = allSueno.slice(-30);
        const sleepSection = document.createElement('div');
        sleepSection.className = 'chart-container';
        sleepSection.innerHTML = '<h4 class="section-title">Calidad de Sueño</h4><div style="height:180px"><canvas id="chart-sleep"></canvas></div>';
        container.appendChild(sleepSection);

        setTimeout(() => {
            new ChartJS(document.getElementById('chart-sleep'), {
                type: 'line',
                data: {
                    labels: sleepData.map(s => formatDateShort(s.fecha_noche)),
                    datasets: [{
                        data: sleepData.map(s => s.calidad_sueno),
                        borderColor: '#54a0ff',
                        backgroundColor: 'rgba(84,160,255,0.1)',
                        tension: 0.3,
                        fill: true,
                        pointRadius: 3,
                        pointBackgroundColor: '#54a0ff'
                    }]
                },
                options: { ...chartDefaults, scales: { ...chartDefaults.scales, y: { ...chartDefaults.scales.y, min: 0, max: 10 } } }
            });
        }, 150);
    }

    // Workout table
    if (allEnts.length > 0) {
        const tableSection = document.createElement('div');
        tableSection.className = 'card mt-lg';
        tableSection.innerHTML = `
      <h3 class="section-title">Entrenamientos Recientes</h3>
      <div style="overflow-x: auto;">
        <table style="width:100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
              <th class="text-xs text-muted" style="padding:6px; text-align:left;">Fecha</th>
              <th class="text-xs text-muted" style="padding:6px; text-align:left;">Tipo</th>
              <th class="text-xs text-muted" style="padding:6px;">Min</th>
              <th class="text-xs text-muted" style="padding:6px;">RPE</th>
              <th class="text-xs text-muted" style="padding:6px;">Dolor</th>
            </tr>
          </thead>
          <tbody>
            ${allEnts.slice(-20).reverse().map(e => `
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
                <td class="text-xs" style="padding:6px;">${formatDateShort(e.fecha)}</td>
                <td class="text-xs" style="padding:6px;">${formatType(e.tipo)}</td>
                <td class="text-xs text-center" style="padding:6px;">${e.duracion_min}</td>
                <td class="text-xs text-center" style="padding:6px;">${e.percepcion_esfuerzo_rpe}</td>
                <td class="text-xs text-center" style="padding:6px; ${e.dolor_espalda_durante > 3 ? 'color: var(--accent-danger)' : ''}">${e.dolor_espalda_durante}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
        container.appendChild(tableSection);
    }

    if (allDias.length === 0 && allEnts.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><p class="empty-state-text">Registra datos para ver tu progreso</p></div>';
    }
}

function formatType(type) {
    const map = {
        fuerza_tren_inferior: 'T.Inf',
        fuerza_tren_superior: 'T.Sup',
        full_body: 'Full',
        movilidad: 'Mov',
        caminata_larga: 'Cam',
        otro: 'Otro'
    };
    return map[type] || type;
}

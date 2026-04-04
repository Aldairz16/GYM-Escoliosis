// Dashboard Screen
import { getWeekSessionCount, getLastSession, getConfig, getWeeklyNutritionLogs, getDailyLogs } from '../db/supabase.js';
import { navigate } from '../router.js';
import { formatDate, today, sessionTypeLabel } from '../components/ui.js';
import Chart from 'chart.js/auto';

export async function renderDashboard() {
    const s = document.createElement('div');
    s.className = 'screen';

    const dToday = new Date();
    const dLastWeek = new Date();
    dLastWeek.setDate(dToday.getDate() - 6);
    const endStr = dToday.toISOString().split('T')[0];
    const startStr = dLastWeek.toISOString().split('T')[0];

    const [weekCount, last, meta, calGoal, nutritionLogs, dailyLogs] = await Promise.all([
        getWeekSessionCount(),
        getLastSession(),
        getConfig('meta_sesiones', 3),
        getConfig('calorias_objetivo', 2000),
        getWeeklyNutritionLogs(startStr, endStr),
        getDailyLogs(startStr, endStr)
    ]);

    s.innerHTML = `
    <h1 class="screen-title">Mi Progreso</h1>
    <p class="screen-subtitle">${formatDate(new Date())}</p>

    <button class="cta-start" id="start-btn">
      <span class="cta-icon">🏋️</span>
      Iniciar Entrenamiento
    </button>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="val">${weekCount}/${meta}</div>
        <div class="label">Sesiones esta semana</div>
      </div>
      <div class="stat-card">
        <div class="val">${last ? last.duracion_min || '–' : '–'}</div>
        <div class="label">${last ? 'min última sesión' : 'Sin sesiones'}</div>
      </div>
    </div>

    ${last ? `
      <div class="card" id="last-session">
        <div class="section-label">Última sesión</div>
        <div class="flex items-center justify-between">
          <div>
            <div style="font-weight:700">${sessionTypeLabel(last.tipo_sesion)}</div>
            <div class="text-sm text-secondary">${formatDate(last.fecha)}</div>
          </div>
          <div class="text-sm">
            ${last.rpe ? `RPE ${last.rpe}` : ''}
            ${last.dolor_espalda_durante !== null ? ` • Dolor ${last.dolor_espalda_durante}` : ''}
          </div>
        </div>
      </div>
    ` : ''}

    <div class="card mt-lg" id="nutrition-widget">
        <div class="flex justify-between items-center mb-sm">
            <div class="section-label mb-0">Nutrición Semanal</div>
            <div class="text-xs text-secondary">Objetivo: ${calGoal} kcal</div>
        </div>
        <canvas id="nutritionCanvas" height="180"></canvas>
    </div>

    <div class="section-label mt-lg">Accesos Rápidos</div>
    <div class="stat-grid">
      <div class="list-item" id="nav-daily"><div class="list-icon">📝</div><div class="list-item-body"><div class="list-item-title">Registro Diario</div></div></div>
      <div class="list-item" id="nav-nutrition"><div class="list-icon">🍏</div><div class="list-item-body"><div class="list-item-title">Nutrición & IA</div></div></div>
      <div class="list-item" id="nav-measures"><div class="list-icon">📏</div><div class="list-item-body"><div class="list-item-title">Mediciones</div></div></div>
      <div class="list-item" id="nav-exercises"><div class="list-icon">🏃</div><div class="list-item-body"><div class="list-item-title">Ejercicios</div></div></div>
    </div>
  `;

    s.querySelector('#start-btn').onclick = () => navigate('/workout');
    s.querySelector('#nav-daily').onclick = () => navigate('/daily');
    s.querySelector('#nav-nutrition').onclick = () => navigate('/nutrition');
    s.querySelector('#nav-measures').onclick = () => navigate('/measurements');
    s.querySelector('#nav-exercises').onclick = () => navigate('/exercises');
    if (last) s.querySelector('#last-session').onclick = () => navigate('/history');

    // Inicializar Chart.js
    setTimeout(() => {
        const ctx = s.querySelector('#nutritionCanvas');
        if (!ctx) return;
        
        // Agrupar kcal por día
        const dayKcal = {};
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(dLastWeek);
            d.setDate(d.getDate() + i);
            const ds = d.toISOString().split('T')[0];
            dates.push(ds);
            dayKcal[ds] = 0;
        }

        nutritionLogs.forEach(log => {
            if (dayKcal[log.fecha] !== undefined) {
                dayKcal[log.fecha] += log.calorias;
            }
        });

        const labels = dates.map(d => d.slice(5)); // MM-DD
        const dataVals = dates.map(d => dayKcal[d]);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Kcal Consumidas',
                        data: dataVals,
                        backgroundColor: dataVals.map(val => val > calGoal ? '#FF6B6B' : '#4ECDC4'),
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    annotation: {
                        annotations: {
                            line1: {
                                type: 'line',
                                yMin: calGoal,
                                yMax: calGoal,
                                borderColor: 'rgba(255, 255, 255, 0.4)',
                                borderWidth: 2,
                                borderDash: [5, 5]
                            }
                        }
                    }
                },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#888' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#888' }
                    }
                }
            }
        });
    }, 100);

    return s;
}

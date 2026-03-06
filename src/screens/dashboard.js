// Dashboard Screen
import { getWeekSessionCount, getLastSession, getConfig } from '../db/supabase.js';
import { navigate } from '../router.js';
import { formatDate, today, sessionTypeLabel } from '../components/ui.js';

export async function renderDashboard() {
    const s = document.createElement('div');
    s.className = 'screen';

    const [weekCount, last, meta] = await Promise.all([
        getWeekSessionCount(),
        getLastSession(),
        getConfig('meta_sesiones', 3),
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

    <div class="section-label mt-lg">Accesos Rápidos</div>
    <div class="stat-grid">
      <div class="list-item" id="nav-daily"><div class="list-icon">📝</div><div class="list-item-body"><div class="list-item-title">Registro Diario</div></div></div>
      <div class="list-item" id="nav-measures"><div class="list-icon">📏</div><div class="list-item-body"><div class="list-item-title">Mediciones</div></div></div>
      <div class="list-item" id="nav-exercises"><div class="list-icon">🏃</div><div class="list-item-body"><div class="list-item-title">Ejercicios</div></div></div>
      <div class="list-item" id="nav-history"><div class="list-icon">📅</div><div class="list-item-body"><div class="list-item-title">Historial</div></div></div>
    </div>
  `;

    s.querySelector('#start-btn').onclick = () => navigate('/workout');
    s.querySelector('#nav-daily').onclick = () => navigate('/daily');
    s.querySelector('#nav-measures').onclick = () => navigate('/measurements');
    s.querySelector('#nav-exercises').onclick = () => navigate('/exercises');
    s.querySelector('#nav-history').onclick = () => navigate('/history');
    if (last) s.querySelector('#last-session').onclick = () => navigate('/history');

    return s;
}

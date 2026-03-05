// Dashboard Screen — daily overview
import { getDia, saveDia, todayISO } from '../db/operations.js';
import { getWeeklySummary } from '../logic/goals.js';
import { createSlider, createProgressRing, formatDate, showToast } from '../components/ui.js';
import { navigate } from '../router.js';

export async function renderDashboard() {
    const screen = document.createElement('div');
    screen.className = 'screen';

    const today = todayISO();
    let dia = await getDia(today) || { fecha: today, pasos_totales: 0, dolor_espalda_fin_dia: 0, energia_fin_dia: 5, notas_generales: '' };
    const summary = await getWeeklySummary();

    // Date header
    const dateStr = formatDate(today);
    screen.innerHTML = `
    <div class="mb-lg">
      <h1 class="screen-title">Mi Progreso</h1>
      <p class="screen-subtitle">${dateStr}</p>
    </div>
  `;

    // Steps progress ring
    const stepsCard = document.createElement('div');
    stepsCard.className = 'card';
    stepsCard.innerHTML = `<div class="card-header"><h3 class="section-title">Pasos del Día</h3><span class="badge badge-teal">${summary.metaPasos.toLocaleString()} meta</span></div>`;

    const ringRow = document.createElement('div');
    ringRow.className = 'flex items-center gap-lg';

    const ring = createProgressRing({
        value: dia.pasos_totales,
        max: summary.metaPasos,
        label: (dia.pasos_totales || 0).toLocaleString(),
        sublabel: 'pasos'
    });
    ringRow.appendChild(ring);

    // Quick steps edit
    const stepsEdit = document.createElement('div');
    stepsEdit.style.flex = '1';
    stepsEdit.innerHTML = `
    <div class="input-group">
      <label class="input-label" for="pasos-input">Editar pasos</label>
      <input type="number" id="pasos-input" class="input" value="${dia.pasos_totales || ''}" placeholder="0" min="0" inputmode="numeric" />
    </div>
    <button class="btn btn-primary btn-sm btn-block" id="save-pasos">Guardar</button>
  `;
    ringRow.appendChild(stepsEdit);
    stepsCard.appendChild(ringRow);
    screen.appendChild(stepsCard);

    // Quick Actions
    const actionsTitle = document.createElement('p');
    actionsTitle.className = 'section-label mt-lg';
    actionsTitle.textContent = 'Acciones rápidas';
    screen.appendChild(actionsTitle);

    const actions = document.createElement('div');
    actions.className = 'quick-actions';
    actions.innerHTML = `
    <div class="quick-action" data-route="/entrenar">
      <span class="quick-action-icon">🏋️</span>
      <span class="quick-action-label">Entrenamiento</span>
    </div>
    <div class="quick-action" data-route="/registro/sueno">
      <span class="quick-action-icon">😴</span>
      <span class="quick-action-label">Sueño</span>
    </div>
    <div class="quick-action" data-route="/registro/alimentacion">
      <span class="quick-action-icon">🍽️</span>
      <span class="quick-action-label">Alimentación</span>
    </div>
    <div class="quick-action" data-route="/registro/suplementos">
      <span class="quick-action-icon">💊</span>
      <span class="quick-action-label">Suplementos</span>
    </div>
  `;
    screen.appendChild(actions);

    // Daily sliders
    const slidersCard = document.createElement('div');
    slidersCard.className = 'card';
    slidersCard.innerHTML = '<h3 class="section-title">¿Cómo fue tu día?</h3>';

    const painSlider = createSlider({
        label: 'Dolor de espalda (fin del día)',
        min: 0, max: 10, value: dia.dolor_espalda_fin_dia || 0,
        id: 'dolor-dia'
    });
    slidersCard.appendChild(painSlider);

    const energySlider = createSlider({
        label: 'Energía',
        min: 0, max: 10, value: dia.energia_fin_dia || 5,
        id: 'energia-dia'
    });
    slidersCard.appendChild(energySlider);

    const notesGroup = document.createElement('div');
    notesGroup.className = 'input-group';
    notesGroup.innerHTML = `
    <label class="input-label" for="notas-dia">Notas del día</label>
    <textarea id="notas-dia" class="input" placeholder="¿Algo que notar hoy?" rows="2">${dia.notas_generales || ''}</textarea>
  `;
    slidersCard.appendChild(notesGroup);

    const saveDayBtn = document.createElement('button');
    saveDayBtn.className = 'btn btn-primary btn-block mt-md';
    saveDayBtn.textContent = 'Guardar día';
    slidersCard.appendChild(saveDayBtn);

    screen.appendChild(slidersCard);

    // Weekly Summary
    const weekCard = document.createElement('div');
    weekCard.className = 'card';
    weekCard.innerHTML = `
    <h3 class="section-title">Resumen Semanal</h3>
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
        <div class="value" style="color: ${summary.dolorProm !== null && parseFloat(summary.dolorProm) > 5 ? 'var(--accent-danger)' : 'var(--accent-success)'}">${summary.dolorProm ?? '—'}</div>
        <div class="label">Dolor prom.</div>
      </div>
      <div class="weekly-stat">
        <div class="value" style="color: var(--accent-info)">${summary.calidadSuenoProm ?? '—'}</div>
        <div class="label">Sueño prom.</div>
      </div>
    </div>
    ${summary.messages.length ? `
      <div class="divider"></div>
      ${summary.messages.map(m => `<p class="text-sm text-secondary" style="margin-bottom: 4px;">${m}</p>`).join('')}
    ` : ''}
  `;
    screen.appendChild(weekCard);

    // Event listeners
    setTimeout(() => {
        // Quick actions navigation
        screen.querySelectorAll('.quick-action').forEach(btn => {
            btn.addEventListener('click', () => navigate(btn.dataset.route));
        });

        // Save steps
        const saveStepsBtn = screen.querySelector('#save-pasos');
        if (saveStepsBtn) {
            saveStepsBtn.addEventListener('click', async () => {
                const pasos = parseInt(screen.querySelector('#pasos-input').value) || 0;
                dia.pasos_totales = pasos;
                await saveDia(dia);
                showToast('✅ Pasos guardados');
                navigate('/');
            });
        }

        // Save day
        saveDayBtn.addEventListener('click', async () => {
            dia.dolor_espalda_fin_dia = parseInt(screen.querySelector('#dolor-dia').value);
            dia.energia_fin_dia = parseInt(screen.querySelector('#energia-dia').value);
            dia.notas_generales = screen.querySelector('#notas-dia').value;
            dia.pasos_totales = parseInt(screen.querySelector('#pasos-input').value) || dia.pasos_totales;
            await saveDia(dia);
            showToast('✅ Día guardado');
        });
    }, 0);

    return screen;
}

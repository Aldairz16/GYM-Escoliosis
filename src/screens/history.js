// Workout History Screen — calendar + list view
import { getSessions, getSessionSets, getSessionDates, deleteSession } from '../db/supabase.js';
import { navigate } from '../router.js';
import { showToast, sessionTypeLabel, formatDate } from '../components/ui.js';

export async function renderHistory() {
    const s = document.createElement('div');
    s.className = 'screen';

    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;

    s.innerHTML = `<h1 class="screen-title">Historial</h1><p class="screen-subtitle">Sesiones de entrenamiento</p>`;

    const calContainer = document.createElement('div');
    calContainer.className = 'card';
    s.appendChild(calContainer);

    const listContainer = document.createElement('div');
    s.appendChild(listContainer);

    // Add retroactive button
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-secondary btn-block mt-lg';
    addBtn.textContent = '+ Agregar sesión pasada';
    addBtn.onclick = () => navigate('/workout');
    s.appendChild(addBtn);

    async function renderCalendar() {
        const dates = await getSessionDates(year, month);
        const firstDay = new Date(year, month - 1, 1).getDay();
        const daysInMonth = new Date(year, month, 0).getDate();
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        calContainer.innerHTML = `
      <div class="cal-nav">
        <button class="btn btn-ghost btn-sm" id="prev-m">◀</button>
        <span class="cal-month">${monthNames[month - 1]} ${year}</span>
        <button class="btn btn-ghost btn-sm" id="next-m">▶</button>
      </div>
      <div class="cal-header"><div>L</div><div>M</div><div>X</div><div>J</div><div>V</div><div>S</div><div>D</div></div>
      <div class="cal-grid" id="cal-grid"></div>
    `;

        const grid = calContainer.querySelector('#cal-grid');
        const todayStr = new Date().toISOString().split('T')[0];
        const shift = firstDay === 0 ? 6 : firstDay - 1;

        for (let i = 0; i < shift; i++) {
            const e = document.createElement('div');
            e.className = 'cal-day empty';
            grid.appendChild(e);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const el = document.createElement('div');
            el.className = 'cal-day';
            if (dateStr === todayStr) el.classList.add('today');
            if (dates.includes(dateStr)) el.classList.add('has-workout');
            el.textContent = d;
            el.onclick = () => loadDateSessions(dateStr);
            grid.appendChild(el);
        }

        calContainer.querySelector('#prev-m').onclick = () => { month--; if (month < 1) { month = 12; year--; } renderCalendar(); };
        calContainer.querySelector('#next-m').onclick = () => { month++; if (month > 12) { month = 1; year++; } renderCalendar(); };
    }

    async function loadDateSessions(date) {
        const sessions = await getSessions(date, date);
        listContainer.innerHTML = '';

        if (sessions.length === 0) {
            listContainer.innerHTML = `<div class="empty mt-lg"><div class="empty-text">Sin sesiones el ${formatDate(date)}</div></div>`;
            return;
        }

        const title = document.createElement('div');
        title.className = 'section-label mt-lg';
        title.textContent = formatDate(date);
        listContainer.appendChild(title);

        for (const sess of sessions) {
            const sets = await getSessionSets(sess.id);
            const card = document.createElement('div');
            card.className = 'card';
            const exerciseNames = [...new Set(sets.map(s2 => s2.exercise_name).filter(Boolean))];

            card.innerHTML = `
        <div class="flex items-center justify-between mb-md">
          <div><strong>${sessionTypeLabel(sess.tipo_sesion)}</strong><div class="text-xs text-secondary">${sess.hora_inicio || ''} – ${sess.hora_fin || ''} ${sess.duracion_min ? `(${sess.duracion_min} min)` : ''}</div></div>
          <div class="text-sm">${sess.rpe ? `RPE ${sess.rpe}` : ''}</div>
        </div>
        ${exerciseNames.length > 0 ? `<div class="text-sm text-secondary mb-sm">${exerciseNames.join(', ')}</div>` : ''}
        ${sets.length > 0 ? `<div class="text-xs text-muted">${sets.length} series total</div>` : ''}
        ${sess.notas ? `<div class="text-xs text-secondary mt-sm">📝 ${sess.notas}</div>` : ''}
        <div class="flex gap-sm mt-md">
          <button class="btn btn-ghost btn-sm del-btn" data-id="${sess.id}">🗑 Borrar</button>
        </div>
      `;
            card.querySelector('.del-btn').onclick = async (e) => {
                e.stopPropagation();
                if (confirm('¿Eliminar esta sesión?')) {
                    await deleteSession(sess.id);
                    showToast('Sesión eliminada');
                    loadDateSessions(date);
                }
            };
            listContainer.appendChild(card);
        }
    }

    // Load all recent sessions initially
    async function loadRecent() {
        const sessions = await getSessions();
        listContainer.innerHTML = '';
        if (sessions.length === 0) {
            listContainer.innerHTML = `<div class="empty"><div class="empty-icon">📅</div><div class="empty-text">Aún no tienes sesiones</div></div>`;
            return;
        }
        const label = document.createElement('div'); label.className = 'section-label mt-lg'; label.textContent = 'Recientes'; listContainer.appendChild(label);
        sessions.slice(0, 10).forEach(sess => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `<div class="list-icon">${sessionTypeLabel(sess.tipo_sesion).split(' ')[0]}</div><div class="list-item-body"><div class="list-item-title">${sessionTypeLabel(sess.tipo_sesion)}</div><div class="list-item-sub">${formatDate(sess.fecha)} • ${sess.duracion_min ? sess.duracion_min + ' min' : ''} ${sess.rpe ? '• RPE ' + sess.rpe : ''}</div></div>`;
            item.onclick = () => loadDateSessions(sess.fecha);
            listContainer.appendChild(item);
        });
    }

    await renderCalendar();
    await loadRecent();
    return s;
}

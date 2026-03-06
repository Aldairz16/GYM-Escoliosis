// Routines Screen — CRUD routines
import { getRoutines, createRoutine, updateRoutine, deleteRoutine, getRoutineExercises, setRoutineExercises, getExercises } from '../db/supabase.js';
import { navigate } from '../router.js';
import { showToast, showModal, SESSION_TYPES, CATEGORIES } from '../components/ui.js';

export async function renderRoutines() {
    const s = document.createElement('div');
    s.className = 'screen';
    s.innerHTML = `<h1 class="screen-title">Rutinas</h1><p class="screen-subtitle">Plantillas de entrenamiento</p>`;

    const listEl = document.createElement('div');
    s.appendChild(listEl);

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary btn-block mt-lg';
    addBtn.textContent = '+ Nueva Rutina';
    addBtn.onclick = () => showRoutineEditor();
    s.appendChild(addBtn);

    async function loadList() {
        const routines = await getRoutines();
        listEl.innerHTML = '';
        if (routines.length === 0) {
            listEl.innerHTML = `<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">Sin rutinas. Crea tu primera plantilla.</div></div>`;
            return;
        }
        routines.forEach(r => {
            const item = document.createElement('div');
            item.className = 'card';
            item.innerHTML = `
        <div class="flex items-center justify-between mb-sm">
          <strong>${r.nombre}</strong>
          <span class="text-xs text-secondary">${r.tipo_sesion || ''}</span>
        </div>
        ${r.notas ? `<div class="text-xs text-secondary">${r.notas}</div>` : ''}
        <div class="flex gap-sm mt-md">
          <button class="btn btn-ghost btn-sm edit-btn">✏️ Editar</button>
          <button class="btn btn-ghost btn-sm dup-btn">📋 Duplicar</button>
          <button class="btn btn-ghost btn-sm text-danger del-btn">🗑</button>
        </div>
      `;
            item.querySelector('.edit-btn').onclick = () => showRoutineEditor(r);
            item.querySelector('.dup-btn').onclick = async () => {
                const exs = await getRoutineExercises(r.id);
                const newR = await createRoutine({ nombre: r.nombre + ' (copia)', tipo_sesion: r.tipo_sesion, notas: r.notas });
                if (exs.length) await setRoutineExercises(newR.id, exs.map(e => ({ exercise_id: e.exercise_id, series_sugeridas: e.series_sugeridas, reps_sugeridas: e.reps_sugeridas, peso_objetivo_kg: e.peso_objetivo_kg, duracion_objetivo_seg: e.duracion_objetivo_seg })));
                showToast('✅ Rutina duplicada');
                loadList();
            };
            item.querySelector('.del-btn').onclick = async () => {
                if (confirm('¿Eliminar rutina?')) { await deleteRoutine(r.id); showToast('Eliminada'); loadList(); }
            };
            listEl.appendChild(item);
        });
    }

    async function showRoutineEditor(existing = null) {
        const allExercises = await getExercises();
        let routineExs = existing ? await getRoutineExercises(existing.id) : [];
        let nombre = existing?.nombre || '';
        let tipo = existing?.tipo_sesion || 'full_body';
        let notas = existing?.notas || '';

        const content = document.createElement('div');

        function renderEditor() {
            content.innerHTML = `
        <div class="input-group"><label class="input-label">Nombre</label><input class="input" id="r-name" value="${nombre}"></div>
        <div class="input-group"><label class="input-label">Tipo de sesión</label><select class="input" id="r-type">${SESSION_TYPES.map(t => `<option value="${t.value}" ${t.value === tipo ? 'selected' : ''}>${t.label}</option>`).join('')}</select></div>
        <div class="input-group"><label class="input-label">Notas</label><textarea class="input" id="r-notes" rows="2">${notas}</textarea></div>
        <div class="section-label mt-lg">Ejercicios</div>
        <div id="r-exs"></div>
        <button class="btn btn-secondary btn-block btn-sm mt-md" id="add-ex-btn">+ Agregar Ejercicio</button>
        <button class="btn btn-primary btn-block btn-lg mt-lg" id="save-btn">💾 Guardar Rutina</button>
      `;

            const exList = content.querySelector('#r-exs');
            routineExs.forEach((re, idx) => {
                const ex = re.exercises || allExercises.find(e => e.id === re.exercise_id);
                const row = document.createElement('div');
                row.className = 'list-item';
                row.innerHTML = `
          <div class="list-item-body">
            <div class="list-item-title">${ex?.nombre || 'Ejercicio'}</div>
            <div class="list-item-sub">${re.series_sugeridas || 3}×${re.reps_sugeridas || 10} ${re.peso_objetivo_kg ? re.peso_objetivo_kg + 'kg' : ''}</div>
          </div>
          <div class="flex gap-sm">
            ${idx > 0 ? `<button class="btn btn-ghost btn-sm up-btn">↑</button>` : ''}
            ${idx < routineExs.length - 1 ? `<button class="btn btn-ghost btn-sm down-btn">↓</button>` : ''}
            <button class="btn btn-ghost btn-sm text-danger rem-btn">✕</button>
          </div>
        `;
                row.querySelector('.rem-btn').onclick = () => { routineExs.splice(idx, 1); renderEditor(); };
                row.querySelector('.up-btn')?.addEventListener('click', () => { [routineExs[idx - 1], routineExs[idx]] = [routineExs[idx], routineExs[idx - 1]]; renderEditor(); });
                row.querySelector('.down-btn')?.addEventListener('click', () => { [routineExs[idx], routineExs[idx + 1]] = [routineExs[idx + 1], routineExs[idx]]; renderEditor(); });
                exList.appendChild(row);
            });

            content.querySelector('#add-ex-btn').onclick = () => {
                const picker = document.createElement('div');
                allExercises.forEach(ex => {
                    const it = document.createElement('div');
                    it.className = 'list-item';
                    it.innerHTML = `<div class="list-item-body"><div class="list-item-title">${ex.nombre}</div><div class="list-item-sub">${ex.categoria}</div></div>`;
                    it.onclick = () => {
                        routineExs.push({ exercise_id: ex.id, exercises: ex, series_sugeridas: 3, reps_sugeridas: ex.es_resistencia ? null : 10, duracion_objetivo_seg: ex.es_resistencia ? 30 : null });
                        document.querySelectorAll('.modal-overlay')[1]?.remove();
                        renderEditor();
                    };
                    picker.appendChild(it);
                });
                showModal({ title: 'Seleccionar Ejercicio', content: picker });
            };

            content.querySelector('#save-btn').onclick = async () => {
                nombre = content.querySelector('#r-name').value;
                tipo = content.querySelector('#r-type').value;
                notas = content.querySelector('#r-notes').value;
                if (!nombre) return showToast('❌ Nombre requerido');
                try {
                    let r;
                    if (existing) {
                        r = await updateRoutine(existing.id, { nombre, tipo_sesion: tipo, notas });
                    } else {
                        r = await createRoutine({ nombre, tipo_sesion: tipo, notas });
                    }
                    await setRoutineExercises(r.id, routineExs.map(e => ({
                        exercise_id: e.exercise_id, series_sugeridas: e.series_sugeridas || 3,
                        reps_sugeridas: e.reps_sugeridas, peso_objetivo_kg: e.peso_objetivo_kg,
                        duracion_objetivo_seg: e.duracion_objetivo_seg
                    })));
                    document.querySelector('.modal-overlay')?.remove();
                    showToast('✅ Rutina guardada');
                    loadList();
                } catch (e) { showToast('❌ ' + e.message); }
            };
        }
        renderEditor();
        showModal({ title: existing ? 'Editar Rutina' : 'Nueva Rutina', content });
    }

    await loadList();
    return s;
}

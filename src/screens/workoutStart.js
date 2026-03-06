// Start Workout Screen — select type, optional routine, then go to active
import { getRoutines, getRoutineExercises, createSession } from '../db/supabase.js';
import { navigate } from '../router.js';
import { showToast, today, nowTime, SESSION_TYPES, createChips } from '../components/ui.js';

export async function renderWorkoutStart() {
    const s = document.createElement('div');
    s.className = 'screen';

    const routines = await getRoutines();
    let tipo = 'full_body';
    let selectedRoutine = null;

    s.innerHTML = `<h1 class="screen-title">Nuevo Entrenamiento</h1><p class="screen-subtitle">Configura tu sesión</p>`;

    // Date
    const dateGroup = document.createElement('div');
    dateGroup.className = 'input-group';
    dateGroup.innerHTML = `<label class="input-label">Fecha</label><input type="date" class="input" id="ws-date" value="${today()}">`;
    s.appendChild(dateGroup);

    // Type chips
    const typeLabel = document.createElement('div');
    typeLabel.className = 'section-label';
    typeLabel.textContent = 'Tipo de sesión';
    s.appendChild(typeLabel);
    s.appendChild(createChips({ options: SESSION_TYPES, selected: tipo, onChange: v => { tipo = v; } }));

    // Routine select
    if (routines.length > 0) {
        const routineGroup = document.createElement('div');
        routineGroup.className = 'input-group';
        routineGroup.innerHTML = `<label class="input-label">Rutina predefinida (opcional)</label><select class="input" id="ws-routine"><option value="">— Sin rutina —</option>${routines.map(r => `<option value="${r.id}">${r.nombre}</option>`).join('')}</select>`;
        routineGroup.querySelector('select').onchange = e => {
            selectedRoutine = e.target.value ? +e.target.value : null;
        };
        s.appendChild(routineGroup);
    }

    // Start button
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary btn-block btn-lg mt-lg';
    btn.textContent = '🚀 Iniciar Sesión';
    btn.onclick = async () => {
        btn.disabled = true;
        try {
            const fecha = s.querySelector('#ws-date').value || today();
            const session = await createSession({
                fecha, hora_inicio: nowTime(), tipo_sesion: tipo,
                rutina_id: selectedRoutine, completada: false
            });
            // Store active session ID
            localStorage.setItem('activeSession', JSON.stringify(session));
            // If routine selected, pre-load exercises
            if (selectedRoutine) {
                const rExs = await getRoutineExercises(selectedRoutine);
                localStorage.setItem('routineExercises', JSON.stringify(rExs));
            }
            navigate('/workout/active');
        } catch (e) {
            showToast('❌ ' + e.message);
            btn.disabled = false;
        }
    };
    s.appendChild(btn);

    return s;
}

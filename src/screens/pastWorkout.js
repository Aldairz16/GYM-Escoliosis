// Past Workout Screen — Static tracking for past sessions without timers
import { getExercises, getMaxWeight, createSession, addSetsBulk, getRoutines, getRoutineExercises } from '../db/supabase.js';
import { navigate } from '../router.js';
import { showToast, showModal, createSlider, CATEGORIES, SESSION_TYPES, createChips, today, formatTimer } from '../components/ui.js';

export async function renderPastWorkout() {
    const s = document.createElement('div');
    s.className = 'screen';

    // State in memory
    const prefillDate = sessionStorage.getItem('prefillWorkoutDate') || today();
    sessionStorage.removeItem('prefillWorkoutDate');
    
    let state = {
        fecha: prefillDate,
        tipo_sesion: 'full_body',
        rutina_id: null,
        rpe: 5,
        dolor: 0,
        notas: '',
        hora_inicio: '12:00',
        hora_fin: '13:00'
    };
    let localSets = [];
    let maxWeights = {};
    const allExercises = await getExercises();
    const routines = await getRoutines();
    const weightUnit = 'kg'; // simplify static since getConfig is async, we can just use kg
    
    s.innerHTML = `<h1 class="screen-title mb-lg">Registro Pasado</h1>`;

    const configBlock = document.createElement('div');
    s.appendChild(configBlock);

    const builderBlock = document.createElement('div');
    builderBlock.style.display = 'none'; // revealed after configuring basic session details
    s.appendChild(builderBlock);

    // Helper: generate temp id
    const genId = () => Math.random().toString(36).substr(2, 9);

    async function loadRoutine(routineId) {
        if (!routineId) return;
        const re = await getRoutineExercises(routineId);
        for (const rx of re) {
            const ex = rx.exercises || allExercises.find(e => e.id === rx.exercise_id);
            if (!ex) continue;
            const numSets = rx.series_sugeridas || 3;
            // Simply use target weight directly or 0
            const w = rx.peso_objetivo_kg || 0;
            const reps = rx.reps_sugeridas || 10;
            const dur = rx.duracion_objetivo_seg || 0;

            const baseName = ex.nombre;
            const isRes = ex.es_resistencia;
            
            if (ex.lado === 'unilateral') {
                for (let i = 1; i <= numSets; i++) {
                    localSets.push({ id: genId(), exercise_id: ex.id, exercise_name: `${baseName} (Izq)`, numero_serie: i, peso_kg: w, repeticiones: isRes ? null : reps, duracion_seg: isRes ? dur : null, tipo_serie: 'normal', isRes });
                    localSets.push({ id: genId(), exercise_id: ex.id, exercise_name: `${baseName} (Der)`, numero_serie: i, peso_kg: w, repeticiones: isRes ? null : reps, duracion_seg: isRes ? dur : null, tipo_serie: 'normal', isRes });
                }
            } else {
                for (let i = 1; i <= numSets; i++) {
                    localSets.push({ id: genId(), exercise_id: ex.id, exercise_name: baseName, numero_serie: i, peso_kg: w, repeticiones: isRes ? null : reps, duracion_seg: isRes ? dur : null, tipo_serie: 'normal', isRes });
                }
            }
            if (!isRes && maxWeights[ex.id] === undefined) maxWeights[ex.id] = await getMaxWeight(ex.id);
        }
        renderBuilder();
    }

    function renderConfig() {
        configBlock.innerHTML = '';
        
        // Date & Times
        const dateGroup = document.createElement('div');
        dateGroup.className = 'input-group flex gap-md';
        dateGroup.innerHTML = `
            <div style="flex:1"><label class="input-label">Fecha</label><input type="date" class="input" id="pw-date" value="${state.fecha}"></div>
        `;
        // <div style="width:100px"><label class="input-label">Inicio</label><input type="time" class="input" id="pw-start" value="${state.hora_inicio}"></div>
        // <div style="width:100px"><label class="input-label">Fin</label><input type="time" class="input" id="pw-end" value="${state.hora_fin}"></div>
        configBlock.appendChild(dateGroup);

        dateGroup.querySelector('#pw-date').onchange = e => state.fecha = e.target.value;

        // Times group
        const timeGroup = document.createElement('div');
        timeGroup.className = 'input-group flex gap-md mt-sm';
        timeGroup.innerHTML = `
            <div style="flex:1"><label class="input-label">Hora Inicio (Ref)</label><input type="time" class="input" id="pw-start" value="${state.hora_inicio}"></div>
            <div style="flex:1"><label class="input-label">Hora Fin (Ref)</label><input type="time" class="input" id="pw-end" value="${state.hora_fin}"></div>
        `;
        configBlock.appendChild(timeGroup);
        timeGroup.querySelector('#pw-start').onchange = e => state.hora_inicio = e.target.value;
        timeGroup.querySelector('#pw-end').onchange = e => state.hora_fin = e.target.value;

        // Type
        const typeLabel = document.createElement('div');
        typeLabel.className = 'section-label';
        typeLabel.textContent = 'Tipo de sesión';
        configBlock.appendChild(typeLabel);
        
        const chipsNode = createChips({ options: SESSION_TYPES, selected: state.tipo_sesion, onChange: v => { state.tipo_sesion = v; } });
        configBlock.appendChild(chipsNode);

        // Routine
        if (routines.length > 0) {
            const rGrp = document.createElement('div');
            rGrp.className = 'input-group mt-md';
            rGrp.innerHTML = `<label class="input-label">Cargar plantilla/rutina (opcional)</label>
                <select class="input" id="pw-routine"><option value="">— Ninguna —</option>${routines.map(r => `<option value="${r.id}">${r.nombre}</option>`).join('')}</select>`;
            configBlock.appendChild(rGrp);
            rGrp.querySelector('select').onchange = e => {
                state.rutina_id = e.target.value ? +e.target.value : null;
                if(state.rutina_id){
                    const rt = routines.find(x => x.id === state.rutina_id);
                    if(rt) {
                        state.tipo_sesion = rt.tipo_sesion || 'full_body';
                        renderConfig();
                    }
                }
            };
        }

        const bnb = document.createElement('button');
        bnb.className = 'btn btn-primary btn-block mt-lg';
        bnb.textContent = 'Siguiente: Llenar Series ➔';
        bnb.onclick = async () => {
            if (state.rutina_id && localSets.length === 0) {
                bnb.innerHTML = 'Cargando...'; bnb.disabled = true;
                await loadRoutine(state.rutina_id);
            }
            configBlock.style.display = 'none';
            builderBlock.style.display = 'block';
            renderBuilder();
        };
        configBlock.appendChild(bnb);
    }

    function groupSets() {
        const groups = {};
        localSets.forEach(set => {
            const key = set.exercise_id || set.exercise_name;
            if (!groups[key]) {
                const ex = allExercises.find(e => e.id === set.exercise_id);
                groups[key] = { exercise: ex, name: ex?.nombre || set.exercise_name?.replace(/ \\((Izq|Der)\\)$/, ''), sets: [], isResistance: set.isRes };
            }
            groups[key].sets.push(set);
        });
        return Object.values(groups);
    }

    function renderBuilder() {
        builderBlock.innerHTML = '';

        const groups = groupSets();

        if (groups.length === 0) {
            builderBlock.innerHTML += `<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">No hay ejercicios aún. Añade lo que hiciste.</div></div>`;
        }

        groups.forEach(g => {
            const block = document.createElement('div');
            block.className = 'exercise-block mb-md';

            const ehdr = document.createElement('div');
            ehdr.className = 'exercise-header';
            const prText = (!g.isResistance && maxWeights[g.exercise?.id]) ? `<span style="font-size:0.8rem;color:var(--accent);margin-left:8px">PR: ${maxWeights[g.exercise.id]}</span>` : '';
            ehdr.innerHTML = `<span class="exercise-name">${g.name}${prText}</span>${g.isResistance ? '<span class="exercise-badge">Resistencia</span>' : ''}`;
            block.appendChild(ehdr);

            const hdr = document.createElement('div');
            hdr.className = 'set-row header';
            hdr.style.gridTemplateColumns = '40px 1fr 1fr 1fr 40px';
            hdr.innerHTML = `<div>Set</div><div>${g.isResistance ? 'Seg' : 'Peso'}</div><div>${g.isResistance ? '' : 'Reps'}</div><div>Tipo</div><div></div>`;
            block.appendChild(hdr);

            g.sets.forEach((set, idx) => {
                const row = document.createElement('div');
                row.className = 'set-row';
                row.style.gridTemplateColumns = '40px 1fr 1fr 1fr 40px';
                
                row.innerHTML = `<div class="set-num">${set.numero_serie}</div>`;

                const inpW = document.createElement('input');
                inpW.className = 'set-input'; inpW.type = 'number'; inpW.inputMode = 'decimal';
                inpW.value = g.isResistance ? (set.duracion_seg || '') : (set.peso_kg || '');
                inpW.onchange = () => {
                    const v = parseFloat(inpW.value) || 0;
                    if(g.isResistance) set.duracion_seg = v; else set.peso_kg = v;
                };
                row.appendChild(inpW);

                if (g.isResistance) {
                    row.innerHTML += `<div></div>`;
                } else {
                    const inpR = document.createElement('input');
                    inpR.className = 'set-input'; inpR.type = 'number'; inpR.inputMode = 'numeric';
                    inpR.value = set.repeticiones || '';
                    inpR.onchange = () => set.repeticiones = parseInt(inpR.value) || 0;
                    row.appendChild(inpR);
                }

                const typeSel = document.createElement('select');
                typeSel.className = 'set-type-sel';
                typeSel.style.cssText = 'background:transparent;border:1px solid #333;color:var(--text);font-size:0.8rem;padding:2px;border-radius:4px';
                const tOpts = { 'normal': 'N', 'calentamiento': 'W', 'dropset': 'D', 'fallo': 'F' };
                typeSel.innerHTML = Object.entries(tOpts).map(([k, v]) => `<option value="${k}" ${set.tipo_serie === k ? 'selected' : ''}>${v}</option>`).join('');
                typeSel.onchange = () => set.tipo_serie = typeSel.value;
                row.appendChild(typeSel);

                const delBtn = document.createElement('button');
                delBtn.className = 'btn btn-ghost btn-sm text-danger';
                delBtn.innerHTML = '✕';
                delBtn.style.padding = '4px 8px';
                delBtn.onclick = () => {
                    localSets = localSets.filter(s => s.id !== set.id);
                    renderBuilder();
                };
                row.appendChild(delBtn);

                block.appendChild(row);
            });

            // Actions for this block
            const act = document.createElement('div');
            act.className = 'flex gap-sm mt-md';
            const abtn = document.createElement('button');
            abtn.className = 'btn btn-sm btn-secondary';
            abtn.textContent = '+ Añadir serie';
            abtn.onclick = () => {
                const last = g.sets[g.sets.length - 1];
                let isLeft = last.exercise_name?.endsWith('(Izq)');
                let isRight = last.exercise_name?.endsWith('(Der)');
                
                if ((isLeft || isRight) && g.exercise?.lado === 'unilateral') {
                    const baseName = g.exercise.nombre;
                    localSets.push({ id: genId(), exercise_id: last.exercise_id, exercise_name: `${baseName} (Izq)`, numero_serie: last.numero_serie + 1, peso_kg: last.peso_kg, repeticiones: last.repeticiones, duracion_seg: last.duracion_seg, tipo_serie: 'normal', isRes: g.isResistance });
                    localSets.push({ id: genId(), exercise_id: last.exercise_id, exercise_name: `${baseName} (Der)`, numero_serie: last.numero_serie + 1, peso_kg: last.peso_kg, repeticiones: last.repeticiones, duracion_seg: last.duracion_seg, tipo_serie: 'normal', isRes: g.isResistance });
                } else {
                    localSets.push({ id: genId(), exercise_id: last.exercise_id, exercise_name: last.exercise_name, numero_serie: last.numero_serie + 1, peso_kg: last.peso_kg, repeticiones: last.repeticiones, duracion_seg: last.duracion_seg, tipo_serie: 'normal', isRes: g.isResistance });
                }
                renderBuilder();
            };
            act.appendChild(abtn);
            block.appendChild(act);

            builderBlock.appendChild(block);
        });

        const ae = document.createElement('button');
        ae.className = 'btn btn-secondary btn-block mt-lg border-dashed';
        ae.textContent = '+ Agregar Ejercicio Nuevo';
        ae.onclick = () => showExercisePicker();
        builderBlock.appendChild(ae);

        const fin = document.createElement('button');
        fin.className = 'btn btn-primary btn-block btn-lg mt-lg mb-xl';
        fin.textContent = '💾 Guardar Registro en BD';
        fin.onclick = submitWorkout;
        builderBlock.appendChild(fin);
    }

    function showExercisePicker() {
        const content = document.createElement('div');
        let filterCat = null;
        function renderList() {
            content.innerHTML = '';
            const chips = document.createElement('div');
            chips.className = 'chip-group mb-md';
            const allChip = document.createElement('button');
            allChip.className = 'chip' + (!filterCat ? ' active' : '');
            allChip.textContent = 'Todos';
            allChip.onclick = () => { filterCat = null; renderList(); };
            chips.appendChild(allChip);
            CATEGORIES.forEach(c => {
                const ch = document.createElement('button');
                ch.className = 'chip' + (filterCat === c.value ? ' active' : '');
                ch.textContent = c.label;
                ch.onclick = () => { filterCat = c.value; renderList(); };
                chips.appendChild(ch);
            });
            content.appendChild(chips);

            const search = document.createElement('input');
            search.className = 'input mb-md';
            search.placeholder = 'Buscar...';
            search.oninput = () => {
                const q = search.value.toLowerCase();
                content.querySelectorAll('.ex-item').forEach(it => {
                    it.style.display = it.dataset.name.includes(q) ? '' : 'none';
                });
            };
            content.appendChild(search);

            const filtered = allExercises.filter(e => !filterCat || e.categoria === filterCat);
            filtered.forEach(ex => {
                const item = document.createElement('div');
                item.className = 'list-item ex-item';
                item.dataset.name = ex.nombre.toLowerCase();
                item.innerHTML = `<div class="list-item-body"><div class="list-item-title">${ex.nombre}</div><div class="list-item-sub">${ex.categoria}${ex.es_resistencia ? ' • resistencia' : ''}</div></div>`;
                item.onclick = async () => {
                    const isRes = ex.es_resistencia;
                    const numSets = 1;
                    const w = 0, reps = 10, dur = 0;
                    if (ex.lado === 'unilateral') {
                        localSets.push({ id: genId(), exercise_id: ex.id, exercise_name: `${ex.nombre} (Izq)`, numero_serie: 1, peso_kg: w, repeticiones: isRes?null:reps, duracion_seg: isRes?dur:null, tipo_serie: 'normal', isRes });
                        localSets.push({ id: genId(), exercise_id: ex.id, exercise_name: `${ex.nombre} (Der)`, numero_serie: 1, peso_kg: w, repeticiones: isRes?null:reps, duracion_seg: isRes?dur:null, tipo_serie: 'normal', isRes });
                    } else {
                        localSets.push({ id: genId(), exercise_id: ex.id, exercise_name: ex.nombre, numero_serie: 1, peso_kg: w, repeticiones: isRes?null:reps, duracion_seg: isRes?dur:null, tipo_serie: 'normal', isRes });
                    }
                    if (!isRes && maxWeights[ex.id] === undefined) maxWeights[ex.id] = await getMaxWeight(ex.id);
                    document.querySelector('.modal-overlay')?.remove();
                    renderBuilder();
                };
                content.appendChild(item);
            });
        }
        renderList();
        showModal({ title: 'Añadir Ejercicio', content });
    }

    async function submitWorkout() {
        if (localSets.length === 0 && !confirm('La sesión no tiene ejercicios registrados. ¿Guardar de todos modos?')) return;
        
        // Modal for RPE and notes
        const content = document.createElement('div');
        content.appendChild(createSlider({ label: 'RPE (Esfuerzo global)', id: 'pw-rpe', min: 1, max: 10, value: 5, onChange: v => state.rpe = v }));
        content.appendChild(createSlider({ label: 'Dolor de espalda durante sesión', id: 'pw-dolor', min: 0, max: 10, value: 0, onChange: v => state.dolor = v }));
        const notaGrp = document.createElement('div');
        notaGrp.className = 'input-group';
        notaGrp.innerHTML = `<label class="input-label">Notas extra</label><textarea class="input" id="pw-notas" placeholder="Sensaciones..."></textarea>`;
        content.appendChild(notaGrp);

        const btn = document.createElement('button');
        btn.className = 'btn btn-primary btn-block btn-lg mt-lg';
        btn.textContent = 'Confirmar Carga Directa 🚀';
        btn.onclick = async () => {
            btn.innerHTML = '⏳ Subiendo...'; btn.disabled = true;
            try {
                let [h1, m1] = state.hora_inicio.split(':').map(Number);
                let [h2, m2] = state.hora_fin.split(':').map(Number);
                let dur = ((h2*60 + m2) - (h1*60 + m1));
                if(dur < 0) dur += 24*60;

                state.notas = content.querySelector('#pw-notas').value;

                // 1. Create session
                const sess = await createSession({
                    fecha: state.fecha,
                    hora_inicio: state.hora_inicio,
                    hora_fin: state.hora_fin,
                    duracion_min: dur,
                    tipo_sesion: state.tipo_sesion,
                    rutina_id: state.rutina_id,
                    completada: true,
                    rpe: state.rpe,
                    dolor_espalda_durante: state.dolor,
                    notas: state.notas
                });

                // 2. Map and insert sets
                const setsPayload = localSets.map(s => ({
                    session_id: sess.id,
                    exercise_id: s.exercise_id,
                    exercise_name: s.exercise_name,
                    numero_serie: s.numero_serie,
                    peso_kg: s.peso_kg || 0,
                    repeticiones: s.isRes ? null : (s.repeticiones || 0),
                    duracion_seg: s.isRes ? (s.duracion_seg || 0) : null,
                    tipo_serie: s.tipo_serie,
                    completada: true
                }));
                
                if(setsPayload.length > 0) {
                    await addSetsBulk(setsPayload);
                }

                document.querySelector('.modal-overlay')?.remove();
                showToast('✅ Registro pasado guardado exitosamente');
                navigate('/history');
            } catch (err) {
                btn.innerHTML = 'Error'; btn.disabled = false;
                showToast('❌ Error: ' + err.message);
            }
        };
        content.appendChild(btn);
        showModal({ title: 'Últimos detalles', content });
    }

    renderConfig();
    return s;
}

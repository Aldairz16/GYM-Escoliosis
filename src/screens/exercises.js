// Exercises Screen — with detail modals and alternatives
import { getExercises, createExercise } from '../db/supabase.js';
import { showToast, showModal, CATEGORIES, createInput, createChips } from '../components/ui.js';

export async function renderExercises() {
    const s = document.createElement('div');
    s.className = 'screen';
    s.innerHTML = `<h1 class="screen-title">Ejercicios</h1><p class="screen-subtitle">Catálogo de ejercicios</p>`;

    let filterCat = null;
    let searchQuery = '';

    const filterEl = document.createElement('div');
    s.appendChild(filterEl);

    const search = document.createElement('input');
    search.className = 'input mb-md';
    search.placeholder = '🔍 Buscar...';
    search.oninput = () => { searchQuery = search.value.toLowerCase(); renderList(); };
    s.appendChild(search);

    const listEl = document.createElement('div');
    s.appendChild(listEl);

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-secondary btn-block mt-lg';
    addBtn.textContent = '+ Crear Ejercicio';
    addBtn.onclick = () => showCreateModal();
    s.appendChild(addBtn);

    let exercises = await getExercises();

    function renderFilters() {
        filterEl.innerHTML = '';
        const chips = document.createElement('div');
        chips.className = 'chip-group';
        const allChip = document.createElement('button');
        allChip.className = 'chip' + (!filterCat ? ' active' : '');
        allChip.textContent = 'Todos';
        allChip.onclick = () => { filterCat = null; renderFilters(); renderList(); };
        chips.appendChild(allChip);
        CATEGORIES.forEach(c => {
            const ch = document.createElement('button');
            ch.className = 'chip' + (filterCat === c.value ? ' active' : '');
            ch.textContent = c.label;
            ch.onclick = () => { filterCat = c.value; renderFilters(); renderList(); };
            chips.appendChild(ch);
        });
        filterEl.appendChild(chips);
    }

    function renderList() {
        listEl.innerHTML = '';
        const filtered = exercises.filter(e => {
            if (filterCat && e.categoria !== filterCat) return false;
            if (searchQuery && !e.nombre.toLowerCase().includes(searchQuery)) return false;
            return true;
        });
        if (filtered.length === 0) {
            listEl.innerHTML = `<div class="empty"><div class="empty-text">No hay ejercicios</div></div>`;
            return;
        }
        filtered.forEach(ex => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.style.cursor = 'pointer';
            item.innerHTML = `
        <div class="list-icon">${CATEGORIES.find(c => c.value === ex.categoria)?.label.split(' ')[0] || '📋'}</div>
        <div class="list-item-body">
          <div class="list-item-title">${ex.nombre}</div>
          <div class="list-item-sub">${ex.categoria} ${ex.es_resistencia ? '• ⏱ resistencia' : ''} ${ex.series_sugeridas ? '• ' + ex.series_sugeridas + '×' + (ex.reps_sugeridas || (ex.tiempo_sugerido_seg + 's')) : ''}${ex.user_id ? ' • ⭐ personal' : ''}</div>
        </div>
        <span style="color:var(--text-muted);font-size:1.1rem">›</span>
      `;
            item.onclick = () => showExerciseDetail(ex);
            listEl.appendChild(item);
        });
    }

    function showExerciseDetail(ex) {
        const content = document.createElement('div');

        // Image
        if (ex.url_imagen) {
            const img = document.createElement('img');
            img.src = ex.url_imagen;
            img.alt = ex.nombre;
            img.style.cssText = 'width:100%;border-radius:var(--r-md);margin-bottom:var(--sp-lg);max-height:200px;object-fit:cover;';
            content.appendChild(img);
        }

        // Category badge
        const badge = document.createElement('div');
        badge.className = 'exercise-badge mb-md';
        badge.style.display = 'inline-block';
        badge.textContent = `${CATEGORIES.find(c => c.value === ex.categoria)?.label || ex.categoria} ${ex.es_resistencia ? '• ⏱ Resistencia' : ''}`;
        content.appendChild(badge);

        // Suggested sets
        if (ex.series_sugeridas) {
            const setsInfo = document.createElement('div');
            setsInfo.className = 'text-sm mb-md';
            setsInfo.style.color = 'var(--accent)';
            setsInfo.style.fontWeight = '700';
            const repsText = ex.es_resistencia && ex.tiempo_sugerido_seg
                ? `${ex.tiempo_sugerido_seg}s`
                : `${ex.reps_sugeridas || '?'} reps`;
            setsInfo.textContent = `📊 ${ex.series_sugeridas} series × ${repsText}`;
            content.appendChild(setsInfo);
        }

        // Description
        if (ex.descripcion) {
            const descLabel = document.createElement('div');
            descLabel.className = 'section-label mt-md';
            descLabel.textContent = '📝 Descripción';
            content.appendChild(descLabel);
            const desc = document.createElement('p');
            desc.className = 'text-sm';
            desc.style.color = 'var(--text-secondary)';
            desc.style.lineHeight = '1.6';
            desc.textContent = ex.descripcion;
            content.appendChild(desc);
        }

        // Scoliosis notes
        if (ex.indicaciones_escoliosis) {
            const scLabel = document.createElement('div');
            scLabel.className = 'section-label mt-lg';
            scLabel.textContent = '🏥 Indicaciones para Escoliosis';
            content.appendChild(scLabel);
            const sc = document.createElement('div');
            sc.style.cssText = 'background:var(--accent-dim);border-radius:var(--r-md);padding:var(--sp-md);margin-top:var(--sp-sm);';
            sc.innerHTML = `<p class="text-sm" style="color:var(--accent)">${ex.indicaciones_escoliosis}</p>`;
            content.appendChild(sc);
        }

        // Alternatives
        if (ex.alternativas_ids && ex.alternativas_ids.length > 0) {
            const altLabel = document.createElement('div');
            altLabel.className = 'section-label mt-lg';
            altLabel.textContent = '🔄 Alternativas';
            content.appendChild(altLabel);

            ex.alternativas_ids.forEach(altId => {
                const altEx = exercises.find(e => e.id === altId);
                if (!altEx) return;
                const altItem = document.createElement('div');
                altItem.className = 'list-item';
                altItem.style.cursor = 'pointer';
                altItem.innerHTML = `
          <div class="list-icon">${CATEGORIES.find(c => c.value === altEx.categoria)?.label.split(' ')[0] || '📋'}</div>
          <div class="list-item-body">
            <div class="list-item-title">${altEx.nombre}</div>
            <div class="list-item-sub">${altEx.categoria}${altEx.es_resistencia ? ' • ⏱' : ''}</div>
          </div>
        `;
                altItem.onclick = () => {
                    document.querySelector('.modal-overlay')?.remove();
                    showExerciseDetail(altEx);
                };
                content.appendChild(altItem);
            });
        }

        // Side tag
        if (ex.lado && ex.lado !== 'bilateral') {
            const sideTag = document.createElement('div');
            sideTag.className = 'text-xs text-muted mt-md';
            sideTag.textContent = `Lado: ${ex.lado}`;
            content.appendChild(sideTag);
        }

        showModal({ title: ex.nombre, content });
    }

    function showCreateModal() {
        const content = document.createElement('div');
        let cat = 'pierna', resist = false;

        content.appendChild(createInput({ label: 'Nombre del ejercicio', id: 'ex-name', placeholder: 'Ej: Sentadilla con barra' }));
        content.appendChild(createInput({ label: 'Descripción', type: 'textarea', id: 'ex-desc', placeholder: 'Cómo se hace...' }));
        content.appendChild(createInput({ label: 'Indicaciones escoliosis', type: 'textarea', id: 'ex-escol', placeholder: 'Precauciones para la espalda...' }));

        const catLabel = document.createElement('div'); catLabel.className = 'section-label'; catLabel.textContent = 'Categoría';
        content.appendChild(catLabel);
        content.appendChild(createChips({ options: CATEGORIES, selected: cat, onChange: v => cat = v }));

        const resistRow = document.createElement('div');
        resistRow.className = 'toggle-row';
        resistRow.innerHTML = `<span class="input-label">¿Ejercicio de resistencia? (medir en segundos)</span><label class="toggle"><input type="checkbox" id="ex-resist"><span class="toggle-track"></span></label>`;
        resistRow.querySelector('#ex-resist').onchange = e => resist = e.target.checked;
        content.appendChild(resistRow);

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-primary btn-block btn-lg mt-lg';
        saveBtn.textContent = '💾 Crear';
        saveBtn.onclick = async () => {
            const nombre = content.querySelector('#ex-name').value.trim();
            if (!nombre) return showToast('❌ Nombre requerido');
            try {
                await createExercise({
                    nombre, categoria: cat, es_resistencia: resist, lado: 'bilateral',
                    descripcion: content.querySelector('#ex-desc').value || null,
                    indicaciones_escoliosis: content.querySelector('#ex-escol').value || null,
                });
                exercises = await getExercises();
                document.querySelector('.modal-overlay')?.remove();
                showToast('✅ Ejercicio creado');
                renderList();
            } catch (e) { showToast('❌ ' + e.message); }
        };
        content.appendChild(saveBtn);
        showModal({ title: 'Nuevo Ejercicio', content });
    }

    renderFilters();
    renderList();
    return s;
}

// Health Notes / Pain Diary Screen
import { addNota, getAllNotas, deleteNota } from '../db/operations.js';
import { createTextarea, createInputGroup, showToast, todayISO, formatDateShort } from '../components/ui.js';
import { navigate } from '../router.js';

export async function renderNotes() {
    const screen = document.createElement('div');
    screen.className = 'screen';

    screen.innerHTML = `
    <div class="header-bar">
      <button class="back-btn" id="back-btn">←</button>
      <span class="header-title">Notas Clínicas</span>
    </div>
  `;

    screen.querySelector('#back-btn').addEventListener('click', () => navigate('/mas'));

    // New note form
    const form = document.createElement('div');
    form.className = 'card';
    form.innerHTML = '<h3 class="section-title">Nueva Nota</h3>';
    form.appendChild(createInputGroup({ label: 'Fecha', type: 'date', id: 'nota-fecha', value: todayISO() }));
    form.appendChild(createTextarea({
        label: 'Nota',
        id: 'nota-texto',
        placeholder: 'Ej: dolor fuerte en cadera derecha al estar de pie, aumenté peso en prensa sin dolor...',
        rows: 4
    }));

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary btn-block';
    saveBtn.textContent = '💾 Guardar Nota';
    saveBtn.addEventListener('click', async () => {
        const text = screen.querySelector('#nota-texto').value.trim();
        if (!text) return;
        await addNota({
            fecha: screen.querySelector('#nota-fecha').value,
            texto: text,
            timestamp: new Date().toISOString()
        });
        screen.querySelector('#nota-texto').value = '';
        showToast('✅ Nota guardada');
        renderNotesList(screen.querySelector('#notes-list'));
    });
    form.appendChild(saveBtn);
    screen.appendChild(form);

    // Notes list
    const listLabel = document.createElement('p');
    listLabel.className = 'section-label mt-xl';
    listLabel.textContent = 'Historial de Notas';
    screen.appendChild(listLabel);

    const listDiv = document.createElement('div');
    listDiv.id = 'notes-list';
    screen.appendChild(listDiv);

    renderNotesList(listDiv);

    return screen;
}

async function renderNotesList(container) {
    container.innerHTML = '';
    const all = (await getAllNotas()).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.timestamp?.localeCompare(a.timestamp));

    if (all.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><p class="empty-state-text">Sin notas clínicas</p></div>';
        return;
    }

    for (const nota of all.slice(0, 50)) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
      <div class="flex justify-between items-center mb-sm">
        <span class="badge badge-teal">${formatDateShort(nota.fecha)}</span>
        <button class="btn btn-ghost btn-sm del-nota" style="color: var(--accent-danger)">✕</button>
      </div>
      <p class="text-sm">${nota.texto}</p>
    `;
        card.querySelector('.del-nota').addEventListener('click', async () => {
            if (confirm('¿Eliminar esta nota?')) {
                await deleteNota(nota.id);
                showToast('Nota eliminada');
                renderNotesList(container);
            }
        });
        container.appendChild(card);
    }
}

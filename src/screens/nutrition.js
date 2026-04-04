// Nutrition Log Screen
import { getNutritionLogs, addNutritionLog, deleteNutritionLog } from '../db/supabase.js';
import { showToast, showModal, today, createInput, formatDate } from '../components/ui.js';
import { navigate } from '../router.js';
import { analyzeFoodImageBase64, fileToBase64 } from '../services/ai_vision.js';

export async function renderNutrition() {
    const s = document.createElement('div');
    s.className = 'screen';
    s.innerHTML = `
    <div class="header-bar">
      <button class="back-btn" id="back">←</button>
      <span class="header-title">Nutrición y Dieta</span>
    </div>`;
    s.querySelector('#back').onclick = () => navigate('/');

    let fecha = today();

    const dateInput = document.createElement('div');
    dateInput.className = 'input-group mt-md';
    dateInput.innerHTML = `<label class="input-label">Fecha</label><input type="date" class="input" id="nt-date" value="${fecha}">`;
    s.appendChild(dateInput);

    // Resumen del día
    const summaryCard = document.createElement('div');
    summaryCard.className = 'card mt-lg';
    summaryCard.innerHTML = `
        <div class="flex justify-between items-center mb-sm">
            <h3 class="section-title mb-0">Total del Día</h3>
            <div id="nt-kcal-total" style="font-weight: bold; font-size: 1.2rem; color: var(--primary);">0 kcal</div>
        </div>
        <div class="flex gap-md text-sm text-secondary">
            <div>Proteínas: <span id="nt-prot-total">0</span>g</div>
            <div>Carbs: <span id="nt-carb-total">0</span>g</div>
            <div>Grasas: <span id="nt-fat-total">0</span>g</div>
        </div>
    `;
    s.appendChild(summaryCard);

    // Botón principal de IA
    const aiBtnContainer = document.createElement('div');
    aiBtnContainer.className = 'mt-xl mb-xl';
    aiBtnContainer.innerHTML = `
        <button class="btn btn-primary btn-block btn-lg" id="btn-scan-food" style="background: linear-gradient(135deg, #FF6B6B, #C0392B); border-color: transparent;">
            <span style="font-size: 1.2rem; margin-right: 8px;">📸</span> Escanear Comida con IA
        </button>
        <input type="file" id="fi-food-img" accept="image/*" capture="environment" style="display:none;">
    `;
    s.appendChild(aiBtnContainer);

    const manualBtn = document.createElement('button');
    manualBtn.className = 'btn btn-ghost btn-block text-sm mb-lg';
    manualBtn.textContent = '✍️ Agregar Manualmente';
    s.appendChild(manualBtn);

    // Listado de comidas
    const listSection = document.createElement('div');
    listSection.innerHTML = `<h3 class="section-label">Comidas Registradas</h3><div id="nt-list"></div>`;
    s.appendChild(listSection);

    // Funciones
    async function loadDay(d) {
        fecha = d;
        const listEl = listSection.querySelector('#nt-list');
        listEl.innerHTML = '<div class="text-secondary text-sm">Cargando...</div>';
        
        let logs = [];
        try {
            logs = await getNutritionLogs(fecha);
            
            let tKcal = 0, tProt = 0, tCarb = 0, tFat = 0;
            listEl.innerHTML = '';
            
            if (logs.length === 0) {
                listEl.innerHTML = '<div class="text-secondary text-sm text-center py-lg border border-dashed border-light rounded">No hay comidas registradas. ¡Escanea tu próxima comida!</div>';
            } else {
                logs.forEach(log => {
                    tKcal += log.calorias || 0;
                    tProt += parseFloat(log.proteinas) || 0;
                    tCarb += parseFloat(log.carbohidratos) || 0;
                    tFat += parseFloat(log.grasas) || 0;

                    const item = document.createElement('div');
                    item.className = 'card mb-md';
                    item.innerHTML = `
                        <div class="flex justify-between items-start">
                            <div>
                                <div style="font-weight: bold; color: var(--text);">${log.nombre_comida}</div>
                                <div class="text-xs text-secondary mt-xs">${log.hora.slice(0, 5)}</div>
                            </div>
                            <div class="text-right">
                                <div style="font-weight: 700; color: var(--primary);">${log.calorias} kcal</div>
                                <div class="text-xs text-secondary mt-xs">P: ${log.proteinas}g | C: ${log.carbohidratos}g | G: ${log.grasas}g</div>
                            </div>
                        </div>
                        <div class="flex justify-end mt-sm">
                            <button class="btn btn-sm btn-ghost text-danger btn-del" data-id="${log.id}">🗑️</button>
                        </div>
                    `;
                    item.querySelector('.btn-del').onclick = async () => {
                        if(confirm('¿Eliminar esta comida?')) {
                            try {
                                await deleteNutritionLog(log.id);
                                loadDay(fecha);
                                showToast('Comida eliminada');
                            } catch(e) { showToast('Error al eliminar'); }
                        }
                    };
                    listEl.appendChild(item);
                });
            }

            // Actualizar resumen
            summaryCard.querySelector('#nt-kcal-total').innerText = `${tKcal} kcal`;
            summaryCard.querySelector('#nt-prot-total').innerText = tProt.toFixed(1);
            summaryCard.querySelector('#nt-carb-total').innerText = tCarb.toFixed(1);
            summaryCard.querySelector('#nt-fat-total').innerText = tFat.toFixed(1);

        } catch (e) {
            listEl.innerHTML = '<div class="text-danger text-sm">Error al cargar registros.</div>';
        }
    }

    s.querySelector('#nt-date').onchange = e => {
        loadDay(e.target.value);
    };

    // Agregar manual config
    function openFoodModal(initialData = null) {
        const m = document.createElement('div');
        m.innerHTML = `
            ${initialData && initialData.ai ? '<div class="bg-success text-success p-sm text-xs rounded mb-md text-center">✨ Analizado por Gemini IA ✨</div>' : ''}
            <div class="input-group mb-sm"><label class="input-label">Nombre de Comida</label><input type="text" class="input" id="f-name" value="${initialData?.nombre_comida || ''}" placeholder="Ej: Pechuga con Arroz"></div>
            <div class="flex gap-sm mb-sm">
                <div class="input-group" style="flex:1;"><label class="input-label">Calorías (kcal)</label><input type="number" class="input" id="f-cal" value="${initialData?.calorias || 0}"></div>
                <div class="input-group" style="flex:1;"><label class="input-label">Proteínas (g)</label><input type="number" step="0.1" class="input" id="f-prot" value="${initialData?.proteinas || 0}"></div>
            </div>
            <div class="flex gap-sm mb-md">
                <div class="input-group" style="flex:1;"><label class="input-label">Carbs (g)</label><input type="number" step="0.1" class="input" id="f-carb" value="${initialData?.carbohidratos || 0}"></div>
                <div class="input-group" style="flex:1;"><label class="input-label">Grasas (g)</label><input type="number" step="0.1" class="input" id="f-fat" value="${initialData?.grasas || 0}"></div>
            </div>
            <div class="input-group mb-lg"><label class="input-label">Hora</label><input type="time" class="input" id="f-time" value="${new Date().toTimeString().slice(0, 5)}"></div>
            <button class="btn btn-primary btn-block" id="f-save">Guardar Comida</button>
        `;
        
        m.querySelector('#f-save').onclick = async () => {
            const nombre = m.querySelector('#f-name').value;
            if(!nombre) return showToast('Agrega un nombre.');
            
            const logData = {
                fecha: fecha,
                hora: m.querySelector('#f-time').value,
                nombre_comida: nombre,
                calorias: parseInt(m.querySelector('#f-cal').value) || 0,
                proteinas: parseFloat(m.querySelector('#f-prot').value) || 0,
                carbohidratos: parseFloat(m.querySelector('#f-carb').value) || 0,
                grasas: parseFloat(m.querySelector('#f-fat').value) || 0
            };

            try {
                await addNutritionLog(logData);
                showToast('✅ Comida registrada');
                document.querySelector('.modal-overlay')?.remove();
                loadDay(fecha);
            } catch (e) { showToast('❌ Error al guardar'); }
        };

        showModal({ title: initialData?.ai ? 'Revisa la Estimación' : 'Añadir Comida', content: m });
    }

    manualBtn.onclick = () => openFoodModal();

    // IA flow
    const fileInput = s.querySelector('#fi-food-img');
    const scanBtn = s.querySelector('#btn-scan-food');

    scanBtn.onclick = () => fileInput.click();

    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Reset the input value so the same file could be selected again if needed
        fileInput.value = '';

        // Mostramos modal de "Analizando..."
        const loadingContent = document.createElement('div');
        loadingContent.className = 'text-center py-xl';
        loadingContent.innerHTML = `
            <div style="font-size: 3rem; margin-bottom: 1rem; animation: pulse 1.5s infinite;">🧠</div>
            <p style="color: var(--text);">Analizando tu comida...</p>
            <p class="text-xs text-secondary mt-sm">Por favor espera un momento.</p>
        `;
        showModal({ title: 'Procesando Imagen', content: loadingContent, hideCloseIcon: true });

        try {
            const base64Data = await fileToBase64(file);
            const aiData = await analyzeFoodImageBase64(base64Data, file.type);
            
            // Cerrar modal de carga
            document.querySelector('.modal-overlay')?.remove();
            
            // Abrir modal con datos rellenados
            aiData.ai = true;
            openFoodModal(aiData);

        } catch (error) {
            document.querySelector('.modal-overlay')?.remove();
            showToast('❌ Ocurrió un error: ' + error.message);
        }
    };

    // Agregamos un simple CSS keyframe animation si no existe
    if (!document.getElementById('ai-styles')) {
        const style = document.createElement('style');
        style.id = 'ai-styles';
        style.innerHTML = `
            @keyframes pulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.2); opacity: 0.8; }
                100% { transform: scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    await loadDay(fecha);

    return s;
}

// Registration hub screen — directs to sub-screens
import { navigate } from '../router.js';

export function renderRegistro() {
    const screen = document.createElement('div');
    screen.className = 'screen';

    screen.innerHTML = `
    <h1 class="screen-title">Registro</h1>
    <p class="screen-subtitle">Selecciona qué registrar</p>
    <div class="quick-actions" style="grid-template-columns: 1fr 1fr;">
      <div class="quick-action" data-route="/registro/pasos">
        <span class="quick-action-icon">👟</span>
        <span class="quick-action-label">Pasos</span>
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
      <div class="quick-action" data-route="/registro/mediciones">
        <span class="quick-action-icon">📏</span>
        <span class="quick-action-label">Mediciones</span>
      </div>
      <div class="quick-action" data-route="/registro/notas">
        <span class="quick-action-icon">📋</span>
        <span class="quick-action-label">Notas Clínicas</span>
      </div>
    </div>
  `;

    screen.querySelectorAll('.quick-action').forEach(btn => {
        btn.addEventListener('click', () => navigate(btn.dataset.route));
    });

    return screen;
}

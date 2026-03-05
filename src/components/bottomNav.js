// Bottom Navigation component
import { navigate } from '../router.js';

export function renderBottomNav() {
    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.innerHTML = `
    <button class="nav-item active" data-route="/">
      <span class="nav-icon">🏠</span>
      <span>Inicio</span>
    </button>
    <button class="nav-item" data-route="/entrenar">
      <span class="nav-icon">💪</span>
      <span>Entrenar</span>
    </button>
    <button class="nav-item" data-route="/registro">
      <span class="nav-icon">📝</span>
      <span>Registro</span>
    </button>
    <button class="nav-item" data-route="/progreso">
      <span class="nav-icon">📊</span>
      <span>Progreso</span>
    </button>
    <button class="nav-item" data-route="/mas">
      <span class="nav-icon">⚙️</span>
      <span>Más</span>
    </button>
  `;

    nav.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            navigate(item.dataset.route);
        });
    });

    return nav;
}

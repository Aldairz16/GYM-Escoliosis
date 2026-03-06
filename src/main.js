// Main entry point
import './styles/index.css';
import { getDB } from './db/database.js';
import { seedIfNeeded } from './db/seedData.js';
import { registerRoute, initRouter } from './router.js';
import { renderBottomNav } from './components/bottomNav.js';
import { enableAutoSync } from './db/supabaseSync.js';
import { supabase } from './db/supabaseClient.js';
import { renderAuth } from './screens/auth.js';

// Screen imports
import { renderDashboard } from './screens/dashboard.js';
import { renderWorkout } from './screens/workout.js';
import { renderRegistro } from './screens/registro.js';
import { renderSteps } from './screens/steps.js';
import { renderSleep } from './screens/sleep.js';
import { renderNutrition } from './screens/nutrition.js';
import { renderSupplements } from './screens/supplements.js';
import { renderMeasurements } from './screens/measurements.js';
import { renderProgress } from './screens/progress.js';
import { renderNotes } from './screens/notes.js';
import { renderMore } from './screens/more.js';
import { renderSettings } from './screens/settings.js';

async function startApp() {
  // Initialize database
  await getDB();
  await seedIfNeeded();

  // Setup app shell
  const app = document.getElementById('app');
  app.innerHTML = '';

  // Content area
  const content = document.createElement('main');
  content.id = 'content';
  app.appendChild(content);

  // Bottom nav
  app.appendChild(renderBottomNav());

  // Register routes
  registerRoute('/', renderDashboard);
  registerRoute('/entrenar', renderWorkout);
  registerRoute('/registro', () => renderRegistro());
  registerRoute('/registro/pasos', renderSteps);
  registerRoute('/registro/sueno', renderSleep);
  registerRoute('/registro/alimentacion', renderNutrition);
  registerRoute('/registro/suplementos', renderSupplements);
  registerRoute('/registro/mediciones', renderMeasurements);
  registerRoute('/registro/notas', renderNotes);
  registerRoute('/progreso', renderProgress);
  registerRoute('/mas', () => renderMore());
  registerRoute('/mas/configuracion', renderSettings);

  // Init router
  initRouter(content);

  // Enable Supabase auto-sync when coming back online
  enableAutoSync();

  // Register service worker
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch (e) {
      // SW registration failed, app still works
    }
  }
}

function showLogin() {
  const app = document.getElementById('app');
  app.innerHTML = '';
  const authScreen = renderAuth(() => {
    // On successful auth, start the app
    startApp();
  });
  app.appendChild(authScreen);
}

async function init() {
  try {
    // Check if user is already authenticated
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      // User is logged in, start the app
      await startApp();
    } else {
      // Show login screen
      showLogin();
    }

    // Listen for auth state changes (logout, etc.)
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        showLogin();
      }
    });
  } catch (err) {
    console.error('Init error:', err);
    // If offline and no session, still try to start the app (IndexedDB works offline)
    try {
      await startApp();
    } catch (e) {
      document.getElementById('app').innerHTML = `
        <div class="loading-screen">
          <p>Error al iniciar la app</p>
          <p class="text-sm text-secondary">${err.message}</p>
          <button class="btn btn-primary mt-lg" onclick="location.reload()">Reintentar</button>
        </div>
      `;
    }
  }
}

init();

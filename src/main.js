// Main entry point
import './styles/index.css';
import { supabase } from './db/supabaseClient.js';
import { getConfig } from './db/supabase.js';
import { registerRoute, initRouter } from './router.js';
import { renderBottomNav, renderSidebar } from './components/nav.js';
import { renderAuth } from './screens/auth.js';
import { renderDashboard } from './screens/dashboard.js';
import { renderWorkoutStart } from './screens/workoutStart.js';
import { renderActiveWorkout } from './screens/activeWorkout.js';
import { renderHistory } from './screens/history.js';
import { renderRoutines } from './screens/routines.js';
import { renderExercises } from './screens/exercises.js';
import { renderDaily } from './screens/daily.js';
import { renderMeasurements } from './screens/measurements.js';
import { renderSettings } from './screens/settings.js';

async function startApp() {
  // Load theme
  const theme = await getConfig('theme', 'dark');
  document.documentElement.dataset.theme = theme;

  const app = document.getElementById('app');
  app.innerHTML = '';

  const shell = document.createElement('div');
  shell.className = 'app-shell';

  // Sidebar (visible on PC via CSS)
  shell.appendChild(renderSidebar());

  // Content area
  const content = document.createElement('main');
  content.id = 'content';
  content.className = 'app-content';
  shell.appendChild(content);

  app.appendChild(shell);

  // Bottom nav (visible on mobile via CSS)
  app.appendChild(renderBottomNav());

  // Routes
  registerRoute('/', renderDashboard);
  registerRoute('/workout', renderWorkoutStart);
  registerRoute('/workout/active', renderActiveWorkout);
  registerRoute('/history', renderHistory);
  registerRoute('/routines', renderRoutines);
  registerRoute('/exercises', renderExercises);
  registerRoute('/daily', renderDaily);
  registerRoute('/measurements', renderMeasurements);
  registerRoute('/settings', renderSettings);

  initRouter(content);

  // Auto-resume active workout if one exists
  const activeSession = localStorage.getItem('activeSession');
  if (activeSession) {
    try {
      const sess = JSON.parse(activeSession);
      if (sess && sess.id && !sess.completada) {
        window.location.hash = '/workout/active';
      }
    } catch (e) { localStorage.removeItem('activeSession'); }
  }

  // Service worker
  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('/sw.js'); } catch (e) { /* ok */ }
  }
}

function showLogin() {
  const app = document.getElementById('app');
  app.innerHTML = '';
  app.appendChild(renderAuth(() => startApp()));
}

async function init() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await startApp();
    } else {
      showLogin();
    }
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') showLogin();
    });
  } catch (err) {
    console.error('Init error:', err);
    try { await startApp(); } catch (e) {
      document.getElementById('app').innerHTML = `<div class="loading-screen"><p>Error: ${err.message}</p><button class="btn btn-primary mt-lg" onclick="location.reload()">Reintentar</button></div>`;
    }
  }
}

init();

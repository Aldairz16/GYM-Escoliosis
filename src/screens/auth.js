// Auth Screen — Login / Register
import { supabase } from '../db/supabaseClient.js';
import { showToast } from '../components/ui.js';

export function renderAuth(onAuthSuccess) {
    const screen = document.createElement('div');
    screen.className = 'screen';
    screen.style.display = 'flex';
    screen.style.flexDirection = 'column';
    screen.style.justifyContent = 'center';
    screen.style.minHeight = '100vh';
    screen.style.minHeight = '100dvh';
    screen.style.paddingBottom = '0';

    let isLogin = true;

    function render() {
        screen.innerHTML = `
      <div class="text-center mb-lg">
        <div style="font-size: 3rem; margin-bottom: var(--space-md);">🏋️</div>
        <h1 class="screen-title">Mi Progreso</h1>
        <p class="screen-subtitle">Seguimiento de escoliosis y entrenamiento</p>
      </div>

      <div class="card">
        <h3 class="section-title">${isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</h3>

        <div class="input-group">
          <label class="input-label" for="auth-email">Correo electrónico</label>
          <input type="email" id="auth-email" class="input" placeholder="tu@email.com" autocomplete="email" />
        </div>

        <div class="input-group">
          <label class="input-label" for="auth-password">Contraseña</label>
          <input type="password" id="auth-password" class="input" placeholder="${isLogin ? 'Tu contraseña' : 'Mínimo 6 caracteres'}" autocomplete="${isLogin ? 'current-password' : 'new-password'}" />
        </div>

        <button class="btn btn-primary btn-block btn-lg" id="auth-submit">
          ${isLogin ? '🔓 Entrar' : '✨ Crear Cuenta'}
        </button>

        <div class="divider"></div>

        <p class="text-center text-sm text-secondary">
          ${isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
          <button class="btn btn-ghost" id="auth-toggle" style="display: inline; padding: 0;">
            ${isLogin ? 'Registrarse' : 'Iniciar sesión'}
          </button>
        </p>
      </div>

      <p class="text-center text-xs text-muted mt-lg">Tus datos estarán protegidos y sincronizados en la nube</p>
    `;

        // Toggle login/register
        screen.querySelector('#auth-toggle').addEventListener('click', () => {
            isLogin = !isLogin;
            render();
        });

        // Submit
        screen.querySelector('#auth-submit').addEventListener('click', handleSubmit);

        // Enter key
        screen.querySelector('#auth-password').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleSubmit();
        });
    }

    async function handleSubmit() {
        const email = screen.querySelector('#auth-email').value.trim();
        const password = screen.querySelector('#auth-password').value;
        const btn = screen.querySelector('#auth-submit');

        if (!email || !password) {
            showToast('❌ Completa todos los campos');
            return;
        }

        if (!isLogin && password.length < 6) {
            showToast('❌ La contraseña debe tener al menos 6 caracteres');
            return;
        }

        btn.disabled = true;
        btn.textContent = '⏳ Cargando...';

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                showToast('✅ ¡Bienvenido!');
            } else {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                showToast('✅ Cuenta creada. Revisa tu correo para confirmar.');
                // After signup, try to log in immediately (Supabase may auto-confirm)
                const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
                if (loginError) {
                    // If can't auto-login, tell user to confirm email
                    showToast('📧 Confirma tu correo y luego inicia sesión');
                    isLogin = true;
                    render();
                    return;
                }
            }

            if (onAuthSuccess) onAuthSuccess();
        } catch (error) {
            let msg = error.message;
            if (msg.includes('Invalid login')) msg = 'Correo o contraseña incorrectos';
            if (msg.includes('already registered')) msg = 'Este correo ya está registrado';
            if (msg.includes('invalid_credentials')) msg = 'Correo o contraseña incorrectos';
            showToast('❌ ' + msg);
            btn.disabled = false;
            btn.textContent = isLogin ? '🔓 Entrar' : '✨ Crear Cuenta';
        }
    }

    render();
    return screen;
}

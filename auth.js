// Admin credentials (in production, use environment variables)
const ADMIN_EMAIL = 'admin@teejaydon.com';
const ADMIN_PASSWORD = 'admin123';

// Authentication functions
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Check for existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session) {
            this.currentUser = session.user;
            this.updateUI();
        }
        
        // Listen for auth state changes
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                this.currentUser = session.user;
                this.updateUI();
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                this.updateUI();
            }
        });
    }

    async login(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            // Check if user is admin
            const isAdmin = await this.checkAdminRole(data.user.id);
            if (!isAdmin) {
                await this.logout();
                throw new Error('Access denied. Admin privileges required.');
            }

            return { success: true, user: data.user };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    }

    async logout() {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Logout error:', error);
            return false;
        }
        this.currentUser = null;
        this.updateUI();
        return true;
    }

    async checkAdminRole(userId) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single();

            if (error) throw error;
            return data && data.role === 'admin';
        } catch (error) {
            console.error('Error checking admin role:', error);
            return false;
        }
    }

    updateUI() {
        const adminBtn = document.getElementById('admin-btn');
        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');

        if (this.currentUser) {
            if (adminBtn) adminBtn.style.display = 'none';
            if (loginBtn) loginBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'block';
        } else {
            if (adminBtn) adminBtn.style.display = 'block';
            if (loginBtn) loginBtn.style.display = 'block';
            if (logoutBtn) logoutBtn.style.display = 'none';
        }
    }

    async getCurrentUser() {
        const { data: { user }, error } = await supabase.auth.getUser();
        return user;
    }
}

// Initialize auth manager
const authManager = new AuthManager();

// Login form handler
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const submitBtn = document.getElementById('login-submit');
            const errorDiv = document.getElementById('login-error');
            
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            
            if (errorDiv) errorDiv.style.display = 'none';
            
            const result = await authManager.login(email, password);
            
            if (result.success) {
                showToast('Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = 'admin-dashboard.html';
                }, 1000);
            } else {
                if (errorDiv) {
                    errorDiv.textContent = result.error;
                    errorDiv.style.display = 'block';
                }
                showToast(result.error, 'error');
            }
            
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.textContent = 'Login';
        });
    }
    
    // Logout handler
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            await authManager.logout();
            showToast('Logged out successfully', 'success');
            window.location.href = 'index.html';
        });
    }
});

// Auth guard for admin pages
async function requireAuth() {
    const user = await authManager.getCurrentUser();
    const isAdmin = user ? await authManager.checkAdminRole(user.id) : false;
    
    if (!user || !isAdmin) {
        window.location.href = 'login.html';
        return false;
    }
    
    return true;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { authManager, requireAuth };
}
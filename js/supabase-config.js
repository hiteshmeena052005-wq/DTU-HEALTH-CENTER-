// =============================================================================
// DTU Health Center - Supabase Client Configuration
// =============================================================================
// Strict Security Rule: Use ONLY the anon/publishable key in frontend code.
// NEVER expose or store the service_role secret key in client code.
// =============================================================================

(function () {
    // Default Supabase project credentials (configured for DTU Health Center)
    const DEFAULT_SUPABASE_URL = "https://zifgkxkrpimyxjaqjvwd.supabase.co";
    const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_T1LDuMaMZXjR0m5SqPpqOQ_qaRm69LC";

    function formatSupabaseUrl(url) {
        if (!url) return '';
        url = url.trim();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            if (!url.includes('.')) {
                return `https://${url}.supabase.co`;
            }
            return `https://${url}`;
        }
        return url;
    }

    function getUrl() {
        const stored = (typeof localStorage !== 'undefined') ? localStorage.getItem('dtu_supabase_url') : null;
        const raw = stored || (typeof window !== 'undefined' && window.__DTU_SUPABASE_URL) || DEFAULT_SUPABASE_URL;
        return formatSupabaseUrl(raw);
    }

    function getAnonKey() {
        const stored = (typeof localStorage !== 'undefined') ? localStorage.getItem('dtu_supabase_anon_key') : null;
        return (stored ? stored.trim() : null) || (typeof window !== 'undefined' && window.__DTU_SUPABASE_ANON_KEY) || DEFAULT_SUPABASE_ANON_KEY;
    }

    // Evaluates whether live credentials have been set (not default placeholders)
    function isConfigured() {
        const url = getUrl();
        const key = getAnonKey();
        return Boolean(
            url && 
            key && 
            !url.includes("your-project-id") && 
            !key.includes("your-anon") &&
            url.startsWith("https://")
        );
    }

    let client = null;

    function initClient() {
        if (client) return client;

        if (typeof window === 'undefined' || typeof window.supabase === 'undefined' || typeof window.supabase.createClient !== 'function') {
            return null;
        }

        if (!isConfigured()) {
            return null;
        }

        try {
            client = window.supabase.createClient(getUrl(), getAnonKey(), {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true,
                    storageKey: 'dtu_supabase_auth_token'
                },
                realtime: {
                    params: {
                        eventsPerSecond: 10
                    }
                }
            });
            console.log("⚡ [Supabase] Client initialized successfully in Live Mode:", getUrl());
            return client;
        } catch (err) {
            console.error("❌ [Supabase] Client initialization failed:", err.message);
            return null;
        }
    }

    // Expose global Supabase helpers
    const dtuSupabase = {
        getUrl: getUrl,
        getAnonKey: getAnonKey,
        isConfigured: isConfigured,
        getClient: initClient,
        saveCredentials: function (url, anonKey) {
            if (!url || !anonKey) return false;
            try {
                const formattedUrl = formatSupabaseUrl(url);
                localStorage.setItem('dtu_supabase_url', formattedUrl);
                localStorage.setItem('dtu_supabase_anon_key', anonKey.trim());
                client = null; // force re-initialization
                if (typeof window !== 'undefined' && window.location && typeof window.location.reload === 'function') {
                    window.location.reload();
                }
                return true;
            } catch (e) {
                return false;
            }
        },
        clearCredentials: function () {
            try {
                localStorage.removeItem('dtu_supabase_url');
                localStorage.removeItem('dtu_supabase_anon_key');
                client = null;
                if (typeof window !== 'undefined' && window.location && typeof window.location.reload === 'function') {
                    window.location.reload();
                }
            } catch (e) {}
        }
    };

    if (typeof window !== 'undefined') {
        window.DTU_SUPABASE = dtuSupabase;
        if (typeof window.addEventListener === 'function') {
            window.addEventListener('DOMContentLoaded', () => {
                initClient();
            });
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = dtuSupabase;
    }
})();

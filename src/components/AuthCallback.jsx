import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabase } from '../utils/auth';

/**
 * Handles the OAuth callback redirect.
 * Waits for Supabase to fully establish the session from the URL hash
 * before redirecting to home.
 */
const AuthCallback = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const supabase = getSupabase();

        if (!supabase) {
            navigate('/', { replace: true });
            return;
        }

        let cleaned = false;

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (!cleaned && session) {
                    cleaned = true;
                    subscription.unsubscribe();
                    navigate('/', { replace: true });
                }
            }
        );

        // Also check if session already exists
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!cleaned && session) {
                cleaned = true;
                subscription.unsubscribe();
                navigate('/', { replace: true });
            }
        });

        // Fallback: redirect after 5s if something goes wrong
        const timeout = setTimeout(() => {
            if (!cleaned) {
                cleaned = true;
                subscription.unsubscribe();
                navigate('/login', { replace: true });
            }
        }, 5000);

        return () => {
            cleaned = true;
            clearTimeout(timeout);
            subscription.unsubscribe();
        };
    }, [navigate]);

    return (
        <main className="auth-page">
            <div className="auth-pattern" />
            <div className="auth-callback-container">
                <div className="auth-callback-card">
                    <span className="auth-btn-loader auth-callback-spinner" />
                    <h2>Signing you in…</h2>
                    <p>Please wait while we complete authentication.</p>
                </div>
            </div>
        </main>
    );
};

export default AuthCallback;

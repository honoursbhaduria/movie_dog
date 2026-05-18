import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { login, loginWithGoogle } from '../utils/auth';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Flash message from registration redirect
    const successMsg = location.state?.message || '';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!email.trim() || !password.trim()) {
            setError('Please fill in all fields.');
            return;
        }

        setLoading(true);

        // simulate async delay
        await new Promise(r => setTimeout(r, 600));

        const result = await login(email, password);

        if (!result.ok) {
            setError(result.message);
            setLoading(false);
            return;
        }

        navigate('/', { replace: true });
    };

    const handleGoogleLogin = async () => {
        setError('');
        await loginWithGoogle();
    };

    return (
        <main className="auth-page">
            <div className="auth-pattern" />

            <div className="auth-container">
                {/* ─── Left hero panel ─── */}
                <div className="auth-hero">
                    <div className="auth-hero-overlay" />
                    <img src="/hero.png" alt="MovieFinder" className="auth-hero-img" />
                    <div className="auth-hero-text">
                        <h2>Welcome Back</h2>
                        <p>Sign in to unlock your personalised movie experience, wishlist and trending picks.</p>
                    </div>
                </div>

                {/* ─── Right form panel ─── */}
                <div className="auth-form-panel">
                    <form className="auth-card" onSubmit={handleSubmit} noValidate>
                        <div className="auth-card-header">
                            <img src="/hero.png" alt="Logo" className="auth-logo-small" />
                            <h1 className="auth-title">Sign In</h1>
                            <p className="auth-subtitle">Enter your credentials to continue</p>
                        </div>

                        {successMsg && <div className="auth-toast auth-toast--success">{successMsg}</div>}
                        {error && <div className="auth-toast auth-toast--error">{error}</div>}

                        {/* ─── Google OAuth Button ─── */}
                        <button
                            type="button"
                            className="auth-google-btn"
                            onClick={handleGoogleLogin}
                        >
                            <svg className="auth-google-icon" viewBox="0 0 24 24" width="20" height="20">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Sign in with Google
                        </button>

                        {/* ─── Divider ─── */}
                        <div className="auth-divider">
                            <span>or</span>
                        </div>

                        <div className="auth-field">
                            <label htmlFor="login-email">Email Address</label>
                            <div className="auth-input-wrap">
                                <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="3" /><path d="M22 7l-10 7L2 7" /></svg>
                                <input
                                    id="login-email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="auth-field">
                            <label htmlFor="login-password">Password</label>
                            <div className="auth-input-wrap">
                                <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="auth-toggle-pw"
                                    onClick={() => setShowPassword(v => !v)}
                                    tabIndex={-1}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                    ) : (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <button type="button" className="auth-btn" disabled={loading} onClick={handleSubmit}>
                            {loading ? (
                                <span className="auth-btn-loader" />
                            ) : (
                                'Sign In'
                            )}
                        </button>

                        <p className="auth-footer">
                            Don't have an account?{' '}
                            <Link to="/register">Create one</Link>
                        </p>

                        <div className="auth-benefits">
                            <p className="auth-benefits-title">What you'll unlock</p>
                            <ul>
                                <li>
                                    <svg className="auth-benefit-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#AB8BFF" strokeWidth="2"><path d="M12 2l2.09 6.91L21 12l-6.91 2.09L12 21l-2.09-6.91L3 12l6.91-2.09L12 2z" /></svg>
                                    <span><strong>AI Recommendations</strong> — Gemini-powered movie picks based on your taste</span>
                                </li>
                                <li>
                                    <svg className="auth-benefit-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#AB8BFF" strokeWidth="2"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" /></svg>
                                    <span><strong>Cloud Favorites</strong> — Your saved movies sync across devices</span>
                                </li>
                                <li>
                                    <svg className="auth-benefit-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#AB8BFF" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
                                    <span><strong>Personalized Experience</strong> — The more you save, the smarter it gets</span>
                                </li>
                            </ul>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    );
};

export default Login;

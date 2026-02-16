import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { login } from '../utils/auth';

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

                        <button type="submit" className="auth-btn" disabled={loading}>
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

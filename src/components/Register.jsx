import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../utils/auth';

/** Return 0-4 strength score + label. */
const getPasswordStrength = (pw) => {
    if (!pw) return { score: 0, label: '' };
    let s = 0;
    if (pw.length >= 6) s++;
    if (pw.length >= 10) s++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
    return { score: Math.min(s, 4), label: labels[Math.min(s, 4)] };
};

const Register = () => {
    const navigate = useNavigate();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const strength = useMemo(() => getPasswordStrength(password), [password]);

    const validate = () => {
        if (!name.trim()) return 'Name is required.';
        if (!email.trim()) return 'Email is required.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.';
        if (password.length < 6) return 'Password must be at least 6 characters.';
        if (password !== confirmPassword) return 'Passwords do not match.';
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const err = validate();
        if (err) { setError(err); return; }

        setLoading(true);
        await new Promise(r => setTimeout(r, 600));

        const result = await register(name, email, password);

        if (!result.ok) {
            setError(result.message);
            setLoading(false);
            return;
        }

        navigate('/login', { state: { message: 'Account created! You can now sign in.' }, replace: true });
    };

    const strengthColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];

    return (
        <main className="auth-page">
            <div className="auth-pattern" />

            <div className="auth-container">
                {/* ─── Left hero panel ─── */}
                <div className="auth-hero">
                    <div className="auth-hero-overlay" />
                    <img src="/hero.png" alt="MovieFinder" className="auth-hero-img" />
                    <div className="auth-hero-text">
                        <h2>Join MovieFinder</h2>
                        <p>Create an account to save your favourites, track trends and get personalised picks.</p>
                    </div>
                </div>

                {/* ─── Right form panel ─── */}
                <div className="auth-form-panel">
                    <form className="auth-card" onSubmit={handleSubmit} noValidate>
                        <div className="auth-card-header">
                            <img src="/hero.png" alt="Logo" className="auth-logo-small" />
                            <h1 className="auth-title">Create Account</h1>
                            <p className="auth-subtitle">Fill in the details to get started</p>
                        </div>

                        {error && <div className="auth-toast auth-toast--error">{error}</div>}

                        {/* Name */}
                        <div className="auth-field">
                            <label htmlFor="reg-name">Full Name</label>
                            <div className="auth-input-wrap">
                                <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                <input
                                    id="reg-name"
                                    type="text"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    autoComplete="name"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="auth-field">
                            <label htmlFor="reg-email">Email Address</label>
                            <div className="auth-input-wrap">
                                <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="3" /><path d="M22 7l-10 7L2 7" /></svg>
                                <input
                                    id="reg-email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="auth-field">
                            <label htmlFor="reg-password">Password</label>
                            <div className="auth-input-wrap">
                                <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                                <input
                                    id="reg-password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Min. 6 characters"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    autoComplete="new-password"
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

                            {/* Strength bar */}
                            {password && (
                                <div className="auth-strength">
                                    <div className="auth-strength-track">
                                        {[0, 1, 2, 3, 4].map(i => (
                                            <div
                                                key={i}
                                                className="auth-strength-segment"
                                                style={{ background: i <= strength.score - 1 ? strengthColors[strength.score - 1] : 'rgba(206,206,251,0.1)' }}
                                            />
                                        ))}
                                    </div>
                                    <span className="auth-strength-label" style={{ color: strengthColors[strength.score - 1] || '#9ca4ab' }}>
                                        {strength.label}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div className="auth-field">
                            <label htmlFor="reg-confirm">Confirm Password</label>
                            <div className="auth-input-wrap">
                                <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4" /><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                                <input
                                    id="reg-confirm"
                                    type={showConfirm ? 'text' : 'password'}
                                    placeholder="Re-enter password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    className="auth-toggle-pw"
                                    onClick={() => setShowConfirm(v => !v)}
                                    tabIndex={-1}
                                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                                >
                                    {showConfirm ? (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                    ) : (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></svg>
                                    )}
                                </button>
                            </div>
                            {confirmPassword && password !== confirmPassword && (
                                <span className="auth-field-hint auth-field-hint--error">Passwords do not match</span>
                            )}
                            {confirmPassword && password === confirmPassword && confirmPassword.length > 0 && (
                                <span className="auth-field-hint auth-field-hint--success">Passwords match ✓</span>
                            )}
                        </div>

                        <button type="submit" className="auth-btn" disabled={loading}>
                            {loading ? (
                                <span className="auth-btn-loader" />
                            ) : (
                                'Create Account'
                            )}
                        </button>

                        <p className="auth-footer">
                            Already have an account?{' '}
                            <Link to="/login">Sign in</Link>
                        </p>


                    </form>
                </div>
            </div>
        </main>
    );
};

export default Register;

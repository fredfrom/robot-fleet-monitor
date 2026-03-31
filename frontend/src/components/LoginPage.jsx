import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof TypeError) {
        setError(
          'Unable to reach server. Check your connection and try again.'
        );
      } else {
        setError(
          'Invalid email or password. Check your credentials and try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-bg">
      <div className="max-w-[400px] w-full p-2xl bg-surface/80 backdrop-blur-xl border border-white/[0.08] shadow-2xl">
        <h1 className="font-sans text-[28px] font-semibold text-text text-center mb-xs leading-tight">Fleet Monitor</h1>
        <p className="font-mono text-[11px] text-text-muted text-center mb-xl uppercase tracking-widest">Robot Fleet Command Center</p>

        <form className="flex flex-col gap-md" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email address"
            aria-label="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-surface text-text border border-border px-md py-sm font-mono text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent"
          />
          <input
            type="password"
            placeholder="Password"
            aria-label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-surface text-text border border-border px-md py-sm font-mono text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent"
          />
          <button
            type="submit"
            className={`w-full h-11 bg-accent text-bg font-sans font-semibold text-sm uppercase tracking-wider border-none cursor-pointer transition-colors duration-150 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg${loading ? ' animate-[loginPulse_1.5s_ease-in-out_infinite]' : ''}`}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {error && <p className="text-status-alert text-sm mt-sm">{error}</p>}
      </div>
    </div>
  );
}

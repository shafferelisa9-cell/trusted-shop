import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';

const Auth = () => {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/');
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    if (tab === 'login') {
      const err = await signIn(email, password);
      if (err) setError(err);
      else navigate('/');
    } else {
      const err = await signUp(email, password);
      if (err) setError(err);
      else {
        setSuccess('Account created! You are now logged in.');
        setTimeout(() => navigate('/'), 1000);
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-sm mx-auto px-6 py-16">
        <div className="flex gap-4 mb-8 justify-center">
          {(['login', 'signup'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); setSuccess(null); }}
              className={`text-sm uppercase tracking-widest ${tab === t ? 'underline' : 'opacity-40 hover:opacity-80'}`}
            >
              {t === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="border border-foreground p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs block">EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-foreground bg-background px-4 py-3 text-sm focus:outline-none"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs block">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-foreground bg-background px-4 py-3 text-sm focus:outline-none"
              required
              minLength={6}
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          {success && <p className="text-xs opacity-80">{success}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full border border-foreground py-3 text-sm font-medium hover:bg-foreground hover:text-background transition-colors disabled:opacity-40"
          >
            {submitting ? 'PLEASE WAIT...' : tab === 'login' ? 'LOG IN' : 'SIGN UP'}
          </button>
        </form>
      </main>
    </div>
  );
};

export default Auth;

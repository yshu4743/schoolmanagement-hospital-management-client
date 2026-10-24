import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO = [
  { role: 'Admin', email: 'admin@hospital.edu', password: 'admin123' },
  { role: 'Doctor', email: 'doctor1@hospital.edu', password: 'doctor123' },
  { role: 'Nurse', email: 'nurse1@hospital.edu', password: 'nurse123' },
  { role: 'Reception', email: 'receptionist@hospital.edu', password: 'reception123' },
  { role: 'Patient', email: 'patient1@hospital.edu', password: 'patient123' },
];

const BLOOD = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // registration fields
  const [form, setForm] = useState({ name: '', phone: '', gender: 'male', bloodGroup: 'O+', dateOfBirth: '' });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({
          name: form.name,
          email,
          password,
          phone: form.phone,
          gender: form.gender,
          bloodGroup: form.bloodGroup,
          dateOfBirth: form.dateOfBirth || null,
        });
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || (mode === 'login' ? 'Login failed.' : 'Registration failed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500 text-2xl font-bold text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path>
              <line x1="16" y1="8" x2="2" y2="22"></line>
              <line x1="17.5" y1="15" x2="9" y2="15"></line>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">MediCare</h1>
          <p className="mt-1 text-sm text-primary-200">Modern Medical & Hospital Management</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <h2 className="mb-1 text-lg font-semibold text-slate-800">
            {mode === 'login' ? 'Sign in to your account' : 'Patient self-registration'}
          </h2>
          <p className="mb-5 text-sm text-slate-500">
            {mode === 'login' ? 'Use your hospital-issued credentials.' : 'Create a patient account to book appointments.'}
          </p>

          {error && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="label" htmlFor="name">Full name</label>
                  <input id="name" required className="input" placeholder="Jane Doe" value={form.name} onChange={(e) => set('name', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label" htmlFor="phone">Phone</label>
                    <input id="phone" className="input" placeholder="+91 90000 00000" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                  </div>
                  <div>
                    <label className="label" htmlFor="dob">Date of birth</label>
                    <input id="dob" type="date" className="input" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label" htmlFor="gender">Gender</label>
                    <select id="gender" className="input" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="blood">Blood group</label>
                    <select id="blood" className="input" value={form.bloodGroup} onChange={(e) => set('bloodGroup', e.target.value)}>
                      {BLOOD.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" required className="input" placeholder="you@hospital.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" type="password" required minLength={6} className="input" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-6 border-t border-slate-100 pt-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Demo accounts (click to fill)</div>
              <div className="grid grid-cols-2 gap-2">
                {DEMO.map((d) => (
                  <button
                    key={d.role}
                    type="button"
                    onClick={() => { setEmail(d.email); setPassword(d.password); setError(''); }}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-left text-xs hover:border-primary-300 hover:bg-primary-50"
                  >
                    <div className="font-semibold text-slate-700">{d.role}</div>
                    <div className="mt-0.5 truncate text-slate-400">{d.email}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 text-center text-sm text-slate-500">
            {mode === 'login' ? (
              <button className="font-semibold text-primary-600 hover:text-primary-700" onClick={() => { setMode('register'); setError(''); }}>
                New patient? Register here
              </button>
            ) : (
              <button className="font-semibold text-primary-600 hover:text-primary-700" onClick={() => { setMode('login'); setError(''); }}>
                Already registered? Sign in
              </button>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-primary-300">Staff accounts are provisioned by the hospital admin</p>
      </div>
    </div>
  );
}

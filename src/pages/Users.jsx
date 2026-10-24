import { useEffect, useState } from 'react';
import api from '../api/client';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import ErrorBanner, { Loading, EmptyState, SuccessBanner } from '../components/Feedback';

const ROLES = ['admin', 'doctor', 'nurse', 'receptionist', 'patient'];

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'receptionist', phone: '', address: '', isActive: true });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const load = () => {
    setLoading(true);
    api
      .get('/users', { params: { role: role || undefined, search: search || undefined } })
      .then((res) => setUsers(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load users.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [role, search]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', email: '', password: '', role: 'receptionist', phone: '', address: '', isActive: true });
    setFormError('');
    setOpen(true);
  };
  const openEdit = (u) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '', address: u.address || '', isActive: u.isActive });
    setFormError('');
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      if (editing) {
        const payload = { name: form.name, email: form.email, phone: form.phone, address: form.address, isActive: form.isActive };
        if (form.password) payload.password = form.password;
        await api.put(`/users/${editing._id}`, payload);
        setNotice('User updated.');
      } else {
        await api.post('/users', form);
        setNotice('User created.');
      }
      setOpen(false);
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save user.');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (u) => {
    try {
      await api.put(`/users/${u._id}`, { isActive: !u.isActive });
      setNotice(`${u.name} ${u.isActive ? 'deactivated' : 'activated'}.`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const remove = async (u) => {
    if (!window.confirm(`Delete ${u.name}?`)) return;
    try {
      await api.delete(`/users/${u._id}`);
      setNotice('User deleted.');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">User Accounts</h1>
          <p className="text-sm text-slate-500">Provision staff and patient accounts, control access.</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Create Account</button>
      </div>

      <ErrorBanner message={error} onClose={() => setError('')} />
      <SuccessBanner message={notice} onClose={() => setNotice('')} />

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <input className="input max-w-xs" placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input max-w-xs" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <Loading />
        ) : users.length === 0 ? (
          <EmptyState title="No users found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Name</th>
                  <th className="th">Role</th>
                  <th className="th">Phone</th>
                  <th className="th">Joined</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50">
                    <td className="td">
                      <div className="font-semibold text-slate-800">{u.name}</div>
                      <div className="text-xs text-slate-400">{u.email}</div>
                    </td>
                    <td className="td"><Badge value={u.role} /></td>
                    <td className="td">{u.phone || '—'}</td>
                    <td className="td">{fmtDate(u.createdAt)}</td>
                    <td className="td"><Badge value={u.isActive ? 'active' : 'inactive'} /></td>
                    <td className="td text-right">
                      <button className="mr-3 text-sm font-semibold text-brand-600 hover:text-brand-700" onClick={() => openEdit(u)}>Edit</button>
                      <button className="mr-3 text-sm font-semibold text-amber-600 hover:text-amber-700" onClick={() => toggleActive(u)}>
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button className="text-sm font-semibold text-rose-600 hover:text-rose-700" onClick={() => remove(u)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit User' : 'Create Account'}>
        {formError && <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{formError}</div>}
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="label">Full name</label>
            <input className="input" required value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" required value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div>
            <label className="label">{editing ? 'New password (optional)' : 'Password'}</label>
            <input type="password" className="input" required={!editing} minLength={6} value={form.password} onChange={(e) => set('password', e.target.value)} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={(e) => set('role', e.target.value)} disabled={editing && form.role === 'admin'}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div>
            <label className="label">Address</label>
            <input className="input" value={form.address} onChange={(e) => set('address', e.target.value)} />
          </div>
          {editing && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
              Account active
            </label>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" disabled={busy} className="btn-primary">{busy ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

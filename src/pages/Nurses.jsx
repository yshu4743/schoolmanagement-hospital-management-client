import { useEffect, useState } from 'react';
import api from '../api/client';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import ErrorBanner, { Loading, EmptyState, SuccessBanner } from '../components/Feedback';

const DEPARTMENTS = ['General Medicine', 'ICU', 'Pediatrics', 'Maternity', 'Emergency', 'Surgical', 'Orthopedics', 'Cardiology'];
const SHIFTS = ['morning', 'evening', 'night', 'rotational'];

const EMPTY = {
  name: '', email: '', password: 'nurse123', phone: '', address: '',
  department: 'General Medicine', qualification: 'GNM', shift: 'morning', experienceYears: 0,
};

export default function Nurses() {
  const [nurses, setNurses] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dept, setDept] = useState('');
  const [search, setSearch] = useState('');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const load = () => {
    setLoading(true);
    api
      .get('/nurses', { params: { department: dept || undefined } })
      .then((res) => setNurses(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load nurses.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [dept]);

  const q = search.trim().toLowerCase();
  const filtered = nurses.filter((n) =>
    [
      n.user?.name,
      n.user?.email,
      n.user?.phone,
      n.nurseId,
      n.department,
      n.qualification,
      n.shift,
      `${n.experienceYears ?? ''} yrs`,
      n.assignedWard?.name,
    ].some((x) => String(x ?? '').toLowerCase().includes(q))
  );

  useEffect(() => {
    api.get('/wards').then((res) => setWards(res.data.data)).catch(() => {});
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openAdd = () => { setEditing(null); setForm(EMPTY); setFormError(''); setOpen(true); };
  const openEdit = (n) => {
    setEditing(n);
    setForm({
      name: n.user?.name || '', email: n.user?.email || '', password: '',
      phone: n.user?.phone || '', address: n.user?.address || '',
      department: n.department, qualification: n.qualification || 'GNM',
      shift: n.shift, experienceYears: n.experienceYears || 0, assignedWard: n.assignedWard?._id || '',
    });
    setFormError('');
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      if (editing) {
        const { password, ...payload } = form;
        await api.put(`/nurses/${editing._id}`, payload);
        setNotice('Nurse updated.');
      } else {
        await api.post('/nurses', form);
        setNotice('Nurse added.');
      }
      setOpen(false);
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save nurse.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (n) => {
    if (!window.confirm(`Delete ${n.user?.name}?`)) return;
    try {
      await api.delete(`/nurses/${n._id}`);
      setNotice('Nurse deleted.');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete nurse.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Nurses</h1>
          <p className="text-sm text-slate-500">Manage nursing staff, shifts and ward assignments.</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Add Nurse</button>
      </div>

      <ErrorBanner message={error} onClose={() => setError('')} />
      <SuccessBanner message={notice} onClose={() => setNotice('')} />

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <input
          className="input max-w-xs"
          placeholder="Search by name, ID, department or ward…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input max-w-xs" value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="">All departments</option>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <div className="ml-auto text-sm text-slate-500">{filtered.length} nurse(s)</div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          search.trim() ? (
            <EmptyState title="No matches found" subtitle={`Nothing matches “${search}”`} />
          ) : (
            <EmptyState title="No nurses found" />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Nurse</th>
                  <th className="th">ID</th>
                  <th className="th">Department</th>
                  <th className="th">Shift</th>
                  <th className="th">Exp</th>
                  <th className="th">Assigned Ward</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((n) => (
                  <tr key={n._id} className="hover:bg-slate-50">
                    <td className="td">
                      <div className="font-semibold text-slate-800">{n.user?.name}</div>
                      <div className="text-xs text-slate-400">{n.user?.email}</div>
                    </td>
                    <td className="td font-mono text-xs">{n.nurseId}</td>
                    <td className="td">{n.department}</td>
                    <td className="td"><Badge value={n.shift} color="brand" /></td>
                    <td className="td">{n.experienceYears} yrs</td>
                    <td className="td">{n.assignedWard?.name || '—'}</td>
                    <td className="td text-right">
                      <button className="mr-3 text-sm font-semibold text-brand-600 hover:text-brand-700" onClick={() => openEdit(n)}>Edit</button>
                      <button className="text-sm font-semibold text-rose-600 hover:text-rose-700" onClick={() => remove(n)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Nurse' : 'Add Nurse'} wide>
        {formError && <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{formError}</div>}
        <form onSubmit={save} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Full name</label>
            <input className="input" required value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" required value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          {!editing && (
            <div>
              <label className="label">Temp password</label>
              <input className="input" value={form.password} onChange={(e) => set('password', e.target.value)} />
            </div>
          )}
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div>
            <label className="label">Department</label>
            <select className="input" value={form.department} onChange={(e) => set('department', e.target.value)}>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Qualification</label>
            <input className="input" value={form.qualification} onChange={(e) => set('qualification', e.target.value)} />
          </div>
          <div>
            <label className="label">Shift</label>
            <select className="input" value={form.shift} onChange={(e) => set('shift', e.target.value)}>
              {SHIFTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Experience (years)</label>
            <input type="number" min="0" className="input" value={form.experienceYears} onChange={(e) => set('experienceYears', Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Assigned ward</label>
            <select className="input" value={form.assignedWard || ''} onChange={(e) => set('assignedWard', e.target.value)}>
              <option value="">None</option>
              {wards.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
            </select>
          </div>
          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" disabled={busy} className="btn-primary">{busy ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

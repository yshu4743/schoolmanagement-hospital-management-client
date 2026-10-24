import { useEffect, useState } from 'react';
import api from '../api/client';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import ErrorBanner, { Loading, EmptyState, SuccessBanner } from '../components/Feedback';

const DEPARTMENTS = [
  'General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Neurology',
  'Gynecology', 'Dermatology', 'ENT', 'Emergency', 'Radiology',
];
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const EMPTY = {
  name: '', email: '', password: 'doctor123', phone: '', address: '',
  department: 'General Medicine', specialization: '', qualification: '',
  experienceYears: 0, consultationFee: 500, availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  shiftStart: '09:00', shiftEnd: '17:00', registrationNo: '',
};

export default function Doctors() {
  const [doctors, setDoctors] = useState([]);
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
      .get('/doctors', { params: { department: dept || undefined, search: search || undefined } })
      .then((res) => setDoctors(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load doctors.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [dept, search]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openAdd = () => { setEditing(null); setForm(EMPTY); setFormError(''); setOpen(true); };
  const openEdit = (d) => {
    setEditing(d);
    setForm({
      name: d.user?.name || '', email: d.user?.email || '', password: '',
      phone: d.user?.phone || '', address: d.user?.address || '',
      department: d.department, specialization: d.specialization || '', qualification: d.qualification || '',
      experienceYears: d.experienceYears || 0, consultationFee: d.consultationFee || 500,
      availableDays: d.availableDays || [], shiftStart: d.shiftStart, shiftEnd: d.shiftEnd, registrationNo: d.registrationNo || '',
    });
    setFormError('');
    setOpen(true);
  };

  const toggleDay = (day) =>
    setForm((f) => ({
      ...f,
      availableDays: f.availableDays.includes(day) ? f.availableDays.filter((d) => d !== day) : [...f.availableDays, day],
    }));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      if (editing) {
        const { password, ...payload } = form;
        await api.put(`/doctors/${editing._id}`, payload);
        setNotice('Doctor updated.');
      } else {
        await api.post('/doctors', form);
        setNotice('Doctor added.');
      }
      setOpen(false);
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save doctor.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (d) => {
    if (!window.confirm(`Delete ${d.user?.name}?`)) return;
    try {
      await api.delete(`/doctors/${d._id}`);
      setNotice('Doctor deleted.');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete doctor.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Doctors</h1>
          <p className="text-sm text-slate-500">Manage medical staff and consultation settings.</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Add Doctor</button>
      </div>

      <ErrorBanner message={error} onClose={() => setError('')} />
      <SuccessBanner message={notice} onClose={() => setNotice('')} />

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <input className="input max-w-xs" placeholder="Search by ID or specialization…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input max-w-xs" value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="">All departments</option>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <Loading />
        ) : doctors.length === 0 ? (
          <EmptyState title="No doctors found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Doctor</th>
                  <th className="th">ID</th>
                  <th className="th">Department</th>
                  <th className="th">Specialization</th>
                  <th className="th">Exp</th>
                  <th className="th">Fee</th>
                  <th className="th">Shift</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {doctors.map((d) => (
                  <tr key={d._id} className="hover:bg-slate-50">
                    <td className="td">
                      <div className="font-semibold text-slate-800">{d.user?.name}</div>
                      <div className="text-xs text-slate-400">{d.user?.email}</div>
                    </td>
                    <td className="td font-mono text-xs">{d.doctorId}</td>
                    <td className="td"><Badge value={d.department} color="brand" /></td>
                    <td className="td">{d.specialization || '—'}</td>
                    <td className="td">{d.experienceYears} yrs</td>
                    <td className="td">₹{d.consultationFee}</td>
                    <td className="td text-xs">{d.shiftStart}–{d.shiftEnd}</td>
                    <td className="td text-right">
                      <button className="mr-3 text-sm font-semibold text-brand-600 hover:text-brand-700" onClick={() => openEdit(d)}>Edit</button>
                      <button className="text-sm font-semibold text-rose-600 hover:text-rose-700" onClick={() => remove(d)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Doctor' : 'Add Doctor'} wide>
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
            <label className="label">Specialization</label>
            <input className="input" value={form.specialization} onChange={(e) => set('specialization', e.target.value)} />
          </div>
          <div>
            <label className="label">Qualification</label>
            <input className="input" value={form.qualification} onChange={(e) => set('qualification', e.target.value)} />
          </div>
          <div>
            <label className="label">Experience (years)</label>
            <input type="number" min="0" className="input" value={form.experienceYears} onChange={(e) => set('experienceYears', Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Consultation fee (₹)</label>
            <input type="number" min="0" className="input" value={form.consultationFee} onChange={(e) => set('consultationFee', Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Registration no.</label>
            <input className="input" value={form.registrationNo} onChange={(e) => set('registrationNo', e.target.value)} />
          </div>
          <div>
            <label className="label">Shift start</label>
            <input type="time" className="input" value={form.shiftStart} onChange={(e) => set('shiftStart', e.target.value)} />
          </div>
          <div>
            <label className="label">Shift end</label>
            <input type="time" className="input" value={form.shiftEnd} onChange={(e) => set('shiftEnd', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="label">Available days</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => toggleDay(d)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize ${
                    form.availableDays.includes(d) ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-500'
                  }`}
                >
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>
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

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import ErrorBanner, { Loading, EmptyState, SuccessBanner } from '../components/Feedback';
import { useAuth } from '../context/AuthContext';

const BLOOD = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

const EMPTY = {
  name: '', email: '', password: 'patient123', phone: '', address: '',
  dateOfBirth: '', gender: 'male', bloodGroup: 'O+', maritalStatus: 'single',
  allergies: '', chronicConditions: '',
  emergencyName: '', emergencyPhone: '', emergencyRelation: '',
  insuranceProvider: '', insurancePolicy: '',
};

const ageOf = (dob) =>
  dob ? Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 3600 * 1000)) : null;

export default function Patients() {
  const { user } = useAuth();
  const canEdit = ['admin', 'receptionist'].includes(user.role);

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState('');

  const load = () => {
    setLoading(true);
    api
      .get('/patients', { params: { search: search || undefined, status: status || undefined } })
      .then((res) => setPatients(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load patients.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [search, status]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setFormErr('');
    setOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.user?.name || '',
      email: p.user?.email || '',
      password: '',
      phone: p.user?.phone || '',
      address: p.user?.address || '',
      dateOfBirth: p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : '',
      gender: p.gender || 'male',
      bloodGroup: p.bloodGroup || 'O+',
      maritalStatus: p.maritalStatus || 'single',
      allergies: (p.allergies || []).join(', '),
      chronicConditions: (p.chronicConditions || []).join(', '),
      emergencyName: p.emergencyContact?.name || '',
      emergencyPhone: p.emergencyContact?.phone || '',
      emergencyRelation: p.emergencyContact?.relation || '',
      insuranceProvider: p.insurance?.provider || '',
      insurancePolicy: p.insurance?.policyNumber || '',
    });
    setFormErr('');
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFormErr('');
    const split = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      address: form.address,
      dateOfBirth: form.dateOfBirth || null,
      gender: form.gender,
      bloodGroup: form.bloodGroup,
      maritalStatus: form.maritalStatus,
      allergies: split(form.allergies),
      chronicConditions: split(form.chronicConditions),
      emergencyContact: { name: form.emergencyName, phone: form.emergencyPhone, relation: form.emergencyRelation },
      insurance: form.insuranceProvider
        ? { provider: form.insuranceProvider, policyNumber: form.insurancePolicy }
        : {},
    };
    try {
      if (editing) {
        await api.put(`/patients/${editing._id}`, payload);
        setNotice('Patient updated.');
      } else {
        await api.post('/patients', { ...payload, password: form.password });
        setNotice('Patient registered.');
      }
      setOpen(false);
      load();
    } catch (err) {
      setFormErr(err.response?.data?.message || 'Failed to save patient.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete ${p.user?.name}?`)) return;
    try {
      await api.delete(`/patients/${p._id}`);
      setNotice('Patient deleted.');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete patient.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Patients</h1>
          <p className="text-sm text-slate-500">Register new patients and manage their records.</p>
        </div>
        {canEdit && <button className="btn-primary" onClick={openAdd}>+ Register Patient</button>}
      </div>

      <ErrorBanner message={error} onClose={() => setError('')} />
      <SuccessBanner message={notice} onClose={() => setNotice('')} />

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <input
          className="input max-w-xs"
          placeholder="Search by name or patient ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input max-w-[12rem]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="deceased">Deceased</option>
        </select>
        <div className="ml-auto text-sm text-slate-500">{patients.length} patient(s)</div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <Loading />
        ) : patients.length === 0 ? (
          <EmptyState title="No patients found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Patient</th>
                  <th className="th">ID</th>
                  <th className="th">Age / Gender</th>
                  <th className="th">Blood</th>
                  <th className="th">Phone</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((p) => {
                  const age = ageOf(p.dateOfBirth);
                  return (
                    <tr key={p._id} className="hover:bg-slate-50">
                      <td className="td">
                        <Link to={`/patients/${p._id}`} className="font-semibold text-slate-800 hover:text-brand-600">
                          {p.user?.name}
                        </Link>
                        <div className="text-xs text-slate-400">{p.user?.email}</div>
                      </td>
                      <td className="td font-mono text-xs">{p.patientId}</td>
                      <td className="td">
                        {age !== null ? `${age} yrs` : '—'} / <span className="capitalize">{p.gender}</span>
                      </td>
                      <td className="td"><Badge value={p.bloodGroup || '—'} /></td>
                      <td className="td">{p.user?.phone || '—'}</td>
                      <td className="td"><Badge value={p.status || 'active'} /></td>
                      <td className="td text-right whitespace-nowrap">
                        <Link to={`/patients/${p._id}`} className="mr-3 text-sm font-semibold text-slate-500 hover:text-slate-700">View</Link>
                        {canEdit && (
                          <>
                            <button className="mr-3 text-sm font-semibold text-brand-600 hover:text-brand-700" onClick={() => openEdit(p)}>Edit</button>
                            <button className="text-sm font-semibold text-rose-600 hover:text-rose-700" onClick={() => remove(p)}>Delete</button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Patient' : 'Register Patient'} wide>
        {formErr && <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{formErr}</div>}
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
            <label className="label">Date of birth</label>
            <input type="date" className="input" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
          </div>
          <div>
            <label className="label">Gender</label>
            <select className="input" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
              {['male', 'female', 'other'].map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Blood group</label>
            <select className="input" value={form.bloodGroup} onChange={(e) => set('bloodGroup', e.target.value)}>
              {BLOOD.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Marital status</label>
            <select className="input" value={form.maritalStatus} onChange={(e) => set('maritalStatus', e.target.value)}>
              {['single', 'married', 'divorced', 'widowed', 'unknown'].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Address</label>
            <input className="input" value={form.address} onChange={(e) => set('address', e.target.value)} />
          </div>
          <div>
            <label className="label">Allergies (comma separated)</label>
            <input className="input" placeholder="Penicillin, Dust" value={form.allergies} onChange={(e) => set('allergies', e.target.value)} />
          </div>
          <div>
            <label className="label">Chronic conditions</label>
            <input className="input" placeholder="Hypertension, Diabetes" value={form.chronicConditions} onChange={(e) => set('chronicConditions', e.target.value)} />
          </div>
          <div className="col-span-2 border-t border-slate-100 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Emergency contact
          </div>
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.emergencyName} onChange={(e) => set('emergencyName', e.target.value)} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.emergencyPhone} onChange={(e) => set('emergencyPhone', e.target.value)} />
          </div>
          <div>
            <label className="label">Relation</label>
            <input className="input" value={form.emergencyRelation} onChange={(e) => set('emergencyRelation', e.target.value)} />
          </div>
          <div>
            <label className="label">Insurance provider</label>
            <input className="input" value={form.insuranceProvider} onChange={(e) => set('insuranceProvider', e.target.value)} />
          </div>
          <div>
            <label className="label">Policy number</label>
            <input className="input" value={form.insurancePolicy} onChange={(e) => set('insurancePolicy', e.target.value)} />
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

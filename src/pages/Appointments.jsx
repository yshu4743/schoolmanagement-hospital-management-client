import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import ErrorBanner, { Loading, EmptyState, SuccessBanner } from '../components/Feedback';
import { useAuth } from '../context/AuthContext';

const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function Appointments() {
  const { user } = useAuth();
  const isPatient = user.role === 'patient';
  const canManage = ['admin', 'receptionist'].includes(user.role);

  const [items, setItems] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [date, setDate] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    const req = isPatient
      ? api.get('/appointments/my')
      : api.get('/appointments', {
          params: { date: date || undefined, doctorId: doctorId || undefined, status: status || undefined },
        });
    req
      .then((res) => setItems(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load appointments.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [date, doctorId, status, isPatient]);

  const q = search.trim().toLowerCase();
  const filtered = items.filter((a) =>
    [
      fmtDate(a.date),
      a.timeSlot,
      a.patient?.user?.name,
      a.patient?.patientId,
      a.doctor?.user?.name,
      a.department || a.doctor?.department,
      a.type,
      a.reason,
      a.status,
    ].some((x) => String(x ?? '').toLowerCase().includes(q))
  );

  useEffect(() => {
    api.get('/doctors').then((r) => setDoctors(r.data.data)).catch(() => {});
    if (!isPatient) api.get('/patients').then((r) => setPatients(r.data.data)).catch(() => {});
  }, [isPatient]);

  /* ------------------------------- Booking ------------------------------- */
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ patientId: '', doctorId: '', date: todayStr(), timeSlot: '', type: 'opd', reason: '' });
  const [slots, setSlots] = useState([]);
  const [slotLoading, setSlotLoading] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openBooking = () => {
    setForm({ patientId: '', doctorId: '', date: todayStr(), timeSlot: '', type: 'opd', reason: '' });
    setSlots([]);
    setFormErr('');
    setOpen(true);
  };

  useEffect(() => {
    if (!open || !form.doctorId || !form.date) {
      setSlots([]);
      return;
    }
    setSlotLoading(true);
    api
      .get('/appointments/available', { params: { doctorId: form.doctorId, date: form.date } })
      .then((r) => setSlots(r.data.data.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setSlotLoading(false));
  }, [open, form.doctorId, form.date]);

  const submit = async (e) => {
    e.preventDefault();
    setFormErr('');
    setBusy(true);
    try {
      const payload = {
        doctorId: form.doctorId,
        date: form.date,
        timeSlot: form.timeSlot,
        type: form.type,
        reason: form.reason,
      };
      if (!isPatient) payload.patientId = form.patientId;
      await api.post('/appointments', payload);
      setOpen(false);
      setNotice('Appointment booked.');
      load();
    } catch (err) {
      setFormErr(err.response?.data?.message || 'Booking failed.');
    } finally {
      setBusy(false);
    }
  };

  const setStatusFor = async (a, s) => {
    try {
      await api.patch(`/appointments/${a._id}/status`, { status: s });
      setNotice(`Appointment marked ${s.replace('_', ' ')}.`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update appointment.');
    }
  };

  const remove = async (a) => {
    if (!window.confirm('Delete this appointment?')) return;
    try {
      await api.delete(`/appointments/${a._id}`);
      setNotice('Appointment deleted.');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete appointment.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Appointments</h1>
          <p className="text-sm text-slate-500">
            {isPatient ? 'View and book your outpatient appointments.' : 'Book and manage outpatient consultation slots.'}
          </p>
        </div>
        <button className="btn-primary" onClick={openBooking}>+ Book Appointment</button>
      </div>

      <ErrorBanner message={error} onClose={() => setError('')} />
      <SuccessBanner message={notice} onClose={() => setNotice('')} />

      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[12rem]">
          <label className="label">Search</label>
          <input
            className="input max-w-xs"
            placeholder="Search appointments…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {!isPatient && (
          <>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="min-w-[12rem]">
              <label className="label">Doctor</label>
              <select className="input" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
                <option value="">All doctors</option>
                {doctors.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.user?.name} — {d.department}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[10rem]">
              <label className="label">Status</label>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All</option>
                {['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'].map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </>
        )}
        <div className="ml-auto pb-2 text-sm text-slate-500">
          <b className="text-slate-700">{filtered.length}</b> appointment{filtered.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          search.trim() ? (
            <EmptyState title="No matches found" subtitle={`Nothing matches “${search}”`} />
          ) : (
            <EmptyState title="No appointments" subtitle="Book an appointment to get started." />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Date</th>
                  <th className="th">Time</th>
                  <th className="th">Patient</th>
                  <th className="th">Doctor</th>
                  <th className="th">Type</th>
                  <th className="th">Reason</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((a) => (
                  <tr key={a._id} className="hover:bg-slate-50">
                    <td className="td">{fmtDate(a.date)}</td>
                    <td className="td font-mono text-xs">{a.timeSlot}</td>
                    <td className="td">
                      {isPatient ? (
                        <span className="font-semibold text-slate-800">{a.patient?.user?.name}</span>
                      ) : (
                        <Link to={`/patients/${a.patient?._id}`} className="font-semibold text-slate-800 hover:text-brand-600">
                          {a.patient?.user?.name}
                        </Link>
                      )}
                      <div className="text-xs text-slate-400">{a.patient?.patientId}</div>
                    </td>
                    <td className="td">
                      {a.doctor?.user?.name}
                      <div className="text-xs text-slate-400">{a.department || a.doctor?.department}</div>
                    </td>
                    <td className="td"><Badge value={a.type} /></td>
                    <td className="td max-w-[12rem] truncate">{a.reason || '—'}</td>
                    <td className="td"><Badge value={a.status} /></td>
                    <td className="td text-right whitespace-nowrap">
                      {canManage && a.status !== 'completed' && a.status !== 'cancelled' && (
                        <>
                          <button className="mr-3 text-sm font-semibold text-brand-600 hover:text-brand-700" onClick={() => setStatusFor(a, 'confirmed')}>Confirm</button>
                          <button className="mr-3 text-sm font-semibold text-amber-600 hover:text-amber-700" onClick={() => setStatusFor(a, 'no_show')}>No-show</button>
                          <button className="text-sm font-semibold text-rose-600 hover:text-rose-700" onClick={() => remove(a)}>Delete</button>
                        </>
                      )}
                      {isPatient && (a.status === 'scheduled' || a.status === 'confirmed') && (
                        <button className="text-sm font-semibold text-rose-600 hover:text-rose-700" onClick={() => setStatusFor(a, 'cancelled')}>Cancel</button>
                      )}
                      {!canManage && !isPatient && <span className="text-xs text-slate-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Book Appointment" wide>
        {formErr && <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{formErr}</div>}
        <form onSubmit={submit} className="space-y-3">
          {!isPatient && (
            <div>
              <label className="label">Patient</label>
              <select className="input" required value={form.patientId} onChange={(e) => set('patientId', e.target.value)}>
                <option value="">Select patient…</option>
                {patients.map((p) => (
                  <option key={p._id} value={p._id}>{p.user?.name} ({p.patientId})</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">Doctor</label>
            <select className="input" required value={form.doctorId} onChange={(e) => set('doctorId', e.target.value)}>
              <option value="">Select doctor…</option>
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>{d.user?.name} — {d.department} (₹{d.consultationFee})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" required value={form.date} onChange={(e) => set('date', e.target.value)} />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.type} onChange={(e) => set('type', e.target.value)}>
                {['opd', 'follow_up', 'emergency', 'teleconsultation'].map((t) => (
                  <option key={t} value={t}>{t.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Available slots</label>
            {!form.doctorId || !form.date ? (
              <p className="text-xs text-slate-400">Choose a doctor and date to see slots.</p>
            ) : slotLoading ? (
              <p className="text-xs text-slate-400">Loading slots…</p>
            ) : slots.length === 0 ? (
              <p className="text-xs text-slate-400">The doctor is not available on this day.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slots.map((s) => (
                  <button
                    type="button"
                    key={s.time}
                    disabled={s.booked}
                    onClick={() => set('timeSlot', s.time)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                      s.booked
                        ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 line-through'
                        : form.timeSlot === s.time
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-slate-300 text-slate-600 hover:border-brand-300'
                    }`}
                  >
                    {s.time}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="label">Reason</label>
            <textarea className="input" rows={2} value={form.reason} onChange={(e) => set('reason', e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button
              type="submit"
              disabled={busy || !form.timeSlot || (!isPatient && !form.patientId)}
              className="btn-primary"
            >
              {busy ? 'Booking…' : 'Book Appointment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

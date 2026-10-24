import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import ErrorBanner, { Loading, EmptyState, SuccessBanner } from '../components/Feedback';
import { useAuth } from '../context/AuthContext';

const todayStr = () => new Date().toISOString().slice(0, 10);
const LAB_PRESETS = [
  { name: 'Complete Blood Count (CBC)', price: 450 },
  { name: 'Blood Sugar (Fasting)', price: 150 },
  { name: 'Lipid Profile', price: 700 },
  { name: 'Liver Function Test', price: 850 },
  { name: 'Kidney Function Test', price: 800 },
  { name: 'Urine Routine', price: 200 },
  { name: 'Thyroid Profile', price: 650 },
  { name: 'Chest X-Ray', price: 500 },
  { name: 'ECG', price: 300 },
];
const emptyVitals = { bloodPressure: '', pulse: '', temperature: '', weight: '', height: '', oxygenSaturation: '', respiratoryRate: '', symptoms: '' };

export default function OPD() {
  const { user } = useAuth();
  const [date, setDate] = useState(todayStr());
  const [doctorId, setDoctorId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [visits, setVisits] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const canCheckIn = ['admin', 'receptionist', 'nurse'].includes(user.role);
  const canConsult = ['admin', 'doctor'].includes(user.role);
  const canVitals = ['admin', 'doctor', 'nurse'].includes(user.role);

  const load = () => {
    setLoading(true);
    api
      .get('/visits', { params: { date, doctorId: doctorId || undefined, status: status || undefined } })
      .then((res) => setVisits(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load OPD queue.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [date, doctorId, status]);

  useEffect(() => {
    api.get('/doctors').then((r) => setDoctors(r.data.data)).catch(() => {});
    api.get('/patients').then((r) => setPatients(r.data.data)).catch(() => {});
    api.get('/medicines').then((r) => setMedicines(r.data.data)).catch(() => {});
  }, []);

  /* ------------------------------ Check-in ------------------------------ */
  const [checkOpen, setCheckOpen] = useState(false);
  const [checkForm, setCheckForm] = useState({ patientId: '', doctorId: '', type: 'opd', reason: '', consultationFee: '' });
  const [checkErr, setCheckErr] = useState('');
  const [busy, setBusy] = useState(false);

  const openCheckIn = () => {
    setCheckForm({ patientId: '', doctorId: '', type: 'opd', reason: '', consultationFee: '' });
    setCheckErr('');
    setCheckOpen(true);
  };

  const submitCheckIn = async (e) => {
    e.preventDefault();
    setBusy(true);
    setCheckErr('');
    try {
      const doc = doctors.find((d) => d._id === checkForm.doctorId);
      await api.post('/visits', {
        patientId: checkForm.patientId,
        doctorId: checkForm.doctorId,
        type: checkForm.type,
        reason: checkForm.reason,
        department: doc?.department,
        consultationFee: checkForm.consultationFee !== '' ? Number(checkForm.consultationFee) : doc?.consultationFee,
      });
      setCheckOpen(false);
      setNotice('Patient checked in.');
      load();
    } catch (err) {
      setCheckErr(err.response?.data?.message || 'Check-in failed.');
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------- Vitals ------------------------------- */
  const [vitOpen, setVitOpen] = useState(false);
  const [vitTarget, setVitTarget] = useState(null);
  const [vitForm, setVitForm] = useState(emptyVitals);

  const openVitals = (v) => {
    setVitTarget(v);
    setVitForm({ ...emptyVitals, ...Object.fromEntries(Object.entries(v.vitals || {}).map(([k, x]) => [k, x ?? ''])) });
    setVitOpen(true);
  };

  const saveVitals = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {};
      Object.entries(vitForm).forEach(([k, x]) => { payload[k] = x === '' ? null : x; });
      await api.put(`/visits/${vitTarget._id}`, { vitals: payload });
      setVitOpen(false);
      setNotice('Vitals recorded.');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save vitals.');
    } finally {
      setBusy(false);
    }
  };

  /* ----------------------------- Consultation --------------------------- */
  const [consultOpen, setConsultOpen] = useState(false);
  const [target, setTarget] = useState(null);
  const [cx, setCx] = useState({ diagnosis: '', icdCode: '', chiefComplaint: '', history: '', examination: '', treatmentPlan: '', advice: '', followUpDate: '' });
  const [rx, setRx] = useState([]);
  const [labs, setLabs] = useState([]);
  const [extras, setExtras] = useState([]);
  const [consultErr, setConsultErr] = useState('');

  const openConsult = (v) => {
    setTarget(v);
    setCx({ diagnosis: '', icdCode: '', chiefComplaint: v.reason || '', history: '', examination: '', treatmentPlan: '', advice: '', followUpDate: '' });
    setRx([]); setLabs([]); setExtras([]); setConsultErr('');
    setConsultOpen(true);
  };

  const addRx = (medId) => {
    const m = medicines.find((x) => x._id === medId);
    if (!m) return;
    setRx((r) => [...r, { medicineId: m._id, name: `${m.name} ${m.strength || ''}`.trim(), dosage: m.strength || '1 tablet', frequency: '1-0-1', durationDays: 5, route: 'oral', quantity: 10 }]);
  };
  const setRxField = (i, k, v) => setRx((r) => r.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)));

  const addLab = (preset) => { if (preset) setLabs((l) => [...l, { ...preset }]); };
  const addExtra = () => setExtras((x) => [...x, { description: '', category: 'other', quantity: 1, unitPrice: 0 }]);

  const submitConsult = async (e) => {
    e.preventDefault();
    setConsultErr('');
    if (!cx.diagnosis) { setConsultErr('Diagnosis is required.'); return; }
    setBusy(true);
    try {
      await api.post(`/visits/${target._id}/consult`, {
        ...cx,
        followUpDate: cx.followUpDate || null,
        prescriptions: rx,
        labTests: labs,
        extraCharges: extras.filter((x) => x.description),
      });
      setConsultOpen(false);
      setNotice('Consultation completed.');
      load();
    } catch (err) {
      setConsultErr(err.response?.data?.message || 'Failed to complete consultation.');
    } finally {
      setBusy(false);
    }
  };

  const startVisit = async (v) => {
    try {
      await api.patch(`/visits/${v._id}/start`);
      setNotice('Consultation started.');
      load();
    } catch (err) { setError(err.response?.data?.message || 'Failed to start.'); }
  };

  const patientName = (v) => v.patient?.user?.name || '—';
  const doctorName = (v) => v.doctor?.user?.name || '—';

  const q = search.trim().toLowerCase();
  const filtered = visits.filter((v) =>
    [
      String(v.queueNumber ?? ''),
      patientName(v),
      v.patient?.patientId,
      doctorName(v),
      v.department,
      v.reason,
      v.status,
      v.vitals?.bloodPressure,
      v.vitals?.pulse,
      v.vitals?.temperature,
    ].some((x) => String(x ?? '').toLowerCase().includes(q))
  );

  const counts = useMemo(() => ({
    waiting: filtered.filter((v) => v.status === 'waiting').length,
    in: filtered.filter((v) => v.status === 'in_consultation').length,
    done: filtered.filter((v) => v.status === 'completed').length,
  }), [filtered]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">OPD Queue</h1>
          <p className="text-sm text-slate-500">Manage today&apos;s outpatient flow from check-in to consultation.</p>
        </div>
        {canCheckIn && <button className="btn-primary" onClick={openCheckIn}>+ Check In Patient</button>}
      </div>

      <ErrorBanner message={error} onClose={() => setError('')} />
      <SuccessBanner message={notice} onClose={() => setNotice('')} />

      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[12rem]">
          <label className="label">Search</label>
          <input
            className="input max-w-xs"
            placeholder="Search patient, doctor, reason…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="min-w-[12rem]">
          <label className="label">Doctor</label>
          <select className="input" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            <option value="">All doctors</option>
            {doctors.map((d) => <option key={d._id} value={d._id}>{d.user?.name} — {d.department}</option>)}
          </select>
        </div>
        <div className="min-w-[10rem]">
          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="waiting">Waiting</option>
            <option value="in_consultation">In consultation</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div className="ml-auto flex gap-4 pb-2 text-sm text-slate-500">
          <span>Waiting: <b className="text-amber-600">{counts.waiting}</b></span>
          <span>In consult: <b className="text-blue-600">{counts.in}</b></span>
          <span>Done: <b className="text-emerald-600">{counts.done}</b></span>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          search.trim() ? (
            <EmptyState title="No matches found" subtitle={`Nothing matches “${search}”`} />
          ) : (
            <EmptyState title="No visits for this selection" subtitle="Check in a patient to start the queue." />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">#</th>
                  <th className="th">Patient</th>
                  <th className="th">Doctor</th>
                  <th className="th">Reason</th>
                  <th className="th">Vitals</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((v) => (
                  <tr key={v._id} className="hover:bg-slate-50">
                    <td className="td font-semibold">{v.queueNumber}</td>
                    <td className="td">
                      <Link to={`/patients/${v.patient?._id}`} className="font-semibold text-slate-800 hover:text-brand-600">{patientName(v)}</Link>
                      <div className="text-xs text-slate-400">{v.patient?.patientId}</div>
                    </td>
                    <td className="td">{doctorName(v)}<div className="text-xs text-slate-400">{v.department}</div></td>
                    <td className="td max-w-[14rem] truncate">{v.reason || '—'}</td>
                    <td className="td text-xs text-slate-500">
                      {v.vitals?.bloodPressure || v.vitals?.pulse ? (
                        <div>
                          {v.vitals.bloodPressure && <div>BP {v.vitals.bloodPressure}</div>}
                          {v.vitals.pulse && <div>Pulse {v.vitals.pulse}</div>}
                          {v.vitals.temperature && <div>Temp {v.vitals.temperature}°F</div>}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="td"><Badge value={v.status} /></td>
                    <td className="td text-right whitespace-nowrap">
                      {canVitals && v.status !== 'completed' && (
                        <button className="mr-3 text-sm font-semibold text-slate-500 hover:text-slate-700" onClick={() => openVitals(v)}>Vitals</button>
                      )}
                      {canConsult && (v.status === 'waiting' || v.status === 'in_consultation') && (
                        <button className="mr-3 text-sm font-semibold text-brand-600 hover:text-brand-700" onClick={() => (v.status === 'waiting' ? startVisit(v) : openConsult(v))}>
                          {v.status === 'waiting' ? 'Start' : 'Consult'}
                        </button>
                      )}
                      {v.status === 'completed' && <Link to={`/records?patient=${v.patient?._id}`} className="text-sm font-semibold text-slate-500 hover:text-slate-700">Records</Link>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Check-in modal */}
      <Modal open={checkOpen} onClose={() => setCheckOpen(false)} title="Check In Patient">
        {checkErr && <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{checkErr}</div>}
        <form onSubmit={submitCheckIn} className="space-y-3">
          <div>
            <label className="label">Patient</label>
            <select className="input" required value={checkForm.patientId} onChange={(e) => setCheckForm((f) => ({ ...f, patientId: e.target.value }))}>
              <option value="">Select patient…</option>
              {patients.map((p) => <option key={p._id} value={p._id}>{p.user?.name} ({p.patientId})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Doctor</label>
            <select
              className="input"
              required
              value={checkForm.doctorId}
              onChange={(e) => setCheckForm((f) => ({ ...f, doctorId: e.target.value }))}
            >
              <option value="">Select doctor…</option>
              {doctors.map((d) => <option key={d._id} value={d._id}>{d.user?.name} — {d.department} (₹{d.consultationFee})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Visit type</label>
              <select className="input" value={checkForm.type} onChange={(e) => setCheckForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="opd">OPD</option>
                <option value="emergency">Emergency</option>
                <option value="follow_up">Follow-up</option>
              </select>
            </div>
            <div>
              <label className="label">Consultation fee (₹)</label>
              <input type="number" min="0" className="input" placeholder="Default from doctor" value={checkForm.consultationFee} onChange={(e) => setCheckForm((f) => ({ ...f, consultationFee: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Reason for visit</label>
            <textarea className="input" rows={2} value={checkForm.reason} onChange={(e) => setCheckForm((f) => ({ ...f, reason: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setCheckOpen(false)}>Cancel</button>
            <button type="submit" disabled={busy} className="btn-primary">{busy ? 'Checking in…' : 'Check In'}</button>
          </div>
        </form>
      </Modal>

      {/* Vitals modal */}
      <Modal open={vitOpen} onClose={() => setVitOpen(false)} title={`Vitals — ${vitTarget ? patientName(vitTarget) : ''}`}>
        <form onSubmit={saveVitals} className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Blood pressure</label>
            <input className="input" placeholder="120/80" value={vitForm.bloodPressure} onChange={(e) => setVitForm((f) => ({ ...f, bloodPressure: e.target.value }))} />
          </div>
          <div>
            <label className="label">Pulse (bpm)</label>
            <input type="number" className="input" value={vitForm.pulse} onChange={(e) => setVitForm((f) => ({ ...f, pulse: e.target.value }))} />
          </div>
          <div>
            <label className="label">Temperature (°F)</label>
            <input type="number" step="0.1" className="input" value={vitForm.temperature} onChange={(e) => setVitForm((f) => ({ ...f, temperature: e.target.value }))} />
          </div>
          <div>
            <label className="label">Weight (kg)</label>
            <input type="number" step="0.1" className="input" value={vitForm.weight} onChange={(e) => setVitForm((f) => ({ ...f, weight: e.target.value }))} />
          </div>
          <div>
            <label className="label">Height (cm)</label>
            <input type="number" className="input" value={vitForm.height} onChange={(e) => setVitForm((f) => ({ ...f, height: e.target.value }))} />
          </div>
          <div>
            <label className="label">SpO2 (%)</label>
            <input type="number" className="input" value={vitForm.oxygenSaturation} onChange={(e) => setVitForm((f) => ({ ...f, oxygenSaturation: e.target.value }))} />
          </div>
          <div>
            <label className="label">Respiratory rate</label>
            <input type="number" className="input" value={vitForm.respiratoryRate} onChange={(e) => setVitForm((f) => ({ ...f, respiratoryRate: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="label">Symptoms</label>
            <textarea className="input" rows={2} value={vitForm.symptoms} onChange={(e) => setVitForm((f) => ({ ...f, symptoms: e.target.value }))} />
          </div>
          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setVitOpen(false)}>Cancel</button>
            <button type="submit" disabled={busy} className="btn-primary">{busy ? 'Saving…' : 'Save Vitals'}</button>
          </div>
        </form>
      </Modal>

      {/* Consultation modal */}
      <Modal open={consultOpen} onClose={() => setConsultOpen(false)} title={`Consultation — ${target ? patientName(target) : ''}`} wide>
        {consultErr && <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{consultErr}</div>}
        {target?.patient?.allergies?.length > 0 && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
            ⚠ Allergies: {target.patient.allergies.join(', ')}
          </div>
        )}
        <form onSubmit={submitConsult} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Diagnosis *</label>
              <input className="input" required value={cx.diagnosis} onChange={(e) => setCx((c) => ({ ...c, diagnosis: e.target.value }))} />
            </div>
            <div>
              <label className="label">ICD code</label>
              <input className="input" placeholder="e.g. J20.9" value={cx.icdCode} onChange={(e) => setCx((c) => ({ ...c, icdCode: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Chief complaint</label>
            <input className="input" value={cx.chiefComplaint} onChange={(e) => setCx((c) => ({ ...c, chiefComplaint: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">History</label>
              <textarea className="input" rows={2} value={cx.history} onChange={(e) => setCx((c) => ({ ...c, history: e.target.value }))} />
            </div>
            <div>
              <label className="label">Examination</label>
              <textarea className="input" rows={2} value={cx.examination} onChange={(e) => setCx((c) => ({ ...c, examination: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Treatment plan</label>
              <textarea className="input" rows={2} value={cx.treatmentPlan} onChange={(e) => setCx((c) => ({ ...c, treatmentPlan: e.target.value }))} />
            </div>
            <div>
              <label className="label">Advice</label>
              <textarea className="input" rows={2} value={cx.advice} onChange={(e) => setCx((c) => ({ ...c, advice: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Follow-up date</label>
            <input type="date" className="input" value={cx.followUpDate} onChange={(e) => setCx((c) => ({ ...c, followUpDate: e.target.value }))} />
          </div>

          {/* Prescriptions */}
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="label mb-0">E-prescription</span>
              <select className="input max-w-xs" value="" onChange={(e) => addRx(e.target.value)}>
                <option value="">+ Add medicine…</option>
                {medicines.map((m) => <option key={m._id} value={m._id}>{m.name} {m.strength} (stock {m.totalStock})</option>)}
              </select>
            </div>
            {rx.length === 0 ? (
              <p className="text-xs text-slate-400">No medicines added.</p>
            ) : (
              <div className="space-y-2">
                {rx.map((r, i) => (
                  <div key={i} className="grid grid-cols-12 items-center gap-2 text-xs">
                    <div className="col-span-4 font-semibold text-slate-700">{r.name}</div>
                    <input className="input col-span-2" placeholder="Dosage" value={r.dosage} onChange={(e) => setRxField(i, 'dosage', e.target.value)} />
                    <input className="input col-span-2" placeholder="Frequency" value={r.frequency} onChange={(e) => setRxField(i, 'frequency', e.target.value)} />
                    <input type="number" min="1" className="input col-span-2" value={r.durationDays} onChange={(e) => setRxField(i, 'durationDays', Number(e.target.value))} />
                    <button type="button" className="col-span-2 text-rose-600" onClick={() => setRx((x) => x.filter((_, idx) => idx !== i))}>Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lab tests */}
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="label mb-0">Lab tests</span>
              <select className="input max-w-xs" value="" onChange={(e) => { addLab(LAB_PRESETS[Number(e.target.value)]); e.target.value = ''; }}>
                <option value="">+ Add test…</option>
                {LAB_PRESETS.map((t, i) => <option key={t.name} value={i}>{t.name} (₹{t.price})</option>)}
              </select>
            </div>
            {labs.length === 0 ? (
              <p className="text-xs text-slate-400">No tests ordered.</p>
            ) : (
              <div className="space-y-1">
                {labs.map((t, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-slate-700">{t.name} — ₹{t.price}</span>
                    <button type="button" className="text-rose-600" onClick={() => setLabs((x) => x.filter((_, idx) => idx !== i))}>Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Extra charges */}
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="label mb-0">Extra charges</span>
              <button type="button" className="text-xs font-semibold text-brand-600" onClick={addExtra}>+ Add charge</button>
            </div>
            {extras.length === 0 ? (
              <p className="text-xs text-slate-400">No extra charges.</p>
            ) : (
              <div className="space-y-2">
                {extras.map((x, i) => (
                  <div key={i} className="grid grid-cols-12 items-center gap-2 text-xs">
                    <input className="input col-span-6" placeholder="Description" value={x.description} onChange={(e) => setExtras((arr) => arr.map((it, idx) => (idx === i ? { ...it, description: e.target.value } : it)))} />
                    <select className="input col-span-3" value={x.category} onChange={(e) => setExtras((arr) => arr.map((it, idx) => (idx === i ? { ...it, category: e.target.value } : it)))}>
                      {['procedure', 'nursing', 'room', 'other'].map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input type="number" min="0" className="input col-span-2" placeholder="₹" value={x.unitPrice} onChange={(e) => setExtras((arr) => arr.map((it, idx) => (idx === i ? { ...it, unitPrice: Number(e.target.value) } : it)))} />
                    <button type="button" className="col-span-1 text-rose-600" onClick={() => setExtras((arr) => arr.filter((_, idx) => idx !== i))}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setConsultOpen(false)}>Cancel</button>
            <button type="submit" disabled={busy} className="btn-primary">{busy ? 'Completing…' : 'Complete Consultation'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

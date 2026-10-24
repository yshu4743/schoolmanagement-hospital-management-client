import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import ErrorBanner, { Loading, EmptyState, SuccessBanner } from '../components/Feedback';
import { useAuth } from '../context/AuthContext';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const losDays = (a) => {
  const start = new Date(a.admitDate).getTime();
  const end = a.dischargeDate ? new Date(a.dischargeDate).getTime() : Date.now();
  return Math.max(1, Math.ceil((end - start) / 86400000));
};

const ADMIT_TYPES = ['planned', 'emergency'];

const EMPTY_ADMIT = {
  patientId: '', doctorId: '', wardId: '', bedId: '', admitType: 'planned', provisionalDiagnosis: '', reason: '',
};
const EMPTY_DISCHARGE = { finalDiagnosis: '', dischargeSummary: '' };

export default function Admissions() {
  const { user } = useAuth();
  const canAdmit = ['admin', 'receptionist'].includes(user.role);
  const canDischarge = ['admin', 'doctor'].includes(user.role);

  const [status, setStatus] = useState('admitted');
  const [wardId, setWardId] = useState('');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [wards, setWards] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = () => {
    setLoading(true);
    api
      .get('/admissions', { params: { status: status || undefined, wardId: wardId || undefined } })
      .then((res) => setItems(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load admissions.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [status, wardId]);

  const q = search.trim().toLowerCase();
  const filtered = items.filter((a) =>
    [
      a.admissionNumber,
      a.patient?.user?.name,
      a.patient?.patientId,
      a.ward?.name,
      a.ward?.type,
      a.bed?.bedNumber,
      a.doctor?.user?.name,
      fmtDate(a.admitDate),
      `${losDays(a)}d`,
      a.finalDiagnosis,
      a.provisionalDiagnosis,
      a.reason,
      a.status,
    ].some((x) => String(x ?? '').toLowerCase().includes(q))
  );

  useEffect(() => {
    api.get('/wards').then((r) => setWards(r.data.data)).catch(() => {});
    api.get('/doctors').then((r) => setDoctors(r.data.data)).catch(() => {});
    if (canAdmit) api.get('/patients').then((r) => setPatients(r.data.data)).catch(() => {});
  }, [canAdmit]);

  /* ------------------------------ Admit ------------------------------ */
  const [admitOpen, setAdmitOpen] = useState(false);
  const [admitForm, setAdmitForm] = useState(EMPTY_ADMIT);
  const [beds, setBeds] = useState([]);
  const [bedsLoading, setBedsLoading] = useState(false);
  const [admitBusy, setAdmitBusy] = useState(false);
  const [admitError, setAdmitError] = useState('');

  const setAdmit = (k, v) => setAdmitForm((f) => ({ ...f, [k]: v }));

  const openAdmit = () => {
    setAdmitForm(EMPTY_ADMIT);
    setBeds([]);
    setAdmitError('');
    setAdmitOpen(true);
  };

  useEffect(() => {
    if (!admitOpen || !admitForm.wardId) {
      setBeds([]);
      return;
    }
    let active = true;
    setBedsLoading(true);
    api
      .get('/beds/available', { params: { wardId: admitForm.wardId } })
      .then((r) => {
        if (active) setBeds(r.data.data);
      })
      .catch(() => {
        if (active) setBeds([]);
      })
      .finally(() => active && setBedsLoading(false));
    return () => {
      active = false;
    };
  }, [admitOpen, admitForm.wardId]);

  const submitAdmit = async (e) => {
    e.preventDefault();
    setAdmitBusy(true);
    setAdmitError('');
    try {
      await api.post('/admissions', {
        patientId: admitForm.patientId,
        doctorId: admitForm.doctorId,
        wardId: admitForm.wardId,
        bedId: admitForm.bedId,
        admitType: admitForm.admitType,
        reason: admitForm.reason,
        provisionalDiagnosis: admitForm.provisionalDiagnosis,
      });
      setAdmitOpen(false);
      setNotice('Patient admitted.');
      load();
    } catch (err) {
      setAdmitError(err.response?.data?.message || 'Failed to admit the patient.');
    } finally {
      setAdmitBusy(false);
    }
  };

  /* ----------------------------- Discharge ----------------------------- */
  const [disOpen, setDisOpen] = useState(false);
  const [disTarget, setDisTarget] = useState(null);
  const [disForm, setDisForm] = useState(EMPTY_DISCHARGE);
  const [disBusy, setDisBusy] = useState(false);
  const [disError, setDisError] = useState('');

  const openDischarge = (a) => {
    setDisTarget(a);
    setDisForm(EMPTY_DISCHARGE);
    setDisError('');
    setDisOpen(true);
  };

  const submitDischarge = async (e) => {
    e.preventDefault();
    setDisBusy(true);
    setDisError('');
    try {
      await api.post(`/admissions/${disTarget._id}/discharge`, {
        finalDiagnosis: disForm.finalDiagnosis,
        dischargeSummary: disForm.dischargeSummary,
        generateInvoice: true,
      });
      setDisOpen(false);
      setNotice('Patient discharged.');
      load();
    } catch (err) {
      setDisError(err.response?.data?.message || 'Failed to discharge the patient.');
    } finally {
      setDisBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admissions</h1>
          <p className="text-sm text-slate-500">Track in-patient stays from admission to discharge.</p>
        </div>
        {canAdmit && <button className="btn-primary" onClick={openAdmit}>+ Admit Patient</button>}
      </div>

      <ErrorBanner message={error} onClose={() => setError('')} />
      <SuccessBanner message={notice} onClose={() => setNotice('')} />

      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[12rem]">
          <label className="label">Search</label>
          <input
            className="input max-w-xs"
            placeholder="Search admissions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="min-w-[10rem]">
          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="admitted">Admitted</option>
            <option value="discharged">Discharged</option>
            <option value="transferred">Transferred</option>
          </select>
        </div>
        <div className="min-w-[12rem]">
          <label className="label">Ward</label>
          <select className="input" value={wardId} onChange={(e) => setWardId(e.target.value)}>
            <option value="">All wards</option>
            {wards.map((w) => (
              <option key={w._id} value={w._id}>{w.name}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto pb-2 text-sm text-slate-500">
          <b className="text-slate-700">{filtered.length}</b> admission{filtered.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          search.trim() ? (
            <EmptyState title="No matches found" subtitle={`Nothing matches “${search}”`} />
          ) : (
            <EmptyState title="No admissions found" subtitle={canAdmit ? 'Admit a patient to get started.' : undefined} />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Admission #</th>
                  <th className="th">Patient</th>
                  <th className="th">Ward / Bed</th>
                  <th className="th">Doctor</th>
                  <th className="th">Admit date</th>
                  <th className="th">LOS</th>
                  <th className="th">Diagnosis</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((a) => (
                  <tr key={a._id} className="hover:bg-slate-50">
                    <td className="td font-mono text-xs">{a.admissionNumber}</td>
                    <td className="td">
                      <Link to={`/patients/${a.patient?._id}`} className="font-semibold text-slate-800 hover:text-brand-600">
                        {a.patient?.user?.name || '—'}
                      </Link>
                      <div className="text-xs text-slate-400">{a.patient?.patientId}</div>
                    </td>
                    <td className="td">
                      {a.ward?.name || '—'}
                      <div className="font-mono text-xs text-slate-400">{a.bed?.bedNumber || '—'}</div>
                    </td>
                    <td className="td">{a.doctor?.user?.name || '—'}</td>
                    <td className="td whitespace-nowrap">{fmtDate(a.admitDate)}</td>
                    <td className="td">{losDays(a)}d</td>
                    <td className="td max-w-[14rem] truncate">
                      {a.finalDiagnosis || a.provisionalDiagnosis || a.reason || '—'}
                    </td>
                    <td className="td"><Badge value={a.status} /></td>
                    <td className="td whitespace-nowrap text-right">
                      {a.status === 'admitted' && canDischarge && (
                        <button
                          className="text-sm font-semibold text-brand-600 hover:text-brand-700"
                          onClick={() => openDischarge(a)}
                        >
                          Discharge
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admit modal */}
      <Modal open={admitOpen} onClose={() => setAdmitOpen(false)} title="Admit Patient" wide>
        {admitError && (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{admitError}</div>
        )}
        <form onSubmit={submitAdmit} className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Patient</label>
            <select className="input" required value={admitForm.patientId} onChange={(e) => setAdmit('patientId', e.target.value)}>
              <option value="">Select patient…</option>
              {patients.map((p) => (
                <option key={p._id} value={p._id}>{p.user?.name} ({p.patientId})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Doctor</label>
            <select className="input" required value={admitForm.doctorId} onChange={(e) => setAdmit('doctorId', e.target.value)}>
              <option value="">Select doctor…</option>
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>{d.user?.name} — {d.department}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Ward</label>
            <select
              className="input"
              required
              value={admitForm.wardId}
              onChange={(e) => {
                setAdmit('wardId', e.target.value);
                setAdmit('bedId', '');
              }}
            >
              <option value="">Select ward…</option>
              {wards.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.name} — ₹{(w.dailyCharge || 0).toLocaleString('en-IN')}/day
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Bed</label>
            <select
              className="input"
              required
              disabled={!admitForm.wardId || bedsLoading}
              value={admitForm.bedId}
              onChange={(e) => setAdmit('bedId', e.target.value)}
            >
              <option value="">
                {!admitForm.wardId ? 'Choose a ward first' : bedsLoading ? 'Loading beds…' : 'Select bed…'}
              </option>
              {beds.map((b) => (
                <option key={b._id} value={b._id}>{b.bedNumber}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Admit type</label>
            <select className="input" value={admitForm.admitType} onChange={(e) => setAdmit('admitType', e.target.value)}>
              {ADMIT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Provisional diagnosis</label>
            <input
              className="input"
              value={admitForm.provisionalDiagnosis}
              onChange={(e) => setAdmit('provisionalDiagnosis', e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className="label">Reason for admission</label>
            <textarea className="input" rows={2} value={admitForm.reason} onChange={(e) => setAdmit('reason', e.target.value)} />
          </div>
          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setAdmitOpen(false)}>Cancel</button>
            <button type="submit" disabled={admitBusy || !admitForm.bedId} className="btn-primary">
              {admitBusy ? 'Admitting…' : 'Admit Patient'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Discharge modal */}
      <Modal
        open={disOpen}
        onClose={() => setDisOpen(false)}
        title={`Discharge — ${disTarget?.patient?.user?.name || ''}`}
      >
        {disError && (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{disError}</div>
        )}
        <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
          A room-charge invoice will be generated for the length of the stay.
        </div>
        <form onSubmit={submitDischarge} className="space-y-3">
          <div>
            <label className="label">Final diagnosis</label>
            <input
              className="input"
              required
              value={disForm.finalDiagnosis}
              onChange={(e) => setDisForm((f) => ({ ...f, finalDiagnosis: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Discharge summary</label>
            <textarea
              className="input"
              rows={4}
              required
              placeholder="Treatment given, advice at discharge, follow-up…"
              value={disForm.dischargeSummary}
              onChange={(e) => setDisForm((f) => ({ ...f, dischargeSummary: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setDisOpen(false)}>Cancel</button>
            <button type="submit" disabled={disBusy} className="btn-primary">
              {disBusy ? 'Discharging…' : 'Discharge Patient'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Badge from '../components/Badge';
import ErrorBanner, { Loading, EmptyState, SuccessBanner } from '../components/Feedback';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const RECORD_TYPES = [
  ['opd', 'OPD'],
  ['ipd_round', 'IPD Round'],
  ['emergency', 'Emergency'],
  ['follow_up', 'Follow-up'],
];

export default function Records() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [recordType, setRecordType] = useState('');

  const [detail, setDetail] = useState({});

  const load = () => {
    setLoading(true);
    api
      .get('/records', {
        params: { patientId: patientId || undefined, recordType: recordType || undefined },
      })
      .then((res) => setRecords(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load medical records.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [patientId, recordType]);

  useEffect(() => {
    api.get('/patients').then((r) => setPatients(r.data.data)).catch(() => {});
  }, []);

  const toggleDetail = (id) => setDetail((d) => ({ ...d, [id]: !d[id] }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">EMR Records</h1>
        <p className="text-sm text-slate-500">Electronic medical records across OPD, IPD and emergency encounters.</p>
      </div>

      <ErrorBanner message={error} onClose={() => setError('')} />
      <SuccessBanner message={notice} onClose={() => setNotice('')} />

      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[14rem]">
          <label className="label">Patient</label>
          <select className="input" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            <option value="">All patients</option>
            {patients.map((p) => <option key={p._id} value={p._id}>{p.user?.name} ({p.patientId})</option>)}
          </select>
        </div>
        <div className="min-w-[12rem]">
          <label className="label">Record type</label>
          <select className="input" value={recordType} onChange={(e) => setRecordType(e.target.value)}>
            <option value="">All types</option>
            {RECORD_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card"><Loading /></div>
      ) : records.length === 0 ? (
        <div className="card">
          <EmptyState title="No medical records found" subtitle="Adjust the filters to broaden your search." />
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((r) => {
            const v = r.vitals || {};
            const hasVitals =
              v.bloodPressure || v.pulse || v.temperature || v.weight || v.oxygenSaturation;
            const showDetail = Boolean(detail[r._id]);
            return (
              <div key={r._id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/patients/${r.patient?._id}`}
                        className="font-semibold text-slate-800 hover:text-brand-600"
                      >
                        {r.patient?.user?.name || '—'}
                      </Link>
                      {r.patient?.patientId && <span className="text-xs text-slate-400">{r.patient.patientId}</span>}
                      <Badge value={r.recordType} color="brand" />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-800">{r.diagnosis || 'No diagnosis recorded'}</span>
                      {r.icdCode && (
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">{r.icdCode}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-medium text-slate-600">{fmtDate(r.date)}</div>
                    <div className="text-xs text-slate-500">Dr. {r.doctor?.user?.name || '—'}</div>
                    {r.doctor?.department && <div className="text-xs text-slate-400">{r.doctor.department}</div>}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="label">Chief complaint</div>
                    <p className="text-sm text-slate-700">{r.chiefComplaint || '—'}</p>
                  </div>
                  <div>
                    <div className="label">Examination</div>
                    <p className="text-sm text-slate-700">{r.examination || '—'}</p>
                  </div>
                  <div>
                    <div className="label">Treatment plan</div>
                    <p className="text-sm text-slate-700">{r.treatmentPlan || '—'}</p>
                  </div>
                  <div>
                    <div className="label">Advice</div>
                    <p className="text-sm text-slate-700">{r.advice || '—'}</p>
                  </div>
                </div>

                {hasVitals && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {v.bloodPressure && (
                      <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">BP {v.bloodPressure}</span>
                    )}
                    {v.pulse && (
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">Pulse {v.pulse} bpm</span>
                    )}
                    {v.temperature && (
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">Temp {v.temperature}°F</span>
                    )}
                    {v.weight && (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Weight {v.weight} kg</span>
                    )}
                    {v.oxygenSaturation && (
                      <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">SpO₂ {v.oxygenSaturation}%</span>
                    )}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <button
                    className="text-sm font-semibold text-brand-600 hover:text-brand-700"
                    onClick={() => toggleDetail(r._id)}
                  >
                    {showDetail ? 'Hide details' : 'Details'}
                  </button>
                </div>

                {showDetail && (
                  <div className="mt-3 grid gap-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
                    <div>
                      <div className="label">History</div>
                      <p className="text-sm text-slate-700">{r.history || '—'}</p>
                    </div>
                    <div>
                      <div className="label">Follow-up date</div>
                      <p className="text-sm text-slate-700">{r.followUpDate ? fmtDate(r.followUpDate) : '—'}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

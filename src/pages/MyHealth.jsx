import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Badge from '../components/Badge';
import StatCard from '../components/StatCard';
import ErrorBanner, { Loading, EmptyState, SuccessBanner } from '../components/Feedback';

const money = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const TAB_ENDPOINTS = {
  Appointments: 'appointments',
  Visits: 'visits',
  'Medical Records': 'records',
  Prescriptions: 'prescriptions',
  'Lab Tests': 'labs',
  Bills: 'invoices',
};
const TABS = Object.keys(TAB_ENDPOINTS);

const capitalize = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1).replace(/_/g, ' ') : '');

const renderContact = (c) => {
  if (!c) return '—';
  if (typeof c === 'string') return c;
  return [c.name, c.relation, c.phone, c.number, c.email].filter(Boolean).join(' · ') || '—';
};
const renderInsurance = (ins) => {
  if (!ins) return '—';
  if (typeof ins === 'string') return ins;
  return [ins.provider, ins.policyNumber, ins.memberId].filter(Boolean).join(' · ') || '—';
};

export default function MyHealth() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [tab, setTab] = useState('Appointments');
  const [data, setData] = useState({});
  const [tabLoading, setTabLoading] = useState(false);
  const [tabError, setTabError] = useState('');

  useEffect(() => {
    api
      .get('/patients/me')
      .then((res) => setProfile(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load your health profile.'))
      .finally(() => setLoading(false));
  }, []);

  // Lazily load each tab's data once, then cache it.
  useEffect(() => {
    const key = TAB_ENDPOINTS[tab];
    if (!key || data[key] !== undefined) return;
    let active = true;
    setTabLoading(true);
    setTabError('');
    api
      .get(`/${key}/my`)
      .then((res) => {
        if (!active) return;
        if (key === 'invoices') {
          setData((d) => ({ ...d, invoices: { items: res.data.data || [], summary: res.data.summary || null } }));
        } else {
          setData((d) => ({ ...d, [key]: res.data.data || [] }));
        }
      })
      .catch((err) => {
        if (active) setTabError(err.response?.data?.message || 'Failed to load this section.');
      })
      .finally(() => {
        if (active) setTabLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tab, data]);

  if (loading) return <Loading label="Loading your health portal…" />;
  if (!profile) return <ErrorBanner message={error || 'Failed to load your health profile.'} />;

  const patient = profile.patient || {};
  const billing = profile.billing || {};
  const upcoming = profile.upcomingAppointments || [];
  const admission = profile.activeAdmission;

  const renderTabBody = () => {
    if (tabLoading && data[TAB_ENDPOINTS[tab]] === undefined) return <div className="card"><Loading /></div>;
    if (tabError) {
      return (
        <div className="card p-4">
          <ErrorBanner message={tabError} onClose={() => setTabError('')} />
        </div>
      );
    }

    /* ------------------------------ Appointments ----------------------------- */
    if (tab === 'Appointments') {
      const items = data.appointments || [];
      if (items.length === 0) return <div className="card"><EmptyState title="No appointments" subtitle="Book an appointment to see it here." /></div>;
      return (
        <div className="space-y-3">
          {items.map((a) => (
            <div key={a._id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-800">
                    {fmtDate(a.date)} {a.timeSlot ? `· ${a.timeSlot}` : ''}
                  </div>
                  <div className="text-sm text-slate-500">
                    Dr. {a.doctor?.user?.name || '—'}
                    {a.doctor?.department ? ` · ${a.doctor.department}` : ''}
                  </div>
                  {a.reason && <div className="mt-1 text-sm text-slate-600">{a.reason}</div>}
                </div>
                <div className="flex items-center gap-2">
                  {a.type && <Badge value={a.type} color="brand" />}
                  <Badge value={a.status} />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    /* -------------------------------- Visits -------------------------------- */
    if (tab === 'Visits') {
      const items = data.visits || [];
      if (items.length === 0) return <div className="card"><EmptyState title="No visits recorded" /></div>;
      return (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Visit #</th>
                  <th className="th">Date</th>
                  <th className="th">Type</th>
                  <th className="th">Doctor</th>
                  <th className="th">Reason</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((v) => (
                  <tr key={v._id} className="hover:bg-slate-50">
                    <td className="td font-mono text-xs">{v.visitNumber}</td>
                    <td className="td">{fmtDate(v.date)}</td>
                    <td className="td">{capitalize(v.type)}</td>
                    <td className="td">
                      {v.doctor?.user?.name || '—'}
                      <div className="text-xs text-slate-400">{v.department || v.doctor?.department}</div>
                    </td>
                    <td className="td max-w-[16rem] truncate">{v.reason || '—'}</td>
                    <td className="td"><Badge value={v.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    /* ---------------------------- Medical Records ---------------------------- */
    if (tab === 'Medical Records') {
      const items = data.records || [];
      if (items.length === 0) return <div className="card"><EmptyState title="No medical records yet" /></div>;
      return (
        <div className="space-y-3">
          {items.map((r) => (
            <div key={r._id} className="card border-l-4 border-l-brand-500 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge value={r.recordType} color="brand" />
                  <span className="text-xs text-slate-400">{fmtDate(r.date)}</span>
                </div>
                <span className="text-xs text-slate-500">Dr. {r.doctor?.user?.name || '—'}</span>
              </div>
              <div className="mt-2 text-lg font-bold text-slate-800">{r.diagnosis || 'No diagnosis'}</div>
              {r.icdCode && <div className="font-mono text-xs text-slate-500">ICD {r.icdCode}</div>}
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {r.chiefComplaint && (
                  <div>
                    <div className="label">Chief complaint</div>
                    <p className="text-sm text-slate-700">{r.chiefComplaint}</p>
                  </div>
                )}
                {r.examination && (
                  <div>
                    <div className="label">Examination</div>
                    <p className="text-sm text-slate-700">{r.examination}</p>
                  </div>
                )}
                {r.treatmentPlan && (
                  <div>
                    <div className="label">Treatment plan</div>
                    <p className="text-sm text-slate-700">{r.treatmentPlan}</p>
                  </div>
                )}
                {r.advice && (
                  <div>
                    <div className="label">Advice</div>
                    <p className="text-sm text-slate-700">{r.advice}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    /* ---------------------------- Prescriptions ------------------------------ */
    if (tab === 'Prescriptions') {
      const items = data.prescriptions || [];
      if (items.length === 0) return <div className="card"><EmptyState title="No prescriptions" /></div>;
      return (
        <div className="space-y-3">
          {items.map((p) => (
            <div key={p._id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-xs text-slate-500">{p.prescriptionNumber}</span>
                  <span className="ml-2 text-xs text-slate-400">{fmtDate(p.date)}</span>
                </div>
                <Badge value={p.status} />
              </div>
              <div className="mt-1 text-sm text-slate-500">Dr. {p.doctor?.user?.name || '—'}</div>
              <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="th">Medicine</th>
                      <th className="th">Dosage</th>
                      <th className="th">Frequency</th>
                      <th className="th">Duration</th>
                      <th className="th">Route</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(p.items || []).map((it, i) => (
                      <tr key={i}>
                        <td className="td font-medium text-slate-800">{it.name}</td>
                        <td className="td">{it.dosage || '—'}</td>
                        <td className="td">{it.frequency || '—'}</td>
                        <td className="td">{it.durationDays ? `${it.durationDays} days` : '—'}</td>
                        <td className="td">{it.route || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      );
    }

    /* ------------------------------- Lab Tests ------------------------------- */
    if (tab === 'Lab Tests') {
      const items = data.labs || [];
      if (items.length === 0) return <div className="card"><EmptyState title="No lab tests" /></div>;
      return (
        <div className="space-y-3">
          {items.map((o) => (
            <div key={o._id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-xs text-slate-500">{o.orderNumber}</span>
                  <span className="ml-2 text-xs text-slate-400">{fmtDate(o.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">{money(o.totalAmount)}</span>
                  <Badge value={o.status} />
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {(o.tests || []).map((t, i) => (
                  <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                    <div>
                      <div className="text-sm font-medium text-slate-800">{t.name}</div>
                      {t.normalRange && <div className="text-xs text-slate-400">Normal: {t.normalRange}</div>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-700">{t.result || '—'}</span>
                      <Badge value={t.flag || 'pending'} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    /* --------------------------------- Bills --------------------------------- */
    if (tab === 'Bills') {
      const bundle = data.invoices || { items: [], summary: null };
      const items = bundle.items || [];
      const summary = bundle.summary;
      return (
        <div className="space-y-4">
          {summary && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard label="Billed" value={money(summary.billed)} icon="🧾" accent="brand" />
              <StatCard label="Paid" value={money(summary.paid)} icon="💰" accent="emerald" />
              <StatCard label="Outstanding" value={money(summary.outstanding)} icon="⚠️" accent="rose" />
            </div>
          )}
          <div className="card overflow-hidden">
            {items.length === 0 ? (
              <EmptyState title="No invoices" />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="th">Invoice #</th>
                      <th className="th">Date</th>
                      <th className="th">Total</th>
                      <th className="th">Paid</th>
                      <th className="th">Balance</th>
                      <th className="th">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((inv) => {
                      const balance = Math.max(0, (inv.grandTotal || 0) - (inv.paidAmount || 0));
                      return (
                        <tr key={inv._id} className="hover:bg-slate-50">
                          <td className="td font-mono text-xs">{inv.invoiceNumber}</td>
                          <td className="td">{fmtDate(inv.date)}</td>
                          <td className="td font-semibold">{money(inv.grandTotal)}</td>
                          <td className="td">{money(inv.paidAmount)}</td>
                          <td className={`td font-semibold ${balance > 0 ? 'text-rose-600' : 'text-slate-500'}`}>{money(balance)}</td>
                          <td className="td"><Badge value={inv.status} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-5">
      {/* Welcome header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Welcome back, {patient.user?.name || 'Patient'}</h1>
          <p className="text-sm text-slate-500">
            Patient ID <span className="font-mono">{patient.patientId || '—'}</span>
          </p>
        </div>
        <Link to="/appointments" className="btn-primary">+ Book Appointment</Link>
      </div>

      <ErrorBanner message={error} onClose={() => setError('')} />
      <SuccessBanner message={notice} onClose={() => setNotice('')} />

      {/* Allergy alert */}
      {(patient.allergies || []).length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="text-base">⚠</span>
          <span>
            <b>Allergy alert:</b> {patient.allergies.join(', ')}
          </span>
        </div>
      )}

      {/* Overview stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Outstanding dues" value={money(billing.outstanding)} icon="⚠️" accent="rose" />
        <StatCard label="Upcoming appointments" value={upcoming.length} icon="🗓️" accent="blue" />
        <StatCard label="Active admission" value={admission ? admission.ward?.name || 'Admitted' : 'Not admitted'} icon="🛏️" accent="emerald" />
        <StatCard label="Blood group" value={patient.bloodGroup || '—'} icon="🩸" accent="brand" />
      </div>

      {/* Profile / contact card */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Personal details</h3>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <div className="label">Gender</div>
              <div className="text-slate-700">{capitalize(patient.gender) || '—'}</div>
            </div>
            <div>
              <div className="label">Date of birth</div>
              <div className="text-slate-700">{patient.dateOfBirth ? fmtDate(patient.dateOfBirth) : '—'}</div>
            </div>
            <div>
              <div className="label">Blood group</div>
              <div className="text-slate-700">{patient.bloodGroup || '—'}</div>
            </div>
            <div>
              <div className="label">Phone</div>
              <div className="text-slate-700">{patient.user?.phone || '—'}</div>
            </div>
            <div>
              <div className="label">Email</div>
              <div className="truncate text-slate-700">{patient.user?.email || '—'}</div>
            </div>
            <div>
              <div className="label">Address</div>
              <div className="text-slate-700">{patient.user?.address || '—'}</div>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <div className="label">Chronic conditions</div>
              <div className="text-slate-700">
                {(patient.chronicConditions || []).length > 0 ? patient.chronicConditions.join(', ') : 'None recorded'}
              </div>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Emergency & insurance</h3>
          <div className="space-y-3 text-sm">
            <div>
              <div className="label">Emergency contact</div>
              <div className="text-slate-700">{renderContact(patient.emergencyContact)}</div>
            </div>
            <div>
              <div className="label">Insurance</div>
              <div className="text-slate-700">{renderInsurance(patient.insurance)}</div>
            </div>
            {admission && (
              <div>
                <div className="label">Current admission</div>
                <div className="text-slate-700">
                  {admission.ward?.name || 'Ward'} · Bed {admission.bed?.bedNumber || '—'}
                </div>
                <div className="text-xs text-slate-400">Since {fmtDate(admission.admitDate)}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {renderTabBody()}
    </div>
  );
}

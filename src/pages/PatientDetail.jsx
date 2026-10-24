import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';
import Badge from '../components/Badge';
import StatCard from '../components/StatCard';
import ErrorBanner, { Loading, EmptyState } from '../components/Feedback';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const ageFrom = (dob) => {
  if (!dob) return '—';
  const years = Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);
  return years >= 0 ? `${years} yrs` : '—';
};

const TABS = ['Overview', 'Visits', 'EMR Records', 'Prescriptions', 'Lab Orders', 'Admissions', 'Invoices'];

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2 last:border-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-right text-sm text-slate-700">{value || '—'}</dd>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-sm text-slate-700">{value}</div>
    </div>
  );
}

export default function PatientDetail() {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('Overview');

  const load = () => {
    setLoading(true);
    Promise.all([api.get(`/patients/${id}`), api.get(`/patients/${id}/history`)])
      .then(([d, h]) => {
        setDetail(d.data.data);
        setHistory(h.data.data);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load patient.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  if (loading) return <Loading label="Loading patient…" />;
  if (error) return <ErrorBanner message={error} />;
  if (!detail || !history) return <EmptyState title="Patient not found" />;

  const { patient, stats } = detail;
  const { visits = [], records = [], prescriptions = [], labOrders = [], admissions = [], invoices = [] } = history;

  const tabContent = () => {
    switch (tab) {
      case 'Visits':
        return visits.length === 0 ? (
          <EmptyState title="No visits yet" />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Date</th>
                    <th className="th">Visit #</th>
                    <th className="th">Doctor</th>
                    <th className="th">Department</th>
                    <th className="th">Type</th>
                    <th className="th">Reason</th>
                    <th className="th">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visits.map((v) => (
                    <tr key={v._id} className="hover:bg-slate-50">
                      <td className="td whitespace-nowrap">{fmtDate(v.date)}</td>
                      <td className="td font-mono text-xs">{v.visitNumber}</td>
                      <td className="td">{v.doctor?.user?.name || '—'}</td>
                      <td className="td">{v.department || '—'}</td>
                      <td className="td"><Badge value={v.type} /></td>
                      <td className="td max-w-[14rem] truncate">{v.reason || '—'}</td>
                      <td className="td"><Badge value={v.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'EMR Records':
        return records.length === 0 ? (
          <EmptyState title="No EMR records yet" />
        ) : (
          <div className="space-y-4">
            {records.map((r) => (
              <div key={r._id} className="card p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge value={r.recordType} color="brand" />
                  <span className="font-semibold text-slate-800">{r.diagnosis}</span>
                  {r.icdCode && <span className="font-mono text-xs text-slate-400">({r.icdCode})</span>}
                  <span className="ml-auto text-xs text-slate-400">
                    {fmtDate(r.date)} · Dr. {r.doctor?.user?.name || '—'}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {r.chiefComplaint && <Field label="Chief complaint" value={r.chiefComplaint} />}
                  {r.examination && <Field label="Examination" value={r.examination} />}
                  {r.treatmentPlan && <Field label="Treatment plan" value={r.treatmentPlan} />}
                  {r.advice && <Field label="Advice" value={r.advice} />}
                </div>
              </div>
            ))}
          </div>
        );

      case 'Prescriptions':
        return prescriptions.length === 0 ? (
          <EmptyState title="No prescriptions yet" />
        ) : (
          <div className="space-y-4">
            {prescriptions.map((p) => (
              <div key={p._id} className="card p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-slate-800">{p.prescriptionNumber}</span>
                  <Badge value={p.status} />
                  <span className="ml-auto text-xs text-slate-400">
                    {fmtDate(p.date)} · Dr. {p.doctor?.user?.name || '—'}
                  </span>
                </div>
                <ul className="space-y-1 text-sm text-slate-700">
                  {(p.items || []).map((it, i) => (
                    <li key={i}>
                      • {it.name} — {it.dosage}, {it.frequency} × {it.durationDays} days ({it.route})
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        );

      case 'Lab Orders':
        return labOrders.length === 0 ? (
          <EmptyState title="No lab orders yet" />
        ) : (
          <div className="space-y-4">
            {labOrders.map((o) => (
              <div key={o._id} className="card overflow-hidden">
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="font-mono text-sm font-semibold text-slate-800">{o.orderNumber}</span>
                  <Badge value={o.status} />
                  <span className="ml-auto text-xs text-slate-500">
                    {fmtDate(o.date)} · Dr. {o.doctor?.user?.name || '—'}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="th">Test</th>
                        <th className="th">Result</th>
                        <th className="th">Flag</th>
                        <th className="th text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(o.tests || []).map((t, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="td font-medium">{t.name}</td>
                          <td className="td">{t.result || 'Awaiting result'}</td>
                          <td className="td"><Badge value={t.flag} /></td>
                          <td className="td text-right">{money(t.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        );

      case 'Admissions':
        return admissions.length === 0 ? (
          <EmptyState title="No admissions yet" />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Admission #</th>
                    <th className="th">Ward</th>
                    <th className="th">Bed</th>
                    <th className="th">Admit date</th>
                    <th className="th">Discharge date</th>
                    <th className="th">Doctor</th>
                    <th className="th">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {admissions.map((a) => (
                    <tr key={a._id} className="hover:bg-slate-50">
                      <td className="td font-mono text-xs">{a.admissionNumber}</td>
                      <td className="td">{a.ward?.name || '—'}</td>
                      <td className="td font-mono text-xs">{a.bed?.bedNumber || '—'}</td>
                      <td className="td whitespace-nowrap">{fmtDate(a.admitDate)}</td>
                      <td className="td whitespace-nowrap">{fmtDate(a.dischargeDate)}</td>
                      <td className="td">{a.doctor?.user?.name || '—'}</td>
                      <td className="td"><Badge value={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'Invoices':
        return invoices.length === 0 ? (
          <EmptyState title="No invoices yet" />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Invoice #</th>
                    <th className="th">Date</th>
                    <th className="th text-right">Sub total</th>
                    <th className="th text-right">Discount</th>
                    <th className="th text-right">Grand total</th>
                    <th className="th text-right">Paid</th>
                    <th className="th">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-slate-50">
                      <td className="td font-mono text-xs">{inv.invoiceNumber}</td>
                      <td className="td whitespace-nowrap">{fmtDate(inv.date)}</td>
                      <td className="td text-right">{money(inv.subTotal)}</td>
                      <td className="td text-right">{money(inv.discount)}</td>
                      <td className="td text-right font-semibold">{money(inv.grandTotal)}</td>
                      <td className="td text-right">{money(inv.paidAmount)}</td>
                      <td className="td"><Badge value={inv.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      default:
        return (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Personal & medical</h3>
              <dl>
                <Row label="Email" value={patient.user?.email} />
                <Row label="Address" value={patient.user?.address} />
                <Row label="Date of birth" value={patient.dateOfBirth ? fmtDate(patient.dateOfBirth) : ''} />
                <Row label="Marital status" value={patient.maritalStatus} />
                <Row label="Allergies" value={patient.allergies?.length ? patient.allergies.join(', ') : 'None recorded'} />
                <Row
                  label="Chronic conditions"
                  value={patient.chronicConditions?.length ? patient.chronicConditions.join(', ') : 'None recorded'}
                />
              </dl>
            </div>
            <div className="card p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Emergency & insurance</h3>
              <dl>
                <Row label="Emergency contact" value={patient.emergencyContact?.name} />
                <Row label="Emergency phone" value={patient.emergencyContact?.phone} />
                <Row label="Relation" value={patient.emergencyContact?.relation} />
                <Row label="Insurance provider" value={patient.insurance?.provider} />
                <Row label="Policy number" value={patient.insurance?.policyNumber} />
                <Row label="Registered on" value={fmtDate(patient.registrationDate)} />
              </dl>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-5">
      <Link to="/patients" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
        ← Back to patients
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold text-slate-800">{patient.user?.name}</h1>
        {patient.allergies?.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
            ⚠ Allergies: {patient.allergies.join(', ')}
          </span>
        )}
        <Badge value={patient.status} />
        <p className="w-full text-sm text-slate-500">
          <span className="font-mono">{patient.patientId}</span>
          {patient.user?.phone ? ` · ${patient.user.phone}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total visits" value={stats.totalVisits ?? 0} icon="🩺" accent="brand" sub={stats.lastVisit ? `Last visit ${fmtDate(stats.lastVisit)}` : 'No visits yet'} />
        <StatCard label="Age / gender" value={ageFrom(patient.dateOfBirth)} icon="🧑" accent="blue" sub={patient.gender || '—'} />
        <StatCard label="Blood group" value={patient.bloodGroup || '—'} icon="🩸" accent="rose" />
        <StatCard
          label="Outstanding"
          value={money(stats.outstanding)}
          icon="₹"
          accent="amber"
          sub={`Billed ${money(stats.billed)} · Paid ${money(stats.paid)}`}
        />
        <StatCard
          label="IPD status"
          value={stats.hasActiveAdmission ? 'Admitted' : 'Not admitted'}
          icon="🛏️"
          accent="emerald"
        />
      </div>

      <div className="card flex overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${
              tab === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tabContent()}
    </div>
  );
}

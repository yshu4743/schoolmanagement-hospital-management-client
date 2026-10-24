import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import ErrorBanner, { Loading, EmptyState, SuccessBanner } from '../components/Feedback';
import { useAuth } from '../context/AuthContext';

const money = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const FLAGS = ['pending', 'normal', 'high', 'low', 'abnormal'];

export default function Labs() {
  const { user } = useAuth();
  const canOrder = ['admin', 'doctor'].includes(user?.role);
  const canResult = ['admin', 'doctor', 'nurse'].includes(user?.role);

  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const load = () => {
    setLoading(true);
    api
      .get('/labs', { params: { status: status || undefined } })
      .then((res) => setLabs(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load lab orders.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [status]);

  const q = search.trim().toLowerCase();
  const filtered = labs.filter((o) =>
    [
      o.orderNumber,
      fmtDate(o.date),
      o.patient?.user?.name,
      o.patient?.patientId,
      o.doctor?.user?.name,
      o.doctor?.department,
      (o.tests || []).map((t) => t.name).join(' '),
      o.status,
      money(o.totalAmount),
    ].some((x) => String(x ?? '').toLowerCase().includes(q))
  );

  useEffect(() => {
    api.get('/patients').then((r) => setPatients(r.data.data)).catch(() => {});
    api.get('/doctors').then((r) => setDoctors(r.data.data)).catch(() => {});
  }, []);

  /* ------------------------------- Results ------------------------------- */
  const [resultsOpen, setResultsOpen] = useState(false);
  const [resultId, setResultId] = useState(null);
  const [testForm, setTestForm] = useState({});
  const [testSaving, setTestSaving] = useState({});

  const resultOrder = labs.find((l) => l._id === resultId) || null;

  const openResults = (order) => {
    const map = {};
    (order.tests || []).forEach((t) => {
      map[t._id] = { result: t.result || '', flag: t.flag || 'pending' };
    });
    setTestForm(map);
    setResultId(order._id);
    setError('');
    setResultsOpen(true);
  };

  const setTest = (testId, k, v) => setTestForm((f) => ({ ...f, [testId]: { ...(f[testId] || {}), [k]: v } }));

  const saveTest = async (order, t) => {
    setTestSaving((s) => ({ ...s, [t._id]: true }));
    try {
      await api.patch(`/labs/${order._id}/tests/${t._id}`, {
        result: testForm[t._id]?.result ?? '',
        flag: testForm[t._id]?.flag ?? 'pending',
        normalRange: t.normalRange || '',
      });
      setNotice('Test result saved.');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save test result.');
    } finally {
      setTestSaving((s) => ({ ...s, [t._id]: false }));
    }
  };

  /* --------------------------- New lab order ----------------------------- */
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({ patientId: '', doctorId: '', notes: '', tests: [] });
  const [newError, setNewError] = useState('');
  const [busy, setBusy] = useState(false);

  const openNew = () => {
    setForm({ patientId: '', doctorId: '', notes: '', tests: [{ name: '', price: 0, normalRange: '' }] });
    setNewError('');
    setNewOpen(true);
  };

  const addTestLine = () => setForm((f) => ({ ...f, tests: [...f.tests, { name: '', price: 0, normalRange: '' }] }));
  const setTestLine = (i, k, v) =>
    setForm((f) => ({ ...f, tests: f.tests.map((t, idx) => (idx === i ? { ...t, [k]: v } : t)) }));
  const removeTestLine = (i) => setForm((f) => ({ ...f, tests: f.tests.filter((_, idx) => idx !== i) }));

  const submitNew = async (e) => {
    e.preventDefault();
    setNewError('');
    const clean = form.tests.filter((t) => t.name.trim());
    if (!form.patientId || !form.doctorId) {
      setNewError('Select both a patient and a doctor.');
      return;
    }
    if (clean.length === 0) {
      setNewError('At least one test is required.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/labs', {
        patientId: form.patientId,
        doctorId: form.doctorId,
        notes: form.notes,
        tests: clean.map((t) => ({ name: t.name.trim(), price: Number(t.price), normalRange: t.normalRange })),
      });
      setNewOpen(false);
      setNotice('Lab order created.');
      load();
    } catch (err) {
      setNewError(err.response?.data?.message || 'Failed to create lab order.');
    } finally {
      setBusy(false);
    }
  };

  const cancelOrder = async (order) => {
    if (!window.confirm(`Cancel lab order ${order.orderNumber}?`)) return;
    try {
      await api.patch(`/labs/${order._id}/cancel`);
      setNotice('Lab order cancelled.');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel lab order.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Laboratory</h1>
          <p className="text-sm text-slate-500">Lab orders, results and verification.</p>
        </div>
        {canOrder && <button className="btn-primary" onClick={openNew}>+ New Lab Order</button>}
      </div>

      <ErrorBanner message={error} onClose={() => setError('')} />
      <SuccessBanner message={notice} onClose={() => setNotice('')} />

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <input
          className="input max-w-xs"
          placeholder="Search by order, patient, doctor or test…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="min-w-[12rem]">
          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="ml-auto text-sm text-slate-500">{filtered.length} order(s)</div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          search.trim() ? (
            <EmptyState title="No matches found" subtitle={`Nothing matches “${search}”`} />
          ) : (
            <EmptyState title="No lab orders found" subtitle="Create a new lab order to get started." />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Order #</th>
                  <th className="th">Date</th>
                  <th className="th">Patient</th>
                  <th className="th">Doctor</th>
                  <th className="th">Tests</th>
                  <th className="th">Amount</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((o) => {
                  const tests = o.tests || [];
                  const done = tests.filter((t) => t.status === 'completed').length;
                  return (
                    <tr key={o._id} className="hover:bg-slate-50">
                      <td className="td font-mono text-xs">{o.orderNumber}</td>
                      <td className="td">{fmtDate(o.date)}</td>
                      <td className="td">
                        <Link to={`/patients/${o.patient?._id}`} className="font-semibold text-slate-800 hover:text-brand-600">
                          {o.patient?.user?.name || '—'}
                        </Link>
                        <div className="text-xs text-slate-400">{o.patient?.patientId}</div>
                      </td>
                      <td className="td">
                        {o.doctor?.user?.name || '—'}
                        <div className="text-xs text-slate-400">{o.doctor?.department}</div>
                      </td>
                      <td className="td">{done}/{tests.length}</td>
                      <td className="td font-semibold">{money(o.totalAmount)}</td>
                      <td className="td"><Badge value={o.status} /></td>
                      <td className="td text-right whitespace-nowrap">
                        <button
                          className="mr-3 text-sm font-semibold text-brand-600 hover:text-brand-700"
                          onClick={() => openResults(o)}
                        >
                          Results
                        </button>
                        {canOrder && o.status !== 'completed' && o.status !== 'cancelled' && (
                          <button className="text-sm font-semibold text-rose-600 hover:text-rose-700" onClick={() => cancelOrder(o)}>
                            + Cancel
                          </button>
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

      {/* ------------------------------ Results modal ----------------------------- */}
      <Modal
        open={resultsOpen}
        onClose={() => { setResultsOpen(false); setResultId(null); }}
        title={`Lab results — ${resultOrder?.orderNumber || ''}`}
        wide
      >
        {resultOrder && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm">
              <div>
                <span className="font-semibold text-slate-800">{resultOrder.patient?.user?.name}</span>
                <span className="ml-2 text-xs text-slate-400">{resultOrder.patient?.patientId}</span>
              </div>
              <Badge value={resultOrder.status} />
            </div>

            {(resultOrder.tests || []).map((t) => (
              <div key={t._id} className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-800">{t.name}</div>
                    {t.normalRange && <div className="text-xs text-slate-400">Normal: {t.normalRange}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    {t.status === 'completed' && <span className="text-xs font-semibold text-emerald-600">Saved ✓</span>}
                    <Badge value={t.status || 'pending'} />
                  </div>
                </div>
                <div className="grid grid-cols-12 items-end gap-2">
                  <div className="col-span-7">
                    <label className="label">Result</label>
                    <input
                      className="input"
                      value={testForm[t._id]?.result ?? ''}
                      onChange={(e) => setTest(t._id, 'result', e.target.value)}
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="label">Flag</label>
                    <select
                      className="input"
                      value={testForm[t._id]?.flag ?? 'pending'}
                      onChange={(e) => setTest(t._id, 'flag', e.target.value)}
                    >
                      {FLAGS.map((f) => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    {canResult && (
                      <button
                        type="button"
                        className="btn-primary w-full"
                        disabled={testSaving[t._id]}
                        onClick={() => saveTest(resultOrder, t)}
                      >
                        {testSaving[t._id] ? 'Saving…' : 'Save'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <p className="text-xs text-slate-400">
              Saving a result updates the test status and automatically recalculates the order status.
            </p>
          </div>
        )}
      </Modal>

      {/* ---------------------------- New order modal ----------------------------- */}
      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="New Lab Order" wide>
        {newError && (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{newError}</div>
        )}
        <form onSubmit={submitNew} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Patient</label>
              <select
                className="input"
                required
                value={form.patientId}
                onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))}
              >
                <option value="">Select patient…</option>
                {patients.map((p) => <option key={p._id} value={p._id}>{p.user?.name} ({p.patientId})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Ordering doctor</label>
              <select
                className="input"
                required
                value={form.doctorId}
                onChange={(e) => setForm((f) => ({ ...f, doctorId: e.target.value }))}
              >
                <option value="">Select doctor…</option>
                {doctors.map((d) => <option key={d._id} value={d._id}>{d.user?.name} — {d.department}</option>)}
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="label mb-0">Tests</span>
              <button type="button" className="text-xs font-semibold text-brand-600 hover:text-brand-700" onClick={addTestLine}>
                + Add test
              </button>
            </div>
            {form.tests.length === 0 ? (
              <p className="text-xs text-slate-400">No tests added.</p>
            ) : (
              <div className="space-y-2">
                {form.tests.map((t, i) => (
                  <div key={i} className="grid grid-cols-12 items-center gap-2">
                    <input
                      className="input col-span-6"
                      placeholder="Test name"
                      value={t.name}
                      onChange={(e) => setTestLine(i, 'name', e.target.value)}
                    />
                    <input
                      type="number"
                      min="0"
                      className="input col-span-3"
                      placeholder="Price"
                      value={t.price}
                      onChange={(e) => setTestLine(i, 'price', e.target.value)}
                    />
                    <input
                      className="input col-span-2"
                      placeholder="Normal range"
                      value={t.normalRange}
                      onChange={(e) => setTestLine(i, 'normalRange', e.target.value)}
                    />
                    <button
                      type="button"
                      className="col-span-1 text-rose-600 hover:text-rose-700"
                      onClick={() => removeTestLine(i)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              className="input"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setNewOpen(false)}>Cancel</button>
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? 'Creating…' : 'Create Order'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

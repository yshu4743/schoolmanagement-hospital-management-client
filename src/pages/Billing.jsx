import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import StatCard from '../components/StatCard';
import ErrorBanner, { Loading, EmptyState, SuccessBanner } from '../components/Feedback';
import { useAuth } from '../context/AuthContext';

const money = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUSES = ['unpaid', 'partial', 'paid', 'cancelled'];
const METHODS = ['cash', 'card', 'upi', 'insurance', 'bank_transfer', 'online'];
const CATEGORIES = ['consultation', 'lab', 'pharmacy', 'room', 'procedure', 'nursing', 'other'];

const capitalize = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1).replace(/_/g, ' ') : '');

export default function Billing() {
  const { user } = useAuth();
  const canBill = ['admin', 'receptionist'].includes(user?.role);

  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [patients, setPatients] = useState([]);

  const load = () => {
    setLoading(true);
    api
      .get('/invoices', {
        params: {
          search: search || undefined,
          status: status || undefined,
          from: from || undefined,
          to: to || undefined,
        },
      })
      .then((res) => {
        setInvoices(res.data.data);
        setSummary(res.data.summary || null);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load invoices.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [search, status, from, to]);

  useEffect(() => {
    api.get('/patients').then((r) => setPatients(r.data.data)).catch(() => {});
  }, []);

  /* ------------------------------ Detail view ---------------------------- */
  const [detailId, setDetailId] = useState(null);
  const detailInvoice = invoices.find((i) => i._id === detailId) || null;

  /* ---------------------------- Record payment --------------------------- */
  const [payTarget, setPayTarget] = useState(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'cash', reference: '' });
  const [payError, setPayError] = useState('');
  const [payBusy, setPayBusy] = useState(false);

  const balanceOf = (inv) => Math.max(0, (inv.grandTotal || 0) - (inv.paidAmount || 0));

  const openPayment = (inv) => {
    setPayTarget(inv);
    setPayForm({ amount: balanceOf(inv), method: 'cash', reference: '' });
    setPayError('');
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    setPayError('');
    const amount = Number(payForm.amount);
    const balance = balanceOf(payTarget);
    if (!(amount > 0)) {
      setPayError('Enter a payment amount greater than zero.');
      return;
    }
    if (amount > balance) {
      setPayError(`Amount exceeds the outstanding balance of ${money(balance)}.`);
      return;
    }
    setPayBusy(true);
    try {
      const res = await api.post(`/invoices/${payTarget._id}/payments`, {
        amount,
        method: payForm.method,
        reference: payForm.reference,
      });
      setPayTarget(null);
      setNotice(res.data?.message || 'Payment recorded.');
      load();
    } catch (err) {
      setPayError(err.response?.data?.message || 'Failed to record payment.');
    } finally {
      setPayBusy(false);
    }
  };

  /* ----------------------------- New invoice ----------------------------- */
  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    patientId: '', discount: 0, taxPercent: 0, notes: '',
    items: [{ description: '', category: 'consultation', quantity: 1, unitPrice: 0 }],
  });
  const [newError, setNewError] = useState('');
  const [busy, setBusy] = useState(false);

  const openNew = () => {
    setNewForm({
      patientId: '', discount: 0, taxPercent: 0, notes: '',
      items: [{ description: '', category: 'consultation', quantity: 1, unitPrice: 0 }],
    });
    setNewError('');
    setNewOpen(true);
  };

  const addItem = () =>
    setNewForm((f) => ({ ...f, items: [...f.items, { description: '', category: 'consultation', quantity: 1, unitPrice: 0 }] }));
  const setItem = (i, k, v) =>
    setNewForm((f) => ({ ...f, items: f.items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)) }));
  const removeItem = (i) => setNewForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const submitNew = async (e) => {
    e.preventDefault();
    setNewError('');
    const clean = newForm.items.filter((it) => it.description.trim());
    if (!newForm.patientId) {
      setNewError('Please select a patient.');
      return;
    }
    if (clean.length === 0) {
      setNewError('At least one invoice item is required.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/invoices', {
        patientId: newForm.patientId,
        items: clean.map((it) => ({
          description: it.description.trim(),
          category: it.category,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
        })),
        discount: Number(newForm.discount) || 0,
        taxPercent: Number(newForm.taxPercent) || 0,
        notes: newForm.notes,
      });
      setNewOpen(false);
      setNotice('Invoice created.');
      load();
    } catch (err) {
      setNewError(err.response?.data?.message || 'Failed to create invoice.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Billing</h1>
          <p className="text-sm text-slate-500">Invoices, payments and outstanding balances.</p>
        </div>
        {canBill && <button className="btn-primary" onClick={openNew}>+ New Invoice</button>}
      </div>

      <ErrorBanner message={error} onClose={() => setError('')} />
      <SuccessBanner message={notice} onClose={() => setNotice('')} />

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Billed" value={money(summary?.billed)} icon="🧾" accent="brand" />
        <StatCard label="Collected" value={money(summary?.paid)} icon="💰" accent="emerald" />
        <StatCard label="Outstanding" value={money(summary?.outstanding)} icon="⚠️" accent="rose" />
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[12rem]">
          <label className="label">Search invoice</label>
          <input className="input" placeholder="Invoice number…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="min-w-[10rem]">
          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">From</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <Loading />
        ) : invoices.length === 0 ? (
          <EmptyState title="No invoices found" subtitle="Adjust the filters or create a new invoice." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Invoice #</th>
                  <th className="th">Date</th>
                  <th className="th">Patient</th>
                  <th className="th">Total</th>
                  <th className="th">Paid</th>
                  <th className="th">Balance</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => {
                  const balance = Math.max(0, (inv.grandTotal || 0) - (inv.paidAmount || 0));
                  return (
                    <tr key={inv._id} className="hover:bg-slate-50">
                      <td className="td font-mono text-xs">{inv.invoiceNumber}</td>
                      <td className="td">{fmtDate(inv.date)}</td>
                      <td className="td">
                        <Link to={`/patients/${inv.patient?._id}`} className="font-semibold text-slate-800 hover:text-brand-600">
                          {inv.patient?.user?.name || '—'}
                        </Link>
                        <div className="text-xs text-slate-400">{inv.patient?.patientId}</div>
                      </td>
                      <td className="td font-semibold">{money(inv.grandTotal)}</td>
                      <td className="td">{money(inv.paidAmount)}</td>
                      <td className={`td font-semibold ${balance > 0 ? 'text-rose-600' : 'text-slate-500'}`}>{money(balance)}</td>
                      <td className="td"><Badge value={inv.status} /></td>
                      <td className="td text-right whitespace-nowrap">
                        <button
                          className="mr-3 text-sm font-semibold text-slate-500 hover:text-slate-700"
                          onClick={() => setDetailId(inv._id)}
                        >
                          View
                        </button>
                        {canBill && inv.status !== 'paid' && inv.status !== 'cancelled' && (
                          <button
                            className="text-sm font-semibold text-brand-600 hover:text-brand-700"
                            onClick={() => openPayment(inv)}
                          >
                            Record payment
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

      {/* ------------------------------ Detail modal ----------------------------- */}
      <Modal
        open={Boolean(detailInvoice)}
        onClose={() => setDetailId(null)}
        title={`Invoice ${detailInvoice?.invoiceNumber || ''}`}
        wide
      >
        {detailInvoice && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 px-4 py-3 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">Patient</div>
                <div className="font-semibold text-slate-800">{detailInvoice.patient?.user?.name || '—'}</div>
                <div className="text-xs text-slate-400">{detailInvoice.patient?.patientId}</div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wide text-slate-400">Date</div>
                <div className="font-semibold text-slate-800">{fmtDate(detailInvoice.date)}</div>
                <div className="mt-1"><Badge value={detailInvoice.status} /></div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Description</th>
                    <th className="th">Category</th>
                    <th className="th">Qty</th>
                    <th className="th">Unit price</th>
                    <th className="th text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(detailInvoice.items || []).map((it, i) => (
                    <tr key={i}>
                      <td className="td">{it.description}</td>
                      <td className="td"><Badge value={it.category} color="brand" /></td>
                      <td className="td">{it.quantity}</td>
                      <td className="td">{money(it.unitPrice)}</td>
                      <td className="td text-right font-semibold">{money(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ml-auto max-w-xs space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{money(detailInvoice.subTotal)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Discount</span><span>- {money(detailInvoice.discount)}</span></div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tax ({detailInvoice.taxPercent || 0}%)</span>
                <span>{money(detailInvoice.taxAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-800">
                <span>Grand total</span><span>{money(detailInvoice.grandTotal)}</span>
              </div>
              <div className="flex justify-between"><span className="text-slate-500">Paid</span><span>{money(detailInvoice.paidAmount)}</span></div>
              <div className="flex justify-between font-semibold text-rose-600">
                <span>Balance</span>
                <span>{money(Math.max(0, (detailInvoice.grandTotal || 0) - (detailInvoice.paidAmount || 0)))}</span>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-700">Payments</h4>
              {(detailInvoice.payments || []).length === 0 ? (
                <p className="text-xs text-slate-400">No payments recorded.</p>
              ) : (
                <ul className="space-y-2">
                  {detailInvoice.payments.map((p, i) => (
                    <li key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <div>
                        <span className="font-semibold text-slate-800">{money(p.amount)}</span>
                        <span className="ml-2 text-xs text-slate-500">{capitalize(p.method)}</span>
                        {p.reference && <span className="ml-2 font-mono text-xs text-slate-400">{p.reference}</span>}
                      </div>
                      <span className="text-xs text-slate-400">{fmtDate(p.paidAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* --------------------------- Record payment modal ------------------------ */}
      <Modal
        open={Boolean(payTarget)}
        onClose={() => setPayTarget(null)}
        title={`Record payment — ${payTarget?.invoiceNumber || ''}`}
      >
        {payError && (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{payError}</div>
        )}
        {payTarget && (
          <form onSubmit={submitPayment} className="space-y-3">
            <div className="rounded-lg bg-slate-50 px-4 py-2 text-sm">
              <span className="text-slate-500">Outstanding balance: </span>
              <span className="font-semibold text-rose-600">{money(balanceOf(payTarget))}</span>
            </div>
            <div>
              <label className="label">Amount (₹)</label>
              <input
                type="number"
                min="1"
                max={balanceOf(payTarget)}
                step="0.01"
                className="input"
                required
                value={payForm.amount}
                onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Method</label>
              <select
                className="input"
                value={payForm.method}
                onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value }))}
              >
                {METHODS.map((m) => <option key={m} value={m}>{capitalize(m)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Reference</label>
              <input
                className="input"
                placeholder="Txn / cheque / receipt no."
                value={payForm.reference}
                onChange={(e) => setPayForm((f) => ({ ...f, reference: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setPayTarget(null)}>Cancel</button>
              <button type="submit" disabled={payBusy} className="btn-primary">
                {payBusy ? 'Recording…' : 'Record Payment'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ------------------------------ New invoice modal ------------------------ */}
      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="New Invoice" wide>
        {newError && (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{newError}</div>
        )}
        <form onSubmit={submitNew} className="space-y-4">
          <div>
            <label className="label">Patient</label>
            <select
              className="input"
              required
              value={newForm.patientId}
              onChange={(e) => setNewForm((f) => ({ ...f, patientId: e.target.value }))}
            >
              <option value="">Select patient…</option>
              {patients.map((p) => <option key={p._id} value={p._id}>{p.user?.name} ({p.patientId})</option>)}
            </select>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="label mb-0">Items</span>
              <button type="button" className="text-xs font-semibold text-brand-600 hover:text-brand-700" onClick={addItem}>
                + Add item
              </button>
            </div>
            <div className="space-y-2">
              {newForm.items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 items-center gap-2">
                  <input
                    className="input col-span-4"
                    placeholder="Description"
                    value={it.description}
                    onChange={(e) => setItem(i, 'description', e.target.value)}
                  />
                  <select className="input col-span-3" value={it.category} onChange={(e) => setItem(i, 'category', e.target.value)}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{capitalize(c)}</option>)}
                  </select>
                  <input
                    type="number"
                    min="1"
                    className="input col-span-1"
                    value={it.quantity}
                    onChange={(e) => setItem(i, 'quantity', e.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input col-span-3"
                    placeholder="Unit price"
                    value={it.unitPrice}
                    onChange={(e) => setItem(i, 'unitPrice', e.target.value)}
                  />
                  <button
                    type="button"
                    className="col-span-1 text-rose-600 hover:text-rose-700"
                    onClick={() => removeItem(i)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Discount (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input"
                value={newForm.discount}
                onChange={(e) => setNewForm((f) => ({ ...f, discount: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Tax percent (%)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input"
                value={newForm.taxPercent}
                onChange={(e) => setNewForm((f) => ({ ...f, taxPercent: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              className="input"
              rows={2}
              value={newForm.notes}
              onChange={(e) => setNewForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setNewOpen(false)}>Cancel</button>
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? 'Creating…' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

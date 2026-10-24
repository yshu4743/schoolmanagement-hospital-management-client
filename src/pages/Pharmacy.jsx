import { useEffect, useState } from 'react';
import api from '../api/client';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import ErrorBanner, { Loading, EmptyState, SuccessBanner } from '../components/Feedback';
import { useAuth } from '../context/AuthContext';

const money = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

const CATEGORIES = [
  'antibiotic', 'analgesic', 'antipyretic', 'antihypertensive', 'antidiabetic',
  'vitamin', 'cardiac', 'respiratory', 'gastro', 'other',
];
const FORMS = ['tablet', 'capsule', 'syrup', 'injection', 'ointment', 'drops', 'inhaler'];

const EMPTY_MED = {
  name: '', genericName: '', sku: '', manufacturer: '', category: 'other',
  form: 'tablet', strength: '', unitPrice: 0, reorderLevel: 50, rackNumber: '',
};

const TABS = ['Medicines', 'Stock Alerts', 'Sales'];

export default function Pharmacy() {
  const { user } = useAuth();
  const canManage = user?.role === 'admin';
  const canDispense = ['admin', 'nurse'].includes(user?.role);

  const [tab, setTab] = useState('Medicines');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  /* ------------------------------ Medicines ------------------------------ */
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const loadMedicines = () => {
    setLoading(true);
    api
      .get('/medicines', { params: { search: search || undefined, category: category || undefined } })
      .then((res) => setMedicines(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load medicines.'))
      .finally(() => setLoading(false));
  };

  useEffect(loadMedicines, [search, category]);

  /* ---------------------------- Stock alerts ----------------------------- */
  const [alerts, setAlerts] = useState(null);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState('');

  const loadAlerts = () => {
    setAlertsLoading(true);
    setAlertsError('');
    api
      .get('/medicines/alerts')
      .then((res) => setAlerts(res.data.data))
      .catch((err) => setAlertsError(err.response?.data?.message || 'Failed to load stock alerts.'))
      .finally(() => setAlertsLoading(false));
  };

  /* -------------------------------- Sales -------------------------------- */
  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState('');

  const loadSales = () => {
    setSalesLoading(true);
    setSalesError('');
    api
      .get('/pharmacy/sales')
      .then((res) => setSales(res.data.data))
      .catch((err) => setSalesError(err.response?.data?.message || 'Failed to load sales.'))
      .finally(() => setSalesLoading(false));
  };

  // Lazy-load tab datasets when a tab is activated.
  useEffect(() => {
    if (tab === 'Stock Alerts') loadAlerts();
    if (tab === 'Sales') loadSales();
  }, [tab]);

  /* ------------------------------- Patients ------------------------------ */
  const [patients, setPatients] = useState([]);
  useEffect(() => {
    api.get('/patients').then((r) => setPatients(r.data.data)).catch(() => {});
  }, []);

  /* --------------------------- Add medicine ------------------------------ */
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_MED);
  const [addError, setAddError] = useState('');
  const [addBusy, setAddBusy] = useState(false);

  const setAdd = (k, v) => setAddForm((f) => ({ ...f, [k]: v }));

  const openAdd = () => {
    setAddForm(EMPTY_MED);
    setAddError('');
    setAddOpen(true);
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    setAddError('');
    if (!addForm.name.trim() || !addForm.sku.trim()) {
      setAddError('Name and SKU are required.');
      return;
    }
    if (!(Number(addForm.unitPrice) > 0)) {
      setAddError('Unit price must be greater than zero.');
      return;
    }
    setAddBusy(true);
    try {
      await api.post('/medicines', {
        ...addForm,
        unitPrice: Number(addForm.unitPrice),
        reorderLevel: Number(addForm.reorderLevel),
      });
      setAddOpen(false);
      setNotice('Medicine added.');
      loadMedicines();
    } catch (err) {
      setAddError(err.response?.data?.message || 'Failed to add medicine.');
    } finally {
      setAddBusy(false);
    }
  };

  /* --------------------------- Receive stock ----------------------------- */
  const [stockOpen, setStockOpen] = useState(false);
  const [stockTarget, setStockTarget] = useState(null);
  const [stockForm, setStockForm] = useState({});
  const [stockError, setStockError] = useState('');
  const [stockBusy, setStockBusy] = useState(false);

  const setStock = (k, v) => setStockForm((f) => ({ ...f, [k]: v }));

  const openStock = (m) => {
    setStockTarget(m);
    setStockForm({
      batchNumber: '',
      expiryDate: '',
      quantity: 0,
      sellingPrice: m.unitPrice || 0,
      purchasePrice: Math.round((m.unitPrice || 0) * 0.6),
      supplier: '',
    });
    setStockError('');
    setStockOpen(true);
  };

  const submitStock = async (e) => {
    e.preventDefault();
    setStockError('');
    if (!stockForm.batchNumber.trim() || !stockForm.expiryDate) {
      setStockError('Batch number and expiry date are required.');
      return;
    }
    if (!Number.isInteger(Number(stockForm.quantity)) || Number(stockForm.quantity) < 0) {
      setStockError('Quantity must be a non-negative whole number.');
      return;
    }
    if (!(Number(stockForm.sellingPrice) >= 0)) {
      setStockError('Selling price is required.');
      return;
    }
    setStockBusy(true);
    try {
      await api.post(`/medicines/${stockTarget._id}/batches`, {
        ...stockForm,
        quantity: Number(stockForm.quantity),
        sellingPrice: Number(stockForm.sellingPrice),
        purchasePrice: Number(stockForm.purchasePrice),
      });
      setStockOpen(false);
      setNotice(`Stock received for ${stockTarget.name}.`);
      loadMedicines();
    } catch (err) {
      setStockError(err.response?.data?.message || 'Failed to receive stock.');
    } finally {
      setStockBusy(false);
    }
  };

  /* -------------------------------- Dispense ----------------------------- */
  const [dispenseOpen, setDispenseOpen] = useState(false);
  const [dispenseForm, setDispenseForm] = useState({ patientId: '', items: [] });
  const [dispenseError, setDispenseError] = useState('');
  const [dispenseBusy, setDispenseBusy] = useState(false);

  const openDispense = () => {
    setDispenseForm({ patientId: '', items: [] });
    setDispenseError('');
    setDispenseOpen(true);
  };

  const addLine = (medicineId) => {
    const m = medicines.find((x) => x._id === medicineId);
    if (!m) return;
    setDispenseForm((f) => ({
      ...f,
      items: [...f.items, { medicineId: m._id, name: `${m.name} ${m.strength || ''}`.trim(), quantity: 1 }],
    }));
  };

  const setLine = (i, k, v) =>
    setDispenseForm((f) => ({ ...f, items: f.items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)) }));

  const removeLine = (i) =>
    setDispenseForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const submitDispense = async (e) => {
    e.preventDefault();
    setDispenseError('');
    if (!dispenseForm.patientId) {
      setDispenseError('Please select a patient.');
      return;
    }
    if (dispenseForm.items.length === 0) {
      setDispenseError('Add at least one medicine.');
      return;
    }
    setDispenseBusy(true);
    try {
      const res = await api.post('/pharmacy/dispense', {
        patientId: dispenseForm.patientId,
        items: dispenseForm.items.map((it) => ({ medicineId: it.medicineId, quantity: Number(it.quantity) })),
      });
      setDispenseOpen(false);
      setNotice(`Dispensed — sale ${res.data.data.sale.saleNumber}.`);
      loadMedicines();
      loadSales();
      loadAlerts();
    } catch (err) {
      setDispenseError(err.response?.data?.message || 'Failed to dispense medicines.');
    } finally {
      setDispenseBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pharmacy</h1>
          <p className="text-sm text-slate-500">Medicines, stock alerts and dispensing.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && <button className="btn-secondary" onClick={openAdd}>+ Add Medicine</button>}
          {canDispense && <button className="btn-primary" onClick={openDispense}>+ Dispense</button>}
        </div>
      </div>

      <ErrorBanner message={error} onClose={() => setError('')} />
      <SuccessBanner message={notice} onClose={() => setNotice('')} />

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

      {/* ------------------------------ Medicines ------------------------------ */}
      {tab === 'Medicines' && (
        <>
          <div className="card flex flex-wrap items-center gap-3 p-4">
            <input
              className="input max-w-xs"
              placeholder="Search by name, SKU or generic…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="input max-w-xs" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{capitalize(c)}</option>)}
            </select>
          </div>

          <div className="card overflow-hidden">
            {loading ? (
              <Loading />
            ) : medicines.length === 0 ? (
              <EmptyState title="No medicines found" subtitle="Adjust the filters or add a new medicine." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="th">Medicine</th>
                      <th className="th">SKU</th>
                      <th className="th">Form</th>
                      <th className="th">Stock</th>
                      <th className="th">Price</th>
                      <th className="th">Expiry</th>
                      <th className="th text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {medicines.map((m) => (
                      <tr key={m._id} className="hover:bg-slate-50">
                        <td className="td">
                          <div className="font-semibold text-slate-800">{m.name}</div>
                          {m.genericName && <div className="text-xs text-slate-400">{m.genericName}</div>}
                        </td>
                        <td className="td font-mono text-xs">{m.sku}</td>
                        <td className="td">
                          {capitalize(m.form)} {m.strength || ''}
                        </td>
                        <td className="td">
                          <span className={`font-semibold ${m.lowStock ? 'text-rose-600' : 'text-slate-800'}`}>
                            {m.totalStock}
                          </span>
                          {m.lowStock && <Badge value="low" color="red" className="ml-2" />}
                        </td>
                        <td className="td">{money(m.unitPrice)}</td>
                        <td className="td">
                          {m.expiredStock > 0 ? (
                            <Badge value="expired" color="red" />
                          ) : m.nearExpiry ? (
                            <Badge value="near expiry" color="amber" />
                          ) : (
                            <Badge value="OK" color="green" />
                          )}
                        </td>
                        <td className="td text-right">
                          {canManage && (
                            <button
                              className="text-sm font-semibold text-brand-600 hover:text-brand-700"
                              onClick={() => openStock(m)}
                            >
                              + Stock
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
        </>
      )}

      {/* ----------------------------- Stock alerts ---------------------------- */}
      {tab === 'Stock Alerts' && (
        <>
          <ErrorBanner message={alertsError} onClose={() => setAlertsError('')} />
          {alertsLoading ? (
            <div className="card"><Loading /></div>
          ) : !alerts ? (
            <div className="card"><EmptyState title="No alerts loaded" /></div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Low stock */}
              <div className="card border-rose-100 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-rose-700">Low stock</h3>
                  <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                    {alerts.lowStock?.length || 0}
                  </span>
                </div>
                {(alerts.lowStock?.length || 0) === 0 ? (
                  <p className="text-xs text-slate-400">All medicines above reorder level.</p>
                ) : (
                  <ul className="space-y-2">
                    {alerts.lowStock.map((m) => (
                      <li key={m._id} className="rounded-lg bg-rose-50 px-3 py-2 text-sm">
                        <div className="font-semibold text-slate-800">{m.name}</div>
                        <div className="text-xs text-slate-500">
                          <span className="font-mono">{m.sku}</span> · stock {m.totalStock} / reorder {m.reorderLevel}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Expiring soon */}
              <div className="card border-amber-100 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-amber-700">Expiring soon</h3>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                    {alerts.expiringSoon?.length || 0}
                  </span>
                </div>
                {(alerts.expiringSoon?.length || 0) === 0 ? (
                  <p className="text-xs text-slate-400">No batches nearing expiry.</p>
                ) : (
                  <ul className="space-y-2">
                    {alerts.expiringSoon.map((b, i) => (
                      <li key={`${b.medicine}-${b.batchNumber}-${i}`} className="rounded-lg bg-amber-50 px-3 py-2 text-sm">
                        <div className="font-semibold text-slate-800">{b.medicine}</div>
                        <div className="text-xs text-slate-500">
                          <span className="font-mono">{b.sku}</span> · batch {b.batchNumber} · qty {b.quantity}
                        </div>
                        <div className="text-xs text-amber-700">Expires {fmtDate(b.expiryDate)}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Expired */}
              <div className="card border-rose-100 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-rose-700">Expired</h3>
                  <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                    {alerts.expired?.length || 0}
                  </span>
                </div>
                {(alerts.expired?.length || 0) === 0 ? (
                  <p className="text-xs text-slate-400">No expired batches.</p>
                ) : (
                  <ul className="space-y-2">
                    {alerts.expired.map((b, i) => (
                      <li key={`${b.medicine}-${b.batchNumber}-${i}`} className="rounded-lg bg-rose-50 px-3 py-2 text-sm">
                        <div className="font-semibold text-slate-800">{b.medicine}</div>
                        <div className="text-xs text-slate-500">
                          <span className="font-mono">{b.sku}</span> · batch {b.batchNumber} · qty {b.quantity}
                        </div>
                        <div className="text-xs text-rose-700">Expired {fmtDate(b.expiryDate)}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* -------------------------------- Sales -------------------------------- */}
      {tab === 'Sales' && (
        <>
          <ErrorBanner message={salesError} onClose={() => setSalesError('')} />
          <div className="card overflow-hidden">
            {salesLoading ? (
              <Loading />
            ) : sales.length === 0 ? (
              <EmptyState title="No sales yet" subtitle="Dispensed medicines will appear here." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="th">Sale #</th>
                      <th className="th">Date</th>
                      <th className="th">Patient</th>
                      <th className="th">Items</th>
                      <th className="th">Total</th>
                      <th className="th">Sold by</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sales.map((s) => (
                      <tr key={s._id} className="hover:bg-slate-50">
                        <td className="td font-mono text-xs">{s.saleNumber}</td>
                        <td className="td">{fmtDate(s.date)}</td>
                        <td className="td">{s.patient?.user?.name || '—'}</td>
                        <td className="td max-w-[20rem] truncate text-xs text-slate-500">
                          {(s.items || []).map((i) => i.name).join(', ') || '—'}
                        </td>
                        <td className="td font-semibold">{money(s.totalAmount)}</td>
                        <td className="td">{s.soldBy?.name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* --------------------------- Add medicine modal ------------------------ */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Medicine" wide>
        {addError && (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{addError}</div>
        )}
        <form onSubmit={submitAdd} className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Name *</label>
            <input className="input" required value={addForm.name} onChange={(e) => setAdd('name', e.target.value)} />
          </div>
          <div>
            <label className="label">Generic name</label>
            <input className="input" value={addForm.genericName} onChange={(e) => setAdd('genericName', e.target.value)} />
          </div>
          <div>
            <label className="label">SKU *</label>
            <input
              className="input"
              required
              value={addForm.sku}
              onChange={(e) => setAdd('sku', e.target.value.toUpperCase())}
            />
          </div>
          <div>
            <label className="label">Manufacturer</label>
            <input className="input" value={addForm.manufacturer} onChange={(e) => setAdd('manufacturer', e.target.value)} />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={addForm.category} onChange={(e) => setAdd('category', e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{capitalize(c)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Form</label>
            <select className="input" value={addForm.form} onChange={(e) => setAdd('form', e.target.value)}>
              {FORMS.map((f) => <option key={f} value={f}>{capitalize(f)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Strength</label>
            <input className="input" placeholder="500mg" value={addForm.strength} onChange={(e) => setAdd('strength', e.target.value)} />
          </div>
          <div>
            <label className="label">Unit price (₹) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input"
              required
              value={addForm.unitPrice}
              onChange={(e) => setAdd('unitPrice', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Reorder level</label>
            <input
              type="number"
              min="0"
              className="input"
              value={addForm.reorderLevel}
              onChange={(e) => setAdd('reorderLevel', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Rack number</label>
            <input className="input" value={addForm.rackNumber} onChange={(e) => setAdd('rackNumber', e.target.value)} />
          </div>
          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setAddOpen(false)}>Cancel</button>
            <button type="submit" disabled={addBusy} className="btn-primary">
              {addBusy ? 'Saving…' : 'Add Medicine'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ---------------------------- Stock modal ------------------------------ */}
      <Modal open={stockOpen} onClose={() => setStockOpen(false)} title={`Receive Stock — ${stockTarget?.name || ''}`}>
        {stockError && (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{stockError}</div>
        )}
        <form onSubmit={submitStock} className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Batch number *</label>
            <input className="input" required value={stockForm.batchNumber || ''} onChange={(e) => setStock('batchNumber', e.target.value)} />
          </div>
          <div>
            <label className="label">Expiry date *</label>
            <input type="date" className="input" required value={stockForm.expiryDate || ''} onChange={(e) => setStock('expiryDate', e.target.value)} />
          </div>
          <div>
            <label className="label">Quantity *</label>
            <input type="number" min="0" className="input" required value={stockForm.quantity ?? 0} onChange={(e) => setStock('quantity', e.target.value)} />
          </div>
          <div>
            <label className="label">Supplier</label>
            <input className="input" value={stockForm.supplier || ''} onChange={(e) => setStock('supplier', e.target.value)} />
          </div>
          <div>
            <label className="label">Selling price (₹) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input"
              required
              value={stockForm.sellingPrice ?? 0}
              onChange={(e) => setStock('sellingPrice', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Purchase price (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input"
              value={stockForm.purchasePrice ?? 0}
              onChange={(e) => setStock('purchasePrice', e.target.value)}
            />
          </div>
          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setStockOpen(false)}>Cancel</button>
            <button type="submit" disabled={stockBusy} className="btn-primary">
              {stockBusy ? 'Receiving…' : 'Receive Stock'}
            </button>
          </div>
        </form>
      </Modal>

      {/* --------------------------- Dispense modal ---------------------------- */}
      <Modal open={dispenseOpen} onClose={() => setDispenseOpen(false)} title="Dispense Medicines" wide>
        {dispenseError && (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{dispenseError}</div>
        )}
        <form onSubmit={submitDispense} className="space-y-4">
          <div>
            <label className="label">Patient</label>
            <select
              className="input"
              required
              value={dispenseForm.patientId}
              onChange={(e) => setDispenseForm((f) => ({ ...f, patientId: e.target.value }))}
            >
              <option value="">Select patient…</option>
              {patients.map((p) => (
                <option key={p._id} value={p._id}>{p.user?.name} ({p.patientId})</option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="label mb-0">Medicines</span>
              <select className="input max-w-xs" value="" onChange={(e) => { if (e.target.value) addLine(e.target.value); }}>
                <option value="">+ Add medicine…</option>
                {medicines.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} {m.strength} (stock {m.totalStock})
                  </option>
                ))}
              </select>
            </div>
            {dispenseForm.items.length === 0 ? (
              <p className="text-xs text-slate-400">No medicines added.</p>
            ) : (
              <div className="space-y-2">
                {dispenseForm.items.map((it, i) => (
                  <div key={i} className="grid grid-cols-12 items-center gap-2">
                    <div className="col-span-6 text-sm font-semibold text-slate-700">{it.name}</div>
                    <input
                      type="number"
                      min="1"
                      className="input col-span-4"
                      value={it.quantity}
                      onChange={(e) => setLine(i, 'quantity', e.target.value)}
                    />
                    <button type="button" className="col-span-2 text-sm font-semibold text-rose-600 hover:text-rose-700" onClick={() => removeLine(i)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setDispenseOpen(false)}>Cancel</button>
            <button type="submit" disabled={dispenseBusy || dispenseForm.items.length === 0} className="btn-primary">
              {dispenseBusy ? 'Dispensing…' : 'Dispense'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

import { useEffect, useState } from 'react';
import api from '../api/client';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import ErrorBanner, { Loading, EmptyState, SuccessBanner } from '../components/Feedback';
import { useAuth } from '../context/AuthContext';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const WARD_TYPES = ['general', 'icu', 'private', 'pediatric', 'maternity', 'emergency', 'surgical'];

const BED_STYLE = {
  available: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  occupied: 'border-rose-300 bg-rose-50 text-rose-700',
  maintenance: 'border-amber-300 bg-amber-50 text-amber-700',
  reserved: 'border-blue-300 bg-blue-50 text-blue-700',
};

const EMPTY_WARD = { name: '', type: 'general', floor: '', dailyCharge: 1000, description: '' };
const EMPTY_BED = { bedNumber: '', notes: '' };

export default function Wards() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';

  const [wards, setWards] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bedsLoading, setBedsLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');

  const loadWards = () => {
    setLoading(true);
    api
      .get('/wards')
      .then((res) => setWards(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load wards.'))
      .finally(() => setLoading(false));
  };

  useEffect(loadWards, []);

  // Keep a valid ward selected as the list refreshes
  useEffect(() => {
    setSelectedId((id) => (id && wards.some((w) => w._id === id) ? id : wards[0]?._id || ''));
  }, [wards]);

  const selected = wards.find((w) => w._id === selectedId) || null;

  const loadBeds = () => {
    if (!selectedId) {
      setBeds([]);
      return;
    }
    setBedsLoading(true);
    api
      .get('/beds', { params: { wardId: selectedId } })
      .then((res) => setBeds(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load beds.'))
      .finally(() => setBedsLoading(false));
  };

  useEffect(loadBeds, [selectedId]);

  const toggleBed = async (bed) => {
    const next = bed.status === 'available' ? 'maintenance' : 'available';
    try {
      await api.put(`/beds/${bed._id}`, { status: next });
      setNotice(`Bed ${bed.bedNumber} marked ${next}.`);
      loadBeds();
      loadWards();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update the bed.');
    }
  };

  /* ------------------------------ Add ward ------------------------------ */
  const q = search.trim().toLowerCase();
  const filtered = wards.filter((w) =>
    [
      w.name,
      w.type,
      w.floor,
      w.dailyCharge,
      w.description,
      w.occupancyRate,
      w.totalBeds,
      w.occupied,
    ].some((x) => String(x ?? '').toLowerCase().includes(q))
  );
  const filteredBeds = beds.filter((b) =>
    [b.bedNumber, b.status, b.currentPatient?.user?.name, b.notes].some((x) =>
      String(x ?? '').toLowerCase().includes(q)
    )
  );

  const [wardOpen, setWardOpen] = useState(false);
  const [wardForm, setWardForm] = useState(EMPTY_WARD);
  const [wardBusy, setWardBusy] = useState(false);
  const [wardError, setWardError] = useState('');

  const setWard = (k, v) => setWardForm((f) => ({ ...f, [k]: v }));

  const openAddWard = () => {
    setWardForm(EMPTY_WARD);
    setWardError('');
    setWardOpen(true);
  };

  const saveWard = async (e) => {
    e.preventDefault();
    setWardBusy(true);
    setWardError('');
    try {
      await api.post('/wards', {
        name: wardForm.name,
        type: wardForm.type,
        floor: wardForm.floor,
        dailyCharge: Number(wardForm.dailyCharge),
        description: wardForm.description,
      });
      setWardOpen(false);
      setNotice('Ward created.');
      loadWards();
    } catch (err) {
      setWardError(err.response?.data?.message || 'Failed to create the ward.');
    } finally {
      setWardBusy(false);
    }
  };

  /* ------------------------------- Add bed ------------------------------- */
  const [bedOpen, setBedOpen] = useState(false);
  const [bedForm, setBedForm] = useState(EMPTY_BED);
  const [bedBusy, setBedBusy] = useState(false);
  const [bedError, setBedError] = useState('');

  const openAddBed = () => {
    setBedForm(EMPTY_BED);
    setBedError('');
    setBedOpen(true);
  };

  const saveBed = async (e) => {
    e.preventDefault();
    setBedBusy(true);
    setBedError('');
    try {
      await api.post('/beds', {
        bedNumber: bedForm.bedNumber,
        ward: selected._id,
        notes: bedForm.notes,
      });
      setBedOpen(false);
      setNotice('Bed added.');
      loadBeds();
      loadWards();
    } catch (err) {
      setBedError(err.response?.data?.message || 'Failed to add the bed.');
    } finally {
      setBedBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Wards & Beds</h1>
          <p className="text-sm text-slate-500">Monitor bed occupancy across the hospital in real time.</p>
        </div>
        {isAdmin && <button className="btn-primary" onClick={openAddWard}>+ Add Ward</button>}
      </div>

      <ErrorBanner message={error} onClose={() => setError('')} />
      <SuccessBanner message={notice} onClose={() => setNotice('')} />

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <input
          className="input max-w-xs"
          placeholder="Search by ward or bed…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="ml-auto text-sm text-slate-500">{filtered.length} ward(s)</div>
      </div>

      {loading ? (
        <Loading label="Loading wards…" />
      ) : filtered.length === 0 ? (
        search.trim() ? (
          <div className="card">
            <EmptyState title="No matches found" subtitle={`Nothing matches “${search}”`} />
          </div>
        ) : (
          <EmptyState title="No wards yet" subtitle={isAdmin ? 'Create a ward to start adding beds.' : 'Ask an administrator to create a ward.'} />
        )
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((w) => (
              <button
                key={w._id}
                onClick={() => setSelectedId(w._id)}
                className={`card p-4 text-left transition ${
                  selectedId === w._id ? 'border-brand-500 ring-2 ring-brand-200' : 'hover:border-brand-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800">{w.name}</span>
                  <Badge value={w.type} color="brand" />
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-800">{w.occupancyRate}%</div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, w.occupancyRate || 0)}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>{w.occupied}/{w.totalBeds} occupied</span>
                  <span>{money(w.dailyCharge)}/day</span>
                </div>
              </button>
            ))}
          </div>

          {selected && (
            <div className="card overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <h2 className="font-semibold text-slate-800">Bed Map — {selected.name}</h2>
                  <p className="text-xs text-slate-500">
                    Floor {selected.floor || '—'} · {money(selected.dailyCharge)}/day
                  </p>
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />Available</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" />Occupied</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Maintenance</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-400" />Reserved</span>
                  {isAdmin && <button className="btn-primary" onClick={openAddBed}>+ Add Bed</button>}
                </div>
              </div>
              <div className="p-4">
                {bedsLoading ? (
                  <Loading label="Loading beds…" />
                ) : filteredBeds.length === 0 ? (
                  search.trim() ? (
                    <EmptyState title="No matches found" subtitle={`Nothing matches “${search}”`} />
                  ) : (
                    <EmptyState title="No beds in this ward" subtitle={isAdmin ? 'Add beds to start allocating patients.' : undefined} />
                  )
                ) : (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                    {filteredBeds.map((b) => (
                      <div
                        key={b._id}
                        className={`rounded-lg border-2 p-2 text-center ${BED_STYLE[b.status] || BED_STYLE.available}`}
                      >
                        <div className="font-mono text-sm font-semibold">{b.bedNumber}</div>
                        <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-70">{b.status}</div>
                        {b.status === 'occupied' && (
                          <div className="mt-1 truncate text-xs" title={b.currentPatient?.user?.name || ''}>
                            {b.currentPatient?.user?.name || 'Patient'}
                          </div>
                        )}
                        {isAdmin && b.status !== 'occupied' && (
                          <button
                            className="mt-1.5 text-[10px] font-semibold underline hover:opacity-70"
                            onClick={() => toggleBed(b)}
                          >
                            {b.status === 'available' ? 'Mark maint.' : 'Mark avail.'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Add ward modal */}
      <Modal open={wardOpen} onClose={() => setWardOpen(false)} title="Add Ward" wide>
        {wardError && (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{wardError}</div>
        )}
        <form onSubmit={saveWard} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Ward name</label>
            <input className="input" required value={wardForm.name} onChange={(e) => setWard('name', e.target.value)} />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={wardForm.type} onChange={(e) => setWard('type', e.target.value)}>
              {WARD_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Floor</label>
            <input className="input" placeholder="e.g. 2" value={wardForm.floor} onChange={(e) => setWard('floor', e.target.value)} />
          </div>
          <div>
            <label className="label">Daily charge (₹)</label>
            <input
              type="number"
              min="0"
              className="input"
              required
              value={wardForm.dailyCharge}
              onChange={(e) => setWard('dailyCharge', e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className="label">Description</label>
            <textarea className="input" rows={2} value={wardForm.description} onChange={(e) => setWard('description', e.target.value)} />
          </div>
          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setWardOpen(false)}>Cancel</button>
            <button type="submit" disabled={wardBusy} className="btn-primary">{wardBusy ? 'Saving…' : 'Add Ward'}</button>
          </div>
        </form>
      </Modal>

      {/* Add bed modal */}
      <Modal open={bedOpen} onClose={() => setBedOpen(false)} title={`Add Bed — ${selected?.name || ''}`}>
        {bedError && (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{bedError}</div>
        )}
        <form onSubmit={saveBed} className="space-y-3">
          <div>
            <label className="label">Bed number</label>
            <input
              className="input"
              required
              placeholder="e.g. GEN-11"
              value={bedForm.bedNumber}
              onChange={(e) => setBedForm((f) => ({ ...f, bedNumber: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              className="input"
              rows={2}
              placeholder="e.g. Near nursing station, oxygen outlet…"
              value={bedForm.notes}
              onChange={(e) => setBedForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setBedOpen(false)}>Cancel</button>
            <button type="submit" disabled={bedBusy} className="btn-primary">{bedBusy ? 'Adding…' : 'Add Bed'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

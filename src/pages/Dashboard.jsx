import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import ErrorBanner, { Loading, EmptyState } from '../components/Feedback';

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('en-IN') : '—');
const money = (n) => `₹${fmt(Math.round(n || 0))}`;

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/dashboard/stats')
      .then((res) => setStats(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading label="Loading hospital overview…" />;
  if (error) return <ErrorBanner message={error} />;
  if (!stats) return <EmptyState title="No data available" />;

  const { census, opd, revenue, alerts, recentVisits, departmentLoad } = stats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Hospital Dashboard</h1>
        <p className="text-sm text-slate-500">Live census, OPD load, occupancy and revenue at a glance.</p>
      </div>

      {/* Census */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Registered Patients" value={fmt(census.totalPatients)} icon="🧑‍⚕️" accent="primary" />
        <StatCard label="Doctors" value={fmt(census.totalDoctors)} icon="👨‍⚕️" accent="blue" />
        <StatCard label="Nurses" value={fmt(census.totalNurses)} icon="👩‍⚕️" accent="violet" />
        <StatCard label="Wards" value={fmt(census.totalWards)} icon="🏥" accent="cyan" />
        <StatCard label="Active Admissions" value={fmt(census.activeAdmissions)} icon="🛏️" accent="emerald" />
        <StatCard label="Available Beds" value={fmt(census.availableBeds)} sub={`of ${census.totalBeds} total`} icon="🟢" accent="green" />
      </div>

      {/* Occupancy + OPD */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-1">
          <h3 className="mb-1 text-sm font-semibold text-slate-700">Bed Occupancy</h3>
          <div className="text-3xl font-bold text-slate-800">{census.occupancyRate}%</div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-primary-500" style={{ width: `${census.occupancyRate}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
            <div>Occupied: <span className="font-semibold text-slate-700">{census.occupiedBeds}</span></div>
            <div>Available: <span className="font-semibold text-slate-700">{census.availableBeds}</span></div>
          </div>
        </div>

        <div className="card p-5 lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Today&apos;s OPD Load</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <div className="text-2xl font-bold text-slate-800">{fmt(opd.appointmentsToday)}</div>
              <div className="text-xs text-slate-500">Appointments</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">{fmt(opd.visitsToday)}</div>
              <div className="text-xs text-slate-500">OPD Visits</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">{fmt(opd.waitingNow)}</div>
              <div className="text-xs text-slate-500">In Queue</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-rose-600">{fmt(opd.emergencyCases)}</div>
              <div className="text-xs text-slate-500">Emergency</div>
            </div>
          </div>
          <div className="mt-4">
            <Link to="/opd" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
              Open OPD queue →
            </Link>
          </div>
        </div>
      </div>

      {/* Revenue + Alerts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Revenue</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <div className="text-2xl font-bold text-slate-800">{money(revenue.totalCollected)}</div>
              <div className="text-xs text-slate-500">Collected (all time)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">{money(revenue.totalBilled)}</div>
              <div className="text-xs text-slate-500">Billed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-rose-600">{money(revenue.outstanding)}</div>
              <div className="text-xs text-slate-500">Outstanding</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-brand-600">{money(revenue.monthCollected)}</div>
              <div className="text-xs text-slate-500">Collected this month</div>
            </div>
          </div>
          <div className="mt-4">
            <Link to="/billing" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
              Go to billing →
            </Link>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Alerts</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Pending lab orders</span>
              <span className="font-bold text-amber-600">{fmt(alerts.pendingLabOrders)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Low-stock medicines</span>
              <span className="font-bold text-rose-600">{fmt(alerts.lowStockCount)}</span>
            </div>
          </div>
          {alerts.lowStock?.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Low stock</div>
              <ul className="space-y-1.5">
                {alerts.lowStock.slice(0, 5).map((m) => (
                  <li key={m._id} className="flex items-center justify-between text-xs">
                    <span className="truncate text-slate-600">{m.name}</span>
                    <span className="ml-2 shrink-0 text-rose-600">{m.stock} / {m.reorderLevel}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Department load + recent visits */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Appointments by Department (today)</h3>
          {departmentLoad?.length ? (
            <ul className="space-y-2">
              {departmentLoad.map((d) => {
                const max = Math.max(...departmentLoad.map((x) => x.count));
                return (
                  <li key={d._id}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-slate-600">{d._id || 'General'}</span>
                      <span className="font-semibold text-slate-700">{d.count}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-primary-400" style={{ width: `${(d.count / max) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="No appointments today" />
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-700">Today&apos;s OPD Queue</h3>
            <Link to="/opd" className="text-xs font-semibold text-primary-600 hover:text-primary-700">View all →</Link>
          </div>
          {recentVisits?.length ? (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">#</th>
                  <th className="th">Patient</th>
                  <th className="th">Department</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentVisits.map((v) => (
                  <tr key={v._id} className="hover:bg-slate-50">
                    <td className="td font-semibold">{v.queueNumber}</td>
                    <td className="td">{v.patient?.user?.name || '—'}</td>
                    <td className="td">{v.department || v.doctor?.department || '—'}</td>
                    <td className="td"><Badge value={v.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="No visits yet today" />
          )}
        </div>
      </div>
    </div>
  );
}

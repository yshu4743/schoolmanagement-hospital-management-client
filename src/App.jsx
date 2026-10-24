import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import OPD from './pages/OPD';
import Appointments from './pages/Appointments';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import Wards from './pages/Wards';
import Admissions from './pages/Admissions';
import Doctors from './pages/Doctors';
import Nurses from './pages/Nurses';
import Pharmacy from './pages/Pharmacy';
import Labs from './pages/Labs';
import Billing from './pages/Billing';
import Records from './pages/Records';
import MyHealth from './pages/MyHealth';
import Users from './pages/Users';

export const STAFF = ['admin', 'doctor', 'nurse', 'receptionist'];
const ALL = [...STAFF, 'patient'];

/** Sends patients to their own portal and everyone else to the dashboard. */
function Home() {
  const { user } = useAuth();
  if (user?.role === 'patient') return <Navigate to="/my-health" replace />;
  return <Dashboard />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute roles={ALL}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/patients" element={<ProtectedRoute roles={STAFF}><Patients /></ProtectedRoute>} />
        <Route path="/patients/:id" element={<ProtectedRoute roles={STAFF}><PatientDetail /></ProtectedRoute>} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/opd" element={<ProtectedRoute roles={STAFF}><OPD /></ProtectedRoute>} />
        <Route path="/wards" element={<ProtectedRoute roles={STAFF}><Wards /></ProtectedRoute>} />
        <Route path="/admissions" element={<ProtectedRoute roles={STAFF}><Admissions /></ProtectedRoute>} />
        <Route path="/doctors" element={<ProtectedRoute roles={['admin']}><Doctors /></ProtectedRoute>} />
        <Route path="/nurses" element={<ProtectedRoute roles={['admin']}><Nurses /></ProtectedRoute>} />
        <Route path="/pharmacy" element={<ProtectedRoute roles={STAFF}><Pharmacy /></ProtectedRoute>} />
        <Route path="/labs" element={<ProtectedRoute roles={STAFF}><Labs /></ProtectedRoute>} />
        <Route path="/billing" element={<ProtectedRoute roles={STAFF}><Billing /></ProtectedRoute>} />
        <Route path="/records" element={<ProtectedRoute roles={STAFF}><Records /></ProtectedRoute>} />
        <Route path="/my-health" element={<ProtectedRoute roles={['patient']}><MyHealth /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

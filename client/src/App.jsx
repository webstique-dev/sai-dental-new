import { Routes, Route, Navigate } from 'react-router-dom';
import {
  Users, CalendarDays, Stethoscope, Wallet, Activity, FileBarChart,
  Settings, ScrollText, DatabaseBackup, UserSquare2, ClipboardList,
  Bell, History, FileHeart, Grid3x3, Pill,
} from 'lucide-react';

import { useAuth, ROLE_HOME } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import DashboardLayout from './components/layout/DashboardLayout.jsx';
import PlaceholderPage from './components/common/PlaceholderPage.jsx';

import Login from './pages/Login.jsx';
import Unauthorized from './pages/Unauthorized.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import ClinicSettings from './pages/admin/ClinicSettings.jsx';
import AdminDocuments from './pages/admin/Documents.jsx';
import AuditLogs from './pages/admin/AuditLogs.jsx';
import Reports from './pages/admin/Reports.jsx';
import Backup from './pages/admin/Backup.jsx';
import AdminPatients from './pages/admin/Patients.jsx';
import AdminAppointments from './pages/admin/Appointments.jsx';
import AdminDoctors from './pages/admin/Doctors.jsx';
import AdminBilling from './pages/admin/Billing.jsx';
import ReceptionistDashboard from './pages/receptionist/ReceptionistDashboard.jsx';
import Patients from './pages/receptionist/Patients.jsx';
import PatientRegistration from './pages/receptionist/PatientRegistration.jsx';
import PatientDetail from './pages/receptionist/PatientDetail.jsx';
import Appointments from './pages/receptionist/Appointments.jsx';
import Queue from './pages/receptionist/Queue.jsx';
import Billing from './pages/receptionist/Billing.jsx';
import FollowUps from './pages/receptionist/FollowUps.jsx';
import DoctorDashboard from './pages/doctor/DoctorDashboard.jsx';
import DoctorQueue from './pages/doctor/Queue.jsx';
import Consultation from './pages/doctor/Consultation.jsx';
import PatientHistory from './pages/doctor/PatientHistory.jsx';

// Small helper so Phase 2+ pages (not yet built) render a clean
// "coming soon" state instead of a blank/broken route.
const stub = (title, description, icon) => <PlaceholderPage title={title} description={description} icon={icon} />;

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-sm text-ink-soft">Loading...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={ROLE_HOME[user.role]} replace /> : <Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* ---------------- Admin ---------------- */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route element={<DashboardLayout title="Admin" />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/patients" element={<AdminPatients />} />
          <Route path="/admin/appointments" element={<AdminAppointments />} />
          <Route path="/admin/doctors" element={<AdminDoctors />} />
          <Route path="/admin/billing" element={<AdminBilling />} />
          <Route path="/admin/treatments" element={stub('Treatments', 'Treatment and procedure catalog. Coming in Phase 2.', Activity)} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/admin/settings" element={<ClinicSettings />} />
          <Route path="/admin/documents" element={<AdminDocuments />} />
          <Route path="/admin/audit-logs" element={<AuditLogs />} />
          <Route path="/admin/backup" element={<Backup />} />
        </Route>
      </Route>

      {/* ---------------- Receptionist ---------------- */}
      <Route element={<ProtectedRoute allowedRoles={['receptionist']} />}>
        <Route element={<DashboardLayout title="Front Desk" />}>
          <Route path="/reception" element={<ReceptionistDashboard />} />
          <Route path="/reception/patients" element={<Patients />} />
          <Route path="/reception/patients/register" element={<PatientRegistration />} />
          <Route path="/reception/patients/:id" element={<PatientDetail />} />
          <Route path="/reception/appointments" element={<Appointments />} />
          <Route path="/reception/queue" element={<Queue />} />
          <Route path="/reception/billing" element={<Billing />} />
          <Route path="/reception/follow-ups" element={<FollowUps />} />
          <Route path="/reception/reports" element={stub('Reports', 'Front-desk operational reports. Coming in Phase 2.', FileBarChart)} />
        </Route>
      </Route>

      {/* ---------------- Doctor ---------------- */}
      <Route element={<ProtectedRoute allowedRoles={['doctor', 'admin']} />}>
        <Route element={<DashboardLayout title="Clinical" />}>
          <Route path="/doctor" element={<DoctorDashboard />} />
          <Route path="/doctor/queue" element={<DoctorQueue />} />
          <Route path="/doctor/consultation/:consultationId" element={<Consultation />} />
          <Route path="/doctor/patients" element={<PatientHistory />} />
          <Route path="/doctor/history" element={<PatientHistory />} />
          <Route path="/doctor/examination" element={<Navigate to="/doctor/queue" replace />} />
          <Route path="/doctor/tooth-chart" element={<Navigate to="/doctor/queue" replace />} />
          <Route path="/doctor/diagnosis" element={<Navigate to="/doctor/queue" replace />} />
          <Route path="/doctor/treatment-plans" element={<Navigate to="/doctor/queue" replace />} />
          <Route path="/doctor/prescriptions" element={<Navigate to="/doctor/queue" replace />} />
          <Route path="/doctor/follow-ups" element={<Navigate to="/doctor/queue" replace />} />
        </Route>
      </Route>

      {/* ---------------- Root & fallback ---------------- */}
      <Route path="/" element={<Navigate to={user ? ROLE_HOME[user.role] : '/login'} replace />} />
      <Route path="*" element={<Navigate to={user ? ROLE_HOME[user.role] : '/login'} replace />} />
    </Routes>
  );
}

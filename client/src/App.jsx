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
import ReceptionistDashboard from './pages/receptionist/ReceptionistDashboard.jsx';
import Patients from './pages/receptionist/Patients.jsx';
import PatientRegistration from './pages/receptionist/PatientRegistration.jsx';
import PatientDetail from './pages/receptionist/PatientDetail.jsx';
import Appointments from './pages/receptionist/Appointments.jsx';
import Queue from './pages/receptionist/Queue.jsx';
import DoctorDashboard from './pages/doctor/DoctorDashboard.jsx';

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
          <Route path="/admin/patients" element={stub('Patients', 'Clinic-wide patient directory. Coming in Phase 2.', UserSquare2)} />
          <Route path="/admin/appointments" element={stub('Appointments', 'Clinic-wide appointment calendar. Coming in Phase 2.', CalendarDays)} />
          <Route path="/admin/doctors" element={stub('Doctors', 'Doctor schedules and specializations. Coming in Phase 2.', Stethoscope)} />
          <Route path="/admin/billing" element={stub('Billing', 'Clinic-wide billing overview. Coming in Phase 2.', Wallet)} />
          <Route path="/admin/treatments" element={stub('Treatments', 'Treatment and procedure catalog. Coming in Phase 2.', Activity)} />
          <Route path="/admin/reports" element={stub('Reports & Analytics', 'Revenue, patient, and treatment analytics. Coming in Phase 2.', FileBarChart)} />
          <Route path="/admin/settings" element={stub('Clinic Settings', 'Clinic profile, hours, and configuration. Coming in Phase 2.', Settings)} />
          <Route path="/admin/audit-logs" element={stub('Audit Logs', 'Full activity trail across the system. Coming in Phase 2.', ScrollText)} />
          <Route path="/admin/backup" element={stub('Backup', 'Data backup and export tools. Coming in Phase 2.', DatabaseBackup)} />
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
          <Route path="/reception/billing" element={stub('Billing & Payments', 'Invoices and payment collection. Coming in Phase 2.', Wallet)} />
          <Route path="/reception/follow-ups" element={stub('Follow-Ups', 'Recall and follow-up reminders. Coming in Phase 2.', Bell)} />
          <Route path="/reception/reports" element={stub('Reports', 'Front-desk operational reports. Coming in Phase 2.', FileBarChart)} />
        </Route>
      </Route>

      {/* ---------------- Doctor ---------------- */}
      <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
        <Route element={<DashboardLayout title="Clinical" />}>
          <Route path="/doctor" element={<DoctorDashboard />} />
          <Route path="/doctor/queue" element={stub('My Queue', "Today's patient queue. Coming in Phase 2.", ClipboardList)} />
          <Route path="/doctor/patients" element={stub('Patients', 'Your assigned patients. Coming in Phase 2.', UserSquare2)} />
          <Route path="/doctor/history" element={stub('Patient History', 'Full clinical history per patient. Coming in Phase 2.', History)} />
          <Route path="/doctor/examination" element={stub('Clinical Examination', 'Structured examination forms. Coming in Phase 2.', FileHeart)} />
          <Route path="/doctor/tooth-chart" element={stub('Tooth Chart', 'Interactive FDI tooth charting. Coming in Phase 2.', Grid3x3)} />
          <Route path="/doctor/diagnosis" element={stub('Diagnosis', 'Diagnosis entry linked to tooth chart. Coming in Phase 2.', Stethoscope)} />
          <Route path="/doctor/treatment-plans" element={stub('Treatment Plans', 'Multi-step treatment planning. Coming in Phase 2.', Activity)} />
          <Route path="/doctor/prescriptions" element={stub('Prescriptions', 'Prescription writing and history. Coming in Phase 2.', Pill)} />
          <Route path="/doctor/follow-ups" element={stub('Follow-Ups', 'Patient recall scheduling. Coming in Phase 2.', Bell)} />
        </Route>
      </Route>

      {/* ---------------- Root & fallback ---------------- */}
      <Route path="/" element={<Navigate to={user ? ROLE_HOME[user.role] : '/login'} replace />} />
      <Route path="*" element={<Navigate to={user ? ROLE_HOME[user.role] : '/login'} replace />} />
    </Routes>
  );
}

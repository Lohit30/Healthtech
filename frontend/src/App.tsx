import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { getUser, clearAuth, AuthUser } from './auth';

// Pages — shared
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import PatientList from './pages/PatientList';
import AddPatient from './pages/AddPatient';
import AppointmentScheduler from './pages/AppointmentScheduler';
import ConsultationNotes from './pages/ConsultationNotes';

// Role dashboards
import AdminDashboard from './pages/admin/AdminDashboard';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import PatientDashboard from './pages/patient/PatientDashboard';

// Sidebar nav definitions per role
const navByRole: Record<string, { to: string; label: string; icon: string; end?: boolean }[]> = {
    admin: [
        { to: '/admin/dashboard', label: 'Admin Dashboard', icon: '🛡️', end: true },
        { to: '/patients', label: 'Patients', icon: '👥' },
        { to: '/patients/new', label: 'Add Patient', icon: '➕' },
        { to: '/appointments', label: 'Appointments', icon: '📅' },
        { to: '/consultations', label: 'Consultations', icon: '📝' },
    ],
    doctor: [
        { to: '/doctor/dashboard', label: 'My Dashboard', icon: '🩺', end: true },
        { to: '/patients', label: 'All Patients', icon: '👥' },
        { to: '/appointments', label: 'Appointments', icon: '📅' },
        { to: '/consultations', label: 'Consultation Notes', icon: '📝' },
    ],
    patient: [
        { to: '/patient/dashboard', label: 'My Portal', icon: '🏠', end: true },
        { to: '/appointments', label: 'Book Appointment', icon: '📅' },
    ],
};

const roleColors: Record<AuthUser['role'], string> = {
    admin: 'bg-red-500',
    doctor: 'bg-blue-500',
    patient: 'bg-green-500',
};

// Redirect unauthenticated users to login
function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const user = getUser();
    if (!user) return <Navigate to="/login" replace />;
    return <>{children}</>;
}

// Automatically redirect / to role-specific dashboard
function RoleRedirect() {
    const user = getUser();
    if (!user) return <Navigate to="/login" replace />;
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'doctor') return <Navigate to="/doctor/dashboard" replace />;
    return <Navigate to="/patient/dashboard" replace />;
}

function AppLayout() {
    const user = getUser()!;
    const navItems = navByRole[user.role] || [];

    const handleLogout = () => {
        clearAuth();
        window.location.href = '/login';
    };

    return (
        <div className="flex min-h-screen">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-800 flex flex-col py-6 px-4 flex-shrink-0">
                <div className="mb-8 px-2">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">🏥</span>
                        <span className="text-white font-bold text-xl">RuralCare</span>
                    </div>
                    <p className="text-slate-400 text-xs ml-9">Healthcare Management</p>
                </div>

                <nav className="flex flex-col gap-1 flex-1">
                    {navItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                        >
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* User info + logout */}
                <div className="mt-auto px-2 space-y-3">
                    <div className="bg-slate-700 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-bold text-white px-2 py-0.5 rounded-full capitalize ${roleColors[user.role]}`}>
                                {user.role}
                            </span>
                        </div>
                        <p className="text-white text-sm font-medium truncate">{user.name}</p>
                        <p className="text-slate-400 text-xs truncate">{user.email}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full text-sm text-slate-400 hover:text-white hover:bg-slate-700 py-2 rounded-lg transition-colors text-left px-3"
                    >
                        🚪 Logout
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-auto">
                <Routes>
                    {/* Home → redirect to role dashboard */}
                    <Route path="/" element={<RoleRedirect />} />

                    {/* Shared pages */}
                    <Route path="/patients" element={<PatientList />} />
                    <Route path="/patients/new" element={<AddPatient />} />
                    <Route path="/appointments" element={<AppointmentScheduler />} />
                    <Route path="/consultations" element={<ConsultationNotes />} />

                    {/* Backwards compat generic dashboard */}
                    <Route path="/dashboard" element={<Dashboard />} />

                    {/* Role-specific dashboards */}
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
                    <Route path="/patient/dashboard" element={<PatientDashboard />} />
                </Routes>
            </main>
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route
                    path="/*"
                    element={
                        <ProtectedRoute>
                            <AppLayout />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}

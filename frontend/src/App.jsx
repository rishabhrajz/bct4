import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import ProviderOnboard from './pages/ProviderOnboard';
import IssuePolicy from './pages/IssuePolicy';
import PatientDashboard from './pages/PatientDashboard';
import SubmitClaim from './pages/SubmitClaim';
import InsurerDashboard from './pages/InsurerDashboard';
import AdminDebug from './pages/AdminDebug';
import InsurerProviderApprovals from './pages/InsurerProviderApprovals';
import InsurerPolicyApprovals from './pages/InsurerPolicyApprovals';

function Navigation() {
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    const navLinks = [
        { path: '/', label: 'Home', icon: '🏠' },
        { path: '/provider', label: 'Provider', icon: '🏥' },
        { path: '/policy', label: 'Issue Policy', icon: '📋' },
        { path: '/patient', label: 'Patient', icon: '👤' },
        { path: '/claim', label: 'Submit Claim', icon: '💊' },
        { path: '/insurer', label: 'Insurer', icon: '🏛️' },
        { path: '/admin', label: 'Admin', icon: '⚙️' },
    ];

    return (
        <nav className="bg-white shadow-lg sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <Link to="/" className="flex items-center space-x-3">
                        <span className="text-2xl">🏥</span>
                        <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                            ProjectY
                        </span>
                    </Link>

                    <div className="flex space-x-1">
                        {navLinks.map(({ path, label, icon }) => (
                            <Link
                                key={path}
                                to={path}
                                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${isActive(path)
                                    ? 'bg-primary-500 text-white shadow-md'
                                    : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                <span>{icon}</span>
                                <span className="hidden sm:inline">{label}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </nav>
    );
}

function App() {
    return (
        <Router>
            <div className="min-h-screen">
                <Navigation />

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/provider" element={<ProviderOnboard />} />
                        <Route path="/policy" element={<IssuePolicy />} />
                        <Route path="/patient" element={<PatientDashboard />} />
                        <Route path="/claim" element={<SubmitClaim />} />
                        <Route path="/insurer" element={<InsurerDashboard />} />
                        <Route path="/insurer/provider-approvals" element={<InsurerProviderApprovals />} />
                        <Route path="/insurer/policy-approvals" element={<InsurerPolicyApprovals />} />
                        <Route path="/admin" element={<AdminDebug />} />
                        <Route path="*" element={
                            <div className="text-center py-12">
                                <h1 className="text-4xl font-bold text-gray-800 mb-4">404 - Page Not Found</h1>
                                <Link to="/" className="text-primary-600 hover:underline">Go Home</Link>
                            </div>
                        } />
                    </Routes>
                </main>

                <footer className="bg-white border-t mt-12 py-6">
                    <div className="max-w-7xl mx-auto px-4 text-center text-gray-600">
                        <p>ProjectY - Decentralized Healthcare Insurance with DIDs & Verifiable Credentials</p>
                    </div>
                </footer>
            </div>
        </Router>
    );
}

export default App;

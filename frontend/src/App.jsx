import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import Overview from './pages/dashboard/Overview';
import Claims from './pages/dashboard/Claims';
import Policies from './pages/dashboard/Policies';
import Copilot from './pages/dashboard/Copilot';
import NewClaim from './pages/dashboard/NewClaim';
import NewPolicy from './pages/dashboard/NewPolicy';
import ChatClaim from './pages/dashboard/ChatClaim';
import { AppDataProvider } from './context/AppDataContext';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from './components/ui/sonner';

function App() {
  return (
    <AppDataProvider>
      <Toaster />
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Overview />} />
            <Route path="claims" element={<Claims />} />
            <Route path="claims/new" element={<NewClaim />} />
            <Route path="claims/chat" element={<ChatClaim />} />
            <Route path="policies" element={<Policies />} />
            <Route path="policies/new" element={<NewPolicy />} />
            <Route path="copilot" element={<Copilot />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AppDataProvider>
  );
}

export default App;

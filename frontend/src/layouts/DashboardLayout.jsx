import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { AlertCircle, Bot, ChevronLeft, ChevronRight, FileText, LayoutDashboard, LogOut } from 'lucide-react';
import logoIcon from '../assets/rex_logo.png';
import { useAppData } from '../context/AppDataContext';
import './Dashboard.css';

const DashboardLayout = () => {
  const navigate = useNavigate();
  const { currentUser, userClaims, logout } = useAppData();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const initials =
    currentUser?.fullName
      ?.split(' ')
      .map((token) => token[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'RX';

  const openClaimsCount = userClaims.filter((claim) => !['Closed', 'Denied', 'Paid'].includes(claim.status)).length;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className={`dashboard-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <span className="sidebar-wordmark">
            <img src={logoIcon} alt="Rex AI" className="sidebar-wordmark-mark" />
            <span className="sidebar-wordmark-text">Rex AI</span>
          </span>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setIsSidebarCollapsed((previous) => !previous)}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
        <div className="sidebar-divider" />

        <nav className="nav-links">
          <NavLink to="/dashboard" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon-wrap">
              <LayoutDashboard size={18} />
            </span>
            <span className="nav-label">Overview</span>
          </NavLink>

          <NavLink to="/dashboard/policies" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon-wrap">
              <FileText size={18} />
            </span>
            <span className="nav-label">Policies</span>
          </NavLink>

          <NavLink to="/dashboard/claims" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon-wrap">
              <AlertCircle size={18} />
            </span>
            <span className="nav-label">Claims</span>
            {openClaimsCount > 0 ? (
              <span className={`nav-pill ${isSidebarCollapsed ? 'compact' : ''}`}>
                {isSidebarCollapsed ? '' : openClaimsCount}
              </span>
            ) : null}
          </NavLink>

          <NavLink
            to="/dashboard/copilot"
            className={({ isActive }) => `nav-item rexy-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon-wrap">
              <Bot size={18} />
            </span>
            <span className="nav-label">Rex AI</span>
          </NavLink>
        </nav>

        <div className="user-profile">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <span className="user-name">{currentUser?.fullName || 'Guest User'}</span>
            <span className="user-role">{currentUser ? 'Policyholder' : 'Member'}</span>
          </div>
          <button type="button" className="logout-btn" onClick={handleLogout} aria-label="Log out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;

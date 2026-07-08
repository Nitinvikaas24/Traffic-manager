import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css'; // We'll create this CSS file
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const menuItems = [
    { text: 'Dashboard', path: '/', icon: '📊' },
    { text: 'Signals', path: '/signals', icon: '🚦' },
    { text: 'Occasions', path: '/occasions', icon: '📅' }
  ];

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <button className="menu-button" onClick={toggleMenu}>
            ☰
          </button>
          <Link to="/" className="logo-link">
            🚦 Traffic Signal Management
          </Link>
        </div>
        
        <div className="desktop-menu">
          {menuItems.map((item) => (
            <Link 
              key={item.text}
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
            >
              {item.text}
            </Link>
          ))}
          {isAuthenticated ? (
            <button className="nav-link nav-action" onClick={logout} type="button">
              Logout{user?.fullName ? ` (${user.fullName})` : ''}
            </button>
          ) : (
            <Link to="/auth" className={`nav-link ${location.pathname === '/auth' ? 'active' : ''}`}>
              Officer Login
            </Link>
          )}
        </div>

        {menuOpen && (
          <div className="mobile-menu">
            <div className="drawer">
              <div className="drawer-content">
                {menuItems.map((item) => (
                  <Link 
                    key={item.text}
                    to={item.path}
                    className={`drawer-item ${location.pathname === item.path ? 'active' : ''}`}
                    onClick={toggleMenu}
                  >
                    <span className="item-icon">{item.icon}</span>
                    <span className="item-text">{item.text}</span>
                  </Link>
                ))}
                {isAuthenticated ? (
                  <button className="drawer-item drawer-button" onClick={logout} type="button">
                    <span className="item-icon">🔒</span>
                    <span className="item-text">Logout</span>
                  </button>
                ) : (
                  <Link 
                    to="/auth"
                    className={`drawer-item ${location.pathname === '/auth' ? 'active' : ''}`}
                    onClick={toggleMenu}
                  >
                    <span className="item-icon">🔑</span>
                    <span className="item-text">Officer Login</span>
                  </Link>
                )}
              </div>
            </div>
            <div className="drawer-backdrop" onClick={toggleMenu}></div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar; 
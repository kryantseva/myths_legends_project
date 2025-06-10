// frontend/myths_legends_app/src/components/NavBar.js
import React from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaUserCircle, FaSignOutAlt, FaUser, FaSignInAlt, FaUserPlus, FaMapMarkedAlt, FaCheckCircle } from 'react-icons/fa';

function Chip({ label, color = '#007bff', icon }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', background: color + '22', color, borderRadius: 14, padding: '2px 10px', marginLeft: 8, fontSize: 13, fontWeight: 500
    }}>
      {icon && <span style={{ marginRight: 4 }}>{icon}</span>}{label}
    </span>
  );
}

function NavBar() {
  const { isLoggedIn, currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    window.location.reload();
  };

  const role = currentUser?.is_superuser ? 'Админ' : currentUser?.groups?.includes('Moderators') ? 'Модератор' : 'Пользователь';
  const roleColor = currentUser?.is_superuser ? '#d32f2f' : currentUser?.groups?.includes('Moderators') ? '#ff9800' : '#007bff';

  return (
    <nav style={{ background: '#fff', color: '#222', boxShadow: '0 2px 12px #0001', padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100, minHeight: 60 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginLeft: 24, fontWeight: 700, fontSize: 22, letterSpacing: 1 }}>
        <FaMapMarkedAlt color="#007bff" style={{ marginRight: 10, fontSize: 26 }} />
        <a href="/" style={{ color: '#007bff', textDecoration: 'none' }}>Myths & Legends</a>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 24 }}>
        {isLoggedIn && currentUser ? (
          <>
            <span style={{ display: 'flex', alignItems: 'center', fontWeight: 500, fontSize: 16, color: '#222' }}>
              <FaUserCircle size={28} color="#007bff" style={{ marginRight: 6 }} />
              {currentUser.username}
              <Chip label={role} color={roleColor} />
            </span>
            <button onClick={() => navigate('/profile')} style={{ background: '#007bff', color: 'white', border: 'none', borderRadius: 8, padding: '7px 16px', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}><FaUser /> Профиль</button>
            {currentUser.is_superuser && (
              <button onClick={() => navigate('/moderation')} style={{ background: '#ff9800', color: 'white', border: 'none', borderRadius: 8, padding: '7px 16px', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}><FaCheckCircle /> Модерация</button>
            )}
            <button onClick={handleLogout} style={{ background: '#d32f2f', color: 'white', border: 'none', borderRadius: 8, padding: '7px 16px', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}><FaSignOutAlt /> Выйти</button>
          </>
        ) : (
          <>
            <button onClick={() => navigate('/login')} style={{ background: '#007bff', color: 'white', border: 'none', borderRadius: 8, padding: '7px 16px', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}><FaSignInAlt /> Войти</button>
            <button onClick={() => navigate('/register')} style={{ background: '#43a047', color: 'white', border: 'none', borderRadius: 8, padding: '7px 16px', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}><FaUserPlus /> Регистрация</button>
          </>
        )}
      </div>
    </nav>
  );
}

export default NavBar;
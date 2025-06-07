// frontend/myths_legends_app/src/components/NavBar.js
import React from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

function NavBar() {
  const { isLoggedIn, currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <nav style={{ background: '#333', color: 'white', padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <a href="/" style={{ color: 'white', marginRight: '20px', textDecoration: 'none' }}>Myths and Legends</a>
      </div>
      <div>
        {isLoggedIn && currentUser ? (
          <>
            <span style={{ marginRight: '20px' }}>
              {currentUser.username} ({currentUser.is_superuser ? 'Admin' : currentUser.groups.includes('Moderators') ? 'Moderator' : 'User'})
            </span>
            <button onClick={() => navigate('/profile')} style={{ marginRight: '10px' }}>Profile</button>
            {currentUser.is_superuser && (
              <button onClick={() => navigate('/moderation')} style={{ marginRight: '10px' }}>Moderation</button>
            )}
            <button onClick={handleLogout} style={{ marginRight: '10px' }}>Logout</button>
          </>
        ) : (
          <>
            <button onClick={() => navigate('/login')} style={{ marginRight: '10px' }}>Login</button>
            <button onClick={() => navigate('/register')}>Register</button>
          </>
        )}
      </div>
    </nav>
  );
}

export default NavBar;
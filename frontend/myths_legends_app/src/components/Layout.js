import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

function Layout() {
  const { isLoggedIn, currentUser, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  const isModeratorOrAdmin = currentUser && (currentUser.is_superuser || currentUser.groups.some(group => group.name === 'Moderators'));

  return (
    
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ flexShrink: 0, padding: '10px 20px', borderBottom: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>Путеводитель по мифам</Link>
        </h1>
        <nav>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', gap: '15px' }}>
            <li>
              <Link to="/" style={{ textDecoration: 'none', color: 'blue' }}>Карта</Link>
            </li>
            <li>
              <Link to="/places" style={{ textDecoration: 'none', color: 'blue' }}>Список Мест</Link>
            </li>
            {isModeratorOrAdmin && (
              <li>
                <Link to="/moderation" style={{ textDecoration: 'none', color: 'orange' }}>Модерация</Link>
              </li>
            )}
            <li>
              {isLoggedIn ? (
                <>
                  <Link to="/profile" style={{ textDecoration: 'none', color: 'blue' }}>Профиль ({currentUser.username})</Link>
                  <button onClick={handleLogout} style={{ marginLeft: '10px', background: 'none', border: '1px solid red', color: 'red', cursor: 'pointer', padding: '5px 10px', borderRadius: '5px' }}>Выйти</button>
                </>
              ) : (
                <Link to="/login" style={{ textDecoration: 'none', color: 'blue' }}>Войти</Link>
              )}
            </li>
          </ul>
        </nav>
      </header>
      {}
      {}
      <main style={{ flexGrow: 1, padding: '0px', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;

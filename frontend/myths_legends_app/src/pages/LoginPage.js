// frontend/myths_legends_app/src/pages/LoginPage.js
import React, { useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';
import { FaUser, FaLock, FaSignInAlt } from 'react-icons/fa';

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const success = await login(credentials.username, credentials.password);
    if (success) {
      navigate('/');
    } else {
      setError('Неверное имя пользователя или пароль.');
    }
  };

  return (
    <div className="login-container" style={{ minHeight: '100vh', background: '#f7f8fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 4px 32px #0002', padding: 36, minWidth: 340, maxWidth: 400, width: '100%' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 24, fontWeight: 700, fontSize: 26 }}>Вход в систему</h2>
        {error && <div style={{ background: '#ffd6d6', color: '#d32f2f', borderRadius: 10, padding: 10, marginBottom: 18, textAlign: 'center', fontWeight: 600 }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}><FaUser style={{ marginRight: 6 }} /> Имя пользователя</label>
            <input
              type="text"
              name="username"
              value={credentials.username}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc', fontSize: 16 }}
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}><FaLock style={{ marginRight: 6 }} /> Пароль</label>
            <input
              type="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc', fontSize: 16 }}
            />
          </div>
          <button type="submit" style={{ width: '100%', padding: 12, background: '#007bff', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><FaSignInAlt /> Войти</button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <span style={{ color: '#888', fontSize: 15 }}>Нет аккаунта?</span>
          <a href="/register" style={{ marginLeft: 8, background: '#e3f0ff', color: '#007bff', borderRadius: 14, padding: '4px 14px', fontWeight: 600, textDecoration: 'none', fontSize: 15, marginTop: 6, display: 'inline-block' }}>Зарегистрироваться</a>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
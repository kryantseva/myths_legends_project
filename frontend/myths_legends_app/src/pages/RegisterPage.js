// frontend/myths_legends_app/src/pages/RegisterPage.js
import React, { useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { useNavigate } from 'react-router-dom';
import './RegisterPage.css';
import { FaUser, FaEnvelope, FaLock, FaUserPlus } from 'react-icons/fa';

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setUserData({ ...userData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const success = await register(userData.username, userData.email, userData.password);
    if (success) {
      navigate('/login');
    } else {
      setError('Регистрация не удалась. Проверьте данные.');
    }
  };

  return (
    <div className="register-container" style={{ minHeight: '100vh', background: '#f7f8fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 4px 32px #0002', padding: 36, minWidth: 340, maxWidth: 400, width: '100%' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 24, fontWeight: 700, fontSize: 26 }}>Регистрация</h2>
        {error && <div style={{ background: '#ffd6d6', color: '#d32f2f', borderRadius: 10, padding: 10, marginBottom: 18, textAlign: 'center', fontWeight: 600 }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}><FaUser style={{ marginRight: 6 }} /> Имя пользователя</label>
            <input
              type="text"
              name="username"
              value={userData.username}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc', fontSize: 16 }}
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}><FaEnvelope style={{ marginRight: 6 }} /> Email</label>
            <input
              type="email"
              name="email"
              value={userData.email}
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
              value={userData.password}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc', fontSize: 16 }}
            />
          </div>
          <button type="submit" style={{ width: '100%', padding: 12, background: '#43a047', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><FaUserPlus /> Зарегистрироваться</button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <span style={{ color: '#888', fontSize: 15 }}>Уже есть аккаунт?</span>
          <a href="/login" style={{ marginLeft: 8, background: '#e3f0ff', color: '#007bff', borderRadius: 14, padding: '4px 14px', fontWeight: 600, textDecoration: 'none', fontSize: 15, marginTop: 6, display: 'inline-block' }}>Войти</a>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
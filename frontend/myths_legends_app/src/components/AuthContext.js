// frontend/myths_legends_app/src/components/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export const AuthProvider = ({ children }) => {
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  axios.defaults.baseURL = API_BASE_URL;

  useEffect(() => {
    if (authToken) {
      axios.defaults.headers.common['Authorization'] = `Token ${authToken}`;
      fetchUserProfile();
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setCurrentUser(null);
      setLoading(false);
    }
  }, [authToken]);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get('/api/auth/profile/');
      const { id, username, email, is_superuser, groups } = response.data;
      setCurrentUser({
        id,
        username,
        email,
        is_superuser,
        groups: groups || [],
      });
    } catch (error) {
      console.error('Failed to fetch user profile:', error.response?.data || error.message);
      setAuthToken(null);
      localStorage.removeItem('authToken');
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await axios.post('/api/auth/login/', { username, password });
      const { token, user_id, email, username: userName } = response.data;
      localStorage.setItem('authToken', token);
      axios.defaults.headers.common['Authorization'] = `Token ${token}`;
      setAuthToken(token);
      await fetchUserProfile();
      navigate('/profile'); // Redirect to profile after login
      return true;
    } catch (error) {
      console.error('Login failed:', error.response?.data || error.message);
      alert('Login failed: ' + (error.response?.data?.detail || error.message));
      return false;
    }
  };

  const register = async (username, email, password) => {
    try {
      await axios.post('/api/auth/register/', { username, email, password });
      alert('Registration successful! Please log in.');
      return true;
    } catch (error) {
      console.error('Registration failed:', error.response?.data || error.message);
      alert('Registration failed: ' + (error.response?.data?.username?.[0] || error.response?.data?.email?.[0] || error.message));
      return false;
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout/');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setAuthToken(null);
      localStorage.removeItem('authToken');
      delete axios.defaults.headers.common['Authorization'];
      setCurrentUser(null);
      navigate('/'); // Redirect to homepage after logout
    }
  };

  const value = {
    authToken,
    currentUser,
    isLoggedIn: !!authToken,
    isModeratorOrAdmin: currentUser && (currentUser.is_superuser || currentUser.groups.includes('Moderators')),
    loading,
    login,
    register,
    logout,
    fetchUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export const AuthProvider = ({ children }) => {
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
      setCurrentUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
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
      const token = response.data.token;
      setAuthToken(token);
      localStorage.setItem('authToken', token);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
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
      console.error('Registration failed:', error);
      alert('Registration failed: ' + (error.response?.data?.username || error.response?.data?.email || error.message));
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
      setCurrentUser(null);
    }
  };

  const value = {
    authToken,
    currentUser,
    isLoggedIn: !!authToken,
    loading,
    login,
    register,
    logout,
    fetchUserProfile
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

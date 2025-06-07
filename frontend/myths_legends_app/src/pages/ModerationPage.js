// frontend/myths_legends_app/src/pages/ModerationPage.js
import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import axios from 'axios';
import './ModerationPage.css';

function ModerationPage() {
  const { isLoggedIn, currentUser, isModeratorOrAdmin } = useAuth();
  const [pendingItems, setPendingItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    if (!isLoggedIn || !isModeratorOrAdmin) {
      setError('Доступ запрещён. Только модераторы и администраторы могут просматривать эту страницу.');
      setLoading(false);
      return;
    }

    const fetchPendingItems = async () => {
      try {
        const headers = { Authorization: `Token ${localStorage.getItem('authToken')}` };
        const [placesResponse, notesResponse, commentsResponse] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/places/?moderation_status=pending`, { headers }),
          axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/notes/?moderation_status=pending`, { headers }),
          axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/comments/?moderation_status=pending`, { headers }),
        ]);

        const places = placesResponse.data.features || placesResponse.data.results || [];
        const notes = notesResponse.data.results || notesResponse.data || [];
        const comments = commentsResponse.data.results || commentsResponse.data || [];

        // Ensure user object has groups property
        setPendingItems([
          ...places.map(item => ({
            ...item,
            type: 'place',
            user: {
              ...item.owner,
              username: item.owner?.username || 'Unknown',
              is_superuser: item.owner?.is_superuser || false,
              groups: item.owner?.groups || []
            }
          })),
          ...notes.map(item => ({
            ...item,
            type: 'note',
            user: {
              ...item.user,
              username: item.user?.username || 'Unknown',
              is_superuser: item.user?.is_superuser || false,
              groups: item.user?.groups || []
            }
          })),
          ...comments.map(item => ({
            ...item,
            type: 'comment',
            user: {
              ...item.user,
              username: item.user?.username || 'Unknown',
              is_superuser: item.user?.is_superuser || false,
              groups: item.user?.groups || []
            }
          })),
        ]);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching pending items:', err.response?.data || err.message);
        setError('Не удалось загрузить данные для модерации. Проверьте подключение или обратитесь к администратору. Ошибка: ' + (err.response?.statusText || err.message));
        setLoading(false);
      }
    };

    fetchPendingItems();
  }, [isLoggedIn, isModeratorOrAdmin]);

  const handleModeration = async (itemId, type, action) => {
    try {
      const headers = { Authorization: `Token ${localStorage.getItem('authToken')}` };
      let url;
      switch (type) {
        case 'place':
          url = `${process.env.REACT_APP_API_BASE_URL}/api/places/${itemId}/${action === 'approve' ? 'approve' : 'reject'}/`;
          break;
        case 'note':
          url = `${process.env.REACT_APP_API_BASE_URL}/api/notes/${itemId}/${action === 'approve' ? 'approve' : 'reject'}/`;
          break;
        case 'comment':
          url = `${process.env.REACT_APP_API_BASE_URL}/api/comments/${itemId}/${action === 'approve' ? 'approve' : 'reject'}/`;
          break;
        default:
          throw new Error('Неверный тип элемента');
      }

      await axios.patch(url, {}, { headers }); // Empty body since action is in URL
      setPendingItems(prevItems => prevItems.filter(item => item.id !== itemId));
      alert(`${type === 'place' ? 'Место' : type === 'note' ? 'Заметка' : 'Комментарий'} успешно ${action === 'approve' ? 'одобрено' : 'отклонено'}.`);
      setSelectedItem(null); // Close popup after action
    } catch (err) {
      console.error('Error moderating item:', err.response?.data || err.message);
      alert('Ошибка при модерации. Попробуйте снова. Ошибка: ' + (err.response?.data?.detail || err.message));
    }
  };

  const openPopup = (item) => {
    setSelectedItem(item);
  };

  const closePopup = () => {
    setSelectedItem(null);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>Загрузка...</div>;
  if (error) return <div style={{ color: 'red', textAlign: 'center', padding: '20px' }}>{error}</div>;
  if (!isLoggedIn || !isModeratorOrAdmin) return null;

  return (
    <div className="moderation-container">
      <h2>Панель модерации</h2>
      {pendingItems.length === 0 ? (
        <p>Нет элементов, требующих модерации.</p>
      ) : (
        <ul className="moderation-list">
          {pendingItems.map(item => (
            <li key={`${item.type}-${item.id}`} className="moderation-item">
              <div>
                <strong>{item.type === 'place' ? 'Место' : item.type === 'note' ? 'Заметка' : 'Комментарий'}: </strong>
                {item.type === 'place' ? item.properties?.name || item.name : item.text || item.content}
                <br />
                <small>Автор: {item.user.username} ({item.user.is_superuser ? 'Admin' : item.user.groups.includes('Moderators') ? 'Moderator' : 'User'})</small>
              </div>
              <div>
                <button
                  onClick={() => openPopup(item)}
                  style={{ marginRight: '10px', backgroundColor: '#007bff', color: 'white' }}
                >
                  Просмотреть
                </button>
                <button
                  onClick={() => handleModeration(item.id, item.type, 'approve')}
                  style={{ marginRight: '10px', backgroundColor: '#28a745', color: 'white' }}
                >
                  Одобрить
                </button>
                <button
                  onClick={() => handleModeration(item.id, item.type, 'reject')}
                  style={{ backgroundColor: '#dc3545', color: 'white' }}
                >
                  Отклонить
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {selectedItem && (
        <div className="modal" onClick={closePopup}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>{selectedItem.type === 'place' ? 'Место' : selectedItem.type === 'note' ? 'Заметка' : 'Комментарий'}</h3>
            <p><strong>Название:</strong> {selectedItem.type === 'place' ? selectedItem.properties?.name || selectedItem.name : selectedItem.text || selectedItem.content}</p>
            {selectedItem.type === 'place' && selectedItem.properties?.description && (
              <p><strong>Описание:</strong> {selectedItem.properties.description}</p>
            )}
            {selectedItem.type === 'note' && selectedItem.text && (
              <p><strong>Текст:</strong> {selectedItem.text}</p>
            )}
            {selectedItem.type === 'comment' && selectedItem.content && (
              <p><strong>Текст:</strong> {selectedItem.content}</p>
            )}
            <p><strong>Автор:</strong> {selectedItem.user.username} ({selectedItem.user.is_superuser ? 'Admin' : selectedItem.user.groups.includes('Moderators') ? 'Moderator' : 'User'})</p>
            <button onClick={() => handleModeration(selectedItem.id, selectedItem.type, 'approve')} style={{ backgroundColor: '#28a745', color: 'white' }}>Одобрить</button>
            <button onClick={() => handleModeration(selectedItem.id, selectedItem.type, 'reject')} style={{ backgroundColor: '#dc3545', color: 'white', marginLeft: '10px' }}>Отклонить</button>
            <button onClick={closePopup} style={{ backgroundColor: '#6c757d', color: 'white', marginLeft: '10px' }}>Закрыть</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ModerationPage;
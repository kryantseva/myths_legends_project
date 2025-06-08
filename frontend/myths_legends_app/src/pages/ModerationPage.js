// frontend/myths_legends_app/src/pages/ModerationPage.js
import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import axios from 'axios';
import './ModerationPage.css'; // Убедитесь, что этот файл существует и содержит стили

function ModerationPage() {
  const { isLoggedIn, currentUser, isModeratorOrAdmin } = useAuth();
  const [pendingItems, setPendingItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loadingPopupData, setLoadingPopupData] = useState(false);
  const [popupError, setPopupError] = useState(null);

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

        setPendingItems([
          ...places.map(item => ({
            ...item,
            type: 'place',
            // owner is nested inside properties for GeoJSON, but user object is preferred for consistency
            user: {
              ...item.properties?.owner, // Use properties.owner if it exists (for GeoJSON)
              username: item.properties?.owner?.username || item.owner?.username || 'Unknown', // Fallback for owner
              is_superuser: item.properties?.owner?.is_superuser || item.owner?.is_superuser || false,
              groups: item.properties?.owner?.groups || item.owner?.groups || []
            },
            created_at: item.properties?.created_at || item.created_at || 'N/A' // Assuming created_at could be in properties or top level
          })),
          ...notes.map(item => ({
            ...item,
            type: 'note',
            user: {
              ...item.user,
              username: item.user?.username || 'Unknown',
              is_superuser: item.user?.is_superuser || false,
              groups: item.user?.groups || []
            },
            created_at: item.created_at || 'N/A'
          })),
          ...comments.map(item => ({
            ...item,
            type: 'comment',
            user: {
              ...item.user,
              username: item.user?.username || 'Unknown',
              is_superuser: item.user?.is_superuser || false,
              groups: item.user?.groups || []
            },
            created_at: item.created_at || 'N/A'
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

  const openPopup = async (item) => {
    setLoadingPopupData(true);
    setPopupError(null);
    let fullItem = { ...item }; // Start with the basic item
    const headers = { Authorization: `Token ${localStorage.getItem('authToken')}` };

    try {
      if (item.type === 'note') {
        if (item.place) { // Assuming 'place' field holds ID
          const placeResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/places/${item.place}/`, { headers });
          fullItem.place_details = placeResponse.data; // Store full place object
        }
      } else if (item.type === 'comment') {
        if (item.note) { // Assuming 'note' field holds ID
          const noteResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/notes/${item.note}/`, { headers });
          fullItem.note_details = noteResponse.data; // Store full note object
          // Also fetch place details if available from the note
          if (fullItem.note_details.place) {
            const placeResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/places/${fullItem.note_details.place}/`, { headers });
            fullItem.place_details = placeResponse.data; // Store full place object
          }
        }
      }
      setSelectedItem(fullItem);
    } catch (err) {
      console.error('Error fetching popup details:', err.response?.data || err.message);
      setPopupError('Не удалось загрузить подробности. Ошибка: ' + (err.response?.statusText || err.message));
      setSelectedItem(null); // Clear selected item if error
    } finally {
      setLoadingPopupData(false);
    }
  };

  const closePopup = () => {
    setSelectedItem(null);
    setPopupError(null);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>Загрузка...</div>;
  if (error) return <div style={{ color: 'red', textAlign: 'center', padding: '20px' }}>{error}</div>;
  if (!isLoggedIn || !isModeratorOrAdmin) return null; // Render nothing if not authorized

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
                <small>Автор: {item.user.username} ({item.user.is_superuser ? 'Admin' : item.user.groups.some(group => group.name === 'Moderators') ? 'Модератор' : 'Пользователь'})</small>
                <br />
                <small>Размещено: {new Date(item.created_at).toLocaleString()}</small>
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
            <h3>Просмотр: {selectedItem.type === 'place' ? 'Место' : selectedItem.type === 'note' ? 'Заметка' : 'Комментарий'}</h3>
            {loadingPopupData ? (
              <p style={{ textAlign: 'center' }}>Загрузка подробностей...</p>
            ) : popupError ? (
              <p style={{ color: 'red', textAlign: 'center' }}>{popupError}</p>
            ) : (
              <>
                {/* Общие поля для всех типов в модальном окне */}
                <p><strong>Автор:</strong> {selectedItem.user.username} ({selectedItem.user.is_superuser ? 'Admin' : selectedItem.user.groups.some(group => group.name === 'Moderators') ? 'Модератор' : 'Пользователь'})</p>
                <p><strong>Размещено:</strong> {new Date(selectedItem.created_at).toLocaleString()}</p>

                {/* Подробности для Места */}
                {selectedItem.type === 'place' && (
                  <>
                    <p><strong>Название:</strong> {selectedItem.properties?.name || selectedItem.name}</p>
                    {selectedItem.properties?.description && (
                      <p><strong>Описание:</strong> {selectedItem.properties.description}</p>
                    )}
                  </>
                )}

                {/* Подробности для Заметки */}
                {selectedItem.type === 'note' && (
                  <>
                    {selectedItem.place_details && (
                      <>
                        <p><strong>Место:</strong> {selectedItem.place_details.properties?.name || selectedItem.place_details.name}</p>
                        <p><strong>Автор места:</strong> {selectedItem.place_details.properties?.owner?.username || selectedItem.place_details.owner?.username || 'Неизвестно'}</p>
                        {selectedItem.place_details.properties?.description && (
                          <p><strong>Описание места:</strong> {selectedItem.place_details.properties.description}</p>
                        )}
                      </>
                    )}
                    <p><strong>Текст заметки:</strong> {selectedItem.text}</p>
                  </>
                )}

                {/* Подробности для Комментария */}
                {selectedItem.type === 'comment' && (
                  <>
                    {selectedItem.note_details && (
                      <>
                        {selectedItem.place_details && (
                          <p><strong>Место:</strong> {selectedItem.place_details.properties?.name || selectedItem.place_details.name}</p>
                        )}
                        <p><strong>Текст заметки:</strong> {selectedItem.note_details.text}</p>
                        <p><strong>Автор заметки:</strong> {selectedItem.note_details.user?.username || 'Неизвестно'}</p>
                      </>
                    )}
                    {/* Исправлено: Отображаем текст комментария из selectedItem.text */}
                    <p><strong>Текст комментария:</strong> {selectedItem.text}</p>
                  </>
                )}
              </>
            )}
            <div className="modal-actions">
              <button onClick={() => handleModeration(selectedItem.id, selectedItem.type, 'approve')} style={{ backgroundColor: '#28a745', color: 'white' }} disabled={loadingPopupData}>Одобрить</button>
              <button onClick={() => handleModeration(selectedItem.id, selectedItem.type, 'reject')} style={{ backgroundColor: '#dc3545', color: 'white', marginLeft: '10px' }} disabled={loadingPopupData}>Отклонить</button>
              <button onClick={closePopup} style={{ backgroundColor: '#6c757d', color: 'white', marginLeft: '10px' }}>Закрыть</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ModerationPage;

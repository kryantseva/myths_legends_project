// frontend/myths_legends_app/src/pages/ModerationPage.js
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '../components/AuthContext';
import axios from 'axios';
import './ModerationPage.css'; // Убедитесь, что этот файл существует и содержит стили
import { FaCheckCircle, FaTimesCircle, FaUser, FaMapMarkedAlt, FaStickyNote, FaCommentDots, FaClock } from 'react-icons/fa';

// --- Lightbox для предпросмотра изображений ---
function ImageLightbox({ src, alt, onClose }) {
  if (!src) return null;
  return (
    <div style={{ position: 'fixed', zIndex: 9999, top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <img src={src} alt={alt} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, boxShadow: '0 4px 32px #0008' }} onClick={e => e.stopPropagation()} />
      <button onClick={onClose} style={{ position: 'fixed', top: 30, right: 40, fontSize: 36, color: '#fff', background: 'none', border: 'none', cursor: 'pointer', zIndex: 10000 }}>×</button>
    </div>
  );
}

function ModerationPage() {
  const { isLoggedIn, currentUser, isModeratorOrAdmin } = useAuth();
  const [pendingItems, setPendingItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loadingPopupData, setLoadingPopupData] = useState(false);
  const [popupError, setPopupError] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [placesById, setPlacesById] = useState({});

  const fetchPendingItems = async () => {
    try {
      const headers = { Authorization: `Token ${localStorage.getItem('authToken')}` };
      const [placesResponse, notesResponse, commentsResponse] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/places/?moderation_status=pending`, { headers }),
        axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/notes/?moderation_status=pending`, { headers }),
        axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/comments/?moderation_status=pending`, { headers }),
      ]);
      const places = placesResponse.data.features || placesResponse.data.results || [];
      const notesRaw = notesResponse.data.results || notesResponse.data || [];
      const commentsRaw = commentsResponse.data.results || commentsResponse.data || [];
      // --- Массовая загрузка мест для заметок и комментариев ---
      const extractPlaceId = (item) => {
        if (!item) return null;
        if (item.place && typeof item.place === 'object' && item.place !== null && 'id' in item.place) return item.place.id;
        if (typeof item.place === 'number' || typeof item.place === 'string') return item.place;
        return item.place_id || null;
      };
      const notePlaceIds = notesRaw.map(extractPlaceId).filter(Boolean);
      const commentPlaceIds = commentsRaw.map(extractPlaceId).filter(Boolean);
      const allPlaceIds = Array.from(new Set([...notePlaceIds, ...commentPlaceIds]));
      console.log('[MODERATION] notePlaceIds:', notePlaceIds);
      console.log('[MODERATION] commentPlaceIds:', commentPlaceIds);
      console.log('[MODERATION] allPlaceIds:', allPlaceIds);
      let placesByIdObj = {};
      if (allPlaceIds.length > 0) {
        const placesByIdResp = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/places/?id__in=${allPlaceIds.join(',')}`, { headers });
        const placesArr = placesByIdResp.data.features || placesByIdResp.data.results || placesByIdResp.data;
        console.log('[MODERATION] placesArr from API:', JSON.stringify(placesArr, null, 2));
        (Array.isArray(placesArr) ? placesArr : []).forEach(p => {
          const key = String(p.id);
          const name = p.properties?.name;
          if (name) placesByIdObj[key] = name;
        });
      }
      console.log('[MODERATION] placesByIdObj:', JSON.stringify(placesByIdObj, null, 2));
      setPlacesById(placesByIdObj);
      // ... остальной код формирования allItems ...
      const notes = notesRaw.map(item => ({
        ...item,
        type: 'note',
        user: {
          ...item.user,
          username: item.user?.username || 'Unknown',
          is_superuser: item.user?.is_superuser || false,
          groups: item.user?.groups || []
        },
        created_at: item.created_at || 'N/A',
        placeId: item.place ? String(extractPlaceId(item)) : null
      }));
      const comments = commentsRaw.map(item => ({
        ...item,
        type: 'comment',
        user: {
          ...item.user,
          username: item.user?.username || 'Unknown',
          is_superuser: item.user?.is_superuser || false,
          groups: item.user?.groups || []
        },
        created_at: item.created_at || 'N/A',
        placeId: item.place ? String(extractPlaceId(item)) : null
      }));
      const allItems = [
        ...places.map(item => ({
          ...item,
          type: 'place',
          name: item.properties?.name || item.name,
          images: item.properties?.images || item.images || [],
          user: {
            ...item.properties?.owner,
            username: item.properties?.owner?.username || item.owner?.username || 'Unknown',
            is_superuser: item.properties?.owner?.is_superuser || item.owner?.is_superuser || false,
            groups: item.properties?.owner?.groups || item.owner?.groups || []
          },
          created_at: item.properties?.created_at || item.created_at || 'N/A'
        })),
        ...notes,
        ...comments,
      ];
      allItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setPendingItems(allItems);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching pending items:', err.response?.data || err.message);
      setError('Не удалось загрузить данные для модерации. Проверьте подключение или обратитесь к администратору. Ошибка: ' + (err.response?.statusText || err.message));
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn || !isModeratorOrAdmin) {
      setError('Доступ запрещён. Только модераторы и администраторы могут просматривать эту страницу.');
      setLoading(false);
      return;
    }
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
      await axios.patch(url, {}, { headers });
      await fetchPendingItems();
      alert(`${type === 'place' ? 'Место' : type === 'note' ? 'Заметка' : 'Комментарий'} успешно ${action === 'approve' ? 'одобрено' : 'отклонено'}.`);
      setSelectedItem(null);
    } catch (err) {
      console.error('Error moderating item:', err.response?.data || err.message);
      alert('Ошибка при модерации. Попробуйте снова. Ошибка: ' + (err.response?.data?.detail || err.message));
    }
  };

  const openPopup = async (item) => {
    setLoadingPopupData(true);
    setPopupError(null);
    let fullItem = { ...item };
    try {
      if (item.type === 'note') {
        const noteResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/notes/${item.id}/`);
        fullItem.note_details = noteResponse.data;
        if (noteResponse.data.place) {
          const placeResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/places/${noteResponse.data.place}/`);
          fullItem.place_details = placeResponse.data;
        }
      } else if (item.type === 'comment') {
        if (item.place) {
          const placeResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/places/${item.place}/`);
          fullItem.place_details = placeResponse.data;
        }
      }
      setSelectedItem(fullItem);
    } catch (err) {
      console.error('Error fetching popup details:', err.response?.data || err.message);
      setPopupError('Не удалось загрузить подробности. Ошибка: ' + (err.response?.statusText || err.message));
      setSelectedItem(null);
    } finally {
      setLoadingPopupData(false);
    }
  };

  const closePopup = () => {
    setSelectedItem(null);
    setPopupError(null);
  };

  const handleRejectClick = (item) => {
    setSelectedItem(item);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async () => {
    if (!selectedItem) return;
    setRejectLoading(true);
    try {
      const headers = { Authorization: `Token ${localStorage.getItem('authToken')}` };
      let url;
      switch (selectedItem.type) {
        case 'place':
          url = `${process.env.REACT_APP_API_BASE_URL}/api/places/${selectedItem.id}/reject/`;
          break;
        case 'note':
          url = `${process.env.REACT_APP_API_BASE_URL}/api/notes/${selectedItem.id}/reject/`;
          break;
        case 'comment':
          url = `${process.env.REACT_APP_API_BASE_URL}/api/comments/${selectedItem.id}/reject/`;
          break;
        default:
          throw new Error('Неверный тип элемента');
      }
      await axios.patch(url, { rejection_reason: rejectReason }, { headers });
      await fetchPendingItems();
      setShowRejectModal(false);
      setSelectedItem(null);
      alert(`${selectedItem.type === 'place' ? 'Место' : selectedItem.type === 'note' ? 'Заметка' : 'Комментарий'} успешно отклонено.`);
    } catch (err) {
      alert('Ошибка при отклонении. Попробуйте снова. Ошибка: ' + (err.response?.data?.detail || err.message));
    } finally {
      setRejectLoading(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>Загрузка...</div>;
  if (error) return <div style={{ color: 'red', textAlign: 'center', padding: '20px' }}>{error}</div>;
  if (!isLoggedIn || !isModeratorOrAdmin) return null; // Render nothing if not authorized

  return (
    <div className="moderation-container" style={{ minHeight: '100vh', background: '#f7f8fa', padding: '32px 0', position: 'relative' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', background: '#fff', borderRadius: 18, boxShadow: '0 4px 32px #0002', padding: 36 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', fontWeight: 700, fontSize: 28, marginBottom: 24 }}><FaClock style={{ marginRight: 12, color: '#ff9800' }} /> Панель модерации</h2>
        {pendingItems.length === 0 ? (
          <p style={{ color: '#888', fontSize: 18, textAlign: 'center' }}>Нет элементов, требующих модерации.</p>
        ) : (
          <ul className="moderation-list" style={{ padding: 0, listStyle: 'none' }}>
            {pendingItems.map((item, idx) => (
              <li key={`${item.type}-${item.id}`} className="moderation-item" style={{ background: '#f9f9fb', borderRadius: 14, boxShadow: '0 2px 12px #0001', margin: '18px 0', padding: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Унифицированный заголовок */}
                <div style={{ fontWeight: 600, fontSize: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
                  {item.type === 'place' ? <FaMapMarkedAlt color="#007bff" /> : item.type === 'note' ? <FaStickyNote color="#43a047" /> : <FaCommentDots color="#ff9800" />}
                  <span style={{fontWeight: 700}}>{item.type === 'place' ? 'Место' : item.type === 'note' ? 'Заметка' : 'Комментарий'}:</span>
                </div>
                {/* Галерея изображений для мест */}
                {item.type === 'place' && Array.isArray(item.images) && item.images.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, margin: '8px 0', flexWrap: 'wrap' }}>
                    {item.images.map((img, idx) => (
                      <img key={idx} src={img.image || img.image_url} alt={`place-img-${idx}`} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', boxShadow: '0 2px 8px #0001' }} onClick={() => setLightboxImg(img.image || img.image_url)} />
                    ))}
                  </div>
                )}
                {/* Галерея изображений для заметок */}
                {item.type === 'note' && Array.isArray(item.images) && item.images.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, margin: '8px 0', flexWrap: 'wrap' }}>
                    {item.images.map((img, idx) => (
                      <img key={idx} src={img.image || img.image_url} alt={`note-img-${idx}`} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', boxShadow: '0 2px 8px #0001' }} onClick={() => setLightboxImg(img.image || img.image_url)} />
                    ))}
                  </div>
                )}
                {/* Основной текст заметки или комментария */}
                {item.type === 'note' && (
                  <span style={{ fontWeight: 400, fontSize: 16, margin: '6px 0 2px 0' }}>{item.text || item.content}</span>
                )}
                {item.type === 'comment' && (
                  <span style={{ fontWeight: 400, fontSize: 16, margin: '6px 0 2px 0' }}>{item.text || item.content}</span>
                )}
                {/* Описание и категории для мест */}
                {item.type === 'place' && (
                  <>
                    {item.properties?.description && <div style={{ color: '#444', fontSize: 15, margin: '6px 0 2px 0' }}><b>Описание:</b> {item.properties.description}</div>}
                    {item.properties?.categories && <div style={{ color: '#888', fontSize: 14, marginBottom: 4 }}><b>Категории:</b> {item.properties.categories}</div>}
                  </>
                )}
                {/* Для заметок и комментариев: к какому месту относятся */}
                {(item.type === 'note' || item.type === 'comment') && (
                  <div style={{ color: '#888', fontSize: 14, marginBottom: 2 }}>
                    {console.log('[MODERATION][RENDER] item.id:', item.id, 'item.placeId:', item.placeId, 'typeof:', typeof item.placeId, 'placesById keys:', Object.keys(placesById), 'result:', item.placeId && placesById[item.placeId] ? placesById[item.placeId] : 'Место удалено')}
                    Место: {item.placeId && placesById[item.placeId] ? placesById[item.placeId] : 'Место удалено'}
                  </div>
                )}
                {/* Визуальный разделитель */}
                <hr style={{ margin: '12px 0', border: 0, borderTop: '1px solid #e0e0e0' }} />
                <div style={{ color: '#888', fontSize: 15, marginBottom: 4 }}>
                  Автор: <FaUser style={{ marginRight: 4 }} />{item.user.username} ({item.user.is_superuser ? 'Admin' : item.user.groups.some(group => group.name === 'Moderators') ? 'Модератор' : 'Пользователь'})<br />
                  <span style={{ color: '#aaa' }}>Создано: {item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button onClick={() => handleModeration(item.id, item.type, 'approve')} style={{ background: '#43a047', color: 'white', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}><FaCheckCircle /> Одобрить</button>
                  <button onClick={() => handleRejectClick(item)} style={{ background: '#d32f2f', color: 'white', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}><FaTimesCircle /> Отклонить</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* Модалка отклонения */}
      {showRejectModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 4px 32px #0002', padding: 32, minWidth: 320, maxWidth: 400, width: '100%', position: 'relative' }}>
            <button onClick={() => setShowRejectModal(false)} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#888' }}>×</button>
            <h3 style={{ marginBottom: 18, fontWeight: 700, fontSize: 22, color: '#d32f2f' }}><FaTimesCircle style={{ marginRight: 8 }} /> Причина отклонения</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={4} style={{ width: '100%', borderRadius: 8, border: '1px solid #ccc', padding: 10, fontSize: 15, marginBottom: 18 }} placeholder="Опишите причину отклонения..." />
            <button onClick={handleRejectSubmit} disabled={rejectLoading || !rejectReason.trim()} style={{ width: '100%', padding: 10, background: '#d32f2f', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 17, cursor: 'pointer', opacity: rejectLoading || !rejectReason.trim() ? 0.7 : 1 }}>Отклонить</button>
          </div>
        </div>
      )}
      {/* Lightbox для предпросмотра изображений */}
      {lightboxImg && (
        <ImageLightbox src={lightboxImg} alt="Просмотр" onClose={() => setLightboxImg(null)} />
      )}
    </div>
  );
}

export default ModerationPage;

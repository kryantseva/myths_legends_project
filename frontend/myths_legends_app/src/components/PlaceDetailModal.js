import React from 'react';
import { useAuth } from './AuthContext';

function PlaceDetailModal({ place, onClose, onToggleFavorite, onAddNote, onEditNote, loading }) {
  const { isLoggedIn, currentUser } = useAuth();

  if (!place) {
    return null;
  }

  const isFavorited = place.is_favorited_by_current_user;
  const hasUserNote = place.current_user_note;

  const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  };

  const modalContentStyle = {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto',
    position: 'relative',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
  };

  const closeButtonStyle = {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#333',
  };

  const buttonStyle = {
    padding: '8px 15px',
    marginRight: '10px',
    marginTop: '15px',
    borderRadius: '5px',
    border: '1px solid #ccc',
    cursor: 'pointer',
    backgroundColor: '#007bff',
    color: 'white',
  };

  const favoriteButtonStyle = {
    ...buttonStyle,
    backgroundColor: isFavorited ? '#ff4d4f' : '#28a745',
  };

  const noteButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#6c757d',
  };

  if (loading) {
    return (
      <div style={modalOverlayStyle}>
        <div style={modalContentStyle}>
          <p>Загрузка деталей места...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        <button style={closeButtonStyle} onClick={onClose}>&times;</button>
        <h2>{place.name}</h2>
        {place.image && (
          <img
            src={place.image}
            alt={place.name}
            style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'cover', marginBottom: '15px' }}
          />
        )}
        <p><strong>Описание:</strong> {place.description}</p>
        <p><strong>Категории:</strong> {place.categories.map(cat => cat.name).join(', ')}</p>
        <p><strong>Рейтинг:</strong> {place.avg_rating ? place.avg_rating.toFixed(1) : 'Нет оценок'}</p>
        <p><strong>Количество заметок:</strong> {place.notes_count}</p>

        {isLoggedIn && (
          <>
            <button
              style={favoriteButtonStyle}
              onClick={() => onToggleFavorite(place.id)}
            >
              {isFavorited ? 'Удалить из избранного' : 'Добавить в избранное'}
            </button>

            {!hasUserNote ? (
              <button
                style={noteButtonStyle}
                onClick={() => onAddNote(place.id)}
              >
                Оставить заметку
              </button>
            ) : (
              <button
                style={noteButtonStyle}
                onClick={() => onEditNote(hasUserNote.id)}
              >
                Редактировать заметку
              </button>
            )}
          </>
        )}

        <h3>Заметки пользователей:</h3>
        {place.approved_notes && place.approved_notes.length > 0 ? (
          place.approved_notes.map(note => (
            <div key={note.id} style={{ border: '1px solid #eee', padding: '10px', marginBottom: '10px', borderRadius: '5px' }}>
              <p><strong>{note.author.username}:</strong> {note.text}</p>
              <p>Оценка: {note.rating || 'Нет'}</p>
              {note.image && (
                <img src={note.image} alt="Заметка" style={{ maxWidth: '100px', maxHeight: '100px', marginTop: '5px' }} />
              )}
              {note.approved_comments && note.approved_comments.length > 0 && (
                <div style={{ marginLeft: '15px', borderLeft: '2px solid #ddd', paddingLeft: '10px' }}>
                  <h4>Комментарии:</h4>
                  {note.approved_comments.map(comment => (
                    <p key={comment.id}><strong>{comment.author.username}:</strong> {comment.text}</p>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <p>Пока нет одобренных заметок для этого места.</p>
        )}
      </div>
    </div>
  );
}

export default PlaceDetailModal;
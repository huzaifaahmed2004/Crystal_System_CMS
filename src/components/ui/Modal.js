import React from 'react';
import '../../styles/modal.css';

function Modal({ open, title = 'Notice', children, onCancel, cancelText = 'Cancel' }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-panel">
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
        </div>
        <div className="modal-body">
          {children}
        </div>
        <div className="modal-footer">
          <button className="modal-btn" type="button" onClick={onCancel}>{cancelText}</button>
        </div>
      </div>
    </div>
  );
}

export default Modal;

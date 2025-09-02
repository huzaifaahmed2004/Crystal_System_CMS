import React from 'react';
import '../../styles/modal.css';

const ConfirmModal = ({ open, title = 'Confirm', message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, busy = false }) => {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-panel">
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
        </div>
        {message && <div className="modal-body">{message}</div>}
        <div className="modal-footer">
          <button className="secondary-btn" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
          <button className="primary-btn" onClick={onConfirm} disabled={busy} style={{ marginLeft: 8 }}>
            {busy ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

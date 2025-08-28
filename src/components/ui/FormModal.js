import React from 'react';
import '../../styles/modal.css';

// A modal variant for forms: no default footer button; allows custom footer.
function FormModal({ open, title = 'Modal', children, onCancel, footer = null }) {
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
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default FormModal;

import React, { useCallback, useRef, useState } from 'react';
import '../../styles/modal.css';
import '../../styles/file-import.css';

const ExcelImportModal = ({ open, onClose, onFileSelected, uploading = false, error = null }) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const onBrowseClick = () => inputRef.current?.click();

  const onInputChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) onFileSelected(file);
  };

  const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };

  const onDragEnter = (e) => { prevent(e); setDragActive(true); };
  const onDragOver = (e) => { prevent(e); setDragActive(true); };
  const onDragLeave = (e) => { prevent(e); setDragActive(false); };
  const onDrop = (e) => {
    prevent(e);
    setDragActive(false);
    const file = e.dataTransfer?.files && e.dataTransfer.files[0];
    if (file) onFileSelected(file);
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Import Excel</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          {error && (
            <div className="import-error">{String(error)}</div>
          )}
          <div
            className={`dropzone ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden-input"
              onChange={onInputChange}
            />
            <div className="dropzone-content">
              <div className="dz-icon" aria-hidden="true">📄</div>
              <div className="dz-title">Drag & drop your Excel file</div>
              <div className="dz-subtitle">or</div>
              <button className="dz-browse" type="button" onClick={onBrowseClick} disabled={uploading}>
                Browse files
              </button>
              <div className="dz-hint">Supported: .xlsx, .xls, .csv</div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="secondary-btn" onClick={onClose} disabled={uploading}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default ExcelImportModal;

import React, { useEffect, useRef, useState } from 'react';

// Lightweight contentEditable-based RTE to avoid extra deps
// value: HTML string
// onChange: (html) => void
const RichTextEditor = ({ label = 'Description', value, onChange, placeholder = 'Type here...', height = 220, readOnly = false }) => {
  const [showCode, setShowCode] = useState(false);
  const editorRef = useRef(null);

  useEffect(() => {
    if (!showCode && editorRef.current && typeof value === 'string') {
      // keep editor HTML in sync when external value changes
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value, showCode]);

  const exec = (cmd, arg = null) => {
    document.execCommand(cmd, false, arg);
    if (editorRef.current) {
      onChange?.(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    onChange?.(editorRef.current?.innerHTML || '');
  };

  return (
    <div className="form-group full-width">
      {label && <label>{label}</label>}
      {!readOnly && (
        <div className="rte-toolbar" style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
          <button type="button" className="secondary-btn sm" onClick={() => exec('bold')}>B</button>
          <button type="button" className="secondary-btn sm" onClick={() => exec('italic')}>I</button>
          <button type="button" className="secondary-btn sm" onClick={() => exec('underline')}>U</button>
          <button type="button" className="secondary-btn sm" onClick={() => exec('insertUnorderedList')}>• List</button>
          <button type="button" className="secondary-btn sm" onClick={() => exec('insertOrderedList')}>1. List</button>
          <button type="button" className="secondary-btn sm" onClick={() => exec('createLink', prompt('Enter URL', 'https://') || '')}>Link</button>
          <select className="secondary-btn sm" onChange={(e) => exec('fontSize', e.target.value)} defaultValue="3" style={{ padding: '4px 6px' }}>
            <option value="2">12px</option>
            <option value="3">14px</option>
            <option value="4">16px</option>
            <option value="5">18px</option>
            <option value="6">24px</option>
          </select>
          <input type="color" title="Text color" onChange={(e) => exec('foreColor', e.target.value)} />
          <button type="button" className="secondary-btn sm" onClick={() => setShowCode(s => !s)}>{showCode ? '</>' : '<>'}</button>
        </div>
      )}
      {readOnly ? (
        <div className="text-area" style={{ border: '1px solid #ddd', padding: 8, minHeight: height, borderRadius: 6 }}
          dangerouslySetInnerHTML={{ __html: value || '' }} />
      ) : showCode ? (
        <textarea
          className="text-area"
          style={{ width: '100%', height }}
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
        />
      ) : (
        <div
          ref={editorRef}
          className="text-area"
          style={{ border: '1px solid #ddd', padding: 8, minHeight: height, borderRadius: 6 }}
          contentEditable
          placeholder={placeholder}
          onInput={handleInput}
          suppressContentEditableWarning
        />
      )}
    </div>
  );
}
;

export default RichTextEditor;

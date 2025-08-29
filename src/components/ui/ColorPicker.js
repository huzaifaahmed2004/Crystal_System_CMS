import React, { useEffect, useMemo, useState } from 'react';

// Simple controlled color picker with hex input + native color input + Select button
// Props: value (#rrggbb), onChange(hex)
const ColorPicker = ({ label = 'Background Color', value = '#ffffff', onChange, disabled = false }) => {
  const [hex, setHex] = useState(value || '#ffffff');

  useEffect(() => {
    if (typeof value === 'string' && value.toLowerCase() !== hex.toLowerCase()) {
      setHex(value);
    }
  }, [value]);

  const isValidHex = useMemo(() => /^#?[0-9a-fA-F]{6}$/.test(hex || ''), [hex]);
  const normalized = useMemo(() => (hex?.startsWith('#') ? hex : `#${hex}`), [hex]);

  const commit = () => {
    if (!isValidHex) return;
    onChange?.(normalized.toLowerCase());
  };

  return (
    <div className="form-group">
      {label && <label>{label}</label>}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          className="input"
          style={{ flex: 1 }}
          value={hex}
          onChange={(e) => setHex(e.target.value.trim())}
          placeholder="#ffffff or ffffff"
          disabled={disabled}
        />
        {!disabled && (
          <>
            <input
              type="color"
              value={normalized}
              onChange={(e) => { setHex(e.target.value); onChange?.(e.target.value); }}
              title="Pick color"
            />
            <button type="button" className="secondary-btn" onClick={commit} disabled={!isValidHex}>
              Select
            </button>
          </>
        )}
        {/* Live swatch preview */}
        <span
          title={normalized}
          aria-label="Selected color preview"
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            border: '1px solid #cbd5e1',
            background: isValidHex ? normalized : '#ffffff',
            boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.6)'
          }}
        />
      </div>
      {!isValidHex && (
        <div className="input-hint" style={{ color: '#b91c1c', fontSize: 12, marginTop: 4 }}>
          Enter a valid 6-digit hex color (e.g., #ffaa00)
        </div>
      )}
    </div>
  );
};

export default ColorPicker;

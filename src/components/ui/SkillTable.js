import React, { useMemo, useState } from 'react';
import '../../styles/skills-table.css';

/**
 * SkillTable
 * - mode: 'view' | 'manage'  // manage = read-only cells but can delete
 * - skills: [{ name, level, skillDescription? }]
 * - levels: LEVELS mapping [{rank, name, description}]
 * - onDelete(index) // used in manage mode
 */
const SkillTable = ({ mode = 'view', skills = [], levels = [], onDelete }) => {

  const levelByName = useMemo(() => {
    const m = {};
    levels.forEach(l => { m[l.name] = l; });
    return m;
  }, [levels]);

  return (
    <div className="skills-table-wrapper">
      <table className="skills-table">
        <thead>
          <tr>
            <th style={{ width: '28%' }}>Skill</th>
            <th style={{ width: '25%' }}>Skill Description</th>
            <th style={{ width: '16%' }}>Level Name</th>
            <th style={{ width: '10%' }}>Level Rank</th>
            <th>Level Description</th>
            {mode === 'manage' && <th style={{ width: 100, textAlign: 'right' }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {!skills || skills.length === 0 ? (
            <tr>
              <td colSpan={mode === 'manage' ? 6 : 5} style={{ textAlign: 'left' }}>
                <div className="no-results" style={{ margin: 0 }}>No skills {mode !== 'view' ? 'added yet' : 'assigned'}</div>
              </td>
            </tr>
          ) : (
            skills.map((s, idx) => {
              const lv = levelByName[s.level] || null;
              return (
                <tr key={`${s.name}-${idx}`}>
                  <td>
                    <span>{s.name || '-'}</span>
                  </td>
                  <td className="wrap">
                    <span>{s.skillDescription || '-'}</span>
                  </td>
                  <td>
                    <span>{s.level || '-'}</span>
                  </td>
                  <td>
                    <span>{lv?.rank != null ? lv.rank : '-'}</span>
                  </td>
                  <td className="wrap">
                    <span>{lv?.description || ''}</span>
                  </td>
                  {mode === 'manage' && (
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" className="danger-btn sm" onClick={() => onDelete && onDelete(idx)}>Delete</button>
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default SkillTable;

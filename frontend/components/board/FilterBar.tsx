'use client';
import { useState } from 'react';
import { useStore } from '../../store';

interface Filters {
  label_id?: number;
  member_id?: number;
  due_date?: string;
}

interface Props {
  filters: Filters;
  onFilter: (f: Filters) => void;
}

export default function FilterBar({ filters, onFilter }: Props) {
  const { labels, users } = useStore();
  const [show, setShow] = useState(false);
  const hasFilters = !!(filters.label_id || filters.member_id || filters.due_date);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)',
      background: 'rgba(0,0,0,0.12)',
      position: 'relative',
      flexShrink: 0,
    }}>
      <button
        onClick={() => setShow(!show)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', borderRadius: 4,
          background: hasFilters ? 'rgba(87,157,255,0.2)' : 'rgba(255,255,255,0.1)',
          color: hasFilters ? 'var(--text-link)' : 'white',
          fontSize: 13, fontWeight: 500,
          border: hasFilters ? '1px solid rgba(87,157,255,0.4)' : '1px solid transparent',
          transition: 'all 0.15s',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
        </svg>
        Filter
        {hasFilters && <span style={{ background: 'var(--bg-btn)', color: 'var(--bg-primary)', borderRadius: '50%', width: 16, height: 16, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>!</span>}
      </button>

      {hasFilters && (
        <button
          onClick={() => onFilter({})}
          style={{
            color: 'rgba(255,255,255,0.7)', fontSize: 12,
            padding: '4px 8px', borderRadius: 4,
            background: 'rgba(255,255,255,0.08)',
          }}
          className="btn-ghost"
        >
          Clear filters
        </button>
      )}

      {/* Active filter chips */}
      {filters.label_id && (
        <FilterChip
          label={labels.find(l => l.id === filters.label_id)?.name || 'Label'}
          color={labels.find(l => l.id === filters.label_id)?.color_code}
          onRemove={() => onFilter({ ...filters, label_id: undefined })}
        />
      )}
      {filters.member_id && (
        <FilterChip
          label={users.find(u => u.id === filters.member_id)?.name || 'Member'}
          onRemove={() => onFilter({ ...filters, member_id: undefined })}
        />
      )}
      {filters.due_date && (
        <FilterChip
          label={`Due before ${filters.due_date}`}
          onRemove={() => onFilter({ ...filters, due_date: undefined })}
        />
      )}

      {show && (
        <div className="popup" style={{
          position: 'absolute', top: '100%', left: 12, zIndex: 100,
          width: 280, padding: 12, marginTop: 4,
        }}>
          <div className="section-title" style={{ marginBottom: 8 }}>Filter by Label</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {labels.map(l => (
              <button
                key={l.id}
                onClick={() => {
                  onFilter({ ...filters, label_id: filters.label_id === l.id ? undefined : l.id });
                  setShow(false);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 4,
                  background: filters.label_id === l.id ? l.color_code : 'rgba(255,255,255,0.08)',
                  color: filters.label_id === l.id ? 'white' : 'var(--text-primary)',
                  border: `1px solid ${l.color_code}40`,
                  fontSize: 12, fontWeight: 500,
                  transition: 'all 0.1s',
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color_code, flexShrink: 0 }} />
                {l.name}
              </button>
            ))}
          </div>
          <div className="section-title" style={{ marginBottom: 8 }}>Filter by Member</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
            {users.map(u => (
              <button
                key={u.id}
                onClick={() => {
                  onFilter({ ...filters, member_id: filters.member_id === u.id ? undefined : u.id });
                  setShow(false);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 8px', borderRadius: 4,
                  background: filters.member_id === u.id ? 'var(--bg-hover)' : 'transparent',
                  color: 'var(--text-primary)',
                  transition: 'background 0.1s',
                }}
                className="btn-ghost"
              >
                <div className="avatar avatar-sm">{u.name[0]}</div>
                <span style={{ fontSize: 13 }}>{u.name}</span>
              </button>
            ))}
          </div>
          <div className="section-title" style={{ marginBottom: 8 }}>Filter by Due Date</div>
          <input
            type="date"
            value={filters.due_date || ''}
            onChange={e => { onFilter({ ...filters, due_date: e.target.value || undefined }); setShow(false); }}
            style={{ width: '100%', padding: '6px 8px', borderRadius: 4 }}
          />
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, color, onRemove }: { label: string; color?: string; onRemove: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      background: 'rgba(87,157,255,0.15)', borderRadius: 4,
      padding: '2px 6px 2px 8px',
      fontSize: 12, color: 'var(--text-link)',
      border: '1px solid rgba(87,157,255,0.3)',
    }}>
      {color && <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />}
      {label}
      <button onClick={onRemove} style={{ color: 'currentColor', marginLeft: 2, padding: '0 2px', fontSize: 14 }}>×</button>
    </div>
  );
}
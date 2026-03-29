// frontend/components/board/FilterBar.tsx
'use client';
import { useStore } from '../../store';

/**
 * FilterBar Component
 * Displays active filters directly below the main Header.
 * Connects to the global Zustand store to read/write filter states.
 */
export default function FilterBar() {
  const { labels = [], users = [], filters, setFilters } = useStore() as any;
  const hasFilters = !!(filters.label_id || filters.member_id || filters.due_date);

  // Don't render at all when no filters are active
  if (!hasFilters) return null;

  const activeLabel  = labels.find((l: any) => l.id === filters.label_id);
  const activeMember = users.find((u: any)  => u.id === filters.member_id);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '5px 14px',
      background: 'rgba(0,0,0,0.22)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      flexShrink: 0,
      flexWrap: 'wrap',
      minHeight: 34,
    }}>
      <span style={{
        fontSize: 11, color: '#8a9bb0', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0,
      }}>
        Filtering:
      </span>

      {activeLabel && (
        <Chip
          color={activeLabel.color_code}
          label={activeLabel.name}
          onRemove={() => setFilters({ ...filters, label_id: undefined })}
        />
      )}

      {activeMember && (
        <Chip
          label={activeMember.name}
          icon={
            <div style={{
              width: 14, height: 14, borderRadius: '50%',
              background: '#0c66e4', color: 'white',
              fontWeight: 700, fontSize: 9,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {activeMember.name[0].toUpperCase()}
            </div>
          }
          onRemove={() => setFilters({ ...filters, member_id: undefined })}
        />
      )}

      {filters.due_date && (
        <Chip
          label={`Due before ${new Date(filters.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
          icon={
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#7dc0ff" strokeWidth="2.5">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
          onRemove={() => setFilters({ ...filters, due_date: undefined })}
        />
      )}

      <button
        onClick={() => setFilters({})}
        style={{
          padding: '3px 10px', borderRadius: 5,
          background: 'rgba(248,113,104,0.13)',
          color: '#f87168',
          border: '1px solid rgba(248,113,104,0.28)',
          fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
          transition: 'background 0.12s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,104,0.22)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(248,113,104,0.13)'}
      >
        Clear all
      </button>
    </div>
  );
}

function Chip({ label, color, icon, onRemove }: {
  label: string;
  color?: string;
  icon?: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      background: 'rgba(87,157,255,0.13)',
      borderRadius: 5, padding: '3px 5px 3px 8px',
      fontSize: 12, color: '#7dc0ff',
      border: '1px solid rgba(87,157,255,0.28)',
      flexShrink: 0,
    }}>
      {color && <span style={{ width: 9, height: 9, borderRadius: 2, background: color, flexShrink: 0 }} />}
      {icon && icon}
      <span style={{ fontWeight: 500 }}>{label}</span>
      <button
        onClick={onRemove}
        style={{
          color: 'rgba(87,157,255,0.7)', background: 'none', border: 'none',
          cursor: 'pointer', padding: '0 3px', fontSize: 14, lineHeight: 1,
          display: 'flex', alignItems: 'center', transition: 'color 0.12s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#7dc0ff'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(87,157,255,0.7)'}
      >×</button>
    </div>
  );
}
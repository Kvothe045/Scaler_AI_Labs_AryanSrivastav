// frontend/components/board/PermissionToast.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store';

/** Parses the backend detail string into a user-friendly role name */
function parseRole(detail: string): string {
  const m = detail.match(/You are a '(\w+)'/i);
  return m ? m[1].charAt(0).toUpperCase() + m[1].slice(1) : 'Viewer';
}

/** Extracts what roles CAN do this action */
function parseRequired(detail: string): string {
  const m = detail.match(/requires one of these roles:\s*\[([^\]]+)\]/i);
  if (!m) return 'Owner or Editor';
  return m[1]
    .split(',')
    .map(s => s.replace(/['"]/g, '').trim())
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' or ');
}

const ROLE_ICON: Record<string, string> = {
  viewer: '👁️',
  editor: '✏️',
  owner:  '👑',
};

const DURATION_MS = 4500;

export default function PermissionToast() {
  const { permissionError, setPermissionError } = useStore();
  const [visible,  setVisible]  = useState(false);
  const [exiting,  setExiting]  = useState(false);
  const [progress, setProgress] = useState(100);

  const timerRef    = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const rafRef      = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const startRef    = useRef<number>(0);
  const pausedRef   = useRef(false);
  const elapsedRef  = useRef(0);

  const dismiss = () => {
    setExiting(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (rafRef.current)   cancelAnimationFrame(rafRef.current);
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
      setProgress(100);
      elapsedRef.current = 0;
      setPermissionError(null);
    }, 320);
  };

  const startProgress = (fromElapsed = 0) => {
    startRef.current = performance.now() - fromElapsed;

    const tick = () => {
      if (pausedRef.current) return;
      const elapsed = performance.now() - startRef.current;
      const pct = Math.max(0, 100 - (elapsed / DURATION_MS) * 100);
      setProgress(pct);
      elapsedRef.current = elapsed;
      if (elapsed < DURATION_MS) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    timerRef.current = setTimeout(dismiss, DURATION_MS - fromElapsed);
  };

  useEffect(() => {
    if (!permissionError) return;

    // Reset & show
    if (timerRef.current) clearTimeout(timerRef.current);
    if (rafRef.current)   cancelAnimationFrame(rafRef.current);
    elapsedRef.current = 0;
    setProgress(100);
    setExiting(false);
    setVisible(true);
    startProgress(0);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current)   cancelAnimationFrame(rafRef.current);
    };
  }, [permissionError]);

  const handleMouseEnter = () => {
    pausedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (rafRef.current)   cancelAnimationFrame(rafRef.current);
  };

  const handleMouseLeave = () => {
    pausedRef.current = false;
    startProgress(elapsedRef.current);
  };

  if (!visible || !permissionError) return null;

  const role     = parseRole(permissionError);
  const required = parseRequired(permissionError);
  const roleKey  = role.toLowerCase();
  const icon     = ROLE_ICON[roleKey] || '🔒';

  return (
    <>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        @keyframes toast-out {
          from { opacity: 1; transform: translateY(0)   scale(1);    }
          to   { opacity: 0; transform: translateY(16px) scale(0.96); }
        }
        .ptoa-wrap {
          position: fixed;
          bottom: 28px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          animation: toast-in 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards;
          pointer-events: auto;
        }
        .ptoa-wrap.out {
          animation: toast-out 0.28s ease-in forwards;
        }
        .ptoa-card {
          position: relative;
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 14px 16px 18px;
          border-radius: 14px;
          background: #1e2328;
          border: 1px solid rgba(248,113,104,0.35);
          box-shadow:
            0 0 0 1px rgba(248,113,104,0.1),
            0 8px 32px rgba(0,0,0,0.6),
            0 2px 8px rgba(0,0,0,0.4),
            inset 0 1px 0 rgba(255,255,255,0.04);
          min-width: 300px;
          max-width: min(420px, calc(100vw - 32px));
          overflow: hidden;
        }
        .ptoa-icon-wrap {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: rgba(248,113,104,0.12);
          border: 1px solid rgba(248,113,104,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }
        .ptoa-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          border-radius: 0 2px 0 14px;
          background: linear-gradient(90deg, #f87168, #ff9c8f);
          transition: width 0.1s linear;
        }
        .ptoa-close {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 22px;
          height: 22px;
          border-radius: 6px;
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.35);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: background 0.15s, color 0.15s;
          line-height: 1;
        }
        .ptoa-close:hover {
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.7);
        }
      `}</style>

      <div
        className={`ptoa-wrap${exiting ? ' out' : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role="alert"
        aria-live="assertive"
      >
        <div className="ptoa-card">
          {/* Icon */}
          <div className="ptoa-icon-wrap">
            {icon}
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0, paddingRight: 20 }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: '#f87168',
              letterSpacing: '0.01em', marginBottom: 4,
            }}>
              Permission denied
            </div>
            <div style={{ fontSize: 13, color: '#c8d0d9', lineHeight: 1.5 }}>
              You're viewing this board as a{' '}
              <span style={{
                fontWeight: 700,
                color: '#ffab00',
                background: 'rgba(255,171,0,0.12)',
                padding: '1px 6px',
                borderRadius: 4,
              }}>
                {role}
              </span>
              . Only{' '}
              <span style={{ fontWeight: 600, color: '#9fadbc' }}>{required}</span>
              {' '}can make changes.
            </div>
          </div>

          {/* Close */}
          <button className="ptoa-close" onClick={dismiss} aria-label="Dismiss">×</button>

          {/* Progress bar */}
          <div className="ptoa-bar" style={{ width: `${progress}%` }}/>
        </div>
      </div>
    </>
  );
}
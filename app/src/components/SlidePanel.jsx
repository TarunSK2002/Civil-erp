import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * SlidePanel — Slides in from the right inside the <main> content area.
 * Height matches the content area, NOT the full viewport.
 * 
 * @param {boolean} isOpen - Whether the panel is visible
 * @param {function} onClose - Called when overlay or X is clicked
 * @param {string} title - Panel header title
 * @param {number} [width=480] - Panel width in px
 * @param {React.ReactNode} footer - Sticky footer content (buttons)
 * @param {React.ReactNode} children - Scrollable body content (form fields)
 */
const SlidePanel = ({ isOpen, onClose, title, width = 480, footer, children }) => {
  const panelRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      // Find the parent <main> and disable its scroll
      const main = panelRef.current?.closest('main');
      const previousOverflow = main?.style.overflow;
      const previousOverflowY = main?.style.overflowY;
      if (main) {
        main.style.overflow = 'hidden';
      }
      return () => {
        if (main) {
          main.style.overflow = previousOverflow || '';
          main.style.overflowY = previousOverflowY || 'auto';
        }
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="slide-panel-overlay" onClick={onClose} ref={panelRef}>
      <div
        className="slide-panel"
        style={{ width: `${width}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="slide-panel-header">
          <h2>{title}</h2>
          <button className="slide-panel-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="slide-panel-body">
          {children}
        </div>

        {/* Sticky Footer */}
        {footer && (
          <div className="slide-panel-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default SlidePanel;

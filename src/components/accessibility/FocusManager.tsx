import React, { useEffect, useRef } from 'react';

interface FocusManagerProps {
  autoFocusRef?: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}

/**
 * FocusManager sets initial focus to main heading or designated element
 * when a view mounts, providing seamless navigation for screen reader and keyboard users.
 */
export const FocusManager: React.FC<FocusManagerProps> = ({ autoFocusRef, children }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocusRef?.current) {
      autoFocusRef.current.focus();
    } else if (containerRef.current) {
      const heading = containerRef.current.querySelector<HTMLElement>('h1, [tabindex="0"]');
      if (heading) {
        heading.focus();
      }
    }
  }, [autoFocusRef]);

  return (
    <div ref={containerRef} tabIndex={-1} className="outline-none focus:outline-none w-full">
      {children}
    </div>
  );
};

import React from 'react';

/**
 * ScreenReaderAnnouncer ensures assistive technologies (NVDA, JAWS, VoiceOver, TalkBack)
 * receive immediate, unambiguous spoken announcements whenever UI state changes.
 */
export const ScreenReaderAnnouncer: React.FC = () => {
  return (
    <div className="sr-only" aria-hidden="false">
      <div
        id="sr-announcer-assertive"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      />
      <div
        id="sr-announcer-polite"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />
    </div>
  );
};

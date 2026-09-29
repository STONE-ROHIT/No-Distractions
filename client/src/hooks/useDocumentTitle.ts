import { useEffect } from 'react';

const SITE_NAME = 'No Distractions';
const DEFAULT_TITLE = `${SITE_NAME} | Learn from YouTube. Without the distractions.`;

/**
 * Keeps the browser tab / history entry / screen-reader page name in step
 * with the current page. In a single-page app the document is never
 * reloaded, so nothing else updates it when the route changes.
 */
export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  }, [title]);
}

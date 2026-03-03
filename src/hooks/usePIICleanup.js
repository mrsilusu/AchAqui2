import { useEffect } from 'react';

export function usePIICleanup(cleanup) {
  useEffect(() => {
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, [cleanup]);
}

export default usePIICleanup;

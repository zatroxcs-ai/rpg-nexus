import { useEffect, useRef } from 'react';
import websocketService from '../services/websocket';

export default function useDataSync(dataType, callback) {
  // Garde toujours la dernière version du callback sans re-subscribe
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (!dataType) return;

    const stableHandler = (...args) => callbackRef.current?.(...args);

    const unsub = websocketService.onDataChanged(dataType, stableHandler);
    return unsub;
  }, [dataType]); // ← plus de dépendance sur callback
}

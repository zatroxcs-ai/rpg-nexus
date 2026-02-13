import { useEffect } from 'react';
import websocketService from '../services/websocket';

export default function useDataSync(dataType, callback) {
  useEffect(() => {
    if (!dataType || !callback) return;
    const unsub = websocketService.onDataChanged(dataType, callback);
    return unsub;
  }, [dataType, callback]);
}

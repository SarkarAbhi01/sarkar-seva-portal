import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { getAccessToken } from '../api/client';

// Connects to the Socket.IO server once an access token is available and
// shows a toast whenever a new order arrives or an order is reassigned.
export function useAdminSocket(onNewOrder) {
  const socketRef = useRef(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return undefined;

    const socket = io('/', { auth: { token }, path: '/socket.io' });
    socketRef.current = socket;

    socket.on('new_order', (payload) => {
      toast.success(`New order: ${payload.serviceTitle} (${payload.orderNumber})`);
      onNewOrder?.(payload);
    });

    socket.on('order_reassigned', (payload) => {
      toast(`Order ${payload.orderNumber} was reassigned to you.`, { icon: '📦' });
      onNewOrder?.(payload);
    });

    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAccessToken()]);

  return socketRef;
}

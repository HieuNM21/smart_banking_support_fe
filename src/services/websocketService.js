/* eslint-disable no-unused-vars */
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export const createStompClient = (onConnect, onUpdate, onAlert) => {
  const client = new Client({
    webSocketFactory: () => new SockJS('http://10.2.22.54:8080/ws'),
    reconnectDelay: 5000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
  });

  client.onConnect = (frame) => {
    console.log('Connected to WebSocket');
    onConnect();

    // Subscribe nhận update table
    client.subscribe('/topic/admin/updates', (message) => {
      onUpdate(JSON.parse(message.body));
    });

    // Subscribe nhận cảnh báo khẩn cấp
    client.subscribe('/topic/admin/alerts', (message) => {
      onAlert(JSON.parse(message.body));
    });
  };

  client.onStompError = (frame) => {
    console.error('STOMP error', frame.headers['message']);
  };

  return client;
};
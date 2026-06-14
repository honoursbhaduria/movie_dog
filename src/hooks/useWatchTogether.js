import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { account } from '../appwrite';

const getWsUrl = () => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  return `http://${window.location.hostname}:8080`;
};

export const useWatchTogether = (roomId, onStateChange = null, initialMetadata = null) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [userName, setUserName] = useState('Anonymous');
  const [roomTime, setRoomTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ownerName, setOwnerName] = useState('Owner');
  const [isOwner, setIsOwner] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('creator') === '1';
  });
  
  const [lastSyncAt, setLastSyncAt] = useState(Date.now());
  const creatorHintRef = useRef(new URLSearchParams(window.location.search).get('creator') === '1');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const nameFromUrl = urlParams.get('name');

    if (nameFromUrl) {
      setUserName(decodeURIComponent(nameFromUrl));
    } else if (account) {
      account.get().then(user => {
        setUserName(user.name || 'User');
      }).catch(() => {
        setUserName(`Guest_${Math.floor(Math.random() * 1000)}`);
      });
    } else {
      setUserName(`Guest_${Math.floor(Math.random() * 1000)}`);
    }
  }, []);

  useEffect(() => {
    if (!roomId || !userName) return;

    const newSocket = io(getWsUrl(), { transports: ['websocket'] });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join-room', { roomId, name: userName, metadata: initialMetadata });
    });

    newSocket.on('room-sync', ({ playing, time, isOwner: ownerStatus, ownerName: oName }) => {
      setRoomTime(time);
      setIsPlaying(playing);
      setIsOwner(ownerStatus || creatorHintRef.current);
      setLastSyncAt(Date.now());
      if (oName) setOwnerName(oName);
    });

    newSocket.on('chat-message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    newSocket.on('user-list', (userList) => {
      setUsers(userList);
    });

    return () => newSocket.close();
  }, [roomId, userName]);

  const updateName = (newName) => {
    if (!socket || !newName.trim()) return;
    setUserName(newName);
    socket.emit('update-name', { roomId, name: newName });
  };

  const syncPlayback = (time, playing) => {
    if (!socket || !isOwner) return;
    socket.emit('sync-playback', { roomId, time, playing });
  };

  const sendMessage = (text) => {
    if (!socket || !text.trim()) return;
    socket.emit('send-message', { roomId, text, name: userName });
  };

  return { 
    messages, 
    users, 
    roomTime, 
    isPlaying, 
    isOwner, 
    ownerName, 
    lastSyncAt, 
    sendMessage, 
    updateName, 
    syncPlayback, 
    userName 
  };
};

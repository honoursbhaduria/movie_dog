import { Server } from "socket.io";
import http from "http";

const server = http.createServer();
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

/* ──────────────────────────────────────────────
   Room storage
   rooms: Map<roomId, {
     owner        : socketId,
     playing      : boolean,
     time         : number     – playback position in seconds,
     updatedAt    : number     – Date.now() when time was last set,
     metadata     : object     – { movieId, type },
     members      : Map<socketId, string>  – id → display name,
   }>
   ────────────────────────────────────────────── */
const rooms = new Map();

/** Compute the estimated playback position right now. */
function getCurrentTime(room) {
  if (room.playing) {
    return room.time + (Date.now() - room.updatedAt) / 1000;
  }
  return room.time;
}

/** Send the current room state to ONE socket. */
function sendSyncTo(socketId, room) {
  io.to(socketId).emit("room-sync", {
    playing: room.playing,
    time: getCurrentTime(room),
    isOwner: socketId === room.owner,
    ownerName: room.members.get(room.owner) || "Owner",
  });
}

/** Broadcast room state to EVERY member in the room. */
function broadcastSync(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  for (const [memberId] of room.members) {
    sendSyncTo(memberId, room);
  }
}

/* ────────────────────── Socket events ────────────────────── */

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  /* ── Check if a room exists (used by JoinRoom page) ── */
  socket.on("check-room", (roomId) => {
    const room = rooms.get(roomId);
    socket.emit("room-exists", {
      exists: !!room,
      metadata: room?.metadata || null,
    });
  });

  /* ── Join (or create) a room ── */
  socket.on("join-room", ({ roomId, name, metadata = null }) => {
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        owner: socket.id,
        playing: false,
        time: 0,
        updatedAt: Date.now(),
        metadata: metadata || {},
        members: new Map(),
      });
    }

    const room = rooms.get(roomId);
    room.members.set(socket.id, name);

    // Send sync to the joining user
    sendSyncTo(socket.id, room);

    // Broadcast updated user list + system message
    io.to(roomId).emit("user-list", Array.from(room.members.values()));
    socket.to(roomId).emit("chat-message", {
      type: "system",
      text: `${name} joined the room`,
    });
  });

  /* ── Owner toggles play/pause ── */
  socket.on("sync-playback", ({ roomId, time, playing }) => {
    const room = rooms.get(roomId);
    if (!room || room.owner !== socket.id) return;   // only owner

    room.time = time;
    room.playing = playing;
    room.updatedAt = Date.now();

    broadcastSync(roomId);
  });

  /* ── Chat message (anyone can send) ── */
  socket.on("send-message", ({ roomId, text, name }) => {
    io.to(roomId).emit("chat-message", {
      type: "user",
      name,
      text,
      timestamp: Date.now(),
    });
  });

  /* ── Display-name change ── */
  socket.on("update-name", ({ roomId, name }) => {
    const room = rooms.get(roomId);
    if (!room || !name) return;

    const prev = room.members.get(socket.id);
    room.members.set(socket.id, name);
    io.to(roomId).emit("user-list", Array.from(room.members.values()));

    if (prev && prev !== name) {
      socket.to(roomId).emit("chat-message", {
        type: "system",
        text: `${prev} is now ${name}`,
      });
    }
  });

  /* ── Disconnect / cleanup ── */
  socket.on("disconnecting", () => {
    for (const roomId of socket.rooms) {
      if (!rooms.has(roomId)) continue;
      const room = rooms.get(roomId);
      const name = room.members.get(socket.id);
      if (!name) continue;

      room.members.delete(socket.id);

      if (room.owner === socket.id) {
        // Transfer ownership or destroy room
        const nextOwner = room.members.keys().next().value;
        if (nextOwner) {
          room.time = getCurrentTime(room);
          room.updatedAt = Date.now();
          room.owner = nextOwner;
          broadcastSync(roomId);
        } else {
          rooms.delete(roomId);
          continue;
        }
      }

      if (rooms.has(roomId)) {
        io.to(roomId).emit("user-list", Array.from(room.members.values()));
        socket.to(roomId).emit("chat-message", {
          type: "system",
          text: `${name} left the room`,
        });
      }
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Watch Together server running on port ${PORT}`);
});

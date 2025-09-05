//signaling server for  peer 2 peer connections
import express from 'express';
import http, { Server } from 'http';
import { WebSocketServer} from 'ws';
import { WebSocketWithId, WebSocket } from '../typings/ws'; // Import the extended WebSocket interface
import {v6 as uuidv6} from 'uuid';
import crypto from 'crypto';
import { join } from 'path';
import path from 'path';
import { fileURLToPath } from 'url';


const app = express();
const server = http.createServer(app);


const __dirname = fileURLToPath(new URL('.', import.meta.url));

// serve client static files (if not already)
app.use(express.static(path.join(__dirname, '..', 'public')));

// explicitly serve HLS assets
app.use('/hls', express.static(path.join(__dirname, 'public', 'hls'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    } else if (path.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/mp2t');
    }
  }
}));



const wss = new WebSocketServer({ server });
app.get('/', (req, res) => {
  res.send('WebSocket signaling server is running');
});


//manage new user joining rooms
  //each room have roomId and name
  let rooms: { [roomId: string]: { id: string; name: string }[] } = {}; 
   let socketToRoom: { [socketId: string]: number } = {}; //map to track which socket is in which room

wss.on('connection', (ws: WebSocket) => {

    const uuid = crypto.randomUUID(); // Generate a unique ID for the WebSocket connection
    (ws as WebSocketWithId).id = uuid // Assign a unique ID to the WebSocket connection
  console.log('New client connected', ws.id);

  ws.on('message', (message: WebSocket.data) => {
    console.log(`Received message: ${message}`);
    // Broadcast the message to all connected clients
    // wss.clients.for Each((client) => {
    //   if (client.readyState === WebSocket.OPEN) {
    //     client.send(message);
    //   }

    let parsedData:WebSocket.data;
    try {
      parsedData = JSON.parse(message.toString());
    } catch (err) {
      console.error('Invalid JSON:', err);
      return;
    }


      //handle logic if user joinroom
      const data = parsedData;
      const { type} = data;
      console.log(type);
      

      switch (type) {


        case "joinRoom":{
          const { roomId, name } = data;
          
              console.log(`User joining room: ${data.roomId} with name: ${data.name}`);
              if (!data.roomId || !data.name) {
                ws.send(JSON.stringify({ error: 'Room ID and name are required' }));
                return;
              }
          const roomIdNumber = parseInt(roomId, 10);
          
          // Check if the roomId is a valid number
          if (isNaN(roomIdNumber)) {
            ws.send(JSON.stringify({ error: 'Invalid room ID' }));
            return;
          }
          
          
           // check if the room exists, if not create and push the user
          if (!rooms[roomIdNumber] ) {
            rooms[roomIdNumber] = [{ id: ws.id, name }];
          }else {
            rooms[roomIdNumber].push({ id: ws.id, name });
          }
          //add the user to the socketToRoom map
          socketToRoom[ws.id] = roomIdNumber;
          
          
          
          // send a list of joined users to the new user
          const users = rooms[roomIdNumber].filter(user => user.id !== ws.id);
          ws.send(JSON.stringify({ type: 'room_users', users, wsId: ws.id }));
          
          //send the updated room information to the user
          const roomInfo = {
            roomId: roomIdNumber,
            users: rooms[roomIdNumber].map(user => ({ id: user.id, name: user.name })),
          };
          ws.send(JSON.stringify({
              type: 'roomInfo',
              roomInfo 
            }));
          console.log(`User ${name} joined room ${roomIdNumber}`);
          break;
        }
          
              
        default:
          break;
      }
    });

    ws.on('close', () => {
      const roomId = socketToRoom[ws.id];
      if (roomId !== undefined && rooms[roomId]) {
        // Remove the user
        rooms[roomId] = rooms[roomId].filter(user => user.id !== ws.id);
  
        // Notify others
        rooms[roomId].forEach(user => {
          const client = [...wss.clients].find(c => (c as WebSocket).id === user.id);
          if (client && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'user_left', id: ws.id }));
          }
        });
  
        // Clean up empty room
        if (rooms[roomId].length === 0) {
          delete rooms[roomId];
        }
  
        delete socketToRoom[ws.id];
      }
  
      console.log(`User ${ws.id} disconnected`);
    });
  });



// ---> change above code ws doesnit have custom handlers like joinRoom, offer, answer, candidate, disconnect



server.listen(3000, () => {
  console.log('Server is listening on port 3000');
});

//signaling server for  peer 2 peer connections
import express from 'express';
import { Server } from 'ws';
import http from 'http';
import WebSocket from 'ws';
import { WebSocketWithId } from '../typings/ws'; // Import the extended WebSocket interface
import {v6 as uuidv6} from 'uuid';
import crypto from 'crypto';
import { join } from 'path';



const app = express();
const server = http.createServer(app);

const wss = new Server({ server });
app.get('/', (req, res) => {
  res.send('WebSocket signaling server is running');
});


//manage new user joining rooms
  //each room have roomId and name
  let rooms: { [roomId: string]: { id: string; name: string }[] } = {}; 
   let socketToRoom: { [socketId: string]: number } = {}; //map to track which socket is in which room

wss.on('connection', (ws: WebSocketWithId) => {

    const uuid = crypto.randomUUID(); // Generate a unique ID for the WebSocket connection
    (ws as WebSocketWithId).id = uuid // Assign a unique ID to the WebSocket connection
  console.log('New client connected', ws.id);

  ws.on('message', (message) => {
    console.log(`Received message: ${message}`);
    // Broadcast the message to all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }


      //handle logic if user joinroom
      const data = JSON.parse(message.toString());
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
          ws.send(JSON.stringify({ type: 'room_users', users }));
          
          //send the updated room information to the user
          const roomInfo = {
            roomId: roomIdNumber,
            users: rooms[roomIdNumber].map(user => ({ id: user.id, name: user.name })),
          };
          ws.send(JSON.stringify({ type: 'roomInfo', roomInfo }));
          console.log(`User ${name} joined room ${roomIdNumber}`);
          break;
        }
          
        case "offer" :{
          const { roomId, offer } = data;
          const roomIdNumber = parseInt(roomId, 10);
          
          if (rooms[roomIdNumber]) {
          // Broadcast the offer to all clients in the room except the sender
          rooms[roomIdNumber].forEach(user => {
              if (user.id !== (ws as WebSocketWithId).id) {
              const client = Array.from(wss.clients)
              .find(client => 
                  (client as WebSocketWithId).id === user.id);
          
              if (client && client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify(
                      { 
                      type: 'offer', 
                      offer,
                      from: (ws as WebSocketWithId).id 
                  }));
              }
              }
          });
          }
          break;
        }
        case "answer": {



          const { roomId, answer } = data;
          const roomIdNumber = parseInt(roomId, 10);
          
          if (rooms[roomIdNumber]) {
            // Broadcast the answer to all clients in the room except the sender
            rooms[roomIdNumber].forEach(user => {
              if (user.id !== (ws as WebSocketWithId).id) {
                const client = Array.from(wss.clients)
                  .find(client => (client as WebSocketWithId).id === user.id);
          
                if (client && client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'answer',
                    answer,
                    from: (ws as WebSocketWithId).id
                  }));
                }
              }
            });
          }
          break;
        }
        case "candidate": {

          const { roomId, candidate } = data;
          const roomIdNumber = parseInt(roomId, 10);
          
          if (rooms[roomIdNumber]) {
            // Broadcast the ICE candidate to all clients in the room except the sender
            rooms[roomIdNumber].forEach(user => {
              if (user.id !== (ws as WebSocketWithId).id) {
                const client = Array.from(wss.clients)
                  .find(client => (client as WebSocketWithId).id === user.id);
          
                if (client && client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'candidate',
                    candidate,
                    from: (ws as WebSocketWithId).id
                  }));
                }
              }
            });
          }
          break;
        }
        case "disconnect": {

          const roomId = socketToRoom[ws.id];
          if (roomId && rooms[roomId]) {
            // Remove the user from the room
            rooms[roomId] = rooms[roomId].filter(user => user.id !== (ws as WebSocketWithId).id);
            
            // Notify other users in the room about the disconnection
            rooms[roomId].forEach(user => {
              const client = Array.from(wss.clients)
                .find(client => (client as WebSocketWithId).id === user.id);
              
              if (client && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'user_left', id: ws.id }));
              }
            });
          
            // Clean up if the room is empty
            if (rooms[roomId].length === 0) {
              delete rooms[roomId];
            }
          }
          console.log(`User ${ws.id} disconnected`);
          break;
          }
              
        default:
          break;
      }
    });
  });

})

// ---> change above code ws doesnit have custom handlers like joinRoom, offer, answer, candidate, disconnect



server.listen(3000, () => {
  console.log('Server is listening on port 3000');
});

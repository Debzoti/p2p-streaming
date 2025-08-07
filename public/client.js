const localVideo = document.getElementById("localVideo");
const button = document.getElementById("joinBtn");



//store variable of stream to send to the server
let localStream ={
    localStream: null,
};
let peerConnection;
let remoteStream = new MediaStream();
let ws;
const iceServers = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302" // Google's public STUN server
        },
        {
            urls: "turn:your.turn.server:3478", // Replace with your TURN server
            username: "your_username", // Replace with your TURN server username
            credential: "your_credential" // Replace with your TURN server credential
        }
    ]
};

//connect to the server by clicking button and send the roomId and name
button.addEventListener("click", () => {
    
  
    const roomId = document.getElementById("roomInput").value;
    const name = prompt("Enter your name:");

    if (!roomId || !name) {
        alert("Please enter a room ID and your name.");
        return;
    }


    button.disabled = true; // Disable the button after clicking
    button.textContent = "Joining...";
    
    
    //connect video stream to the server
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
        localStream.localStream = stream;
        localVideo.srcObject = stream;
        localVideo.play();
    })
    .catch((error) => {
        console.error("Error accessing media devices.", error);
    });

    //first connect your local stream to the server
    
    const ws = new WebSocket("ws://localhost:3000");
    
    ws.onopen = () => {
        console.log("WebSocket connection established");
        button.disabled = false; // Enable the button once connected
        button.textContent = "Join Room";
        ws.send(JSON.stringify({ type: "joinRoom", roomId, name }));
            
        };
        ws.onmessage = async (event) => {
            const data = JSON.parse(event.data);
           
            switch (data.type) {
                case "room_users":{
                    console.log("Room users:", data.users);
                    await setUpPeerConnections();
                    // Here you can handle the list of users in the room
                    if (data.users.length == 0) {
                        await createAndSendoffer();
                    } else {
                        // If there are users in the room, you can handle them accordingly
                        console.log("Users in the room:", data.users);
                    }   
                    break;
                }
                case "offer":{
                    break;
                }
                case "roomInfo":{
                    break;
                }
                case "answer":{
                    break;
                }
                case "iceCandidate":{
                    break;
                }
                default:
                    break;
            }
        
        
        
        }
        ws.onerror = (error) => {
            console.error("WebSocket error:", error);
        }
        ws.onclose = () => {
            console.log("WebSocket connection closed");
        }
        
})


async function setUpPeerConnections(){
     peerConnection = new RTCPeerConnection(iceServers);

     //add local streams
        localStream.localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream.localStream);
        });
    
        //handle ice candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                ws.send(JSON.stringify({
                    type: "iceCandidate",
                    candidate: event.candidate,
                }));
            }
        }

        // remote stream handling
        peerConnection.ontrack = (event) => {
            console.log("Remote track received");
            remoteStream.addTrack(event.track);
            const remoteVideo = document.getElementById("remoteVideo");
            remoteVideo.srcObject = remoteStream;
            remoteVideo.play();
        }
}

async function createAndSendoffer() {

}


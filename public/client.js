const localVideo = document.getElementById("localVideo");
const button = document.getElementById("joinBtn");

//first connect your local stream to the server

const ws = new WebSocket("ws://localhost:3000");

ws.onopen = () => {
    console.log("WebSocket connection established");
    button.disabled = false; // Enable the button once connected
    button.textContent = "Join Room";
    
};
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "joined") {
        console.log(`Joined room ${data.roomId} as ${data.name}`);
    } else if (data.type === "error") {
        console.error(data.message);
    }
}
ws.onerror = (error) => {
    console.error("WebSocket error:", error);
}
ws.onclose = () => {
    console.log("WebSocket connection closed");
}


//store variable of stream to send to the server
let localStream ={
    localStream: null,
};

//connect to the server by clicking button and send the roomId and name
button.addEventListener("click", () => {
    
    const roomId = document.getElementById("roomInput").value;
    const name = prompt("Enter your name:");
    button.disabled = true; // Disable the button after clicking
    button.textContent = "Joining...";
    
    
    //connect video stream to the server
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
        localStream.localStream = stream;
        localVideo.srcObject = stream;
        localVideo.play();

        ws.send(JSON.stringify({ type: "join", roomId, name }));
        })
        .catch((error) => {
            console.error("Error accessing media devices.", error);
        });
    
})
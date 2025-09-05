// import mediasoup ,
// {
//     Worker,
//     Router,
//     Producer,Consumer,RtpParameters,
//     WebRtcTransport,
// }from 'mediasoup/node/lib/types';

import { types as mediasoupTypes,createWorker } from "mediasoup";

import config from '../../config.json' ;
import {Config} from '../config' ;

let configData:Config = config as Config;

//media manager will handle all the media related tasks
//like creating worker, router, transport, producer, consumer
let worker:mediasoupTypes.Worker<mediasoupTypes.AppData>;
let router:mediasoupTypes.Router<mediasoupTypes.AppData>;
let transport:mediasoupTypes.WebRtcTransport;
let producer:mediasoupTypes.Producer<mediasoupTypes.AppData>;


//manage the producers transports in map for cleanup later
const transports:Map<string,mediasoupTypes.WebRtcTransport> = new Map();
const producers:Map<string,mediasoupTypes.Producer<mediasoupTypes.AppData>> = new Map();
const producerOwner:Map<string,string> = new Map(); //map producer id to socket id  
const peerTransport:Map<string,string> = new Map(); //map socket id to transport id


//initialize the media manager

async function initApp() {
    //set up worker which will cretae router and transport

    worker = await createWorker({
        rtcMinPort: configData.rtcMinPort,
        rtcMaxPort: configData.rtcMaxPort,
        logLevel: 'warn',
    })

    worker.on('died', () => {
        console.error('mediasoup worker died, exiting in 2 seconds... [pid:%d]', worker.pid);
        setTimeout(() => process.exit(1), 2000); // exit in 2 seconds
    });
        
    //create a router

    const mediaCodecs = [
        {
            kind: 'audio',
            mimeType: 'audio/opus',
            clockRate: 48000,
            channels: 2 ,
            preferredPayloadType: 100,
            parameters: {
                "x-google-start-bitrate": 1000,
                },
            rtcpFeedback: [
                { type: "nack" },
                { type: "ccm", parameter: "fir" },
                { type: "goog-remb" }
            ],
            
        }
    ]
    router  = await worker.createRouter({
        mediaCodecs: mediaCodecs as mediasoupTypes.RtpCodecCapability[],
    })

    console.log('Router created with id:', router.id);

    
}


async function getRouterRtpCapabilites(){
    if(!router){
        throw new Error('Router not initialized');
    }
    return router.rtpCapabilities;
}

async function createWebrtcTransport(){

    //transport webrtc transport through which we will send media

     transport = await router.createWebRtcTransport({
        listenIps: [
            {ip:'127.0.0.1',announcedIp:'127.0.0.1'}
        ],

        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate: 1000000,
    });

    console.log(`Transport created: ${transport.id}`);

    //record the transports in map fro cleanup later

    return {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
    };
}

async function connectTransport(transportId:string, dtlsParameters:mediasoupTypes.DtlsParameters){
    const transport = transports.get(transportId); //get the transportid from map
    if(!transport){
        throw new Error('Transport not found');
    }
    await transport.connect({dtlsParameters});
    console.log(`Transport connected: ${transport.id}`);
}

async function produce(
    wsId:string,
    transportId:string,
    rtpParameters:mediasoupTypes.RtpParameters, 
    kind:mediasoupTypes.MediaKind
){
    const transport = transports.get(transportId); //get the transportid from map
    if(!transport){
        throw new Error('Transport not found');
    }

    //cretae producer for that transport
    const producer = await transport.produce({
        kind,
        rtpParameters,
        appData: {
            wsId,
        }
    });

    //store the producer in map for cleanup later
    producers.set(producer.id, producer);
    producerOwner.set(producer.id, wsId);

    producer.on('transportclose', () => {
        console.log(`Producer's transport closed, closing producer ${producer.id}`);
        producer.close();
        producers.delete(producer.id);
        producerOwner.delete(producer.id);
    });

    console.log(`Producer created: ${producer.id} for transport: ${transport.id}`);

    return {id: producer.id, kind: producer.kind};
}


//create consumers

async function createConsumer(
    recvTransportId:string, 
    producerId:string, 
    rtpCapabilities:mediasoupTypes.RtpCapabilities
){
    if(!router){
        throw new Error('Router not initialized');
    }

    const recvTransport = transports.get(recvTransportId); //get the transportid from map
    if(!recvTransport){
        throw new Error('Receive Transport not found');
    }

    const consumer = await recvTransport.consume({
        producerId,
        rtpCapabilities,
        paused: false, //we want to start the consumer right away
    });

    // When consumer closed by server or transport close events, the client must handle it too.
    consumer.on('transportclose', () => {
        console.log('consumer transport closed');
    });
    
    consumer.on('producerclose', () => {
        console.log('consumer producer closed');
    });

    console.log(`Consumer created: ${consumer.id} for transport: ${recvTransport.id}`);

    return {
        id: consumer.id,
        producerId: consumer.producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        type: consumer.type,
        producerPaused: consumer.producerPaused,
    };


}

//cleanup all the resources when a peer disconnects

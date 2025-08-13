import {spawn} from 'node:child_process';
import {resolve} from 'path';
import {fileURLToPath} from 'url';
import {mkdirSync, existsSync} from 'fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const outdir = resolve(__dirname, '..','public','hls');
//crewate if it does not exist
if(!fs.existsSync(outdir) ){
    mkdirSync(outdir, { recursive: true });
}

const input = process.argv[2] || resolve(__dirname, '..', 'public', 'video.mp4');
const playlist = resolve(outdir, 'playlist.m3u8');
const segmentPattern = resolve(outdir, 'segment_%03d.ts');

const ffmpegPath = 'ffmpeg'; // Ensure ffmpeg is in your PATH or provide the full path
const options =[
    '-re',
  '-i', input,
  '-c:v', 'libx264',
  '-c:a', 'aac',
  '-preset', 'veryfast',
  '-g', '48',
  '-sc_threshold', '0',
  '-f', 'hls',
  '-hls_time', '4',
  '-hls_list_size', '6',
  '-hls_flags', 'delete_segments+omit_endlist',
  '-hls_segment_filename', segmentPattern,
  playlist
];


const ffmpeg = spawn(ffmpegPath, options);

ffmpeg.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

ffmpeg.stderr.on('data', (data) => {

    process.stderr.write(data.toString());
})

ffmpeg.on('close', (code)=>{
    console.log(`ffmpeg exited with code ${code}`);
    if (code === 0) {
      console.log('HLS created at:', outDir);
    } else {
      console.error('ffmpeg failed. Check stderr above.');
    }
})
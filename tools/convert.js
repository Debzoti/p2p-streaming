import {spawn} from 'node:child_process';
import {resolve} from 'path';
import {fileURLToPath} from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const outdir = resolve(__dirname, '..','public','hls');


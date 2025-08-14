#!/bin/bash
set -e  # stop if any command fails

# Ensure HLS output directory exists
mkdir -p /app/public/hls

# Convert input.mp4 to HLS (skip if already exists)
if [ ! -f /app/public/hls/output.m3u8 ]; then
  echo "Converting input.mp4 to HLS..."
  ffmpeg -i /app/input.mp4 -c:v libx264 -c:a aac -f hls -hls_time 4 -hls_list_size 0 /app/public/hls/output.m3u8
fi

# Start the Node server
echo "Starting server..."
nodemon --watch src --exec tsx src/index.ts

FROM node:18-bullseye

WORKDIR /app

# Install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Copy package files & install dependencies
COPY package.json tsconfig.json ./
RUN npm install

# Copy source code
COPY src ./src
COPY public ./public
COPY tools ./tools
COPY start.sh ./
# Install dev tools globally
RUN npm install -g tsx typescript nodemon
RUN chmod +x start.sh

EXPOSE 3000

CMD ["sh", "start.sh"]

FROM node:22-alpine

RUN apk add --no-cache \
    python3 \
    ffmpeg \
    py3-pip \
    curl

RUN pip install --no-cache-dir --break-system-packages yt-dlp

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000
CMD ["node", "src/server.js"]

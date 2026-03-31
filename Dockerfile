FROM node:20-slim

# Install ffmpeg + yt-dlp (pre-built binary, no Python needed)
RUN apt-get update && apt-get install -y ffmpeg curl ca-certificates --no-install-recommends && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
      -o /usr/local/bin/yt-dlp && \
    chmod +x /usr/local/bin/yt-dlp && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Declare build-time args so Next.js can bake NEXT_PUBLIC_* vars into the bundle
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN npm run build

ENV HOSTNAME="0.0.0.0"
EXPOSE 8080

CMD ["sh", "-c", "node_modules/.bin/next start"]

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['fluent-ffmpeg', '@ffmpeg-installer/ffmpeg', '@distube/ytdl-core'],
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;

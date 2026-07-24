import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // /blog se fusionó con los videos en /biblioteca — estos redirects
  // conservan el SEO ya indexado de los artículos que se alcanzaron a
  // publicar bajo /blog.
  async redirects() {
    return [
      { source: "/blog", destination: "/biblioteca", permanent: true },
      { source: "/blog/:slug", destination: "/biblioteca/:slug", permanent: true },
    ];
  },
};

export default nextConfig;

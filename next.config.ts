import type { NextConfig } from "next";

// When building for GitHub Pages we ship a fully static export and serve the
// site under `https://<user>.github.io/<repo>/`, so we need a basePath and
// asset prefix. Both are gated on `GITHUB_PAGES=true` so local `next dev` and
// `next build` keep working at the root.
const isPages = process.env.GITHUB_PAGES === "true";
const repoName = process.env.GITHUB_PAGES_BASE ?? "slack-agent";

const nextConfig: NextConfig = {
  // Surface the basePath to client code so we can prefix raw `<img src>`
  // values that point at /public assets (Next only auto-prefixes its own
  // <Image>, not raw imgs). Empty string in dev keeps URLs working at /.
  env: {
    NEXT_PUBLIC_BASE_PATH: isPages ? `/${repoName}` : "",
  },
  ...(isPages
    ? {
        output: "export",
        basePath: `/${repoName}`,
        assetPrefix: `/${repoName}/`,
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;

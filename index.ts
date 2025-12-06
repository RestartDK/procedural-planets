import { serve } from "bun";

import indexHtml from "./pages/index.html";
import creatorHtml from "./pages/creator.html";

const server = serve({
  port: 3000,
  routes: {
    "/": indexHtml,
    "/creator": creatorHtml,
  },
  development: true,
});

console.log(`🚀 Server running at ${server.url}`);

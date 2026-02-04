import { serve } from "bun";
import index from "./index.html";

// can set server to const
serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production",
});

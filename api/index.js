import { createApp } from "../src/server.js";

const app = createApp();

export default function handler(req, res) {
  if (req.url?.startsWith("/api")) {
    req.url = req.url.slice(4) || "/";
  }
  return app(req, res);
}

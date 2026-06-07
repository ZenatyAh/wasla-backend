import "dotenv/config";
import { createServer } from "http";
import app from "./server.js";
import { initSocket } from "./realtime/socket.js";

const port = Number(process.env.PORT || 3000);
const server = createServer(app);

initSocket(server);

server.listen(port, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${port}`);
});

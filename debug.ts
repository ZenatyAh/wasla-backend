import "dotenv/config";
import app from "./src/server.js";
import request from "supertest";

(async () => {
  try {
    const response = await request(app).get("/users/123/profile");
    console.log("Status:", response.status);
    console.log("Body:", response.body);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
})();

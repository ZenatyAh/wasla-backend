import "dotenv/config";
import app from "./server.js";

const port = Number(process.env.PORT || 3000);

app.listen(port,'0.0.0.0', () => {
  console.log(`Server running on http://localhost:${port}`);
});

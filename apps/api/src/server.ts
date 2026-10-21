import { env } from "./config/env";
import { app } from "./app";

const port = env.PORT;

app.listen(port, "0.0.0.0", () => {
  console.log(`DesignedPrice API listening on port ${port}`);
});

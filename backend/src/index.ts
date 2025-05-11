import express from "express";
import userRouter from "./routers/user";
import workerRouter from "./routers/worker";
const app = express();

app.use(express.json());

// ORM => postgresql://neondb_owner:npg_7HEQlRT0PVIf@ep-mute-breeze-a58c62cz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require


app.use("/v1/user", userRouter);
app.use("/v1/worker", workerRouter);

app.listen(3000, () => {console.log("the server has started")})
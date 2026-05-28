import Express, { Request, Response } from "express";
import fullRoutes from "@/routes/index";
import cors from "cors";
import path from "path";
import { errorHandler } from "@/middleware/error";

const app = Express();
const PORT = process.env.PORT || 3000;

app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));
app.use(cors());

app.use((req, res, next) => {
  console.log(`Chamada recebida: ${req.method} ${req.url}`);
  next();
});

app.use("/api", fullRoutes);

app.get("/", (req: Request, res: Response) => {
  const filePath = path.join(process.cwd(), "src/index.html");
  res.sendFile(filePath);
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running: http://localhost:${PORT}`);
});

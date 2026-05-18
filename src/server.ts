import Express, { Request, Response } from "express";
import cors from "cors";
import path from "path";

const app = Express();
const PORT = process.env.PORT || 3000;

app.use(Express.json());
app.use(cors());

app.use((req, res, next) => {
  console.log(`Chamada recebida: ${req.method} ${req.url}`);
  next();
});

app.get("/", (req: Request, res: Response) => {
  const filePath = path.join(process.cwd(), "index.html");
  res.sendFile(filePath);
});

app.listen(PORT, () => {
  console.log(`Server is running: http://localhost:${PORT}`);
});

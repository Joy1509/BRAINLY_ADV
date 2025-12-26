import  express  from "express";
import dotenv from "dotenv";
dotenv.config();
import cors from "cors";
import router from "./routes/pageRoutes";
import dbConnect from "./config/db";
import cookieParser from 'cookie-parser';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true}))
app.use(cors({
  origin: "http://localhost:5173", 
  credentials: true 
}));
app.use(cookieParser());
dbConnect();

app.use("/api/v1",router);

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;

// Optionally warm up Playwright browser to reduce first-request latency
if (process.env.PLAYWRIGHT_ENABLED === 'true') {
  import('./utils/browserRenderer')
    .then(m => m.warmUp())
    .catch(err => console.warn('Playwright warm-up import failed:', (err as any).message || err));
}

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  if (process.env.PLAYWRIGHT_ENABLED === 'true') console.log('Playwright rendering is ENABLED (PLAYWRIGHT_ENABLED=true)');
}).on('error', (err) => {
  console.error('Server failed to start:', err);
});
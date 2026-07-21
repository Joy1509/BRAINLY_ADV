import express from "express";
import { createServer } from "http";
import dotenv from "dotenv";
dotenv.config();
import cors from "cors";
import router from "./routes/pageRoutes";
import dbConnect from "./config/db";
import cookieParser from 'cookie-parser';
import passport from './controllers/oauthController';
import { initIO } from './socket';
import jwt from 'jsonwebtoken';

const app = express();
const httpServer = createServer(app);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(passport.initialize());

app.use("/api/v1", router);

// Connect to database asynchronously
dbConnect().catch(err => console.error('Failed to connect to database:', err));

const io = initIO(httpServer);

io.on('connection', (socket) => {
  const token = socket.handshake.auth?.token;
  if (!token) { socket.disconnect(); return; }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY as string) as { userID: string; role: string };
    socket.join(`user_${decoded.userID}`);
    if (decoded.role === 'admin') socket.join('admins');
  } catch {
    socket.disconnect();
  }
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;

if (process.env.PLAYWRIGHT_ENABLED === 'true') {
  import('./utils/browserRenderer')
    .then(m => m.warmUp())
    .catch(err => console.warn('Playwright warm-up failed:', (err as any).message || err));
}

httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  if (process.env.PLAYWRIGHT_ENABLED === 'true') console.log('Playwright rendering is ENABLED');
}).on('error', (err) => {
  console.error('Server failed to start:', err);
});

export default app;

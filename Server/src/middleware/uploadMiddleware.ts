import multer from 'multer';

const storage = multer.memoryStorage();

const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/mpeg'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only audio files are allowed'));
  },
});

export { imageUpload };
export default upload;

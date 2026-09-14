const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const uploadDir = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const allowedMimeTypes = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
];

function fileFilter(req, file, cb) {
  if (allowedMimeTypes.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Unsupported file type. Allowed: JPG, PNG, WEBP, GIF, PDF.'));
}

const maxSizeBytes = (parseInt(process.env.MAX_UPLOAD_MB, 10) || 10) * 1024 * 1024;

const upload = multer({ storage, fileFilter, limits: { fileSize: maxSizeBytes } });

module.exports = upload;

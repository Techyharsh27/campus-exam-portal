const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Cloudinary Configuration
let useCloudinary = false;

if (process.env.CLOUDINARY_URL && !process.env.CLOUDINARY_URL.includes('YOUR_')) {
    useCloudinary = true;
    // Cloudinary automatically configures via the CLOUDINARY_URL env var
    // example: cloudinary://my_key:my_secret@my_cloud_name
}

let storage;

if (useCloudinary) {
    storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'campus_exam_questions',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
            transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
        }
    });
    console.log('[Upload Config] Using Cloudinary Storage System');
} else {
    // Local fallback
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(4).toString('hex');
            cb(null, 'question-' + uniqueSuffix + path.extname(file.originalname).toLowerCase());
        }
    });
    console.log('[Upload Config] Using Local Disk Storage (uploads/)');
}

const fileFilter = (req, file, cb) => {
    // Check mime type
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only standard images are allowed.'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

module.exports = { upload, useCloudinary };

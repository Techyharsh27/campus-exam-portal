const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { upload, useCloudinary } = require('../config/upload');

router.post('/', protect, adminOnly, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image provided.' });
        }

        // Multer creates a `path` property. For Cloudinary, this is the secure HTTPS URL.
        // For Local storage, we send back just the filename so the frontend maps it to VITE_API_BASE_URL/uploads/...
        let imageUrl = req.file.path;

        if (!useCloudinary) {
            // Just send the filename so frontend can build the URL
            imageUrl = req.file.filename;
        }

        res.status(200).json({ 
            success: true, 
            data: { url: imageUrl },
            message: 'Image uploaded successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;

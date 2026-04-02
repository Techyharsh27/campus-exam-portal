const express = require('express');
const router = express.Router();
const path = require('path');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { upload } = require('../config/upload');

router.post('/', protect, adminOnly, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image provided.' });
        }

        // Cloudinary returns the permanent URL in req.file.path
        const imageUrl = req.file.path;

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

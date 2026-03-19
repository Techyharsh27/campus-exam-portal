const express = require('express');
const router = express.Router();
const { addWarning } = require('../controllers/warningController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, addWarning);

module.exports = router;

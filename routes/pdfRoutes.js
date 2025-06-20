const express = require('express');
const router = express.Router();
const { mergePDFs, splitPDF, status } = require('../controllers/pdfController');
const { upload } = require('../middleware/fileUpload');

router.post('/merge', upload.array('pdfs', 10), mergePDFs);
router.post('/split', upload.single('pdf'), splitPDF);
router.get('/status', status);

module.exports = router;
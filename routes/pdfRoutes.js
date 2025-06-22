const express = require('express');
const router = express.Router();
const { mergePDFs, splitPDF, status, downloadFile, startMergeJob, startSplitJob, getJobStatus, splitByBookmarks } = require('../controllers/pdfController');
const { upload } = require('../middleware/fileUpload');

// Synchronous operations
router.post('/merge', upload.array('pdfs', 10), mergePDFs);
router.post('/split', upload.single('pdf'), splitPDF);

// Asynchronous operations
router.post('/merge/job', upload.array('pdfs', 10), startMergeJob);
router.post('/split/job', upload.single('pdf'), startSplitJob);

// Job status
router.get('/job/:jobId', getJobStatus);

// Split by bookmarks (planned)
router.post('/split/bookmarks', upload.single('pdf'), splitByBookmarks);
router.get('/status', status);
router.get('/download/:filename', downloadFile);

module.exports = router;
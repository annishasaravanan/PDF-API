const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/pdfController');
const { upload } = require('../middleware/fileUpload');

router.get('/status', pdfController.status);
router.post('/merge', upload.array('pdfs'), pdfController.mergePDFs);
router.post('/split', upload.single('pdf'), pdfController.splitPDF);
router.get('/download/:filename', pdfController.downloadFile); // Parameterized route
router.post('/start-merge-job', pdfController.startMergeJob);
router.post('/start-split-job', pdfController.startSplitJob);
router.get('/status/job/:jobId', pdfController.getJobStatus);
router.post('/split-by-bookmarks', pdfController.splitByBookmarks);

module.exports = router;
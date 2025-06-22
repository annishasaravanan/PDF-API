const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/pdfController');

router.get('/status', pdfController.status);
router.post('/merge', pdfController.mergePDFs);
router.post('/split', pdfController.splitPDF);
router.get('/download/:filename', pdfController.downloadFile); // Parameterized route
router.post('/start-merge-job', pdfController.startMergeJob);
router.post('/start-split-job', pdfController.startSplitJob);
router.get('/status/job/:jobId', pdfController.getJobStatus);
router.post('/split-by-bookmarks', pdfController.splitByBookmarks);

module.exports = router;
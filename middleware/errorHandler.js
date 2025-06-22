const logger = require('../utils/logger');
const multer = require('multer');

const errorHandler = (err, req, res, next) => {
  logger.error(`${err.message} - ${req.method} ${req.url}`);
  // Handle file upload format errors
  if (err.message === 'Only PDF files are allowed') {
    return res.status(415).json({ error: err.message });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: 'File upload error: ' + err.message });
  }
  res.status(500).json({ error: err.message || 'Internal server error' });
};

module.exports = errorHandler;
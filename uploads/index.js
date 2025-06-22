const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const pdfRoutes = require('../routes/pdfRoutes');
const errorHandler = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests
  })
);

// Log all requests
app.use((req, res, next) => {
  logger.info(`Request: ${req.method} ${req.url}`);
  next();
});

// Log all responses
app.use((req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;
  res.send = function (body) {
    const duration = Date.now() - start;
    logger.info(`Response: ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`, { responseBody: body });
    return originalSend.call(this, body);
  };
  next();
});

// Routes
app.use('/api/pdf', pdfRoutes);

// Error Handler
app.use(errorHandler);

// File cleanup (runs every hour)
setInterval(() => {
  const now = Date.now();
  fs.readdirSync(uploadDir).forEach((file) => {
    const filePath = path.join(uploadDir, file);
    const stats = fs.statSync(filePath);
    // Delete files older than 1 hour
    if (now - stats.mtimeMs > 60 * 60 * 1000) {
      fs.unlinkSync(filePath);
      logger.info(`Deleted temporary file: ${file}`);
    }
  });
}, 60 * 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
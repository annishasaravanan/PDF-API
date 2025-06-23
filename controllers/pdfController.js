const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// In-memory job store for async operations
const jobs = {};

const mergePDFs = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No PDF files provided' });
    }

    const mergedPdf = await PDFDocument.create();
    for (const file of req.files) {
      const pdfBytes = fs.readFileSync(file.path);
      let pdf;
      try {
        pdf = await PDFDocument.load(pdfBytes, {
          password: req.body.passwords ? req.body.passwords[file.originalname] : undefined,
        });
      } catch (err) {
        logger.error(`Error loading PDF ${file.originalname}: ${err.message}`);
        return res.status(400).json({ error: `Invalid or password-protected PDF: ${file.originalname}` });
      }
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    if (req.body.outputPassword) {
      if (typeof mergedPdf.encrypt === 'function') {
        mergedPdf.encrypt({
          userPassword: req.body.outputPassword,
          ownerPassword: req.body.outputPassword, // Optional, can be different from userPassword
          permissions: {
            printing: 'highResolution',
            modifying: false,
            copying: false,
            annotating: false,
            fillingForms: false,
            contentAccessibility: false,
            documentAssembly: false,
          },
        });
      } else {
        logger.warn('Encryption is not supported in current pdf-lib version; skipping password protection');
      }
    }

    const mergedPdfBytes = await mergedPdf.save();
    const outputPath = path.join(__dirname, '../uploads', `merged-${Date.now()}.pdf`);
    fs.writeFileSync(outputPath, mergedPdfBytes);
    const fileName = path.basename(outputPath);
    return res.status(200).json({ files: [{ name: 'merged.pdf', url: `/api/pdf/download/${fileName}` }] });
  } catch (err) {
    logger.error(`Merge PDF error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const splitPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'A PDF file is required' });
    }

    // Get split count from request
    const splitCount = parseInt(req.body.splitCount);
    if (!Number.isInteger(splitCount) || splitCount < 1) {
      return res.status(400).json({ error: 'Invalid split count, must be a positive integer' });
    }

    let ranges;
    try {
      ranges = typeof req.body.ranges === 'string' ? JSON.parse(req.body.ranges) : req.body.ranges;
    } catch (err) {
      logger.error(`Error parsing ranges: ${err.message}`);
      return res.status(400).json({ error: 'Invalid page ranges format' });
    }

    if (!Array.isArray(ranges) || ranges.length !== splitCount) {
      return res.status(400).json({ error: `Expected ${splitCount} range(s), got ${ranges.length}` });
    }

    const pdfBytes = fs.readFileSync(req.file.path);
    let pdf;
    try {
      pdf = await PDFDocument.load(pdfBytes, {
        password: req.body.password,
      });
    } catch (err) {
      logger.error(`Error loading PDF: ${err.message}`);
      return res.status(400).json({ error: 'Invalid or password-protected PDF' });
    }

    // Validate page ranges without requiring full coverage or no overlap
    const totalPages = pdf.getPageCount();
    for (const range of ranges) {
      if (!Number.isInteger(range.start) || !Number.isInteger(range.end) || range.start < 1 || range.end > totalPages || range.start > range.end) {
        return res.status(400).json({ error: `Invalid range: ${JSON.stringify(range)}` });
      }
    }

    const outputFiles = [];
    for (const range of ranges) {
      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(pdf, Array.from({ length: range.end - range.start + 1 }, (_, i) => range.start - 1 + i));
      copiedPages.forEach((page) => newPdf.addPage(page));

      if (req.body.outputPassword) {
        if (typeof newPdf.encrypt === 'function') {
          newPdf.encrypt({
            userPassword: req.body.outputPassword,
            ownerPassword: req.body.outputPassword, // Optional, can be different
            permissions: {
              printing: 'highResolution',
              modifying: false,
              copying: false,
              annotating: false,
              fillingForms: false,
              contentAccessibility: false,
              documentAssembly: false,
            },
          });
        } else {
          logger.warn('Encryption is not supported in current pdf-lib version; skipping password protection');
        }
      }

      const newPdfBytes = await newPdf.save();
      const outputPath = path.join(__dirname, '../uploads', `split-${Date.now()}-${range.start}-${range.end}.pdf`);
      fs.writeFileSync(outputPath, newPdfBytes);
      outputFiles.push(outputPath);
    }

    // Return download URLs for each split PDF
    const files = outputFiles.map((filePath) => {
      const name = path.basename(filePath);
      return { name, url: `/api/pdf/download/${name}` };
    });
    return res.status(200).json({ files });

  } catch (err) {
    logger.error(`Split PDF error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const status = async (req, res) => {
  res.status(200).json({ status: 'API is running' });
};

const downloadFile = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    // Stream PDF inline to display in client
    const fileBuffer = fs.readFileSync(filePath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(fileBuffer);
    fs.unlinkSync(filePath);
  } catch (err) {
    logger.error(`Download error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Asynchronous job handling
const startMergeJob = (req, res) => {
  const jobId = uuidv4();
  jobs[jobId] = { status: 'pending', files: [], error: null };
  // Kick off job
  mergePDFs(req, {
    status: (code) => ({ json: (body) => body }),
    ...{
      statusCode: null,
      json: (body) => {
        if (body.files) jobs[jobId].files = body.files;
        jobs[jobId].status = 'completed';
      }
    }
  }).catch(err => {
    jobs[jobId].status = 'error';
    jobs[jobId].error = err.message;
  });
  res.status(202).json({ jobId });
};

const startSplitJob = (req, res) => {
  const jobId = uuidv4();
  jobs[jobId] = { status: 'pending', files: [], error: null };
  splitPDF(req, {
    status: (code) => ({ json: (body) => body }),
    json: (body) => {
      if (body.files) jobs[jobId].files = body.files;
      jobs[jobId].status = 'completed';
    }
  }).catch(err => {
    jobs[jobId].status = 'error';
    jobs[jobId].error = err.message;
  });
  res.status(202).json({ jobId });
};

const getJobStatus = (req, res) => {
  const { jobId } = req.params;
  const job = jobs[jobId];
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.status(200).json(job);
};

const splitByBookmarks = async (req, res) => {
  // Feature not implemented: splitting by bookmarks/chapter detection
  res.status(501).json({ error: 'Splitting by bookmarks not implemented' });
};

module.exports = {
  mergePDFs,
  splitPDF,
  status,
  downloadFile,
  startMergeJob,
  startSplitJob,
  getJobStatus,
  splitByBookmarks,
};
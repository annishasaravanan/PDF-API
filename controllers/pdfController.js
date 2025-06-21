const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const mergePDFs = async (req, res) => {
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({ error: 'At least two PDF files are required' });
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
      mergedPdf.encrypt({
        userPassword: req.body.outputPassword,
        permissions: { printing: 'highResolution', modifying: false, copying: false },
      });
    }

    const mergedPdfBytes = await mergedPdf.save();
    const outputPath = path.join(__dirname, '../uploads', `merged-${Date.now()}.pdf`);
    fs.writeFileSync(outputPath, mergedPdfBytes);

    res.download(outputPath, 'merged.pdf', (err) => {
      if (err) logger.error(`Error downloading file: ${err.message}`);
      fs.unlinkSync(outputPath); // Clean up after download
    });
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

    // Validate ranges
    const totalPages = pdf.getPageCount();
    const coveredPages = new Set();
    for (const range of ranges) {
      if (!Number.isInteger(range.start) || !Number.isInteger(range.end) || range.start < 1 || range.end > totalPages || range.start > range.end) {
        return res.status(400).json({ error: `Invalid range: ${JSON.stringify(range)}` });
      }
      for (let i = range.start; i <= range.end; i++) {
        if (coveredPages.has(i)) {
          return res.status(400).json({ error: 'Ranges cannot overlap or repeat pages' });
        }
        coveredPages.add(i);
      }
    }
    if (coveredPages.size !== totalPages) {
      return res.status(400).json({ error: 'Ranges must cover all pages of the PDF' });
    }

    const outputFiles = [];
    for (const range of ranges) {
      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(pdf, Array.from({ length: range.end - range.start + 1 }, (_, i) => range.start - 1 + i));
      copiedPages.forEach((page) => newPdf.addPage(page));

      if (req.body.outputPassword) {
        newPdf.encrypt({
          userPassword: req.body.outputPassword,
          permissions: { printing: 'highResolution', modifying: false, copying: false },
        });
      }

      const newPdfBytes = await newPdf.save();
      const outputPath = path.join(__dirname, '../uploads', `split-${Date.now()}-${range.start}-${range.end}.pdf`);
      fs.writeFileSync(outputPath, newPdfBytes);
      outputFiles.push(outputPath);
    }

    // Sequentially trigger downloads for each split PDF
    let index = 0;
    const downloadNext = () => {
      if (index < outputFiles.length) {
        res.download(outputFiles[index], path.basename(outputFiles[index]), (err) => {
          if (err) {
            logger.error(`Error downloading file ${outputFiles[index]}: ${err.message}`);
          }
          fs.unlinkSync(outputFiles[index]); // Clean up after download
          index++;
          if (index < outputFiles.length) {
            // Delay to allow browser/Postman to process the next download
            setTimeout(downloadNext, 1000); // 1-second delay
          }
        });
      }
    };

    // Start the download sequence
    downloadNext();

  } catch (err) {
    logger.error(`Split PDF error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const status = async (req, res) => {
  res.status(200).json({ status: 'API is running' });
};

module.exports = { mergePDFs, splitPDF, status };
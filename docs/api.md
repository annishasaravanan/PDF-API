# PDF Processing API Documentation

Base URL: `http://localhost:3000/api/pdf`

---

## 1. Merge PDFs

**Endpoint:** `POST /merge`

**Description:** Merges multiple PDF files into a single PDF.

**Headers:**
- `Content-Type: multipart/form-data`

**Request Body:**
- `pdfs` (array of files): Upload 2–10 PDFs (each ≤10 MB).
- `passwords` (optional, JSON string): e.g. `{ "file1.pdf": "pass123" }` for input file passwords.
- `outputPassword` (optional, string): Protects merged PDF with this password.

**Responses:**
- `200 OK`:
  ```json
  {
    "files": [
      { "name": "merged.pdf", "url": "/api/pdf/download/merged-<timestamp>.pdf" }
    ]
  }
  ```
- `400 Bad Request`: Invalid parameters or processing error.
- `415 Unsupported Media Type`: Non-PDF upload.
- `500 Internal Server Error`

---

## 2. Split PDF

**Endpoint:** `POST /split`

**Description:** Splits a single PDF into multiple documents based on specified page ranges.

**Headers:**
- `Content-Type: multipart/form-data`

**Request Body:**
- `pdf` (file): Single PDF (≤10 MB).
- `splitCount` (integer): Number of ranges provided.
- `ranges` (JSON string or array): Array of objects `{ "start": <number>, "end": <number> }`. 1-indexed.
- `password` (optional, string): Password for input PDF.
- `outputPassword` (optional, string): Protects each split PDF.

**Responses:**
- `200 OK`:
  ```json
  {
    "files": [
      { "name": "split-<timestamp>-1-3.pdf", "url": "/api/pdf/download/split-<timestamp>-1-3.pdf" },
      { "name": "split-<timestamp>-4-5.pdf", "url": "/api/pdf/download/split-<timestamp>-4-5.pdf" }
    ]
  }
  ```
- `400 Bad Request`: Invalid PDF, parameters, or page ranges.
- `415 Unsupported Media Type`: Non-PDF upload.
- `500 Internal Server Error`

---

## 3. Download Processed File

**Endpoint:** `GET /download/:filename`

**Description:** Streams a processed PDF (merged or split) and removes it after download.

**Parameters:**
- `filename` (path parameter): Name of the file in `/uploads` directory.

**Responses:**
- `200 OK`: Initiates file download.
- `404 Not Found`: File does not exist (or already cleaned up).
- `500 Internal Server Error`

---

## 4. API Status

**Endpoint:** `GET /status`

**Description:** Health check endpoint.

**Responses:**
- `200 OK`:
  ```json
  { "status": "API is running" }
  ```

---

## Error Handling & Logging

- All requests and responses (status codes and durations) are logged via Winston.
- File uploads limited to PDF (`application/pdf`); non-PDF returns `415`.
- Multer upload errors return `400` with details.
- Processing errors (invalid PDF, wrong format, corruption) return `400` or `500` as appropriate.

---

## File Storage & Cleanup

- Uploaded and generated PDFs stored in `/uploads`.
- Automatic cleanup: Files older than 1 hour are deleted via a scheduled job.

---

## Rate Limiting & CORS

- CORS enabled for all origins.
- Rate limiting: max 100 requests per IP per 15 minutes.

---

*Generated on `$(date)`*
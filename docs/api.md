PDF Processing API Documentation
Base URL
http://localhost:3000/api/pdf
Endpoints
1. Merge PDFs

Endpoint: POST /merge
Description: Merges multiple PDF files into a single PDF.
Content-Type: multipart/form-data
Request Body:
pdfs: Array of PDF files (min: 2, max: 10, max size: 10MB each)
passwords (optional): JSON object mapping filenames to passwords (e.g., {"file1.pdf":"pass123"})
outputPassword (optional): Password to protect the merged PDF


Response:
200: Downloads the merged PDF (merged.pdf)
400: Invalid files or parameters
500: Server error


Sample Request (Postman):
Select form-data, add key pdfs with multiple PDF files.
Add key passwords with value {"file1.pdf":"pass123"} if needed.
Add key outputPassword with value newpass if needed.


Sample Response:
File download: merged.pdf



2. Split PDF

Endpoint: POST /split
Description: Splits a PDF into multiple documents based on page ranges and returns them as a ZIP file.
Content-Type: multipart/form-data
Request Body:
pdf: Single PDF file (max size: 10MB)
ranges: JSON array of page ranges (e.g., [{"start":1,"end":3}, {"start":4,"end":5}])
password (optional): Password for the input PDF
outputPassword (optional): Password to protect split PDFs


Response:
200: Downloads a ZIP file (split-files.zip) containing split PDFs (e.g., split-1-3.pdf, split-4-5.pdf)
400: Invalid file or ranges
500: Server error


Sample Request (Postman):
Select form-data, add key pdf with a PDF file.
Add key ranges with value [{"start":1,"end":3}].
Add key password or outputPassword if needed.


Sample Response:
File download: split-files.zip



3. Status

Endpoint: GET /status
Description: Checks API health.
Response:
200: { "status": "API is running" }


Sample Request (Postman):
GET http://localhost:3000/api/pdf/status




PDF Processing API
A Node.js backend API for merging and splitting PDF documents, built with Express.js and pdf-lib.
Features

Merge multiple PDFs into a single document.
Split a PDF by page ranges.
Support for password-protected PDFs.
Password protection for output PDFs.
Temporary file storage with automatic cleanup.
RESTful API with comprehensive error handling.
Logging with Winston.
Docker support.

Prerequisites

Node.js v14 or above
Docker (optional)
Postman for testing

Setup

Clone the repository:git clone <repository-url>
cd pdf-api


Install dependencies:npm install


Create a .env file:PORT=3000


Start the server:npm run dev

Or use Docker:docker-compose up



Usage

API base URL: http://localhost:3000/api/pdf
See docs/api.md for detailed API documentation.

Testing with Postman

Import the API endpoints into Postman.
Test /merge with multiple PDF uploads.
Test /split with a PDF and page ranges.
Test /status to check API health.

Project Structure
pdf-api/
├── src/
│   ├── controllers/     # Business logic
│   ├── middleware/      # Middleware for uploads and errors
│   ├── routes/          # API routes
│   ├── utils/           # Logger utility
│   ├── uploads/         # Temporary file storage
│   ├── index.js         # Entry point
├── docs/                # API documentation
├── logs/                # Log files
├── .env                 # Environment variables
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Docker Compose configuration
├── README.md            # Project documentation

License
MIT

# PDF Generation Microservice

This service is responsible for generating PDFs from HTML/CSS using Puppeteer. 
It is designed to run in a Docker container to ensure consistent font rendering (specifically the "Inter" font).

## Local Development

### Option 1: Run with Node (Fastest)
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the service:
   ```bash
   PORT=3005 node server.js
   ```
*Note: This uses your local OS fonts. If "Inter" is not installed on your system, it will fallback to sans-serif.*

### Option 2: Run with Docker (Recommended for testing fonts)
1. Build the image:
   ```bash
   docker build -t resume-pdf-service .
   ```
2. Run the container:
   ```bash
   docker run -p 3005:3000 -e PORT=3000 resume-pdf-service
   ```
*Note: This maps port 3005 on your host to port 3000 in the container. The Dockerfile installs the Inter font correctly.*

## Deployment to Render

1. **Create a new Web Service** on Render.
2. **Connect your GitHub repository**.
3. **Root Directory**: `resumeBuilderPdfService`
4. **Runtime**: `Docker`
5. **Instance Type**: Starter (or higher). *Free tier might work but Puppeteer is memory-intensive.*
6. **Environment Variables**:
   - `PORT`: 3000 (or whatever you prefer, Render usually detects it).
7. **Deploy!**

Once deployed, copy the Render URL and update the `PDF_SERVICE_URL` in your Backend's `.env`.

## API Endpoints

### GET /health
Returns 200 OK if the service is running.

### POST /generate-pdf
**Body:**
```json
{
  "html": "<h1>Hello</h1>",
  "css": "h1 { color: blue; }"
}
```
**Returns:** Binary PDF file.

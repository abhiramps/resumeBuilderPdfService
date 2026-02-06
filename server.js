require('dotenv').config();
const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Helper to find Chrome path in Docker
const getChromePath = () => {
  if (process.env.NODE_ENV !== 'production') return undefined;
  
  const paths = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ];
  
  for (const path of paths) {
    if (fs.existsSync(path)) return path;
  }
  
  console.warn('Warning: Could not find system Chrome. Defaulting to puppeteer bundled path.');
  return undefined;
};

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    memoryUsage: process.memoryUsage(),
    platform: process.platform
  });
});

app.post('/generate-pdf', async (req, res) => {
  const { html, css } = req.body;
  const requestId = Math.random().toString(36).substring(7);

  if (!html) {
    console.error(`[${requestId}] Error: HTML is required`);
    return res.status(400).json({ error: 'HTML is required' });
  }

  console.log(`[${requestId}] Received PDF generation request. Payload size: ${Math.round((JSON.stringify(req.body).length) / 1024)} KB`);
  const startTime = Date.now();
  let browser = null;

  try {
    const executablePath = getChromePath();

    console.log(`[${requestId}] Launching browser... environment: ${process.env.NODE_ENV || 'development'}, path: ${executablePath || 'bundled'}`);
    browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--font-render-hinting=none'
      ]
    });

    const page = await browser.newPage();
    
    // Log console messages from within the page
    page.on('console', msg => console.log(`[${requestId}] Browser Console:`, msg.text()));
    page.on('error', err => console.error(`[${requestId}] Browser Page Error:`, err));

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            ${css}
            
            /* Force global override */
            html, body, * {
              font-family: 'Inter', sans-serif !important;
            }
            
            @page {
              margin: 0;
              size: letter;
            }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

    console.log(`[${requestId}] Setting page content...`);
    await page.setContent(fullHtml, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    console.log(`[${requestId}] Checking font availability...`);
    const fonts = await page.evaluate(() => {
        return document.fonts.check('12px Inter');
    });
    console.log(`[${requestId}] Inter font available:`, fonts);

    console.log(`[${requestId}] Generating PDF...`);
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: true
    });

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] PDF Generated successfully. Size: ${pdfBuffer.length} bytes. Duration: ${duration}ms`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="resume.pdf"');
    res.send(pdfBuffer);

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] PDF Generation Error after ${duration}ms:`, error);
    res.status(500).json({ error: error.message });
  } finally {
    if (browser) {
      console.log(`[${requestId}] Closing browser...`);
      await browser.close();
    }
  }
});

app.listen(PORT, () => {
  console.log(`PDF Service listening on port ${PORT}`);
});

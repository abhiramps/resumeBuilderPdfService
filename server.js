require('dotenv').config();
const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.status(200).send('PDF Service is OK');
});

app.post('/generate-pdf', async (req, res) => {
  const { html, css } = req.body;

  if (!html) {
    return res.status(400).json({ error: 'HTML is required' });
  }

  console.log('Received PDF generation request');
  let browser = null;

  try {
    // Launch browser (fresh instance per request to avoid memory leaks on low-RAM hosts)
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Critical for Docker/Render
        '--font-render-hinting=none'
      ]
    });

    const page = await browser.newPage();

    // Construct HTML with Global Font Reset
    // Note: 'Inter' will be installed as a system font in the Docker container
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

    await page.setContent(fullHtml, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // We don't need document.fonts.load() if it's a system font!
    // But we can check it just in case.
    const fonts = await page.evaluate(() => {
        return document.fonts.check('12px Inter');
    });
    console.log('Inter font available:', fonts);

    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: true
    });

    console.log(`PDF Generated. Size: ${pdfBuffer.length} bytes`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="resume.pdf"');
    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF Generation Error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.listen(PORT, () => {
  console.log(`PDF Service listening on port ${PORT}`);
});

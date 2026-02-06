FROM ghcr.io/puppeteer/puppeteer:24.1.1

# Switch to root to install fonts
USER root

# Create font directory
RUN mkdir -p /usr/share/fonts/truetype/custom

# Copy local fonts
COPY ./fonts/*.woff2 /usr/share/fonts/truetype/custom/

# Refresh font cache
RUN fc-cache -f -v

# List fonts to verify Inter is installed (for build log debugging)
RUN fc-list | grep "Inter"

# Switch back to the non-root user provided by the base image
USER pptruser

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
# We use 'npm ci' for clean install. 
# Note: Puppeteer is already in the base image, but we need express/cors.
# passing --omit=dev to save space
RUN npm install --omit=dev

# Copy app source
COPY . .

# Expose port
EXPOSE 3000

# Start command
CMD [ "node", "server.js" ]

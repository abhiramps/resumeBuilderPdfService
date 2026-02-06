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

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies as root to avoid permission issues
RUN npm install --omit=dev

# Copy app source
COPY . .

# Change ownership of the app directory to pptruser
RUN chown -R pptruser:pptruser /usr/src/app

# Switch to the non-root user provided by the base image for security
USER pptruser

# Expose port
EXPOSE 3000

# Start command
CMD [ "node", "server.js" ]

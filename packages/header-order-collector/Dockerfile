FROM mcr.microsoft.com/playwright:v1.48.2-focal

# Install browsers
RUN npx playwright install chrome
RUN npx playwright install msedge

# Install Node.js dependencies
COPY package.json package-lock.json ./
RUN npm install


# Copy the rest of the files
COPY ./collector.js ./
COPY ./server.js ./

# Run the server
CMD ["node", "collector.js"]
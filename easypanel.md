# EasyPanel Deployment Fix for Chrome/Puppeteer Issue

## Problem
When deploying to EasyPanel using Docker, you encounter this error:
```
Error: Browser was not found at the configured executablePath (C:\Program Files\Google\Chrome\Application\chrome.exe)
```

This happens because Puppeteer is trying to use a Windows path for Chrome, but your container is running in Linux.

## Solution

1. In your EasyPanel deployment, make sure to set these environment variables:

```
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
CHROME_PATH=/usr/bin/chromium-browser
```

2. Update your `src/index.js` file to explicitly set the Puppeteer executablePath option based on environment variables.

3. Since you're deploying via Git URL + Dockerfile, make sure your Dockerfile installs Chromium and sets the correct path (your current Dockerfile already does this correctly).

## Verifying Installation

After deploying, you can check if Chromium is properly installed by running this command in EasyPanel's web terminal:

```bash
ls -la /usr/bin/chromium-browser
```

If it returns information about the file, then Chromium is correctly installed.

## Additional Troubleshooting

If the issue persists:

1. Check the container logs for any errors related to Chromium installation
2. Verify that all environment variables are set correctly in EasyPanel
3. Try using an alternative path for Chromium: `/usr/bin/chromium` (without the "-browser" suffix)

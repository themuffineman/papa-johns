const puppeteer = require("puppeteer");
const express = require("express");
const cors = require("cors");
const { WebSocketServer } = require("ws");
const { v4: uuidv4 } = require("uuid");
const WS_OPEN = require("ws").OPEN;
require("dotenv").config();

// Configuration constants
const CONFIG = {
  WEBSOCKET_PORT: 8080,
  HTTP_PORT: 8090,
  TIMEOUT: 900000,
  URL_DETECTION_ATTEMPTS: 12,
  DELAY_MS: 5000,
  GOOGLE_URL_BASE:
    "https://www.google.com/localservices/prolist?g2lbs=AIQllVxEpXuuCPFrOHRAavT6nJMeIXUuM9D7r7-IlczaiEuKdgYVA09lqC7MIhZ3mUJ_MfwMM30K5vDmEB9UFLvwoZMUuqe_RIT2RmrDlIhrFndV8WuAgW-ioANkhbKSz__jtHfxKrJZLfFak9ca1Vbqi4HEnaKw7Q%3D%3D&hl=en-US&gl=&cs=1&ssta=1",
  PUPPETEER_ARGS: [
    "--disable-setuid-sandbox",
    "--no-sandbox",
    "--disable-dev-shm-usage",
  ],
};

// Initialize Express app
const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "*",
  })
);

// Initialize WebSocket server
const clients = new Map();
const wss = new WebSocketServer({ port: CONFIG.WEBSOCKET_PORT });

/**
 * Creates a delay for the specified time
 * @param {number} ms - Delay in milliseconds
 * @returns {Promise} Promise that resolves after the delay
 */
async function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("Success");
    }, ms);
  });
}

/**
 * Broadcasts a message to a specific client
 * @param {Object} options - Message options
 * @param {string} options.message - Message content
 * @param {string} options.type - Message type
 * @param {string} options.id - Client ID
 */
function broadcast({ message, type, id }) {
  const ws = clients.get(id);
  if (ws && ws.readyState === WS_OPEN) {
    ws.send(
      JSON.stringify({
        message,
        type,
      })
    );
    console.log("Sent message to user: ", id);
  } else {
    console.warn(`User ${id} is not connected.`);
  }
}

/**
 * Extracts emails from a page by checking mailto links and text content
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<Array<string>>} Array of extracted emails
 */
async function crawl(page) {
  const crawledEmails = [];

  // Extract all <a> tags on the page
  const links = await page.evaluate(() => {
    const anchorTags = Array.from(document.querySelectorAll("a"));
    return anchorTags.map((a) => a.href);
  });

  // Filter for mailto links and extract emails
  const emailLinks = links.filter((link) => link.startsWith("mailto:"));
  emailLinks.forEach((link) => {
    const email = link.replace("mailto:", "");
    crawledEmails.push(email);
  });

  // Extract emails from text content using regex
  const text = await page.evaluate(() => document.body.textContent);
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  let match;
  while ((match = emailRegex.exec(text)) !== null) {
    crawledEmails.push(match[0]);
  }

  return crawledEmails;
}

/**
 * Navigates to a business website and extracts contact information
 * @param {Browser} browser - Puppeteer browser instance
 * @param {string} url - Website URL to scrape
 * @param {string} businessName - Name of the business
 * @param {string} clientId - Client ID for messaging
 * @returns {Promise<Object>} Business information with emails
 */
async function scrapeBusinessWebsite(browser, url, businessName, clientId) {
  const newPage = await browser.newPage();
  newPage.setDefaultNavigationTimeout(CONFIG.TIMEOUT);
  newPage.setDefaultTimeout(CONFIG.TIMEOUT);

  try {
    // Navigate to the business website
    await newPage.goto(url);
    console.info(`Navigated to ${url}`);
    broadcast({
      id: clientId,
      message: `Navigated to ${url.slice(0, 10)}...`,
      type: "status",
    });

    // Extract emails from the main page
    let tempEmails = [];
    const crawledEmails = await crawl(newPage);
    tempEmails.push(...crawledEmails);

    // Get the root domain for filtering internal links
    const rootUrl = new URL(url).hostname.replace(/^www\./, "");

    // Extract all anchor tags from the page
    const anchorTags = await newPage.$$eval("a", (anchors) =>
      anchors.map((anchor) => anchor.href)
    );

    // Remove duplicates from anchor tags
    const filteredAnchorTags = [...new Set(anchorTags)];

    // Filter for internal links only
    const internalAnchorTags = filteredAnchorTags.filter((anchor) =>
      anchor.includes(rootUrl)
    );

    // Further filter for contact-related pages
    const internalLinks = internalAnchorTags.filter(
      (link) => link.includes("contact") || link.includes("touch")
    );

    // Visit contact pages and extract additional emails
    for (const link of internalLinks) {
      try {
        await newPage.goto(link);
        const secondaryCrawledEmails = await crawl(newPage);
        tempEmails.push(...secondaryCrawledEmails);
      } catch (error) {
        console.log(`Error navigating to url on link: `, link);
      }
    }

    // Return business information with deduplicated emails
    return {
      name: businessName,
      tempName: businessName,
      url,
      emails: [...new Set(tempEmails)],
    };
  } catch (error) {
    console.error(`Error navigating to ${url}: ${error}`);
    return null;
  } finally {
    await newPage.close();
  }
}

/**
 * Detects when Google has finished loading search results by monitoring URL changes
 * @param {Page} page - Puppeteer page object
 * @param {string} currentUrl - Initial URL before search
 * @returns {Promise<void>}
 */
async function waitForUrlChange(page, currentUrl) {
  let exitLoop = false;
  let urlDetections = 0;
  console.log("Detecting URL change...");

  while (!exitLoop) {
    // Prevent infinite loop with maximum attempts
    if (urlDetections > CONFIG.URL_DETECTION_ATTEMPTS) {
      console.log("URL change detection timeout");
      break;
    }

    const newUrl = page.url();
    if (newUrl !== currentUrl) {
      exitLoop = true;
    } else {
      console.log("Still detecting URL change...");
      urlDetections++;
      await delay(CONFIG.DELAY_MS);
    }
  }
}

/**
 * Extracts business information from Google search results cards
 * @param {Page} page - Puppeteer page object
 * @param {Browser} browser - Puppeteer browser instance
 * @param {string} clientId - Client ID for messaging
 * @returns {Promise<void>}
 */
async function extractBusinessInfo(page, browser, clientId) {
  // Wait for business cards to load
  await page.waitForSelector("div.rgnuSb.xYjf2e");
  await page.waitForSelector(".AIYI7d");

  // Get all business cards
  const cards = await page.$$('div[jsname="gam5T"]');

  // Extract total number of results for pagination calculation
  const textContent = await page.$eval(
    ".AIYI7d",
    (element) => element.textContent
  );
  const lastNumbersMatch = textContent.match(/\d+$/);
  const lastNumber = lastNumbersMatch
    ? parseInt(lastNumbersMatch[0], 10)
    : null;
  const pagesToScrape = Math.floor(lastNumber / 20);

  // Send count information to client
  broadcast({
    id: clientId,
    message: pagesToScrape,
    type: "count",
  });

  // Process each business card
  for (const card of cards) {
    // Extract business name
    const businessName = await card.$eval(
      "div.rgnuSb.xYjf2e",
      (node) => node.textContent
    );

    // Extract website URL if available
    const websiteATag = await card.$('a[aria-label="Website"]');
    const url = websiteATag
      ? await (await websiteATag.getProperty("href")).jsonValue()
      : null;

    // If we have a website URL, scrape it for contact information
    if (url) {
      const businessInfo = await scrapeBusinessWebsite(
        browser,
        url,
        businessName,
        clientId
      );

      // Send business information to client if successfully scraped
      if (businessInfo) {
        broadcast({
          id: clientId,
          message: businessInfo,
          type: "lead",
        });
      }
    }
  }
}

/**
 * Scrapes business information from Google Local Services
 * @param {Object} options - Scraping options
 * @param {string} options.service - Service to search for
 * @param {string} options.location - Location to search in
 * @param {number} options.pageNumber - Page number to scrape
 * @param {string} options.clientId - Client ID for messaging
 * @returns {Promise<void>}
 */
async function scraper({ service, location, pageNumber, clientId }) {
  let browser;

  try {
    if (service && location && pageNumber) {
      console.log("The Scraping Queries:", service, ",", location);
      const intPageNumber = 1; //parseInt(pageNumber);

      // Launch Puppeteer browser with appropriate settings
      browser = await puppeteer.launch({
        args: CONFIG.PUPPETEER_ARGS,
      });
      console.log("Puppeteer is launched");
      broadcast({
        id: clientId,
        message: "Scraper is up and running",
        type: "status",
      });

      // Create new page and set timeouts
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(CONFIG.TIMEOUT);
      page.setDefaultTimeout(CONFIG.TIMEOUT);

      // Navigate to Google Local Services with search query
      const searchQuery = `${service} in ${location}`;
      await page.goto(
        `https://www.google.com/localservices/prolist?g2lbs=AIQllVxEpXuuCPFrOHRAavT6nJMeIXUuM9D7r7-IlczaiEuKdgYVA09lqC7MIhZ3mUJ_MfwMM30K5vDmEB9UFLvwoZMUuqe_RIT2RmrDlIhrFndV8WuAgW-ioANkhbKSz__jtHfxKrJZLfFak9ca1Vbqi4HEnaKw7Q%3D%3D&hl=en-US&gl=&cs=1&ssta=1&q=${service}+in+${location}&oq=${service}+in+${location}&scp=Cg5nY2lkOmFyY2hpdGVjdBJMEhIJSTKCCzZwQIYRPN4IGI8c6xYaEgkLNjLkhLXqVBFCt95Dkrk7HCIKVGV4YXMsIFVTQSoUDV1uZg8VcypvwB3BkMEVJTvOQ8gwABoKYXJjaGl0ZWN0cyITYXJjaGl0ZWN0cyBpbiB0ZXhhcyoJQXJjaGl0ZWN0&slp=MgA6HENoTUkxWXZoamNfVmhBTVZZSUJRQmgxMkpBRTRSAggCYACSAZsCCgsvZy8xdGg2ZjZ4ZwoNL2cvMTFoY3c1ZDltZAoLL2cvMXd5YzRybWQKDC9nLzEycWg5dzhmZAoNL2cvMTFnNm5sMGxmNQoLL2cvMXRkY2dzdjQKCy9nLzF0aGwxODBzCgsvZy8xdGc3c2RmNwoLL2cvMXRkNGR6cTEKCy9nLzF0ZnNuZDRfCg0vZy8xMWI3bHBtOGIxCgsvZy8xdHp6dng1bAoLL2cvMXRrNHJsMTEKCy9nLzF0a3ZiNGpzCg0vZy8xMWJ4OGNteHM4Cg0vZy8xMWNuMF93MTkxCgsvZy8xdG15NWdzaAoLL2cvMXYzaF9jM3EKCy9nLzF2eWsyeHpnCgsvZy8xdGZtY24xcRIEEgIIARIECgIIAZoBBgoCFxkQAA%3D%3D&src=2&serdesk=1&sa=X&ved=2ahUKEwiyo9uNz9WEAxUMQkEAHZWwBcEQjGp6BAgfEAE`
      );
      console.info(`Google GMB page ${intPageNumber} navigated`);
      broadcast({
        id: clientId,
        message: `Google GMB page navigated`,
        type: "status",
      });
      const currentUrl = page.url();

      // Clear and fill search input
      await page.waitForSelector("input#qjZKOb.MDhB7");
      await page.$eval("input#qjZKOb.MDhB7", (input) => (input.value = ""));
      await page.type("input#qjZKOb.MDhB7", searchQuery);
      await page.keyboard.press("Enter");
      await delay(CONFIG.DELAY_MS);

      // Wait for Google to load search results
      await waitForUrlChange(page, currentUrl);

      // Navigate to specific page number
      const newUrl = page.url();
      const editedUrl = newUrl + `&lci=${intPageNumber * 20}`;
      await page.goto(editedUrl);

      // Extract business information from search results
      await extractBusinessInfo(page, browser, clientId);

      console.log("Scraping Complete");
      broadcast({
        id: clientId,
        message: `Finished Scraping Page ${intPageNumber}`,
        type: "status",
      });
    }
  } catch (error) {
    console.error("Error:", error);
    broadcast({
      id: clientId,
      type: "error",
      message: `Error occurred: ${error.message}`,
    });
  } finally {
    browser && (await browser.close());
  }
}

// WebSocket event handlers
wss.on("listening", () => {
  console.log("WebSocket listening on port: ", CONFIG.WEBSOCKET_PORT);
});

wss.on("connection", (ws, request) => {
  const origin = request.headers.origin;
  const url = new URL(request.url, `http://${origin}`);
  // const allowedOrigins = [process.env.BASE_URL, process.env.BASE_URL_2];
  // if (!allowedOrigins.includes(origin)) {
  //   console.log("Access denied for origin:", origin);
  //   ws.close(1008, "Unauthorized origin");
  //   return;
  // }
  const uuid = uuidv4();
  clients.set(uuid, ws);
  broadcast({ id: uuid, type: "status", message: "Connection Established" });
  const location = url.searchParams.get("location");
  const service = url.searchParams.get("service");
  console.log("Service: ", service, "Location: ", location);
  if (!location || !service) {
    broadcast({
      id: uuid,
      message: "Missing Details",
      type: "error",
    });
    ws.close();
  }
  scraper({
    clientId: uuid,
    location,
    pageNumber: 1,
    service,
  }).then(() => {
    ws.close();
  });
});

wss.on("close", () => {
  wss.clients.forEach((client) => {
    client.terminate();
  });
  console.log("WebSocket connections closed.");
});

// HTTP route handlers
app.post("/scrape", async (req, res) => {
  const { service, location, pageNumber, clientId } = req.body;
  try {
    await scraper({ service, location, pageNumber, clientId });
    res.status(200).send("Scraping complete");
  } catch (error) {
    console.error("Error:", error);
    broadcast({
      id: clientId,
      type: "error",
      message: `Error occurred: ${error.message}`,
    });
    res.status(500).send("Internal Server Error");
  }
});

app.get("/ping", (_, res) => {
  res.send("hello world");
  setInterval(async () => {
    fetch(`https://papa-johns.onrender.com`).then((res) => {});
  }, 10000);
});

// Start HTTP server
app.listen(CONFIG.HTTP_PORT, () => {
  console.log("HTTP server listening on: ", CONFIG.HTTP_PORT);
});

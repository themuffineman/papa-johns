const puppeteer = require("puppeteer");
const express = require("express");
const { WebSocketServer } = require("ws");
const { v4: uuidv4 } = require("uuid");
const WS_OPEN = require("ws").OPEN;
require("dotenv").config();

const WSPORT = 8080;
const PORT = 8090;
const cors = require("cors");
const app = express();
app.use(
  cors({
    origin: "*",
  })
);
const clients = new Map();
const wss = new WebSocketServer({ port: WSPORT });
wss.on("listening", () => {
  console.log("WebSocket listening on port: ", WSPORT);
});
app.use(express.json());
app.listen(PORT, () => {
  console.log("HTTP server listening on: ", PORT);
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

app.post("/scrape", async (req, res) => {
  let browser;
  const { service, location, pageNumber, clientId } = req.body;
  try {
    if (service && location && pageNumber) {
      console.log("The Scraping Queries:", service, ",", location);
      const intPageNumber = 1; //parseInt(pageNumber);

      browser = await puppeteer.launch({
        headless: false,
        executablePath:
          process.env.NODE_ENV === "production"
            ? process.env.PUPPETERR_EXECUTABLE_PATH
            : puppeteer.executablePath(),
        args: [
          `--disable-setuid-sandbox`,
          // `--single-process`,
          `--no-sandbox,`,
          // `--no-zygote`,
          `--disable-dev-shm-usage`,
        ],
      });
      console.log("Puppeteer is launched");
      broadcast({
        id: clientId,
        message: "Scraper is up and running",
        type: "status",
      });

      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(900000);
      page.setDefaultTimeout(900000);

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

      //Wait for input element and search
      await page.waitForSelector("input#qjZKOb.MDhB7");
      await page.$eval("input#qjZKOb.MDhB7", (input) => (input.value = ""));
      await page.type("input#qjZKOb.MDhB7", `${service} in ${location}`);
      await page.keyboard.press("Enter");
      await delay(5000);
      //Checkin if the URL has changed
      let exitLoop = false;
      let urlDetections = 0;
      console.log("Detecting URL change...");
      while (!exitLoop) {
        if (urlDetections > 12) {
          console.log("URL change detection timeout");
        }
        const newUrl = page.url();
        if (newUrl !== currentUrl) {
          exitLoop = true;
        } else {
          console.log("Still detecting URL change...");
          urlDetections++;
          await delay(5000);
        }
      }
      const newUrl = page.url();
      const editedUrl = newUrl + `&lci=${intPageNumber * 20}`;
      await page.goto(editedUrl);

      await page.waitForSelector("div.rgnuSb.xYjf2e");
      await page.waitForSelector(".AIYI7d");

      // Wait for cards to load
      const cards = await page.$$('div[jsname="gam5T"]');

      // max pages to scrape
      const textContent = await page.$eval(
        ".AIYI7d",
        (element) => element.textContent
      );
      const lastNumbersMatch = textContent.match(/\d+$/);
      const lastNumber = lastNumbersMatch
        ? parseInt(lastNumbersMatch[0], 10)
        : null;
      const pagesToScrape = Math.floor(lastNumber / 20);
      broadcast({
        id: clientId,
        message: pagesToScrape,
        type: "count",
      });
      // The real scraping begins here
      for (const card of cards) {
        const businessName = await card.$eval(
          "div.rgnuSb.xYjf2e",
          (node) => node.textContent
        );
        const websiteATag = await card.$('a[aria-label="Website"]');
        const url = websiteATag
          ? await (await websiteATag.getProperty("href")).jsonValue()
          : null;

        if (url) {
          const newPage = await browser.newPage();
          newPage.setDefaultNavigationTimeout(900000);
          newPage.setDefaultTimeout(900000);

          try {
            await newPage.goto(url);
            console.info(`Navigated to ${url}`);
            broadcast({
              id: clientId,
              message: `Navigated to ${url.slice(0, 10)}...`,
              type: "status",
            });

            let tempEmails = [];
            //Now we are search for all the email addressses on this page
            const crawledEmails = await crawl(newPage);
            tempEmails.push(...crawledEmails);
            const rootUrl = new URL(url).hostname.replace(/^www\./, "");
            // data pre-processing for getting the urls on the page
            const anchorTags = await newPage.$$eval("a", (anchors) =>
              anchors.map((anchor) => anchor.href)
            );
            const filteredAnchorTags = [...new Set(anchorTags)]; // removing duplicates
            const internalAnchorTags = filteredAnchorTags.filter((anchor) =>
              anchor.includes(rootUrl)
            ); // removing non root urls
            const internalLinks = internalAnchorTags.filter(
              (link) => link.includes("contact") || link.includes("touch")
            ); // filtering down to contact links

            for (const link of internalLinks) {
              try {
                await newPage.goto(link);
                const secondaryCrawledEmails = await crawl(newPage);
                tempEmails.push(...secondaryCrawledEmails);
              } catch (error) {
                console.log(`Error navigating to url on link: `, link);
              }
            }

            broadcast({
              id: clientId,
              message: {
                name: businessName,
                tempName: businessName,
                url,
                emails: [...new Set(tempEmails)],
              },
              type: "lead",
            });
          } catch (error) {
            console.error(`Error navigating to ${url}: ${error}`);
          } finally {
            await newPage.close();
          }
        }
      }
      res.status(200).send("Scraping complete");
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
    res.status(500).send("Internal Server Error");
  } finally {
    browser && (await browser.close());
  }

  async function crawl(page) {
    const crawledEmails = [];

    // Extract all <a> tags on the page
    const links = await page.evaluate(() => {
      const anchorTags = Array.from(document.querySelectorAll("a"));
      return anchorTags.map((a) => a.href);
    });

    const emailLinks = links.filter((link) => link.startsWith("mailto:"));

    emailLinks.forEach((link) => {
      const email = link.replace("mailto:", "");
      crawledEmails.push(email);
    });

    const text = await page.evaluate(() => document.body.textContent);

    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

    let match;
    while ((match = emailRegex.exec(text)) !== null) {
      crawledEmails.push(match[0]);
    }

    return crawledEmails;
  }
});

wss.on("close", () => {
  wss.clients.forEach((client) => {
    client.terminate();
  });
  console.log("WebSocket connections closed.");
});

app.get("/ping", (_, res) => {
  res.send("hello world");
  setInterval(async () => {
    fetch(`https://papa-johns.onrender.com`).then((res) => {});
  }, 10000);
});

function broadcast({ message, type, id }) {
  const ws = clients.get(id);
  if (ws && ws.readyState === WS_OPEN) {
    ws.send(
      JSON.stringify({
        message,
        type,
      })
    );
    console.log("Sent render to user: ", id);
  } else {
    console.warn(`User ${id} is not connected.`);
  }
}
async function delay(delay) {
  return new Promise((res) => {
    setTimeout(() => {
      res("Success");
    }, delay);
  });
}
const scraper = async ({ service, location, pageNumber, clientId }) => {
  let browser;

  try {
    if (service && location && pageNumber) {
      console.log("The Scraping Queries:", service, ",", location);
      const intPageNumber = 1; //parseInt(pageNumber);

      browser = await puppeteer.launch({
        headless: false,
        executablePath:
          process.env.NODE_ENV === "production"
            ? process.env.PUPPETERR_EXECUTABLE_PATH
            : puppeteer.executablePath(),
        args: [
          `--disable-setuid-sandbox`,
          // `--single-process`,
          `--no-sandbox,`,
          // `--no-zygote`,
          `--disable-dev-shm-usage`,
        ],
      });
      console.log("Puppeteer is launched");
      broadcast({
        id: clientId,
        message: "Scraper is up and running",
        type: "status",
      });

      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(900000);
      page.setDefaultTimeout(900000);

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

      //Wait for input element and search
      await page.waitForSelector("input#qjZKOb.MDhB7");
      await page.$eval("input#qjZKOb.MDhB7", (input) => (input.value = ""));
      await page.type("input#qjZKOb.MDhB7", `${service} in ${location}`);
      await page.keyboard.press("Enter");
      await delay(5000);
      //Checkin if the URL has changed
      let exitLoop = false;
      let urlDetections = 0;
      console.log("Detecting URL change...");
      while (!exitLoop) {
        if (urlDetections > 12) {
          console.log("URL change detection timeout");
        }
        const newUrl = page.url();
        if (newUrl !== currentUrl) {
          exitLoop = true;
        } else {
          console.log("Still detecting URL change...");
          urlDetections++;
          await delay(5000);
        }
      }
      const newUrl = page.url();
      const editedUrl = newUrl + `&lci=${intPageNumber * 20}`;
      await page.goto(editedUrl);

      await page.waitForSelector("div.rgnuSb.xYjf2e");
      await page.waitForSelector(".AIYI7d");

      // Wait for cards to load
      const cards = await page.$$('div[jsname="gam5T"]');

      // max pages to scrape
      const textContent = await page.$eval(
        ".AIYI7d",
        (element) => element.textContent
      );
      const lastNumbersMatch = textContent.match(/\d+$/);
      const lastNumber = lastNumbersMatch
        ? parseInt(lastNumbersMatch[0], 10)
        : null;
      const pagesToScrape = Math.floor(lastNumber / 20);
      broadcast({
        id: clientId,
        message: pagesToScrape,
        type: "count",
      });
      // The real scraping begins here
      for (const card of cards) {
        const businessName = await card.$eval(
          "div.rgnuSb.xYjf2e",
          (node) => node.textContent
        );
        const websiteATag = await card.$('a[aria-label="Website"]');
        const url = websiteATag
          ? await (await websiteATag.getProperty("href")).jsonValue()
          : null;

        if (url) {
          const newPage = await browser.newPage();
          newPage.setDefaultNavigationTimeout(900000);
          newPage.setDefaultTimeout(900000);

          try {
            await newPage.goto(url);
            console.info(`Navigated to ${url}`);
            broadcast({
              id: clientId,
              message: `Navigated to ${url.slice(0, 10)}...`,
              type: "status",
            });

            let tempEmails = [];
            //Now we are search for all the email addressses on this page
            const crawledEmails = await crawl(newPage);
            tempEmails.push(...crawledEmails);
            const rootUrl = new URL(url).hostname.replace(/^www\./, "");
            // data pre-processing for getting the urls on the page
            const anchorTags = await newPage.$$eval("a", (anchors) =>
              anchors.map((anchor) => anchor.href)
            );
            const filteredAnchorTags = [...new Set(anchorTags)]; // removing duplicates
            const internalAnchorTags = filteredAnchorTags.filter((anchor) =>
              anchor.includes(rootUrl)
            ); // removing non root urls
            const internalLinks = internalAnchorTags.filter(
              (link) => link.includes("contact") || link.includes("touch")
            ); // filtering down to contact links

            for (const link of internalLinks) {
              try {
                await newPage.goto(link);
                const secondaryCrawledEmails = await crawl(newPage);
                tempEmails.push(...secondaryCrawledEmails);
              } catch (error) {
                console.log(`Error navigating to url on link: `, link);
              }
            }

            broadcast({
              id: clientId,
              message: {
                name: businessName,
                tempName: businessName,
                url,
                emails: [...new Set(tempEmails)],
              },
              type: "lead",
            });
          } catch (error) {
            console.error(`Error navigating to ${url}: ${error}`);
          } finally {
            await newPage.close();
          }
        }
      }
      console.log("Scraping Complete");
      broadcast({
        id: clientId,
        message: `Finished Scraping Page ${intPageNumber}`,
        type: "status",
      });
      return;
    }
  } catch (error) {
    console.error("Error:", error);
    broadcast({
      id: clientId,
      type: "error",
      message: `Error occurred: ${error.message}`,
    });
  } finally {
    await browser.close();
    return;
  }

  async function crawl(page) {
    const crawledEmails = [];

    // Extract all <a> tags on the page
    const links = await page.evaluate(() => {
      const anchorTags = Array.from(document.querySelectorAll("a"));
      return anchorTags.map((a) => a.href);
    });

    const emailLinks = links.filter((link) => link.startsWith("mailto:"));

    emailLinks.forEach((link) => {
      const email = link.replace("mailto:", "");
      crawledEmails.push(email);
    });

    const text = await page.evaluate(() => document.body.textContent);

    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

    let match;
    while ((match = emailRegex.exec(text)) !== null) {
      crawledEmails.push(match[0]);
    }

    return crawledEmails;
  }
};

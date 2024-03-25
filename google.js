const express = require('express');
const puppeteer = require('puppeteer');
const WebSocket = require('ws');

const app = express();
const port = 8080;


app.use(express.urlencoded({ extended: true }));
app.use(express.json());



const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

const wss = new WebSocket.Server({ server });

function broadcast(message) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

app.get('/', async(req, res) => {
    try {
        const {service, location} = req.query
        console.log('the queries', service, location)
        // Launch a headless browser
        const browser = await puppeteer.launch();
        console.log('puppeteer is launched')
        const page = await browser.newPage();
        console.log('initial page is opened')

        broadcast("Google GMB Page Created");
    
        page.setDefaultNavigationTimeout(900000); 
        page.setDefaultTimeout(900000);
    
        // Navigate to the main website
        await page.goto(`https://www.google.com/localservices/prolist?g2lbs=AIQllVxEpXuuCPFrOHRAavT6nJMeIXUuM9D7r7-IlczaiEuKdgYVA09lqC7MIhZ3mUJ_MfwMM30K5vDmEB9UFLvwoZMUuqe_RIT2RmrDlIhrFndV8WuAgW-ioANkhbKSz__jtHfxKrJZLfFak9ca1Vbqi4HEnaKw7Q%3D%3D&hl=en-NA&gl=na&cs=1&ssta=1&q=${service}+in+${location}&oq=${service}+in+${location}&scp=Cg5nY2lkOmFyY2hpdGVjdBJMEhIJSTKCCzZwQIYRPN4IGI8c6xYaEgkLNjLkhLXqVBFCt95Dkrk7HCIKVGV4YXMsIFVTQSoUDV1uZg8VcypvwB3BkMEVJTvOQ8gwABoKYXJjaGl0ZWN0cyITYXJjaGl0ZWN0cyBpbiB0ZXhhcyoJQXJjaGl0ZWN0&slp=MgA6HENoTUkxWXZoamNfVmhBTVZZSUJRQmgxMkpBRTRSAggCYACSAZsCCgsvZy8xdGg2ZjZ4ZwoNL2cvMTFoY3c1ZDltZAoLL2cvMXd5YzRybWQKDC9nLzEycWg5dzhmZAoNL2cvMTFnNm5sMGxmNQoLL2cvMXRkY2dzdjQKCy9nLzF0aGwxODBzCgsvZy8xdGc3c2RmNwoLL2cvMXRkNGR6cTEKCy9nLzF0ZnNuZDRfCg0vZy8xMWI3bHBtOGIxCgsvZy8xdHp6dng1bAoLL2cvMXRrNHJsMTEKCy9nLzF0a3ZiNGpzCg0vZy8xMWJ4OGNteHM4Cg0vZy8xMWNuMF93MTkxCgsvZy8xdG15NWdzaAoLL2cvMXYzaF9jM3EKCy9nLzF2eWsyeHpnCgsvZy8xdGZtY24xcRIEEgIIARIECgIIAZoBBgoCFxkQAA%3D%3D&src=2&serdesk=1&sa=X&ved=2ahUKEwiyo9uNz9WEAxUMQkEAHZWwBcEQjGp6BAgfEAE`);
        broadcast("Google GMB Page Navigated");
        console.log("Google GMB Page Navigated");
    
        // Wait for cards to load
        await page.waitForSelector('div.rgnuSb.xYjf2e');
        broadcast('Cards selector has Loaded')
        console.log('Cards selector has Loaded')
    
        // Get all the business cards
        const cards = await page.$$('div[jsname="gam5T"]');
        const businessData = [];
    
    
       

        for (const card of cards) {
            const businessName = await card.$eval('div.rgnuSb.xYjf2e', node => node.textContent);
            const websiteATag = await card.$('a[aria-label="Website"]');
            const url = websiteATag ? await (await websiteATag.getProperty('href')).jsonValue() : null;
    
            if (url) {
                const newPage = await browser.newPage();
                console.log('created a page for:', url);
                newPage.setDefaultNavigationTimeout(900000);
                newPage.setDefaultTimeout(900000);
            
                try {
                    await newPage.goto(url);
                    console.log(`Navigated to ${url}`);

                    let tempEmails = []
                    const crawledEmails = await crawl(newPage);
                    console.log(`Found these emails: ${crawledEmails}`);
                    tempEmails.push(...crawledEmails)

                    const rootUrl = new URL(url).hostname.replace(/^www\./, '');;
                    console.log('heres the root url', rootUrl)

                    const anchorTags = await newPage.$$eval('a', anchors => anchors.map(anchor => anchor.href));
                    console.log('we found these a tags', anchorTags)
                    const filteredAnchorTags = [...new Set(anchorTags)]; // removing duplicates
                    console.log('we removed duplicates', filteredAnchorTags)
                    const internalAnchorTags = filteredAnchorTags.filter((anchor)=> (anchor.includes(rootUrl))) // removing non root urls
                    console.log('we removed the non root domains', internalAnchorTags)
                    const internalLinks = internalAnchorTags.filter(link => (link.includes('contact'))); // filtering down to contact links
                    console.log('only contact links', internalLinks)
                    
                    for (const link of internalLinks) {
                        console.log(`Visiting internal link: ${link}`);
                        await newPage.goto(link);
                        const secondaryCrawledEmails = await crawl(newPage);
                        console.log(`Found these emails on ${link}: ${secondaryCrawledEmails}`);
                        tempEmails.push(...secondaryCrawledEmails);
                    }
                    
                    businessData.push({ name: businessName, url, emails: [...new Set(tempEmails)] });
                    
                    
                   


                } catch (error) {
                    console.error(`Error navigating to ${url}: ${error}`);
                } finally {
                    await newPage.close();
                }
            }  
        }

        console.log('this is the business data', businessData);
        const filteredBusinessData = businessData.filter(data => data.emails !== null);
        console.log('this is the filtered business data', filteredBusinessData);
        res.send(JSON.stringify(filteredBusinessData));
        await browser.close();
    
    } catch (error) {
        console.error('Error:', error);
        broadcast('Error occurred: ' + error.message);
        res.status(500).send('Internal Server Error');
    }
    
    async function crawl(page) {
        const crawledEmails = [];
    
        // Extract all <a> tags on the page
        const links = await page.evaluate(() => {
            const anchorTags = Array.from(document.querySelectorAll('a'));
            return anchorTags.map(a => a.href);
        });
    
        // Filter links that are email links
        const emailLinks = links.filter(link => link.startsWith('mailto:'));
    
        // Extract email addresses from email links
        emailLinks.forEach(link => {
            const email = link.replace('mailto:', '');
            crawledEmails.push(email);
        });
    
        // Extract text content from the page
        const text = await page.evaluate(() => document.body.textContent);
    
        // Regular expression to find email addresses
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    
        // Find all email addresses in the text content
        let match;
        while ((match = emailRegex.exec(text)) !== null) {
            crawledEmails.push(match[0]);
        }
    
        return crawledEmails;
    }
    
        
    
});




const express = require('express');
require('dotenv').config()
const cors = require('cors')
const puppeteer = require('puppeteer');
const WebSocket = require('ws');

const app = express();

const port = 8080;


app.use(cors({
    origin: '*'
}))
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

app.get('/scrape', async(req, res) => {
    let browser;
    try {
        const {service, location, pageNumber} = req.query

        if (service && location && pageNumber){
            console.log('The Scraping Queries:', service,',', location, ',', pageNumber)
            const intPageNumber = parseInt(pageNumber)
           
            browser = await puppeteer.launch({
                executablePath: process.env.NODE_ENV === 'production' ?
                    process.env.PUPPETERR_EXECUTABLE_PATH:
                    puppeteer.executablePath(),
                args: [
                    `--disable-setuid-sandbox`,
                    // `--single-process`,
                    // `--no-sandbox,`,
                    // `--no-zygote`,
                    `--disable-dev-shm-usage`
                ],
            });
            console.log('Puppeteer is launched')
            broadcast('Puppeteer is up and running')
            
            const page = await browser.newPage();
            page.setDefaultNavigationTimeout(900000); 
            page.setDefaultTimeout(900000);
        
            // Navigate to the GMB website
            if(intPageNumber === 0){
                // await page.goto(`https://www.google.com/localservices/prolist?g2lbs=AIQllVxEpXuuCPFrOHRAavT6nJMeIXUuM9D7r7-IlczaiEuKdgYVA09lqC7MIhZ3mUJ_MfwMM30K5vDmEB9UFLvwoZMUuqe_RIT2RmrDlIhrFndV8WuAgW-ioANkhbKSz__jtHfxKrJZLfFak9ca1Vbqi4HEnaKw7Q%3D%3D&hl=en-US&gl=&cs=1&ssta=1&q=${service}+in+${location}&oq=${service}+in+${location}&scp=Cg5nY2lkOmFyY2hpdGVjdBJMEhIJSTKCCzZwQIYRPN4IGI8c6xYaEgkLNjLkhLXqVBFCt95Dkrk7HCIKVGV4YXMsIFVTQSoUDV1uZg8VcypvwB3BkMEVJTvOQ8gwABoKYXJjaGl0ZWN0cyITYXJjaGl0ZWN0cyBpbiB0ZXhhcyoJQXJjaGl0ZWN0&slp=MgA6HENoTUkxWXZoamNfVmhBTVZZSUJRQmgxMkpBRTRSAggCYACSAZsCCgsvZy8xdGg2ZjZ4ZwoNL2cvMTFoY3c1ZDltZAoLL2cvMXd5YzRybWQKDC9nLzEycWg5dzhmZAoNL2cvMTFnNm5sMGxmNQoLL2cvMXRkY2dzdjQKCy9nLzF0aGwxODBzCgsvZy8xdGc3c2RmNwoLL2cvMXRkNGR6cTEKCy9nLzF0ZnNuZDRfCg0vZy8xMWI3bHBtOGIxCgsvZy8xdHp6dng1bAoLL2cvMXRrNHJsMTEKCy9nLzF0a3ZiNGpzCg0vZy8xMWJ4OGNteHM4Cg0vZy8xMWNuMF93MTkxCgsvZy8xdG15NWdzaAoLL2cvMXYzaF9jM3EKCy9nLzF2eWsyeHpnCgsvZy8xdGZtY24xcRIEEgIIARIECgIIAZoBBgoCFxkQAA%3D%3D&src=2&serdesk=1&sa=X&ved=2ahUKEwiyo9uNz9WEAxUMQkEAHZWwBcEQjGp6BAgfEAE`);
                await page.goto('https://www.google.com/localservices/prolist?g2lbs=AIQllVy8_BwcU5s9UwVyCtx14C0m8XSYJRnqCjpDSn8f1_V0I1sAIxnl7-RL40t8v15xdWPk3PmLf4jse7a_f5ET1nILbEqJ6s1FL_FpKVHzVmDVp2S4KZUqxOVAYPcsgyvdWt8K-AOL&hl=en-NA&gl=na&cs=1&ssta=1&q=architects%20in%20texas&oq=architects%20in%20texas&slp=MgBSAggCYACSAZsCCgsvZy8xdGg2ZjZ4ZwoNL2cvMTFoY3c1ZDltZAoLL2cvMXRkaDQ4aDMKCy9nLzF3eWM0cm1kCgsvZy8xdGtzajVkdwoML2cvMTJxaDl3OGZkCg0vZy8xMWc2bmwwbGY1CgsvZy8xdHQxdDJubgoLL2cvMXRobDE4MHMKCy9nLzF0ZGNnc3Y0Cg0vZy8xMWNteTRuOXY0CgsvZy8xdGQ0ZHpxMQoNL2cvMTFid3FiazB3ZgoLL2cvMXRmc25kNF8KCy9nLzF0Zjg3Z3dwCgsvZy8xdGc3c2RmNwoNL2cvMTFiN2xwbThiMQoLL2cvMXR6enZ4NWwKCy9nLzF0bXk1Z3NoCgsvZy8xdGtiNWhoMBIEEgIIARIECgIIAZoBBgoCFxkQAA%3D%3D&src=2&serdesk=1&sa=X&ved=2ahUKEwjL6pbpv7qFAxV90AIHHYWEDc8QjGp6BAglEAE&scp=Cg5nY2lkOmFyY2hpdGVjdBJMEhIJSTKCCzZwQIYRPN4IGI8c6xYaEgkLNjLkhLXqVBFCt95Dkrk7HCIKVGV4YXMsIFVTQSoUDV1uZg8VcypvwB3BkMEVJTvOQ8gwABoKYXJjaGl0ZWN0cyITYXJjaGl0ZWN0cyBpbiB0ZXhhcyoJQXJjaGl0ZWN0')
                console.info('Navigated To GMB Website')
                broadcast('Navigated To GMB Website')

                //Wait for input element and search
                await page.waitForSelector('input#qjZKOb.MDhB7');
                console.log('Search Selector has appeared')
                await page.$eval('input#qjZKOb.MDhB7', input => input.value = '');
                await page.type('input#qjZKOb.MDhB7', `${service} in ${location}`);
                await page.keyboard.press('Enter');
                await new Promise(resolve => setTimeout(resolve, 10000));
                let exitLoop = false
                while(!exitLoop){
                    const newUrl = page.url();
                    if(newUrl !== currentUrl){
                        console.log('Page has navigated to a new URL:', newUrl);
                        exitLoop=true
                    }
                    setTimeout(()=> console('Url is still the same'), 5000)
                }

                // Wait for cards to load
                await page.waitForSelector('div.rgnuSb.xYjf2e');
                await page.waitForSelector('.AIYI7d');
              
            
                // Get all the business cards
                const cards = await page.$$('div[jsname="gam5T"]');
    
                for (const card of cards) {
                    const businessName = await card.$eval('div.rgnuSb.xYjf2e', node => node.textContent);
                    const websiteATag = await card.$('a[aria-label="Website"]');
                    const url = websiteATag ? await (await websiteATag.getProperty('href')).jsonValue() : null;
            
                    if (url) {
                        const newPage = await browser.newPage();
                        newPage.setDefaultNavigationTimeout(900000);
                        newPage.setDefaultTimeout(900000);
                    
                        try {
                            await newPage.goto(url);
                            console.info(`Navigated to ${url}`);
                            broadcast(`Navigated to ${url}`);
    
        
                            let tempEmails = []
                            const crawledEmails = await crawl(newPage);
                            tempEmails.push(...crawledEmails)
        
                            const rootUrl = new URL(url).hostname.replace(/^www\./, '');
    
                            //data pre-processing
                            const anchorTags = await newPage.$$eval('a', anchors => anchors.map(anchor => anchor.href));
                            const filteredAnchorTags = [...new Set(anchorTags)]; // removing duplicates
                            const internalAnchorTags = filteredAnchorTags.filter((anchor)=> (anchor.includes(rootUrl))) // removing non root urls
                            const internalLinks = internalAnchorTags.filter(link => (link.includes('contact'))); // filtering down to contact links
                            
                            for (const link of internalLinks) {
                                await newPage.goto(link);
                                const secondaryCrawledEmails = await crawl(newPage);
                                tempEmails.push(...secondaryCrawledEmails);
                            }
                            
                            broadcast(JSON.stringify({ name: businessName, url, emails: [...new Set(tempEmails)], platform: 'google'}));
        
                        } catch (error) {
                            console.error(`Error navigating to ${url}: ${error}`);
                        } finally {
                            await newPage.close();
                        }
                    }  
                }
                console.log('Scraping Complete')
                res.status(200).send('Scraping complete');
            }
            else if(intPageNumber >= 1){
    
                await page.goto(`https://www.google.com/localservices/prolist?g2lbs=AIQllVxEpXuuCPFrOHRAavT6nJMeIXUuM9D7r7-IlczaiEuKdgYVA09lqC7MIhZ3mUJ_MfwMM30K5vDmEB9UFLvwoZMUuqe_RIT2RmrDlIhrFndV8WuAgW-ioANkhbKSz__jtHfxKrJZLfFak9ca1Vbqi4HEnaKw7Q%3D%3D&hl=en-US&gl=&cs=1&ssta=1&q=${service}+in+${location}&oq=${service}+in+${location}&scp=Cg5nY2lkOmFyY2hpdGVjdBJMEhIJSTKCCzZwQIYRPN4IGI8c6xYaEgkLNjLkhLXqVBFCt95Dkrk7HCIKVGV4YXMsIFVTQSoUDV1uZg8VcypvwB3BkMEVJTvOQ8gwABoKYXJjaGl0ZWN0cyITYXJjaGl0ZWN0cyBpbiB0ZXhhcyoJQXJjaGl0ZWN0&slp=MgA6HENoTUkxWXZoamNfVmhBTVZZSUJRQmgxMkpBRTRSAggCYACSAZsCCgsvZy8xdGg2ZjZ4ZwoNL2cvMTFoY3c1ZDltZAoLL2cvMXd5YzRybWQKDC9nLzEycWg5dzhmZAoNL2cvMTFnNm5sMGxmNQoLL2cvMXRkY2dzdjQKCy9nLzF0aGwxODBzCgsvZy8xdGc3c2RmNwoLL2cvMXRkNGR6cTEKCy9nLzF0ZnNuZDRfCg0vZy8xMWI3bHBtOGIxCgsvZy8xdHp6dng1bAoLL2cvMXRrNHJsMTEKCy9nLzF0a3ZiNGpzCg0vZy8xMWJ4OGNteHM4Cg0vZy8xMWNuMF93MTkxCgsvZy8xdG15NWdzaAoLL2cvMXYzaF9jM3EKCy9nLzF2eWsyeHpnCgsvZy8xdGZtY24xcRIEEgIIARIECgIIAZoBBgoCFxkQAA%3D%3D&src=2&serdesk=1&sa=X&ved=2ahUKEwiyo9uNz9WEAxUMQkEAHZWwBcEQjGp6BAgfEAE`);
                console.info(`Google GMB page ${intPageNumber} navigated`);
                broadcast(`Google GMB page ${intPageNumber} navigated`);
                const currentUrl = page.url();

                
                //Wait for input element and search
                await page.waitForSelector('input#qjZKOb.MDhB7');
                console.log('Search selector has appeared')
                await page.$eval('input#qjZKOb.MDhB7', input => input.value = '');
                await page.type('input#qjZKOb.MDhB7', `${service} in ${location}`);
                await page.keyboard.press('Enter');
                await new Promise(resolve => setTimeout(resolve, 10000));
                let exitLoop = false
                while(!exitLoop){
                    const newUrl = page.url();
                    if(newUrl !== currentUrl){
                        console.log('Page has navigated to a new URL:', newUrl);
                        exitLoop=true
                    }
                    setTimeout(()=> console('Url is still the same'), 5000)
                }
                const newUrl = page.url();
                const editedUrl = newUrl + `&lci=${intPageNumber*20}`;
                console.log('this is the edited url', editedUrl)
                await page.goto(editedUrl);
                console.log('Now at the new site')
                
                await page.waitForSelector('div.rgnuSb.xYjf2e');
                await page.waitForSelector('.AIYI7d');
        
                // Wait for cards to load
                const cards = await page.$$('div[jsname="gam5T"]');
            
                // max pages to scrape
                const textContent = await page.$eval('.AIYI7d', element => element.textContent);
                const lastNumbersMatch = textContent.match(/\d+$/);
                const lastNumber = lastNumbersMatch ? parseInt(lastNumbersMatch[0], 10) : null;
                const pagesToScrape = Math.floor(lastNumber / 20);
                broadcast(JSON.stringify({pages:pagesToScrape}));
    
                for (const card of cards) {
                    const businessName = await card.$eval('div.rgnuSb.xYjf2e', node => node.textContent);
                    const websiteATag = await card.$('a[aria-label="Website"]');
                    const url = websiteATag ? await (await websiteATag.getProperty('href')).jsonValue() : null;
            
                    if (url) {
                        const newPage = await browser.newPage();
                        newPage.setDefaultNavigationTimeout(900000);
                        newPage.setDefaultTimeout(900000);
                    
                        try {
                            await newPage.goto(url);
                            broadcast(`Navigated to ${url}`);
    
    
                            let tempEmails = []
                            const crawledEmails = await crawl(newPage);
                            tempEmails.push(...crawledEmails)
    
                            const rootUrl = new URL(url).hostname.replace(/^www\./, '');;
    
                            // data pre-processing
                            const anchorTags = await newPage.$$eval('a', anchors => anchors.map(anchor => anchor.href));
                            const filteredAnchorTags = [...new Set(anchorTags)]; // removing duplicates
                            const internalAnchorTags = filteredAnchorTags.filter((anchor)=> (anchor.includes(rootUrl))) // removing non root urls
                            const internalLinks = internalAnchorTags.filter(link => (link.includes('contact'))); // filtering down to contact links

                            for (const link of internalLinks) {
                                await newPage.goto(link);
                                const secondaryCrawledEmails = await crawl(newPage);
                                tempEmails.push(...secondaryCrawledEmails);
                            }
                            
                            broadcast(JSON.stringify({ name: businessName, url, emails: [...new Set(tempEmails)], platform: 'google'}));
    
                        } catch (error) {
                            console.error(`Error navigating to ${url}: ${error}`);
                        } finally {
                            await newPage.close();
                        }
                    }  
                } 
                res.status(200).send('Scraping complete');
                console.log('Scraping Complete')
                broadcast(`Finished Scraping Page ${intPageNumber}`)
            }
            
        }
        
    }catch(error) { 
        console.error('Error:', error);
        broadcast('Error occurred: ' + error.message);
        res.status(500).send('Internal Server Error');
    }finally{
        await browser.close();
    }
        
    async function crawl(page) {
        const crawledEmails = [];
    
        // Extract all <a> tags on the page
        const links = await page.evaluate(() => {
            const anchorTags = Array.from(document.querySelectorAll('a'));
            return anchorTags.map(a => a.href);
        });
    
        const emailLinks = links.filter(link => link.startsWith('mailto:'));
    
        emailLinks.forEach(link => {
            const email = link.replace('mailto:', '');
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




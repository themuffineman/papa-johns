// import {MongoClient, ObjectId} from 'mongodb'
// import puppeteer from 'puppeteer'
// import express from 'express'
// import dotenv from 'dotenv'

// dotenv.config()

// const PORT = 8080 

// const app = express()

// app.listen(PORT, ()=> {console.log(`Server listening on port ${PORT}`)})
// let browser;
// let startingCity
// let startingPage
// let emailsSent = 0;
// let locationCollection;
// let intermidaryCollection;
// let emailsCollection;

// app.get('/leads', async (req , res)=>{
    
    
//     console.log('Script is up and running')


//     try {

//         const client = new MongoClient(process.env.URI)
//         await client.connect()
//         locationCollection = client.db('pendora').collection('locations')
//         intermidaryCollection = client.db('pendora').collection('intermediary')
//         emailsCollection = client.db('pendora').collection('leads')
//         const locationDocument = await locationCollection.findOne()

//         const cities = locationDocument.cities
//         const service = 'Architects'
//         startingCity = locationDocument.index
//         startingPage = locationDocument.page
//         let maxpages = startingPage+10

//         console.log('starting page is', startingPage)
//         console.log('max pages page is', maxpages)
//         console.log('Current City:', cities[startingCity])

//         browser = await puppeteer.launch({
//             timeout: 180000,
//             executablePath: process.env.NODE_ENV === 'production' ?
//                 process.env.PUPPETERR_EXECUTABLE_PATH:
//                 puppeteer.executablePath(),
//             args: [
//                 `--disable-setuid-sandbox`,
//                 `--disable-dev-shm-usage`
//             ],
//         });
//         console.log('Puppeteer is launched')

//         //Loop to scrape the whole city
//         while(emailsSent < 100){
            
//             const page = await browser.newPage();
//             page.setDefaultNavigationTimeout(900000); 
//             page.setDefaultTimeout(900000);

//             while(startingPage < maxpages && emailsSent < 100){

//                 if(startingPage === 0){
//                     await page.goto(`https://www.google.com/localservices/prolist?g2lbs=AIQllVxEpXuuCPFrOHRAavT6nJMeIXUuM9D7r7-IlczaiEuKdgYVA09lqC7MIhZ3mUJ_MfwMM30K5vDmEB9UFLvwoZMUuqe_RIT2RmrDlIhrFndV8WuAgW-ioANkhbKSz__jtHfxKrJZLfFak9ca1Vbqi4HEnaKw7Q%3D%3D&hl=en-US&gl&cs=1&ssta=1&q=architects%20in%20texas&oq=architects%20in%20texas&slp=MgA6HENoTUkxWXZoamNfVmhBTVZZSUJRQmgxMkpBRTRSAggCYACSAZsCCgsvZy8xdGg2ZjZ4ZwoNL2cvMTFoY3c1ZDltZAoLL2cvMXd5YzRybWQKDC9nLzEycWg5dzhmZAoNL2cvMTFnNm5sMGxmNQoLL2cvMXRkY2dzdjQKCy9nLzF0aGwxODBzCgsvZy8xdGc3c2RmNwoLL2cvMXRkNGR6cTEKCy9nLzF0ZnNuZDRfCg0vZy8xMWI3bHBtOGIxCgsvZy8xdHp6dng1bAoLL2cvMXRrNHJsMTEKCy9nLzF0a3ZiNGpzCg0vZy8xMWJ4OGNteHM4Cg0vZy8xMWNuMF93MTkxCgsvZy8xdG15NWdzaAoLL2cvMXYzaF9jM3EKCy9nLzF2eWsyeHpnCgsvZy8xdGZtY24xcRIEEgIIARIECgIIAZoBBgoCFxkQAA%3D%3D&src=2&serdesk=1&sa=X&ved=2ahUKEwiyo9uNz9WEAxUMQkEAHZWwBcEQjGp6BAgfEAE&scp=Cg5nY2lkOmFyY2hpdGVjdBJMEhIJSTKCCzZwQIYRPN4IGI8c6xYaEgkLNjLkhLXqVBFCt95Dkrk7HCIKVGV4YXMsIFVTQSoUDV1uZg8VcypvwB3BkMEVJTvOQ8gwABoKYXJjaGl0ZWN0cyITYXJjaGl0ZWN0cyBpbiB0ZXhhcyoJQXJjaGl0ZWN0`);
//                     console.info('Navigated To GMB Website')
//                     const currentUrl = page.url();
        
//                     //Wait for input element and search
//                     await page.waitForSelector('input#qjZKOb.MDhB7');
//                     await page.$eval('input#qjZKOb.MDhB7', input => input.value = '');
//                     await page.type('input#qjZKOb.MDhB7', `${service} in ${cities[startingCity]}`);
//                     await page.keyboard.press('Enter');
//                     await new Promise(resolve => setTimeout(resolve, 10000));
    
//                     //checking if the url did really change before proceeding
//                     let exitLoop = false
//                     while(!exitLoop){ 
//                         const newUrl = page.url();
//                         if(newUrl !== currentUrl){
//                             exitLoop=true
//                         }else{
//                             await new Promise(resolve => setTimeout(resolve, 5000));
//                         }
//                     }
                    
//                     //not sure what this is for. I forgot why I put it here but wont remove it, am afraid of errors
//                     const newUrl = page.url()
//                     await page.goto(newUrl)
        
//                     // Wait for cards to load
//                     await page.waitForSelector('div.rgnuSb.xYjf2e');
//                     await page.waitForSelector('.AIYI7d');
                    
                
//                     // Get all the business cards
//                     const cards = await page.$$('div[jsname="gam5T"]');
        
//                     for (const card of cards) {
//                         const businessName = await card.$eval('div.rgnuSb.xYjf2e', node => node.textContent);
//                         const websiteATag = await card.$('a[aria-label="Website"]');
//                         const url = websiteATag ? await (await websiteATag.getProperty('href')).jsonValue() : null;
                
//                         if (url) {
//                             const newPage = await browser.newPage();
//                             newPage.setDefaultNavigationTimeout(900000);
//                             newPage.setDefaultTimeout(900000);
                        
//                             try {
//                                 await newPage.goto(url);
//                                 console.info(`Navigated to ${url}`);
        
            
//                                 let tempEmails = []
//                                 const crawledEmails = await crawl(newPage);
//                                 tempEmails.push(...crawledEmails)
            
//                                 const rootUrl = new URL(url).hostname.replace(/^www\./, '');
        
//                                 //data pre-processing for scraping all subpages
//                                 const anchorTags = await newPage.$$eval('a', anchors => anchors.map(anchor => anchor.href));
//                                 const filteredAnchorTags = [...new Set(anchorTags)]; // removing duplicates
//                                 const internalAnchorTags = filteredAnchorTags.filter((anchor)=> (anchor.includes(rootUrl))) // removing non root urls
//                                 const internalLinks = internalAnchorTags.filter(link => (link.includes('contact'))); // filtering down to contact links
                                
//                                 for (const link of internalLinks){
//                                     await newPage.goto(link);
//                                     const secondaryCrawledEmails = await crawl(newPage);
//                                     const filteredEmails = secondaryCrawledEmails.filter(async (email)=>{
//                                         const emailsExists = await emailsCollection.findOne({"email": {$eq: email}})
//                                         if(!emailsExists){
//                                             return true
//                                         }else{
//                                             return false
//                                         }
//                                     })
//                                     tempEmails.push(...filteredEmails);
//                                 }
//                                 await intermidaryCollection.insertOne({ name: businessName, url, emails: [...new Set(tempEmails)], platform: 'google'})
//                                 emailsSent++
//                                 console.log('We have sent ', emailsSent, 'emails')

//                             } catch (error) {
//                                 console.error(`Error navigating to ${url}: ${error}`);
//                             } finally {
//                                 await newPage.close();
//                             }
//                         }  
//                     }
//                     console.log('Scraping First Page Complete')
                    
//                 }
//                 else if(startingPage >= 1){
//                     await page.goto(`https://www.google.com/localservices/prolist?g2lbs=AIQllVxEpXuuCPFrOHRAavT6nJMeIXUuM9D7r7-IlczaiEuKdgYVA09lqC7MIhZ3mUJ_MfwMM30K5vDmEB9UFLvwoZMUuqe_RIT2RmrDlIhrFndV8WuAgW-ioANkhbKSz__jtHfxKrJZLfFak9ca1Vbqi4HEnaKw7Q%3D%3D&hl=en-US&gl&cs=1&ssta=1&q=architects%20in%20texas&oq=architects%20in%20texas&slp=MgA6HENoTUkxWXZoamNfVmhBTVZZSUJRQmgxMkpBRTRSAggCYACSAZsCCgsvZy8xdGg2ZjZ4ZwoNL2cvMTFoY3c1ZDltZAoLL2cvMXd5YzRybWQKDC9nLzEycWg5dzhmZAoNL2cvMTFnNm5sMGxmNQoLL2cvMXRkY2dzdjQKCy9nLzF0aGwxODBzCgsvZy8xdGc3c2RmNwoLL2cvMXRkNGR6cTEKCy9nLzF0ZnNuZDRfCg0vZy8xMWI3bHBtOGIxCgsvZy8xdHp6dng1bAoLL2cvMXRrNHJsMTEKCy9nLzF0a3ZiNGpzCg0vZy8xMWJ4OGNteHM4Cg0vZy8xMWNuMF93MTkxCgsvZy8xdG15NWdzaAoLL2cvMXYzaF9jM3EKCy9nLzF2eWsyeHpnCgsvZy8xdGZtY24xcRIEEgIIARIECgIIAZoBBgoCFxkQAA%3D%3D&src=2&serdesk=1&sa=X&ved=2ahUKEwiyo9uNz9WEAxUMQkEAHZWwBcEQjGp6BAgfEAE&scp=Cg5nY2lkOmFyY2hpdGVjdBJMEhIJSTKCCzZwQIYRPN4IGI8c6xYaEgkLNjLkhLXqVBFCt95Dkrk7HCIKVGV4YXMsIFVTQSoUDV1uZg8VcypvwB3BkMEVJTvOQ8gwABoKYXJjaGl0ZWN0cyITYXJjaGl0ZWN0cyBpbiB0ZXhhcyoJQXJjaGl0ZWN0`);
//                     console.info(`Google GMB page ${startingPage} navigated`);
//                     const currentUrl = page.url();
        
                    
//                     //Wait for input element and search
//                     await page.waitForSelector('input#qjZKOb.MDhB7');
//                     await page.$eval('input#qjZKOb.MDhB7', input => input.value = '');
//                     await page.type('input#qjZKOb.MDhB7', `${service} in ${cities[startingCity]}`);
//                     await page.keyboard.press('Enter');
//                     await new Promise(resolve => setTimeout(resolve, 10000));
//                     let exitLoop = false
//                     while(!exitLoop){
//                         const newUrl = page.url();
//                         if(newUrl !== currentUrl){
//                             exitLoop=true
//                         }else{
//                             await new Promise(resolve => setTimeout(resolve, 10000));
//                         }
//                     }
//                     const newUrl = page.url();
//                     const editedUrl = newUrl + `&lci=${startingPage*20}`;
//                     await page.goto(editedUrl);
                    
//                     await page.waitForSelector('div.rgnuSb.xYjf2e');
//                     await page.waitForSelector('.AIYI7d');
            
//                     // Wait for cards to load
//                     const cards = await page.$$('div[jsname="gam5T"]');
                
//                     // max pages to scrape
//                     const textContent = await page.$eval('.AIYI7d', element => element.textContent);
//                     const lastNumbersMatch = textContent.match(/\d+$/);
//                     const lastNumber = lastNumbersMatch ? parseInt(lastNumbersMatch[0], 10) : null;
//                     maxpages = (Math.floor(lastNumber / 20)-1);
        
//                     for (const card of cards) {
//                         const businessName = await card.$eval('div.rgnuSb.xYjf2e', node => node.textContent);
//                         const websiteATag = await card.$('a[aria-label="Website"]');
//                         const url = websiteATag ? await (await websiteATag.getProperty('href')).jsonValue() : null;
                
//                         if (url) {
//                             const newPage = await browser.newPage();
//                             newPage.setDefaultNavigationTimeout(900000)
//                             newPage.setDefaultTimeout(900000);
                        
//                             try {
//                                 await newPage.goto(url);
//                                 console.info(`Navigated to ${url}`);
//                                 broadcast(`Navigated to ${url}`);
        
        
//                                 let tempEmails = []
//                                 const crawledEmails = await crawl(newPage);
//                                 tempEmails.push(...crawledEmails)
        
//                                 const rootUrl = new URL(url).hostname.replace(/^www\./, '');
        
//                                 // data pre-processing
//                                 const anchorTags = await newPage.$$eval('a', anchors => anchors.map(anchor => anchor.href));
//                                 const filteredAnchorTags = [...new Set(anchorTags)]; // removing duplicates
//                                 const internalAnchorTags = filteredAnchorTags.filter((anchor)=> (anchor.includes(rootUrl))) // removing non root urls
//                                 const internalLinks = internalAnchorTags.filter(link => (link.includes('contact'))); // filtering down to contact links
        
//                                 for (const link of internalLinks) {
//                                     await newPage.goto(link);
//                                     const secondaryCrawledEmails = await crawl(newPage);
//                                     tempEmails.push(...secondaryCrawledEmails);
//                                 }
                                
//                                 await intermidaryCollection.insertOne({ name: businessName, url, emails: [...new Set(tempEmails)], platform: 'google'});
//                                 emailsSent++
//                                 console.log('We have sent ', emailsSent, 'emails')
        
//                             } catch (error) {
//                                 console.error(`Error navigating to ${url}: ${error}`);
//                             } finally {
//                                 await newPage.close();
//                             }
//                         }  
//                     } 
//                     console.log(`Finished Scraping Page ${startingPage}`)
//                 }
//                 startingPage++
//                 console.log('Max Pages is:', maxpages)
//                 console.log('Starting Page is now', startingPage)
//             }
//             if(startingPage >= maxpages){
//                 startingCity++ 
//                 startingPage = 0
//                 maxpages = 1
//             }
//             page.close()
//             console.log('Starting City is now', startingCity,'/', cities[startingCity])
//         }
        
//     }catch(error) { 
//         console.error('Error Occured:', error);
//     }finally{
//         if(emailsSent >= 100){
//             console.log('Reached Max Emails')
//             const result = await locationCollection.updateOne({ _id: new ObjectId('66374edd38ab0b57c8ee1f22')},{ $set: { index: startingCity, page: startingPage }})
//             console.log(result.acknowledged)
//         }
//         console.log('Didnt send all emails')
//         await browser.close();
//     }
    
// })

// async function crawl(page) {
//     const crawledEmails = [];

//     // Extract all <a> tags on the page
//     const links = await page.evaluate(() => {
//         const anchorTags = Array.from(document.querySelectorAll('a'));
//         return anchorTags.map(a => a.href);
//     });

//     const emailLinks = links.filter(link => link.startsWith('mailto:'));

//     emailLinks.forEach(link => {
//         const email = link.replace('mailto:', '');
//         crawledEmails.push(email);
//     });

//     const text = await page.evaluate(() => document.body.textContent);

//     const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

//     let match;
//     while ((match = emailRegex.exec(text)) !== null) {
//         crawledEmails.push(match[0]);
//     }

//     const finalEmails = crawledEmails.filter((email)=>{
//         return email != undefined && email != null
//     })
//     const trulyFinalEmails = finalEmails.filter((email)=>{
//         return !email.includes("wixpress")
//     })

//     return trulyFinalEmails; //better name TBD
// }





import puppeteer from 'puppeteer'
import express from 'express'
import WebSocket from 'ws';
import cors from 'cors'
import dotenv from 'dotenv'
dotenv.config()

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

server.on('close', () => {
    wss.clients.forEach(client => {
        client.terminate();
    });
    console.log('WebSocket connections closed.');
});

process.on('exit', () => {
    // Close the WebSocket connection
    if (ws.readyState === WebSocket.OPEN) {
        wss.clients.forEach(client => {
            client.terminate();
        });
        wss.close();
    }
});
app.get('/cancel', async(req,res)=>{
    wss.clients.forEach(client => {
        client.terminate();
    });
    wss.close();
    res.status(200).send('Connections Manually Closed');
    console.log('Connections Manually Closed')
    process.exit(0);
})



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
                await page.goto(`https://www.google.com/localservices/prolist?g2lbs=AIQllVxEpXuuCPFrOHRAavT6nJMeIXUuM9D7r7-IlczaiEuKdgYVA09lqC7MIhZ3mUJ_MfwMM30K5vDmEB9UFLvwoZMUuqe_RIT2RmrDlIhrFndV8WuAgW-ioANkhbKSz__jtHfxKrJZLfFak9ca1Vbqi4HEnaKw7Q%3D%3D&hl=en-US&gl=&cs=1&ssta=1&q=${service}+in+${location}&oq=${service}+in+${location}&scp=Cg5nY2lkOmFyY2hpdGVjdBJMEhIJSTKCCzZwQIYRPN4IGI8c6xYaEgkLNjLkhLXqVBFCt95Dkrk7HCIKVGV4YXMsIFVTQSoUDV1uZg8VcypvwB3BkMEVJTvOQ8gwABoKYXJjaGl0ZWN0cyITYXJjaGl0ZWN0cyBpbiB0ZXhhcyoJQXJjaGl0ZWN0&slp=MgA6HENoTUkxWXZoamNfVmhBTVZZSUJRQmgxMkpBRTRSAggCYACSAZsCCgsvZy8xdGg2ZjZ4ZwoNL2cvMTFoY3c1ZDltZAoLL2cvMXd5YzRybWQKDC9nLzEycWg5dzhmZAoNL2cvMTFnNm5sMGxmNQoLL2cvMXRkY2dzdjQKCy9nLzF0aGwxODBzCgsvZy8xdGc3c2RmNwoLL2cvMXRkNGR6cTEKCy9nLzF0ZnNuZDRfCg0vZy8xMWI3bHBtOGIxCgsvZy8xdHp6dng1bAoLL2cvMXRrNHJsMTEKCy9nLzF0a3ZiNGpzCg0vZy8xMWJ4OGNteHM4Cg0vZy8xMWNuMF93MTkxCgsvZy8xdG15NWdzaAoLL2cvMXYzaF9jM3EKCy9nLzF2eWsyeHpnCgsvZy8xdGZtY24xcRIEEgIIARIECgIIAZoBBgoCFxkQAA%3D%3D&src=2&serdesk=1&sa=X&ved=2ahUKEwiyo9uNz9WEAxUMQkEAHZWwBcEQjGp6BAgfEAE`);
                console.info('Navigated To GMB Website')
                broadcast('Navigated To GMB Website')
                const currentUrl = page.url();

                //Wait for input element and search
                await page.waitForSelector('input#qjZKOb.MDhB7');
                await page.$eval('input#qjZKOb.MDhB7', input => input.value = '');
                await page.type('input#qjZKOb.MDhB7', `${service} in ${location}`);
                await page.keyboard.press('Enter');
                await new Promise(resolve => setTimeout(resolve, 10000));
                let exitLoop = false
                while(!exitLoop){
                    const newUrl = page.url();
                    if(newUrl !== currentUrl){
                        exitLoop=true
                    }else{
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    }
                }
                const newUrl = page.url()
                await page.goto(newUrl)

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
                await page.$eval('input#qjZKOb.MDhB7', input => input.value = '');
                await page.type('input#qjZKOb.MDhB7', `${service} in ${location}`);
                await page.keyboard.press('Enter');
                await new Promise(resolve => setTimeout(resolve, 10000));
                let exitLoop = false
                while(!exitLoop){
                    const newUrl = page.url();
                    if(newUrl !== currentUrl){
                        exitLoop=true
                    }else{
                        await new Promise(resolve => setTimeout(resolve, 10000));
                    }
                }
                const newUrl = page.url();
                const editedUrl = newUrl + `&lci=${intPageNumber*20}`;
                await page.goto(editedUrl);
                
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
                        newPage.setDefaultNavigationTimeout(900000)
                        newPage.setDefaultTimeout(900000);
                    
                        try {
                            await newPage.goto(url);
                            console.info(`Navigated to ${url}`);
                            broadcast(`Navigated to ${url}`);
    
    
                            let tempEmails = []
                            const crawledEmails = await crawl(newPage);
                            tempEmails.push(...crawledEmails)
    
                            const rootUrl = new URL(url).hostname.replace(/^www\./, '');
    
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





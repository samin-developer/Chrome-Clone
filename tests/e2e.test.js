const puppeteer = require('puppeteer');

describe('Chrome Clone UI E2E Tests', () => {
    let browser;
    let page;

    beforeAll(async () => {
        // Launch headless Chrome
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        page = await browser.newPage();
        
        // Wait for network idle to ensure scripts are loaded
        await page.goto('http://127.0.0.1:5000', { waitUntil: 'networkidle0' });
        
        // Let's manually set a dummy user session in localStorage and JS window variable 
        // to simulate a logged-in state so we can test the "Turn off" flow.
        await page.evaluate(() => {
            window.lastGoogleUserName = 'E2E Test User';
            window.lastGoogleUserEmail = 'e2etest@gmail.com';
            // Show settings explicitly to start the flow
            window.showView('Settings');
        });
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    test('1. Turn Off Sync Modal appears', async () => {
        // Click the "Turn off" button in settings
        await page.click(`button[onclick="document.getElementById('turnOffSyncModal').classList.remove('d-none')"]`);
        
        // Check if the modal became visible
        const isModalVisible = await page.evaluate(() => {
            const modal = document.getElementById('turnOffSyncModal');
            return modal && !modal.classList.contains('d-none');
        });
        expect(isModalVisible).toBe(true);
    });

    test('2. Logout navigates to Choose Account screen', async () => {
        // Click the "Turn off" confirm button inside the modal
        await page.click('button[onclick="confirmTurnOffSync()"]');
        
        // Wait for navigation transition
        await new Promise(r => setTimeout(r, 500));
        
        // Verify viewChooseAccount is visible
        const isChooseAccountVisible = await page.evaluate(() => {
            const view = document.getElementById('viewChooseAccount');
            return view && view.style.display !== 'none';
        });
        expect(isChooseAccountVisible).toBe(true);
        
        // Verify the dynamic email was populated
        const emailText = await page.$eval('#chooseAccountEmail', el => el.innerText);
        expect(emailText).toBe('e2etest@gmail.com');
    });

    test('3. Open Password Input screen', async () => {
        // Click the account item wrapper to trigger openPasswordInput
        await page.click('div[onclick="openPasswordInput()"]');
        
        // Wait for navigation transition
        await new Promise(r => setTimeout(r, 500));
        
        // Verify viewPasswordInput is visible
        const isPasswordInputVisible = await page.evaluate(() => {
            const view = document.getElementById('viewPasswordInput');
            return view && view.style.display !== 'none';
        });
        expect(isPasswordInputVisible).toBe(true);
        
        // Verify "Hi E2E" is populated (split on first name)
        const nameText = await page.$eval('#passwordScreenName', el => el.innerText);
        expect(nameText).toBe('Hi E2E');
    });

    test('4. Firebase Demo Bypass forces successful login', async () => {
        // Type a dummy password
        await page.type('#loginPasswordInput', 'dummyPassword123');
        
        // Click Next button
        await page.click('button[onclick="performFirebaseSignIn()"]');
        
        // Wait for the Firebase logic and bypass to complete
        await new Promise(r => setTimeout(r, 1500));
        
        // Verify it routed back to Settings
        const isSettingsVisible = await page.evaluate(() => {
            const view = document.getElementById('viewSettings');
            return view && view.style.display !== 'none';
        });
        expect(isSettingsVisible).toBe(true);
    });
});

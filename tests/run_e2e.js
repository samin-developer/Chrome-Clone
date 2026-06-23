const puppeteer = require('puppeteer');

(async () => {
    let browser;
    try {
        console.log('Starting E2E Tests...');
        browser = await puppeteer.launch({
            headless: "new",
            channel: 'chrome',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        page.on('dialog', async dialog => {
            console.log('Dialog appeared:', dialog.message());
            await dialog.accept();
        });
        
        console.log('Navigating to http://127.0.0.1:5000 ...');
        await page.goto('http://127.0.0.1:5000', { waitUntil: 'networkidle0' });
        
        await page.evaluate(() => {
            window.lastGoogleUserName = 'E2E Test User';
            window.lastGoogleUserEmail = 'e2etest@gmail.com';
            window.showView('Settings');
        });

        console.log('Test 1: Turn Off Sync Modal appears');
        await page.click('button[onclick="openTurnOffModal()"]');
        await new Promise(r => setTimeout(r, 500));
        
        let isModalVisible = await page.evaluate(() => {
            const modal = document.getElementById('turnOffSyncModal');
            return modal && !modal.classList.contains('d-none');
        });
        if (!isModalVisible) throw new Error('Turn Off Sync Modal did not appear');
        console.log('  -> PASS');

        console.log('Test 2: Logout navigates to Choose Account screen');
        await page.click('button[onclick="confirmTurnOffSync()"]');
        await new Promise(r => setTimeout(r, 500));
        
        let isChooseAccountVisible = await page.evaluate(() => {
            const view = document.getElementById('viewChooseAccount');
            return view && view.style.display !== 'none';
        });
        if (!isChooseAccountVisible) throw new Error('Choose Account view is not visible');
        
        let emailText = await page.$eval('#chooseAccountEmail', el => el.innerText);
        if (emailText !== 'e2etest@gmail.com') throw new Error(`Email text mismatch: ${emailText}`);
        console.log('  -> PASS');

        console.log('Test 3: Open Password Input screen');
        await page.click('div[onclick="openPasswordInput()"]');
        await new Promise(r => setTimeout(r, 500));
        
        let isPasswordInputVisible = await page.evaluate(() => {
            const view = document.getElementById('viewPasswordInput');
            return view && view.style.display !== 'none';
        });
        if (!isPasswordInputVisible) throw new Error('Password Input view is not visible');
        
        let nameText = await page.$eval('#passwordScreenName', el => el.innerText);
        if (nameText !== 'Hi E2E') throw new Error(`Name text mismatch: ${nameText}`);
        console.log('  -> PASS');

        console.log('Test 4: Firebase Demo Bypass forces successful login');
        await page.type('#loginPasswordInput', 'dummyPassword123');
        await page.click('button[onclick="performFirebaseSignIn()"]');
        await new Promise(r => setTimeout(r, 1500));
        
        let isSettingsVisible = await page.evaluate(() => {
            const view = document.getElementById('viewSettings');
            return view && view.style.display !== 'none';
        });
        if (!isSettingsVisible) throw new Error('Settings view did not appear after bypass');
        console.log('  -> PASS');

        console.log('All E2E tests passed successfully!');
    } catch (err) {
        console.error('Test Failed:', err);
        process.exit(1);
    } finally {
        if (browser) await browser.close();
    }
})();

// ============================================================
// tabs.js - Tab Management
// ============================================================

'use strict';

// --- State ---
const S = { closedTabs: [] };
let windows = [{ tabs: [], activeIdx: 0, incognito: false }];

// --- Helpers ---
function activeWindow() { return windows[0]; }

function createTab(url = 'new-tab', title = 'New Tab') {
    return { url, title, favicon: '🌐', isPinned: false, ntInput: '' };
}

function setStatus(msg) {
    const el = document.getElementById('statusBar');
    if (el) el.textContent = msg;
}

function showToast(msg, duration = 3000) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; bottom: 60px; left: 50%; transform: translateX(-50%);
        background: #323232; color: white; padding: 12px 24px;
        border-radius: 8px; font-size: 14px; z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: fadeIn 0.3s ease;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function closeAllPopups() {
    const menu = document.getElementById('ctxMenu');
    if (menu) menu.style.display = 'none';
    const userMenu = document.getElementById('userMenu');
    if (userMenu) userMenu.classList.remove('open');
    const suggDrop = document.getElementById('suggDrop');
    if (suggDrop) suggDrop.classList.remove('open');
}

// --- Show New Tab Content ---
function showNewTabContent() {
    // Call app.js functions if available
    if (typeof showView === 'function') {
        showView('Newtab');
    }
    const omnibox = document.getElementById('omnibox');
    if (omnibox) omnibox.value = '';
    
    const w = typeof activeWindow === 'function' ? activeWindow() : null;
    const tab = w && w.tabs ? w.tabs[w.activeIdx] : null;
    const ntInput = document.getElementById('ntInput');
    if (ntInput) {
        ntInput.value = tab && tab.ntInput ? tab.ntInput : '';
    }
    
    // Load widgets if available (only in normal mode)
    if (!window.isIncognito) {
        if (typeof loadWeather === 'function') loadWeather();
        if (typeof loadCrypto === 'function') loadCrypto();
        if (typeof loadNews === 'function') loadNews();
    }
}

// --- Open New Tab ---
function openNewTab() {
    const w = activeWindow();
    if (!w) return;
    
    const t = createTab('new-tab', 'New Tab');
    w.tabs.push(t);
    w.activeIdx = w.tabs.length - 1;
    renderTabs();
    showNewTabContent();
    if (typeof updateTab === 'function') {
        updateTab('🌐', 'New Tab');
    } else {
        updateTabUI();
    }
    setStatus('New tab opened');
    closeAllPopups();
}

// --- Add Tab ---
function addTab(url, title) {
    const w = activeWindow();
    if (!w) return;
    
    url = url || 'new-tab';
    title = title || 'New Tab';
    const t = createTab(url, title);
    w.tabs.push(t);
    w.activeIdx = w.tabs.length - 1;
    renderTabs();
    
    if (url === 'new-tab') {
        showNewTabContent();
        updateTabUI();
    } else if (typeof navigate === 'function') {
        navigate(url);
    }
    closeAllPopups();
}

// --- Close Tab ---
function closeTab(idx) {
    const w = activeWindow();
    if (!w) return;
    const t = w.tabs[idx];
    if (!t || t.isPinned) {
        showToast('Unpin tab first to close it');
        return;
    }

    S.closedTabs.push({ ...t });
    w.tabs.splice(idx, 1);

    if (w.tabs.length === 0) {
        w.tabs.push(createTab());
        w.activeIdx = 0;
        showNewTabContent();
    } else if (w.activeIdx >= w.tabs.length) {
        w.activeIdx = w.tabs.length - 1;
    }

    renderTabs();
    showCurrentPage();
}

// --- Switch Tab ---
function switchTab(idx) {
    const w = activeWindow();
    if (!w) return;
    if (idx < 0 || idx >= w.tabs.length) return;
    w.activeIdx = idx;
    renderTabs();
    showCurrentPage();
    closeAllPopups();
}

// --- Show Current Page ---
function showCurrentPage() {
    const w = activeWindow();
    if (!w) return;
    const tab = w.tabs[w.activeIdx];
    if (!tab) return;
    
    if (tab.url === 'new-tab') {
        showNewTabContent();
        updateTabUI();
    } else if (typeof navigate === 'function') {
        navigate(tab.url);
    }
}

// --- Update Tab UI ---
function updateTabUI() {
    const w = activeWindow();
    if (!w) return;
    const tab = w.tabs[w.activeIdx];
    if (!tab) return;
    
    const faviconEl = document.getElementById('tabFavicon');
    const titleEl = document.getElementById('tabTitle');
    if (faviconEl) faviconEl.textContent = tab.favicon || '🌐';
    if (titleEl) {
        titleEl.textContent = tab.title.length > 22 ? tab.title.slice(0, 22) + '…' : tab.title;
    }
}

// --- Render Tabs ---
function renderTabs() {
    const w = activeWindow();
    if (!w) return;

    const tabRow = document.querySelector('.tab-row');
    if (!tabRow) return;
    
    const newTabBtn = tabRow.querySelector('.new-tab-btn');
    const existingTabs = tabRow.querySelectorAll('.tab');
    existingTabs.forEach(t => t.remove());

    w.tabs.forEach((tab, idx) => {
        const tabEl = document.createElement('div');
        tabEl.className = `tab${idx === w.activeIdx ? ' active' : ''}`;
        tabEl.innerHTML = `
            <span style="flex-shrink: 0;">${tab.favicon || '🌐'}</span>
            <span style="flex-grow: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-right: 4px;">${tab.title}</span>
            ${!tab.isPinned ? `<span class="tab-close" style="flex-shrink: 0;" onclick="event.stopPropagation(); window.closeTab(${idx})">✕</span>` : ''}
        `;
        tabEl.onclick = () => switchTab(idx);
        tabEl.oncontextmenu = (e) => showTabCtx(e, idx);
        tabRow.insertBefore(tabEl, newTabBtn);
    });

    updateTabUI();
}

// --- Pin Tab ---
function pinTab(idx) {
    const w = activeWindow();
    if (!w) return;
    const t = w.tabs[idx];
    if (!t) return;
    
    t.isPinned = !t.isPinned;
    if (t.isPinned) {
        w.tabs.splice(idx, 1);
        w.tabs.unshift(t);
        w.activeIdx = 0;
    }
    renderTabs();
    showToast(t.isPinned ? '📌 Tab pinned' : 'Tab unpinned');
}

// --- Duplicate Tab ---
function duplicateTab(idx) {
    const w = activeWindow();
    if (!w) return;
    const src = w.tabs[idx];
    if (!src) return;
    
    const copy = createTab(src.url, src.title);
    copy.favicon = src.favicon;
    w.tabs.splice(idx + 1, 0, copy);
    w.activeIdx = idx + 1;
    renderTabs();
    showCurrentPage();
    showToast('Tab duplicated');
}

// --- Close Tabs to Right ---
function closeTabsToRight(idx) {
    const w = activeWindow();
    if (!w) return;
    const removed = w.tabs.splice(idx + 1);
    S.closedTabs.push(...removed);
    if (w.activeIdx > idx) w.activeIdx = idx;
    renderTabs();
    showCurrentPage();
    showToast(removed.length + ' tab(s) closed');
}

// --- Reopen Closed Tab ---
function reopenClosedTab() {
    if (!S.closedTabs.length) {
        showToast('No recently closed tabs');
        return;
    }
    const ct = S.closedTabs.pop();
    const w = activeWindow();
    if (!w) return;
    
    const t = createTab(ct.url, ct.title);
    t.favicon = ct.favicon;
    w.tabs.push(t);
    w.activeIdx = w.tabs.length - 1;
    renderTabs();
    showCurrentPage();
    showToast('↩ Tab restored');
    closeAllPopups();
}

// --- Incognito Window ---
function openIncognito() {
    const w = activeWindow();
    if (!w) return;
    w.incognito = true;
    addTab();
    showToast('🕵️ Incognito mode activated');
    renderTabs();
    closeAllPopups();
}

// --- New Window ---
function openNewWindow() {
    showToast('Opening new window (simulated)');
    addTab();
    closeAllPopups();
}

// --- Tab Context Menu ---
function showTabCtx(e, idx) {
    e.preventDefault();
    let menu = document.getElementById('ctxMenu');
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'ctxMenu';
        menu.style.cssText = `
            display:none; position:fixed; background:#fff;
            border:1px solid #ccc; border-radius:8px;
            box-shadow:0 4px 12px rgba(0,0,0,0.15);
            z-index:9999; min-width:180px; padding:6px 0;
        `;
        document.body.appendChild(menu);
    }
    
    menu.style.display = 'block';
    menu.style.left = Math.min(e.clientX, window.innerWidth - 200) + 'px';
    menu.style.top = Math.min(e.clientY, window.innerHeight - 300) + 'px';
    
    const w = activeWindow();
    const t = w && w.tabs[idx];
    menu.innerHTML = `
        <div class="ctx-item" onclick="window.switchTab(${idx});window.closeCtx()" style="padding:8px 16px;cursor:pointer;font-size:13px;">
            &#9654; Switch to this tab
        </div>
        <div class="ctx-divider" style="border-top:1px solid #e0e0e0;margin:4px 0;"></div>
        <div class="ctx-item" onclick="window.pinTab(${idx});window.closeCtx()" style="padding:8px 16px;cursor:pointer;font-size:13px;">
            &#128204; ${t && t.isPinned ? 'Unpin' : 'Pin'} tab
        </div>
        <div class="ctx-item" onclick="window.duplicateTab(${idx});window.closeCtx()" style="padding:8px 16px;cursor:pointer;font-size:13px;">
            &#128203; Duplicate
        </div>
        <div class="ctx-divider" style="border-top:1px solid #e0e0e0;margin:4px 0;"></div>
        <div class="ctx-item" onclick="window.closeTabsToRight(${idx});window.closeCtx()" style="padding:8px 16px;cursor:pointer;font-size:13px;">
            &#10145; Close tabs to right
        </div>
        <div class="ctx-item danger" onclick="window.closeTab(${idx});window.closeCtx()" style="padding:8px 16px;cursor:pointer;font-size:13px;color:#d93025;">
            &#10005; Close tab
        </div>
    `;
}

// --- Close Context Menu ---
function closeCtx() {
    const menu = document.getElementById('ctxMenu');
    if (menu) menu.style.display = 'none';
}

// --- Keyboard Shortcuts ---
document.addEventListener('keydown', (e) => {
    // Ctrl+T = New Tab
    if (e.ctrlKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        openNewTab();
    }
    // Ctrl+Shift+T = Reopen closed tab
    if (e.ctrlKey && e.shiftKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        reopenClosedTab();
    }
    // Ctrl+W = Close tab
    if (e.ctrlKey && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        const w = activeWindow();
        if (w && w.tabs.length > 0) {
            closeTab(w.activeIdx);
        }
    }
});

// --- Expose Globally ---
window.S = S;
window.windows = windows;
window.activeWindow = activeWindow;
window.createTab = createTab;
window.openNewTab = openNewTab;
window.addTab = addTab;
window.closeTab = closeTab;
window.switchTab = switchTab;
window.pinTab = pinTab;
window.duplicateTab = duplicateTab;
window.closeTabsToRight = closeTabsToRight;
window.reopenClosedTab = reopenClosedTab;
window.openIncognito = openIncognito;
window.openNewWindow = openNewWindow;
window.showTabCtx = showTabCtx;
window.closeCtx = closeCtx;
window.renderTabs = renderTabs;
window.showCurrentPage = showCurrentPage;
window.showNewTabContent = showNewTabContent;
window.updateTabUI = updateTabUI;
window.showToast = showToast;
window.closeAllPopups = closeAllPopups;
window.setStatus = setStatus;

console.log('📑 tabs.js loaded');
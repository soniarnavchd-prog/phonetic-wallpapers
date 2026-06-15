let wallpapers = [];
let currentCategory = 'all';
let currentWallpaper = null;
let currentDevice = 'desktop';
let currentDeviceType = 'desktop';
let currentUser = null;
let uiPreviewActive = false;
let contextMenuTarget = null; // Track which wallpaper was right-clicked

const galleryGrid = document.getElementById('galleryGrid');
const themeToggle = document.getElementById('themeToggle');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const previewFrame = document.getElementById('previewFrame');
const previewImage = document.getElementById('previewImage');
const previewLoading = document.getElementById('previewLoading');
const modalTitle = document.getElementById('modalTitle');
const modalResolution = document.getElementById('modalResolution');
const modalCategory = document.getElementById('modalCategory');
const btnDownload = document.getElementById('btnDownload');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const searchInput = document.getElementById('searchInput');
const galleryTitle = document.getElementById('galleryTitle');
const loadingScreen = document.getElementById('loadingScreen');
const helloScreen = document.getElementById('helloScreen');

const uiPreviewToggle = document.getElementById('uiPreviewToggle');
const phoneUiMock = document.getElementById('phoneUiMock');
const desktopUiMock = document.getElementById('desktopUiMock');

const accountBtn = document.getElementById('accountBtn');
const userAvatar = document.getElementById('userAvatar');
const userPanel = document.getElementById('userPanel');
const userPanelOverlay = document.getElementById('userPanelOverlay');
const userPanelClose = document.getElementById('userPanelClose');
const userLoginSection = document.getElementById('userLoginSection');
const usernameInput = document.getElementById('usernameInput');
const userLoginBtn = document.getElementById('userLoginBtn');
const userCollections = document.getElementById('userCollections');
const collectionsList = document.getElementById('collectionsList');
const newCollectionInput = document.getElementById('newCollectionInput');
const createCollectionBtn = document.getElementById('createCollectionBtn');

// Context menu elements
const customContextMenu = document.getElementById('customContextMenu');
const ctxSaveImage = document.getElementById('ctxSaveImage');
const ctxDownloadImage = document.getElementById('ctxDownloadImage');
const ctxOpenNewTab = document.getElementById('ctxOpenNewTab');
const ctxPremiumDownload = document.getElementById('ctxPremiumDownload');

const CATEGORY_NAMES = {
    'all': 'All Wallpapers',
    'abstract': 'Abstract',
    'amoled': 'AMOLED',
    'minimal': 'Minimal',
    'scifi': 'Sci-Fi',
    'nature': 'Nature',
    'technology': 'Technology',
    'sports': 'Sports',
    'music': 'Music',
    'cars': 'Cars',
    'anime': 'Anime',
    'space': 'Space',
    'surreal': 'Surreal',
    'cyberpunk': 'Cyberpunk',
    'top-rated': 'Top Rated',
    'premium': 'Premium'
};

const PHONE_CATEGORIES = {
    'all': 'all',
    'abstract': 'phoneabstract',
    'amoled': 'phoneamoled',
    'minimal': 'phoneminimal',
    'scifi': 'phonescifi',
    'nature': 'phonenature',
    'technology': 'phonetechnology',
    'sports': 'phonesports',
    'music': 'phonemusic',
    'cars': 'phonecars',
    'anime': 'phoneanime',
    'space': 'phonespace',
    'surreal': 'phonesurreal',
    'top-rated': 'phonetop-rated',
    'premium': 'phonepremium'
};

const NAV_TO_CATEGORY = {
    'home': 'all',
    'top-rated': 'top-rated',
    'premium': 'premium',
    'cars': 'cars',
    'anime': 'anime'
};

function getRandomHeight() {
    return Math.floor(Math.random() * 16) + 15;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function initTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
}

function createSkeletonCard() {
    const card = document.createElement('div');
    card.className = 'skeleton-card';
    card.style.setProperty('--row-span', getRandomHeight());
    return card;
}

function showSkeletons(count = 8) {
    galleryGrid.innerHTML = '';
    for (let i = 0; i < count; i++) {
        galleryGrid.appendChild(createSkeletonCard());
    }
}

function getApiCategory(category) {
    if (currentDeviceType === 'phone') {
        return PHONE_CATEGORIES[category] || category;
    }
    return category;
}

async function fetchWallpapers(category = 'all') {
    showSkeletons(8);
    const apiCategory = getApiCategory(category);
    const url = apiCategory === 'all' ? '/api/wallpapers' : `/api/wallpapers?category=${apiCategory}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed');
        wallpapers = await response.json();
        console.log(`Loaded ${wallpapers.length} wallpapers for: ${apiCategory}`);
        renderGallery(wallpapers);
        updateGalleryTitle(category);
        updateStatCount(wallpapers.length);
    } catch (e) {
        console.error(e);
        galleryGrid.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:3rem;">Failed to load wallpapers</p>';
    }
}

function updateGalleryTitle(category) {
    if (galleryTitle) {
        const prefix = currentDeviceType === 'phone' ? 'Phone ' : '';
        galleryTitle.textContent = prefix + (CATEGORY_NAMES[category] || 'Wallpapers');
    }
}

function updateStatCount(count) {
    const statEl = document.getElementById('statCount');
    if (statEl) statEl.textContent = count;
}

async function checkFavorite(wallpaperId) {
    if (!currentUser) return false;
    try {
        const response = await fetch(`/api/wallpapers/${wallpaperId}/is_favorite?user_id=${currentUser.id}`);
        const data = await response.json();
        return data.is_favorite;
    } catch (e) {
        return false;
    }
}

async function toggleFavorite(wallpaperId, btn) {
    if (!currentUser) {
        openUserPanel();
        showToast('Login to save favorites');
        setTimeout(() => {
            if (usernameInput) usernameInput.focus();
        }, 300);
        return;
    }
    
    try {
        const collectionName = btn.dataset.collection || null;
        const response = await fetch('/api/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `user_id=${currentUser.id}&wallpaper_id=${wallpaperId}&collection_name=${collectionName || ''}`
        });
        const data = await response.json();
        
        btn.classList.toggle('active', data.favorited);
        showToast(data.message);
        
        if (data.favorited && userPanel.classList.contains('active')) {
            loadUserCollections();
        }
    } catch (e) {
        console.error('Favorite error:', e);
    }
}

function createWallpaperCard(wallpaper) {
    const card = document.createElement('div');
    card.className = 'wallpaper-card';
    card.style.setProperty('--row-span', getRandomHeight());
    card.dataset.id = wallpaper.id;
    
    const img = document.createElement('img');
    img.className = 'card-image';
    img.src = wallpaper.thumbnail_url || wallpaper.image_url;
    img.alt = wallpaper.title;
    img.loading = 'lazy';
    img.draggable = false;
    
    // Custom right-click for this card
    img.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e, wallpaper);
    });
    
    card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e, wallpaper);
    });
    
    const favBtn = document.createElement('button');
    favBtn.className = 'favorite-btn';
    favBtn.innerHTML = '<i data-lucide="heart"></i>';
    favBtn.dataset.id = wallpaper.id;
    
    checkFavorite(wallpaper.id).then(isFav => {
        if (isFav) favBtn.classList.add('active');
    });
    
    favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(wallpaper.id, favBtn);
    });
    
    const overlay = document.createElement('div');
    overlay.className = 'card-overlay';
    
    let amoledBadge = '';
    if (wallpaper.category === 'AMOLED' && wallpaper.true_black_pct !== null && wallpaper.true_black_pct !== undefined) {
        amoledBadge = `<div class="amoled-badge">True Black: ${wallpaper.true_black_pct}%</div>`;
    }
    
    overlay.innerHTML = `
        <h3 class="card-title">${wallpaper.title}</h3>
        <div class="card-meta">${capitalize(wallpaper.category)}</div>
        ${amoledBadge}
    `;
    
    card.appendChild(img);
    card.appendChild(favBtn);
    card.appendChild(overlay);
    card.addEventListener('click', () => openModal(wallpaper));
    return card;
}

function renderGallery(data) {
    galleryGrid.innerHTML = '';
    if (!data.length) {
        galleryGrid.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:3rem;">No wallpapers found</p>';
        return;
    }
    data.forEach(w => galleryGrid.appendChild(createWallpaperCard(w)));
    lucide.createIcons();
}

// ==================== CONTEXT MENU ====================

function showContextMenu(e, wallpaper) {
    contextMenuTarget = wallpaper;
    
    // Position menu
    const x = e.clientX;
    const y = e.clientY;
    
    // Prevent going off screen
    const menuWidth = 200;
    const menuHeight = 180;
    const finalX = Math.min(x, window.innerWidth - menuWidth - 10);
    const finalY = Math.min(y, window.innerHeight - menuHeight - 10);
    
    customContextMenu.style.left = finalX + 'px';
    customContextMenu.style.top = finalY + 'px';
    customContextMenu.classList.add('active');
    
    // Update premium item based on wallpaper
    if (wallpaper.category === 'Premium') {
        ctxPremiumDownload.innerHTML = '<i data-lucide="crown"></i><span>Premium (2 Ads)</span>';
    } else {
        ctxPremiumDownload.innerHTML = '<i data-lucide="crown"></i><span>HD Download (Watch Ad)</span>';
    }
    
    lucide.createIcons();
}

function hideContextMenu() {
    customContextMenu.classList.remove('active');
    contextMenuTarget = null;
}

function initContextMenu() {
    // Close on click elsewhere
    document.addEventListener('click', (e) => {
        if (!customContextMenu.contains(e.target)) {
            hideContextMenu();
        }
    });
    
    // Close on scroll
    window.addEventListener('scroll', hideContextMenu);
    
    // Menu actions
    ctxSaveImage.addEventListener('click', () => {
        if (!contextMenuTarget) return;
        // Save image logic - just open in new tab for now
        window.open(contextMenuTarget.image_url, '_blank');
        hideContextMenu();
        showToast('Opening image...');
    });
    
    ctxDownloadImage.addEventListener('click', () => {
        if (!contextMenuTarget) return;
        handleDownloadWithAd(contextMenuTarget);
        hideContextMenu();
    });
    
    ctxOpenNewTab.addEventListener('click', () => {
        if (!contextMenuTarget) return;
        window.open(contextMenuTarget.image_url, '_blank');
        hideContextMenu();
    });
    
    ctxPremiumDownload.addEventListener('click', () => {
        if (!contextMenuTarget) return;
        handlePremiumDownload(contextMenuTarget);
        hideContextMenu();
    });
}

// ==================== AD INTEGRATION ====================

// Track daily free downloads
function getDailyDownloads() {
    const today = new Date().toDateString();
    const stored = JSON.parse(localStorage.getItem('phonetic_downloads') || '{}');
    if (stored.date !== today) {
        return { date: today, count: 0 };
    }
    return stored;
}

function incrementDailyDownloads() {
    const downloads = getDailyDownloads();
    downloads.count++;
    localStorage.setItem('phonetic_downloads', JSON.stringify(downloads));
    return downloads.count;
}

function canDownloadFree() {
    const downloads = getDailyDownloads();
    return downloads.count < 5; // 5 free downloads per day
}

function showAdModal(callback, isPremium = false) {
    const adModal = document.createElement('div');
    adModal.className = 'ad-modal';
    adModal.innerHTML = `
        <div class="ad-modal-backdrop"></div>
        <div class="ad-modal-content">
            <h3>${isPremium ? 'Premium Download' : 'Free Download'}</h3>
            <p>${isPremium ? 'Watch 2 short ads to download this premium wallpaper' : 'Watch a short ad to download this wallpaper'}</p>
            <div class="ad-slot" id="adSlot">
                <!-- Ad will be loaded here -->
                <div style="width:300px;height:250px;background:var(--bg-card);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);">
                    Ad Loading...
                </div>
            </div>
            <div class="ad-timer">
                <span id="adTimer">5</span>s remaining
            </div>
            <button class="skip-ad-btn" id="skipAdBtn" style="display:none;">
                Continue Download
            </button>
        </div>
    `;
    
    document.body.appendChild(adModal);
    
    let countdown = 5;
    const timerEl = document.getElementById('adTimer');
    const skipBtn = document.getElementById('skipAdBtn');
    
    const timer = setInterval(() => {
        countdown--;
        if (timerEl) timerEl.textContent = countdown;
        if (countdown <= 0) {
            clearInterval(timer);
            if (skipBtn) skipBtn.style.display = 'block';
        }
    }, 1000);
    
    skipBtn.addEventListener('click', () => {
        adModal.remove();
        callback();
    });
}

function handleDownloadWithAd(wallpaper) {
    if (!canDownloadFree()) {
        showToast('Daily limit reached. Watch ad to continue.');
        showAdModal(() => {
            proceedWithDownload(wallpaper);
        });
        return;
    }
    
    // First 5 downloads are free, then show ad
    const downloadCount = incrementDailyDownloads();
    if (downloadCount > 5) {
        showAdModal(() => {
            proceedWithDownload(wallpaper);
        });
    } else {
        proceedWithDownload(wallpaper);
    }
}

function handlePremiumDownload(wallpaper) {
    // Premium wallpapers always require 2 ads
    showAdModal(() => {
        // After first ad, show second
        setTimeout(() => {
            showAdModal(() => {
                proceedWithDownload(wallpaper);
            }, true);
        }, 500);
    }, true);
}

function proceedWithDownload(wallpaper) {
    const filename = `${wallpaper.title.replace(/\s+/g, '_').toLowerCase()}_4k.jpg`;
    downloadWallpaper(wallpaper.image_url, filename);
}

// ==================== REST OF FUNCTIONS ====================

function initDeviceToggle() {
    const btnDesktop = document.getElementById('btnDesktop');
    const btnPhone = document.getElementById('btnPhone');
    
    if (!btnDesktop || !btnPhone) return;
    
    btnDesktop.addEventListener('click', () => {
        currentDeviceType = 'desktop';
        btnDesktop.classList.add('active');
        btnPhone.classList.remove('active');
        fetchWallpapers(currentCategory);
    });
    
    btnPhone.addEventListener('click', () => {
        currentDeviceType = 'phone';
        btnPhone.classList.add('active');
        btnDesktop.classList.remove('active');
        fetchWallpapers(currentCategory);
    });
}

function initCategories() {
    document.querySelectorAll('.category-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentCategory = pill.dataset.category;
            fetchWallpapers(currentCategory);
        });
    });

    document.querySelectorAll('.nav-link[data-nav]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const nav = link.dataset.nav;
            const category = NAV_TO_CATEGORY[nav];
            
            if (!category) return;
            
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            document.querySelectorAll('.category-pill').forEach(p => {
                p.classList.toggle('active', p.dataset.category === category);
            });
            
            currentCategory = category;
            
            const gallerySection = document.querySelector('.gallery-section');
            if (gallerySection) {
                gallerySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            
            fetchWallpapers(category);
        });
    });
}

function initSearch() {
    if (!searchInput) return;
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        if (!query) {
            renderGallery(wallpapers);
            return;
        }
        const filtered = wallpapers.filter(w => 
            w.title.toLowerCase().includes(query) || 
            w.category.toLowerCase().includes(query)
        );
        renderGallery(filtered);
    });
}

function initUiPreview() {
    if (!uiPreviewToggle) return;
    
    uiPreviewToggle.addEventListener('click', () => {
        uiPreviewActive = !uiPreviewActive;
        uiPreviewToggle.classList.toggle('active', uiPreviewActive);
        
        if (currentDevice === 'phone') {
            phoneUiMock.classList.toggle('active', uiPreviewActive);
        } else {
            desktopUiMock.classList.toggle('active', uiPreviewActive);
        }
        
        const span = uiPreviewToggle.querySelector('span');
        if (span) span.textContent = uiPreviewActive ? 'Hide UI' : 'Preview UI';
    });
    
    function updateTime() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        const phoneTime = document.getElementById('phoneTime');
        const desktopTime = document.getElementById('desktopTime');
        if (phoneTime) phoneTime.textContent = timeStr.replace(' AM', '').replace(' PM', '');
        if (desktopTime) desktopTime.textContent = timeStr;
    }
    updateTime();
    setInterval(updateTime, 60000);
}

function openModal(wallpaper) {
    currentWallpaper = wallpaper;
    currentDevice = 'desktop';
    uiPreviewActive = false;
    
    if (uiPreviewToggle) {
        uiPreviewToggle.classList.remove('active');
        const span = uiPreviewToggle.querySelector('span');
        if (span) span.textContent = 'Preview UI';
    }
    phoneUiMock.classList.remove('active');
    desktopUiMock.classList.remove('active');
    
    previewImage.src = '';
    previewLoading.classList.remove('hidden');
    
    document.querySelectorAll('.device-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.device === 'desktop');
    });
    
    previewFrame.dataset.device = 'desktop';
    modalTitle.textContent = wallpaper.title;
    modalResolution.textContent = '3840 × 2160';
    
    if (wallpaper.category === 'AMOLED' && wallpaper.true_black_pct !== null && wallpaper.true_black_pct !== undefined) {
        modalCategory.innerHTML = `${capitalize(wallpaper.category)} <span style="color:#00ff88;margin-left:8px;">• ${wallpaper.true_black_pct}% True Black</span>`;
    } else {
        modalCategory.textContent = capitalize(wallpaper.category);
    }
    
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    previewImage.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e, wallpaper);
    });
    
    const img = new Image();
    img.onload = () => {
        previewImage.src = wallpaper.image_url;
        previewLoading.classList.add('hidden');
    };
    img.onerror = () => {
        previewLoading.classList.add('hidden');
        previewImage.src = wallpaper.thumbnail_url || wallpaper.image_url;
    };
    img.src = wallpaper.image_url;
    
    lucide.createIcons();
}

function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
    uiPreviewActive = false;
    phoneUiMock.classList.remove('active');
    desktopUiMock.classList.remove('active');
    setTimeout(() => {
        previewImage.src = '';
        previewLoading.classList.remove('hidden');
    }, 400);
}

function switchDevice(device) {
    currentDevice = device;
    previewFrame.dataset.device = device;
    
    if (uiPreviewActive) {
        phoneUiMock.classList.toggle('active', device === 'phone');
        desktopUiMock.classList.toggle('active', device !== 'phone');
    }
    
    document.querySelectorAll('.device-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.device === device);
    });
}

async function downloadWallpaper(url, filename) {
    try {
        showToast('Preparing download...');
        
        const response = await fetch(url);
        const blob = await response.blob();
        
        const blobUrl = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        window.URL.revokeObjectURL(blobUrl);
        
        showToast('Download started!');
    } catch (error) {
        console.error('Download failed:', error);
        window.open(url, '_blank');
        showToast('Opening image in new tab...');
    }
}

function initModal() {
    modalOverlay.addEventListener('click', e => {
        if (e.target === modalOverlay || e.target.classList.contains('modal-backdrop')) closeModal();
    });
    modalClose.addEventListener('click', closeModal);
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeModal();
    });
    document.querySelectorAll('.device-btn').forEach(btn => {
        btn.addEventListener('click', () => switchDevice(btn.dataset.device));
    });
    
    btnDownload.addEventListener('click', () => {
        if (!currentWallpaper) return;
        handleDownloadWithAd(currentWallpaper);
    });
}

// ==================== WALLPAPER OF THE DAY ====================

async function loadWallpaperOfTheDay() {
    try {
        const response = await fetch('/api/wallpapers?category=all');
        const data = await response.json();
        
        if (!data.length) return;
        
        const today = new Date();
        const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const dateEl = document.getElementById('wotdDate');
        if (dateEl) dateEl.textContent = dateStr;
        
        const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
        const wotd = data[dayOfYear % data.length];
        
        const imgEl = document.getElementById('wotdImage');
        const titleEl = document.getElementById('wotdTitle');
        const descEl = document.getElementById('wotdDesc');
        const cardEl = document.getElementById('wotdCard');
        const btnEl = document.getElementById('wotdBtn');
        
        if (imgEl) imgEl.src = wotd.thumbnail_url || wotd.image_url;
        if (titleEl) titleEl.textContent = wotd.title;
        if (descEl) descEl.textContent = `Featured ${capitalize(wotd.category)} Wallpaper`;
        
        if (cardEl) {
            cardEl.addEventListener('click', () => openModal(wotd));
        }
        
        if (btnEl) {
            btnEl.addEventListener('click', (e) => {
                e.stopPropagation();
                openModal(wotd);
            });
        }
        
    } catch (e) {
        console.error('WOTD load error:', e);
    }
}

// ==================== USER PANEL ====================

function initUserPanel() {
    const savedUser = localStorage.getItem('phonetic_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showUserAvatar();
    }
    
    if (accountBtn) {
        accountBtn.addEventListener('click', openUserPanel);
    }
    
    if (userAvatar) {
        userAvatar.addEventListener('click', openUserPanel);
    }
    
    if (userPanelClose) {
        userPanelClose.addEventListener('click', closeUserPanel);
    }
    if (userPanelOverlay) {
        userPanelOverlay.addEventListener('click', closeUserPanel);
    }
    
    if (userLoginBtn) {
        userLoginBtn.addEventListener('click', handleLogin);
    }
    if (usernameInput) {
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
    }
    
    if (createCollectionBtn) {
        createCollectionBtn.addEventListener('click', createCollection);
    }
    if (newCollectionInput) {
        newCollectionInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') createCollection();
        });
    }
}

function showUserAvatar() {
    if (!currentUser || !userAvatar) return;
    userAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
    userAvatar.style.display = 'flex';
    if (accountBtn) accountBtn.style.display = 'none';
}

function openUserPanel() {
    userPanel.classList.add('active');
    userPanelOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    if (currentUser) {
        userLoginSection.style.display = 'none';
        userCollections.style.display = 'block';
        loadUserCollections();
    } else {
        userLoginSection.style.display = 'flex';
        userCollections.style.display = 'none';
    }
}

function closeUserPanel() {
    userPanel.classList.remove('active');
    userPanelOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

async function handleLogin() {
    const username = usernameInput.value.trim();
    if (!username) {
        showToast('Please enter a username');
        return;
    }
    
    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `username=${encodeURIComponent(username)}`
        });
        const data = await response.json();
        
        currentUser = data;
        localStorage.setItem('phonetic_user', JSON.stringify(currentUser));
        showUserAvatar();
        openUserPanel();
        showToast(`Welcome, ${username}!`);
    } catch (e) {
        console.error('Login error:', e);
        showToast('Failed to login');
    }
}

async function loadUserCollections() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`/api/favorites/${currentUser.id}`);
        const favorites = await response.json();
        
        const collections = {};
        const uncategorized = [];
        
        favorites.forEach(fav => {
            if (fav.collection_name) {
                if (!collections[fav.collection_name]) {
                    collections[fav.collection_name] = [];
                }
                collections[fav.collection_name].push(fav);
            } else {
                uncategorized.push(fav);
            }
        });
        
        let html = '';
        
        if (uncategorized.length > 0) {
            html += renderCollectionSection('All Favorites', uncategorized);
        }
        
        Object.entries(collections).forEach(([name, items]) => {
            html += renderCollectionSection(name, items);
        });
        
        if (html === '') {
            html = '<p style="color:var(--text-muted);text-align:center;padding:2rem;">No favorites yet. Heart some wallpapers!</p>';
        }
        
        collectionsList.innerHTML = html;
        lucide.createIcons();
    } catch (e) {
        console.error('Load collections error:', e);
    }
}

function renderCollectionSection(name, items) {
    return `
        <div class="collection-section">
            <div class="collection-header">
                <span class="collection-name">${name}</span>
                <span class="collection-count">${items.length}</span>
            </div>
            ${items.map(item => `
                <div class="favorite-item" onclick="openModalFromFavorite(${item.wallpaper.id})">
                    <img src="${item.wallpaper.thumbnail_url}" alt="${item.wallpaper.title}">
                    <div class="favorite-item-info">
                        <div class="favorite-item-title">${item.wallpaper.title}</div>
                        <div class="favorite-item-cat">${capitalize(item.wallpaper.category)}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

async function createCollection() {
    const name = newCollectionInput.value.trim();
    if (!name) {
        showToast('Enter a collection name');
        return;
    }
    
    showToast(`Collection "${name}" ready! Heart wallpapers to add them.`);
    newCollectionInput.value = '';
    
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.dataset.collection = name;
    });
}

function openModalFromFavorite(wallpaperId) {
    const wallpaper = wallpapers.find(w => w.id === wallpaperId);
    if (wallpaper) {
        openModal(wallpaper);
    } else {
        showToast('Loading wallpaper...');
    }
}

function showToast(msg) {
    toastMessage.textContent = msg;
    toast.classList.add('active');
    setTimeout(() => toast.classList.remove('active'), 3000);
}

function init() {
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 2500);
    }
    
    if (helloScreen) {
        setTimeout(() => {
            helloScreen.style.display = 'none';
        }, 4500);
    }
    
    lucide.createIcons();
    initTheme();
    themeToggle.addEventListener('click', toggleTheme);
    initDeviceToggle();
    initCategories();
    initSearch();
    initModal();
    initUiPreview();
    initUserPanel();
    initContextMenu();
    loadWallpaperOfTheDay();
    fetchWallpapers('all');
}

document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
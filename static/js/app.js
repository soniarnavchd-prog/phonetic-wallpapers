// Phonetic Wallpapers - Clean Rebuild v4.0
console.log('=== PHONETIC APP LOADING ===');

// ==================== GLOBAL STATE ====================
let wallpapers = [];
let currentCategory = 'all';
let currentWallpaper = null;
let currentDevice = 'desktop';
let currentDeviceType = 'desktop';
let currentUser = null;
let uiPreviewActive = false;
let contextMenuTarget = null;

// ==================== DOM REFERENCES ====================
const $ = id => document.getElementById(id);

const galleryGrid = $('galleryGrid');
const themeToggle = $('themeToggle');
const modalOverlay = $('modalOverlay');
const modalClose = $('modalClose');
const previewFrame = $('previewFrame');
const previewImage = $('previewImage');
const previewLoading = $('previewLoading');
const modalTitle = $('modalTitle');
const modalResolution = $('modalResolution');
const modalCategory = $('modalCategory');
const btnDownload = $('btnDownload');
const toast = $('toast');
const toastMessage = $('toastMessage');
const searchInput = $('searchInput');
const galleryTitle = $('galleryTitle');
const loadingScreen = $('loadingScreen');
const btnDesktop = $('btnDesktop');
const btnPhone = $('btnPhone');
const uiPreviewToggle = $('uiPreviewToggle');
const phoneUiMock = $('phoneUiMock');
const desktopUiMock = $('desktopUiMock');
const accountBtn = $('accountBtn');
const userAvatar = $('userAvatar');
const userPanel = $('userPanel');
const userPanelOverlay = $('userPanelOverlay');
const userPanelClose = $('userPanelClose');
const userLoginSection = $('userLoginSection');
const userCollections = $('userCollections');
const collectionsList = $('collectionsList');
const newCollectionInput = $('newCollectionInput');
const createCollectionBtn = $('createCollectionBtn');
const customContextMenu = $('customContextMenu');
const ctxSaveImage = $('ctxSaveImage');
const ctxDownloadImage = $('ctxDownloadImage');
const ctxOpenNewTab = $('ctxOpenNewTab');
const ctxPremiumDownload = $('ctxPremiumDownload');
const downloadModal = $('downloadModal');
const downloadPhase1 = $('downloadPhase1');
const downloadPhase2 = $('downloadPhase2');
const countdownNumber = $('countdownNumber');
const countdownRing = $('countdownRing');
const downloadModalClose = $('downloadModalClose');
const wotdImage = $('wotdImage');
const wotdTitle = $('wotdTitle');
const wotdDesc = $('wotdDesc');
const wotdDate = $('wotdDate');
const wotdCard = $('wotdCard');
const wotdBtn = $('wotdBtn');
const statCount = $('statCount');
const logoutBtn = $('logoutBtn');
const mobileMenuBtn = $('mobileMenuBtn');
const mobileMenuOverlay = $('mobileMenuOverlay');
const mobileMenuClose = $('mobileMenuClose');

// ==================== CONSTANTS ====================
const CATEGORY_NAMES = {
    'all': 'All Wallpapers', 'abstract': 'Abstract', 'amoled': 'AMOLED',
    'minimal': 'Minimal', 'scifi': 'Sci-Fi', 'nature': 'Nature',
    'technology': 'Technology', 'sports': 'Sports', 'music': 'Music',
    'cars': 'Cars', 'anime': 'Anime', 'space': 'Space', 'surreal': 'Surreal',
    'cyberpunk': 'Cyberpunk', 'top-rated': 'Top Rated', 'premium': 'Premium'
};

const PHONE_CATEGORIES = {
    'all': 'all', 'abstract': 'phoneabstract', 'amoled': 'phoneamoled',
    'minimal': 'phoneminimal', 'scifi': 'phonescifi', 'nature': 'phonenature',
    'technology': 'phonetechnology', 'sports': 'phonesports', 'music': 'phonemusic',
    'cars': 'phonecars', 'anime': 'phoneanime', 'space': 'phonespace',
    'surreal': 'phonesurreal', 'top-rated': 'phonetop-rated', 'premium': 'phonepremium'
};

const NAV_TO_CATEGORY = {
    'home': 'all', 'top-rated': 'top-rated', 'premium': 'premium',
    'cars': 'cars', 'anime': 'anime'
};

// ==================== UTILITIES ====================
function getRandomHeight() { return Math.floor(Math.random() * 16) + 15; }
function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }
function createIcons() {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        try { lucide.createIcons(); } catch (e) { console.warn('Lucide:', e); }
    }
}

// ==================== THEME ====================
function initTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    console.log('Theme initialized:', saved);
}
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    console.log('Theme toggled to:', next);
}

// ==================== SKELETONS ====================
function createSkeletonCard() {
    const card = document.createElement('div');
    card.className = 'skeleton-card';
    card.style.setProperty('--row-span', getRandomHeight());
    const inner = document.createElement('div');
    inner.className = 'skeleton-image';
    card.appendChild(inner);
    return card;
}
function showSkeletons(count = 8) {
    if (!galleryGrid) return;
    galleryGrid.innerHTML = '';
    for (let i = 0; i < count; i++) galleryGrid.appendChild(createSkeletonCard());
}

// ==================== API FETCH ====================
function getApiCategory(category) {
    return currentDeviceType === 'phone' ? (PHONE_CATEGORIES[category] || category) : category;
}

async function fetchWallpapers(category = 'all') {
    if (!galleryGrid) { console.error('galleryGrid not found'); return; }
    showSkeletons(8);
    const apiCategory = getApiCategory(category);
    const url = apiCategory === 'all' ? '/api/wallpapers' : `/api/wallpapers?category=${apiCategory}`;

    console.log('Fetching:', url);
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        wallpapers = await response.json();
        console.log(`Loaded ${wallpapers.length} wallpapers for: ${apiCategory}`);

        if (!wallpapers || !wallpapers.length) {
            galleryGrid.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:3rem;">No wallpapers found. Try uploading some!</p>';
            if (statCount) statCount.textContent = '0';
            return;
        }
        renderGallery(wallpapers);
        updateGalleryTitle(category);
        if (statCount) statCount.textContent = wallpapers.length;
    } catch (e) {
        console.error('Fetch error:', e);
        if (galleryGrid) galleryGrid.innerHTML = `<p style="text-align:center;color:var(--text-secondary);padding:3rem;">Error loading wallpapers: ${e.message}</p>`;
        if (statCount) statCount.textContent = '0';
    }
}

function updateGalleryTitle(category) {
    if (galleryTitle) {
        const prefix = currentDeviceType === 'phone' ? 'Phone ' : '';
        galleryTitle.textContent = prefix + (CATEGORY_NAMES[category] || 'Wallpapers');
    }
}

// ==================== FAVORITES ====================
async function checkFavorite(wallpaperId) {
    if (!currentUser) return false;
    try {
        const response = await fetch(`/api/wallpapers/${wallpaperId}/is_favorite?user_id=${currentUser.id}`);
        if (!response.ok) return false;
        const data = await response.json();
        return data.is_favorite;
    } catch (e) { return false; }
}

async function toggleFavorite(wallpaperId, btn) {
    if (!currentUser) {
        openUserPanel();
        showToast('Login to save favorites');
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
        if (data.favorited && userPanel && userPanel.classList.contains('active')) {
            loadUserCollections();
        }
    } catch (e) { console.error('Favorite error:', e); }
}

// ==================== GALLERY CARDS ====================
function createWallpaperCard(wallpaper) {
    const card = document.createElement('div');
    card.className = 'wallpaper-card';
    card.style.setProperty('--row-span', getRandomHeight());
    card.dataset.id = wallpaper.id;

    const img = document.createElement('img');
    img.className = 'card-image';
    img.src = wallpaper.thumbnail_url || wallpaper.image_url;
    img.alt = wallpaper.title || 'Wallpaper';
    img.loading = 'lazy';
    img.draggable = false;
    img.onerror = function () { this.src = wallpaper.image_url; };

    img.addEventListener('contextmenu', (e) => { e.preventDefault(); showContextMenu(e, wallpaper); });
    card.addEventListener('contextmenu', (e) => { e.preventDefault(); showContextMenu(e, wallpaper); });

    const favBtn = document.createElement('button');
    favBtn.className = 'favorite-btn';
    favBtn.innerHTML = '<svg data-lucide="heart" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>';
    favBtn.dataset.id = wallpaper.id;
    favBtn.setAttribute('aria-label', 'Add to favorites');

    checkFavorite(wallpaper.id).then(isFav => { if (isFav) favBtn.classList.add('active'); }).catch(() => { });
    favBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleFavorite(wallpaper.id, favBtn); });

    const overlay = document.createElement('div');
    overlay.className = 'card-overlay';
    let amoledBadge = '';
    if (wallpaper.category && wallpaper.category.toUpperCase() === 'AMOLED' && wallpaper.true_black_pct != null) {
        amoledBadge = `<div class="amoled-badge">True Black: ${wallpaper.true_black_pct}%</div>`;
    }
    overlay.innerHTML = `<h3 class="card-title">${wallpaper.title || 'Untitled'}</h3><div class="card-meta">${capitalize(wallpaper.category || 'Wallpaper')}</div>${amoledBadge}`;

    card.appendChild(img);
    card.appendChild(favBtn);
    card.appendChild(overlay);
    card.addEventListener('click', () => openModal(wallpaper));
    return card;
}

function renderGallery(data) {
    if (!galleryGrid) return;
    galleryGrid.innerHTML = '';
    if (!data || !data.length) {
        galleryGrid.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:3rem;">No wallpapers found</p>';
        return;
    }
    data.forEach(w => galleryGrid.appendChild(createWallpaperCard(w)));
    createIcons();
}

// ==================== CONTEXT MENU ====================
function showContextMenu(e, wallpaper) {
    if (!customContextMenu) return;
    contextMenuTarget = wallpaper;
    const menuWidth = 220, menuHeight = 200;
    const finalX = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
    const finalY = Math.min(e.clientY, window.innerHeight - menuHeight - 10);
    customContextMenu.style.left = finalX + 'px';
    customContextMenu.style.top = finalY + 'px';
    customContextMenu.classList.add('active');
    if (ctxPremiumDownload) {
        const text = wallpaper.category === 'Premium' ? 'Premium (2 Ads)' : 'HD Download (Watch Ad)';
        ctxPremiumDownload.innerHTML = `<svg data-lucide="crown" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg><span>${text}</span>`;
    }
    createIcons();
}
function hideContextMenu() {
    if (customContextMenu) customContextMenu.classList.remove('active');
    contextMenuTarget = null;
}
function initContextMenu() {
    document.addEventListener('click', (e) => {
        if (customContextMenu && !customContextMenu.contains(e.target)) hideContextMenu();
    });
    window.addEventListener('scroll', hideContextMenu, { passive: true });
    if (ctxSaveImage) ctxSaveImage.addEventListener('click', () => {
        if (contextMenuTarget) { window.open(contextMenuTarget.image_url, '_blank'); hideContextMenu(); showToast('Opening image...'); }
    });
    if (ctxDownloadImage) ctxDownloadImage.addEventListener('click', () => {
        if (contextMenuTarget) { showDownloadModal(contextMenuTarget); hideContextMenu(); }
    });
    if (ctxOpenNewTab) ctxOpenNewTab.addEventListener('click', () => {
        if (contextMenuTarget) { window.open(contextMenuTarget.image_url, '_blank'); hideContextMenu(); }
    });
    if (ctxPremiumDownload) ctxPremiumDownload.addEventListener('click', () => {
        if (contextMenuTarget) { showDownloadModal(contextMenuTarget, true); hideContextMenu(); }
    });
}

// ==================== DOWNLOAD MODAL ====================
function showDownloadModal(wallpaper, isPremium = false) {
    if (!downloadModal || !downloadPhase1 || !downloadPhase2 || !countdownNumber || !countdownRing) {
        proceedWithDownload(wallpaper);
        return;
    }
    downloadPhase1.classList.remove('hidden');
    downloadPhase2.classList.add('hidden');
    downloadModal.classList.add('active');

    let countdown = 5;
    countdownNumber.textContent = countdown;
    const circumference = 2 * Math.PI * 15.9155;
    countdownRing.style.strokeDasharray = `${circumference} ${circumference}`;
    countdownRing.style.strokeDashoffset = 0;

    const timer = setInterval(() => {
        countdown--;
        countdownNumber.textContent = countdown;
        countdownRing.style.strokeDashoffset = circumference - (countdown / 5) * circumference;
        if (countdown <= 0) {
            clearInterval(timer);
            downloadPhase1.classList.add('hidden');
            downloadPhase2.classList.remove('hidden');
            setTimeout(() => proceedWithDownload(wallpaper), 600);
            setTimeout(() => downloadModal.classList.remove('active'), 3500);
        }
    }, 1000);
}

function proceedWithDownload(wallpaper) {
    if (!wallpaper || !wallpaper.image_url) return;
    const filename = `${(wallpaper.title || 'wallpaper').replace(/\s+/g, '_').toLowerCase()}_4k.jpg`;
    downloadWallpaper(wallpaper.image_url, filename);
}

async function downloadWallpaper(url, filename) {
    try {
        showToast('Preparing download...');
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network error');
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

// ==================== DEVICE TOGGLE ====================
function initDeviceToggle() {
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

// ==================== CATEGORIES ====================
function initCategories() {
    document.querySelectorAll('.category-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentCategory = pill.dataset.category;
            fetchWallpapers(currentCategory);
        });
    });

    document.querySelectorAll('.qa-item[data-nav]').forEach(item => {
        item.addEventListener('click', () => {
            const category = item.dataset.nav;
            document.querySelectorAll('.category-pill').forEach(p => {
                p.classList.toggle('active', p.dataset.category === category);
            });
            currentCategory = category;
            fetchWallpapers(category);
            const gallerySection = document.querySelector('.gallery-section');
            if (gallerySection) gallerySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    document.querySelectorAll('.nav-link[data-nav]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
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
            if (gallerySection) gallerySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            fetchWallpapers(category);
        });
    });
}

// ==================== SEARCH ====================
function initSearch() {
    if (!searchInput) return;
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) { renderGallery(wallpapers); return; }
        const filtered = wallpapers.filter(w =>
            (w.title && w.title.toLowerCase().includes(query)) ||
            (w.category && w.category.toLowerCase().includes(query))
        );
        renderGallery(filtered);
    });
}

// ==================== UI PREVIEW ====================
function initUiPreview() {
    if (!uiPreviewToggle) return;
    uiPreviewToggle.addEventListener('click', () => {
        uiPreviewActive = !uiPreviewActive;
        uiPreviewToggle.classList.toggle('active', uiPreviewActive);
        if (currentDevice === 'phone') {
            if (phoneUiMock) phoneUiMock.classList.toggle('active', uiPreviewActive);
        } else {
            if (desktopUiMock) desktopUiMock.classList.toggle('active', uiPreviewActive);
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

// ==================== MODAL ====================
function openModal(wallpaper) {
    if (!modalOverlay || !previewImage || !modalTitle) return;
    currentWallpaper = wallpaper;
    currentDevice = 'desktop';
    uiPreviewActive = false;

    if (uiPreviewToggle) {
        uiPreviewToggle.classList.remove('active');
        const span = uiPreviewToggle.querySelector('span');
        if (span) span.textContent = 'Preview UI';
    }
    if (phoneUiMock) phoneUiMock.classList.remove('active');
    if (desktopUiMock) desktopUiMock.classList.remove('active');

    previewImage.src = '';
    if (previewLoading) previewLoading.classList.remove('hidden');

    document.querySelectorAll('.device-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.device === 'desktop');
    });
    if (previewFrame) previewFrame.dataset.device = 'desktop';
    modalTitle.textContent = wallpaper.title || 'Wallpaper';
    if (modalResolution) modalResolution.textContent = '3840 x 2160';
    if (modalCategory) {
        if (wallpaper.category && wallpaper.category.toUpperCase() === 'AMOLED' && wallpaper.true_black_pct != null) {
            modalCategory.innerHTML = `${capitalize(wallpaper.category)} <span style="color:#00ff88;margin-left:8px;">&#8226; ${wallpaper.true_black_pct}% True Black</span>`;
        } else {
            modalCategory.textContent = capitalize(wallpaper.category || 'Wallpaper');
        }
    }
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    previewImage.addEventListener('contextmenu', (e) => { e.preventDefault(); showContextMenu(e, wallpaper); });

    const img = new Image();
    img.onload = () => {
        previewImage.src = wallpaper.image_url;
        if (previewLoading) previewLoading.classList.add('hidden');
    };
    img.onerror = () => {
        if (previewLoading) previewLoading.classList.add('hidden');
        previewImage.src = wallpaper.thumbnail_url || wallpaper.image_url;
    };
    img.src = wallpaper.image_url;
    createIcons();
}

function closeModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
    uiPreviewActive = false;
    if (phoneUiMock) phoneUiMock.classList.remove('active');
    if (desktopUiMock) desktopUiMock.classList.remove('active');
    setTimeout(() => {
        if (previewImage) previewImage.src = '';
        if (previewLoading) previewLoading.classList.remove('hidden');
    }, 400);
}

function switchDevice(device) {
    currentDevice = device;
    if (previewFrame) previewFrame.dataset.device = device;
    if (uiPreviewActive) {
        if (phoneUiMock) phoneUiMock.classList.toggle('active', device === 'phone');
        if (desktopUiMock) desktopUiMock.classList.toggle('active', device !== 'phone');
    }
    document.querySelectorAll('.device-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.device === device);
    });
}

function initModal() {
    if (!modalOverlay) return;
    modalOverlay.addEventListener('click', e => {
        if (e.target === modalOverlay || e.target.classList.contains('modal-backdrop')) closeModal();
    });
    if (modalClose) modalClose.addEventListener('click', closeModal);
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeModal();
            if (userPanel) closeUserPanel();
            if (downloadModal) downloadModal.classList.remove('active');
        }
    });
    document.querySelectorAll('.device-btn').forEach(btn => {
        btn.addEventListener('click', () => switchDevice(btn.dataset.device));
    });
    if (btnDownload) {
        btnDownload.addEventListener('click', () => {
            if (currentWallpaper) showDownloadModal(currentWallpaper);
        });
    }
    if (downloadModalClose) {
        downloadModalClose.addEventListener('click', () => {
            if (downloadModal) downloadModal.classList.remove('active');
        });
    }
}

// ==================== WALLPAPER OF THE DAY ====================
async function loadWallpaperOfTheDay() {
    try {
        const response = await fetch('/api/wallpapers?category=all');
        if (!response.ok) throw new Error(`API failed: ${response.status}`);
        const data = await response.json();
        console.log('WOTD data:', data ? data.length : 0, 'wallpapers');

        if (!data || !data.length) {
            console.log('No wallpapers for WOTD');
            if (wotdTitle) wotdTitle.textContent = 'Coming Soon';
            if (wotdDesc) wotdDesc.textContent = 'Upload wallpapers to see them featured';
            return;
        }

        const today = new Date().toDateString();
        const hash = today.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const wotdIndex = hash % data.length;
        const wotd = data[wotdIndex];

        const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        if (wotdDate) wotdDate.textContent = dateStr;

        if (wotdImage) {
            wotdImage.src = wotd.thumbnail_url || wotd.image_url;
            wotdImage.onerror = () => { wotdImage.src = wotd.image_url; };
        }
        if (wotdTitle) wotdTitle.textContent = wotd.title || 'Featured Wallpaper';
        if (wotdDesc) wotdDesc.textContent = `Featured ${capitalize(wotd.category || 'Wallpaper')}`;

        if (wotdCard) {
            wotdCard.onclick = () => openModal(wotd);
            wotdCard.style.cursor = 'pointer';
        }
        if (wotdBtn) {
            wotdBtn.onclick = (e) => { e.stopPropagation(); openModal(wotd); };
        }
    } catch (e) {
        console.error('WOTD load error:', e);
        if (wotdTitle) wotdTitle.textContent = 'Loading...';
    }
}

// ==================== USER PANEL ====================
let authMode = 'login';

function toggleAuthMode(e) {
    e.preventDefault();
    authMode = authMode === 'login' ? 'signup' : 'login';
    const slider = document.getElementById('authSlider');
    if (slider) {
        slider.style.transform = authMode === 'signup' ? 'translateX(-50%)' : 'translateX(0)';
    }
}

function initUserPanel() {
    const savedUser = localStorage.getItem('phonetic_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showUserAvatar();
    }

    if (accountBtn) accountBtn.addEventListener('click', openUserPanel);
    if (userAvatar) userAvatar.addEventListener('click', openUserPanel);
    if (userPanelClose) userPanelClose.addEventListener('click', closeUserPanel);
    if (userPanelOverlay) userPanelOverlay.addEventListener('click', closeUserPanel);

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            currentUser = null;
            localStorage.removeItem('phonetic_user');
            if (userAvatar) userAvatar.style.display = 'none';
            if (accountBtn) accountBtn.style.display = 'flex';
            closeUserPanel();
            showToast('Logged out successfully');
            document.querySelectorAll('.favorite-btn').forEach(btn => btn.classList.remove('active'));
        });
    }

    if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
            client_id: "935635974021-nfd0b1u8vkdeck1o1cc9afduipi8h6vm.apps.googleusercontent.com",
            callback: handleGoogleCredentialResponse
        });
        const loginTarget = document.getElementById("googleButtonTargetLogin");
        const signupTarget = document.getElementById("googleButtonTargetSignup");
        if (loginTarget) {
            google.accounts.id.renderButton(
                loginTarget,
                { theme: "outline", size: "large", width: "100%", text: "continue_with" }
            );
        }
        if (signupTarget) {
            google.accounts.id.renderButton(
                signupTarget,
                { theme: "outline", size: "large", width: "100%", text: "continue_with" }
            );
        }
    }
}

async function handleCustomAuth(mode) {
    const isSignup = mode === 'signup';
    const emailId = isSignup ? 'signupEmail' : 'loginEmail';
    const passwordId = isSignup ? 'signupPassword' : 'loginPassword';
    const usernameId = 'signupUsername';

    const emailInput = document.getElementById(emailId);
    const passwordInput = document.getElementById(passwordId);
    const usernameInput = document.getElementById(usernameId);

    if (!emailInput || !passwordInput) {
        showToast('Form elements not found');
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const username = isSignup && usernameInput ? usernameInput.value.trim() : "";

    if (!email || !password || (isSignup && !username)) {
        showToast('Please fill in all required fields');
        return;
    }

    const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';
    const bodyPayload = isSignup
        ? `username=${encodeURIComponent(username)}&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
        : `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: bodyPayload
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Authentication failed');
        completeUserSession(data);
    } catch (e) {
        showToast(e.message);
    }
}

async function handleGoogleCredentialResponse(response) {
    try {
        const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `credential=${encodeURIComponent(response.credential)}`
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Google Login failed');
        completeUserSession(data);
    } catch (e) {
        showToast(e.message);
    }
}

function completeUserSession(userData) {
    currentUser = { id: userData.id, username: userData.username };
    localStorage.setItem('phonetic_user', JSON.stringify(currentUser));
    showUserAvatar();
    closeUserPanel();
    showToast(`Logged in successfully as ${userData.username}!`);
}

function showUserAvatar() {
    if (!currentUser || !userAvatar) return;
    userAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
    userAvatar.style.display = 'flex';
    if (accountBtn) accountBtn.style.display = 'none';
    const footer = document.getElementById('userPanelFooter');
    if (footer) footer.style.display = 'block';
}

function openUserPanel() {
    if (!userPanel) return;
    userPanel.classList.add('active');
    if (userPanelOverlay) userPanelOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (currentUser) {
        if (userLoginSection) userLoginSection.style.display = 'none';
        if (userCollections) userCollections.style.display = 'block';
        const footer = document.getElementById('userPanelFooter');
        if (footer) footer.style.display = 'block';
        loadUserCollections();
    } else {
        if (userLoginSection) userLoginSection.style.display = 'block';
        if (userCollections) userCollections.style.display = 'none';
        const footer = document.getElementById('userPanelFooter');
        if (footer) footer.style.display = 'none';
        
        // FIXED: Correctly resets the slider variable so the animation works!
        authMode = 'login'; 
        const slider = document.getElementById('authSlider');
        if (slider) slider.style.transform = 'translateX(0)';
    }
}

function closeUserPanel() {
    if (!userPanel) return;
    userPanel.classList.remove('active');
    if (userPanelOverlay) userPanelOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

async function loadUserCollections() {
    if (!currentUser || !collectionsList) return;
    try {
        const response = await fetch(`/api/favorites/${currentUser.id}`);
        const favorites = await response.json();
        const collections = {};
        const uncategorized = [];
        favorites.forEach(fav => {
            if (fav.collection_name) {
                if (!collections[fav.collection_name]) collections[fav.collection_name] = [];
                collections[fav.collection_name].push(fav);
            } else { uncategorized.push(fav); }
        });
        let html = '';
        if (uncategorized.length > 0) html += renderCollectionSection('All Favorites', uncategorized);
        Object.entries(collections).forEach(([name, items]) => { html += renderCollectionSection(name, items); });
        if (html === '') html = '<p style="color:var(--text-muted);text-align:center;padding:2rem;">No favorites yet. Heart some wallpapers!</p>';
        collectionsList.innerHTML = html;
        createIcons();
    } catch (e) { console.error('Load collections error:', e); }
}

function renderCollectionSection(name, items) {
    return `<div class="collection-section"><div class="collection-header"><span class="collection-name">${name}</span><span class="collection-count">${items.length}</span></div>${items.map(item => `<div class="favorite-item" onclick="openModalFromFavorite(${item.wallpaper.id})"><img src="${item.wallpaper.thumbnail_url || item.wallpaper.image_url}" alt="${item.wallpaper.title}" onerror="this.src='${item.wallpaper.image_url}'"><div class="favorite-item-info"><div class="favorite-item-title">${item.wallpaper.title}</div><div class="favorite-item-cat">${capitalize(item.wallpaper.category)}</div></div></div>`).join('')}</div>`;
}

async function createCollection() {
    if (!newCollectionInput) return;
    const name = newCollectionInput.value.trim();
    if (!name) { showToast('Enter a collection name'); return; }
    showToast(`Collection "${name}" ready! Heart wallpapers to add them.`);
    newCollectionInput.value = '';
    document.querySelectorAll('.favorite-btn').forEach(btn => { btn.dataset.collection = name; });
}

function openModalFromFavorite(wallpaperId) {
    const wallpaper = wallpapers.find(w => w.id === wallpaperId);
    if (wallpaper) { openModal(wallpaper); }
    else {
        showToast('Loading wallpaper...');
        fetch('/api/wallpapers?category=all').then(r => r.json()).then(data => {
            wallpapers = data;
            const w = wallpapers.find(w => w.id === wallpaperId);
            if (w) openModal(w); else showToast('Wallpaper not found');
        });
    }
}

// ==================== MOBILE MENU ====================
function initMobileMenu() {
    if (!mobileMenuBtn || !mobileMenuOverlay || !mobileMenuClose) return;
    mobileMenuBtn.addEventListener('click', openMobileMenu);
    mobileMenuClose.addEventListener('click', closeMobileMenu);
    mobileMenuOverlay.addEventListener('click', (e) => {
        if (e.target === mobileMenuOverlay || e.target.classList.contains('mobile-menu-backdrop')) {
            closeMobileMenu();
        }
    });
    document.querySelectorAll('.mobile-menu-link[data-category]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const category = link.dataset.category;
            closeMobileMenu();
            document.querySelectorAll('.category-pill').forEach(p => {
                p.classList.toggle('active', p.dataset.category === category);
            });
            currentCategory = category;
            fetchWallpapers(category);
            const gallerySection = document.querySelector('.gallery-section');
            if (gallerySection) setTimeout(() => gallerySection.scrollIntoView({ behavior: 'smooth' }), 300);
        });
    });
    document.querySelectorAll('.mobile-menu-link[data-nav]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const nav = link.dataset.nav;
            const category = NAV_TO_CATEGORY[nav];
            if (!category) return;
            closeMobileMenu();
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.category-pill').forEach(p => {
                p.classList.toggle('active', p.dataset.category === category);
            });
            currentCategory = category;
            fetchWallpapers(category);
        });
    });
    let touchStartX = 0;
    mobileMenuOverlay.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    mobileMenuOverlay.addEventListener('touchmove', (e) => {
        if (e.touches[0].clientX - touchStartX < -50) closeMobileMenu();
    }, { passive: true });
}

function openMobileMenu() {
    if (mobileMenuOverlay) { mobileMenuOverlay.classList.add('active'); document.body.style.overflow = 'hidden'; }
}
function closeMobileMenu() {
    if (mobileMenuOverlay) { mobileMenuOverlay.classList.remove('active'); document.body.style.overflow = ''; }
}

// ==================== CATEGORY SWIPE ====================
function initCategorySwipe() {
    const container = document.querySelector('.categories-container');
    if (!container) return;
    let isDown = false, startX, scrollLeft;
    container.addEventListener('touchstart', (e) => { isDown = true; startX = e.touches[0].pageX - container.offsetLeft; scrollLeft = container.scrollLeft; }, { passive: true });
    container.addEventListener('touchend', () => { isDown = false; }, { passive: true });
    container.addEventListener('touchmove', (e) => { if (!isDown) return; const x = e.touches[0].pageX - container.offsetLeft; container.scrollLeft = scrollLeft - (x - startX) * 1.5; }, { passive: true });
}

// ==================== TOAST ====================
function showToast(msg) {
    if (!toast || !toastMessage) return;
    toastMessage.textContent = msg;
    toast.classList.add('active');
    setTimeout(() => toast.classList.remove('active'), 3000);
}

// ==================== LOADING SCREEN ====================
function hideLoadingScreen() {
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => { loadingScreen.style.display = 'none'; }, 600);
    }
}

// ==================== INIT ====================
function init() {
    console.log('=== PHONETIC INIT ===');
    createIcons();
    initTheme();
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    initDeviceToggle();
    initCategories();
    initSearch();
    initModal();
    initUiPreview();
    initUserPanel();
    initContextMenu();
    initMobileMenu();

    loadWallpaperOfTheDay();
    fetchWallpapers('all'); 
    initCategorySwipe();

    setTimeout(hideLoadingScreen, 2000);
    console.log('=== PHONETIC INIT COMPLETE ===');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
// Phonetic Wallpapers - Main JavaScript
// Version: 2.0 - Complete rebuild with all fixes

console.log('=== PHONETIC APP LOADING ===');

// Global state
let wallpapers = [];
let currentCategory = 'all';
let currentWallpaper = null;
let currentDevice = 'desktop';
let currentDeviceType = 'desktop';
let currentUser = null;
let uiPreviewActive = false;
let contextMenuTarget = null;

// DOM element cache
const DOM = {};

function cacheDOM() {
    const ids = [
        'galleryGrid', 'themeToggle', 'modalOverlay', 'modalClose',
        'previewFrame', 'previewImage', 'previewLoading', 'modalTitle',
        'modalResolution', 'modalCategory', 'btnDownload', 'toast',
        'toastMessage', 'searchInput', 'galleryTitle', 'loadingScreen',
        'btnDesktop', 'btnPhone', 'uiPreviewToggle', 'phoneUiMock',
        'desktopUiMock', 'accountBtn', 'userAvatar', 'userPanel',
        'userPanelOverlay', 'userPanelClose', 'userLoginSection',
        'usernameInput', 'userLoginBtn', 'userCollections', 'collectionsList',
        'newCollectionInput', 'createCollectionBtn', 'customContextMenu',
        'ctxSaveImage', 'ctxDownloadImage', 'ctxOpenNewTab', 'ctxPremiumDownload',
        'downloadModal', 'downloadPhase1', 'downloadPhase2', 'countdownNumber',
        'countdownRing', 'downloadModalClose', 'wotdImage', 'wotdTitle', 'wotdDesc', 'wotdDate',
        'wotdCard', 'wotdBtn', 'statCount', 'userAvatarLarge', 'userNameDisplay',
        'createNewAccountBtn', 'logoutBtn',
        'mobileMenuBtn', 'mobileMenuOverlay', 'mobileMenuClose'
    ];
    ids.forEach(id => { DOM[id] = document.getElementById(id); });
}

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

function getRandomHeight() { return Math.floor(Math.random() * 16) + 15; }
function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }

// ==================== THEME ====================
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
    if (!DOM.galleryGrid) return;
    DOM.galleryGrid.innerHTML = '';
    for (let i = 0; i < count; i++) DOM.galleryGrid.appendChild(createSkeletonCard());
}

// ==================== API FETCH ====================
function getApiCategory(category) {
    return currentDeviceType === 'phone' ? (PHONE_CATEGORIES[category] || category) : category;
}

// Touch swipe support for categories
function initCategorySwipe() {
    const container = document.querySelector('.categories-container');
    if (!container) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    container.addEventListener('touchstart', (e) => {
        isDown = true;
        startX = e.touches[0].pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
    }, { passive: true });

    container.addEventListener('touchend', () => {
        isDown = false;
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        if (!isDown) return;
        const x = e.touches[0].pageX - container.offsetLeft;
        const walk = (x - startX) * 1.5;
        container.scrollLeft = scrollLeft - walk;
    }, { passive: true });
}

async function fetchWallpapers(category = 'all') {
    if (!DOM.galleryGrid) return;
    showSkeletons(8);
    const apiCategory = getApiCategory(category);
    const url = apiCategory === 'all' ? '/api/wallpapers' : `/api/wallpapers?category=${apiCategory}`;

    console.log('Fetching:', url);
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        wallpapers = await response.json();
        console.log(`Loaded ${wallpapers.length} wallpapers`);

        if (!wallpapers || !wallpapers.length) {
            DOM.galleryGrid.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:3rem;">No wallpapers found. Try uploading some!</p>';
            return;
        }
        renderGallery(wallpapers);
        updateGalleryTitle(category);
        if (DOM.statCount) DOM.statCount.textContent = wallpapers.length;
    } catch (e) {
        console.error('Fetch error:', e);
        if (DOM.galleryGrid) DOM.galleryGrid.innerHTML = `<p style="text-align:center;color:var(--text-secondary);padding:3rem;">Error: ${e.message}</p>`;
    }
}

function updateGalleryTitle(category) {
    if (DOM.galleryTitle) {
        const prefix = currentDeviceType === 'phone' ? 'Phone ' : '';
        DOM.galleryTitle.textContent = prefix + (CATEGORY_NAMES[category] || 'Wallpapers');
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
        setTimeout(() => { if (DOM.usernameInput) DOM.usernameInput.focus(); }, 300);
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
        if (data.favorited && DOM.userPanel && DOM.userPanel.classList.contains('active')) {
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
    img.onerror = function() { this.src = wallpaper.image_url; };

    img.addEventListener('contextmenu', (e) => { e.preventDefault(); showContextMenu(e, wallpaper); });
    card.addEventListener('contextmenu', (e) => { e.preventDefault(); showContextMenu(e, wallpaper); });

    const favBtn = document.createElement('button');
    favBtn.className = 'favorite-btn';
    favBtn.innerHTML = '<svg data-lucide="heart" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>';
    favBtn.dataset.id = wallpaper.id;
    favBtn.setAttribute('aria-label', 'Add to favorites');

    checkFavorite(wallpaper.id).then(isFav => { if (isFav) favBtn.classList.add('active'); }).catch(() => {});
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
    if (!DOM.galleryGrid) return;
    DOM.galleryGrid.innerHTML = '';
    if (!data || !data.length) {
        DOM.galleryGrid.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:3rem;">No wallpapers found</p>';
        return;
    }
    data.forEach(w => DOM.galleryGrid.appendChild(createWallpaperCard(w)));
    createIcons();
}

function createIcons() {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        try { lucide.createIcons(); } catch (e) { console.warn('Lucide icons failed:', e); }
    }
}

// ==================== CONTEXT MENU ====================
function showContextMenu(e, wallpaper) {
    if (!DOM.customContextMenu) return;
    contextMenuTarget = wallpaper;
    const menuWidth = 220, menuHeight = 200;
    const finalX = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
    const finalY = Math.min(e.clientY, window.innerHeight - menuHeight - 10);
    DOM.customContextMenu.style.left = finalX + 'px';
    DOM.customContextMenu.style.top = finalY + 'px';
    DOM.customContextMenu.classList.add('active');
    if (DOM.ctxPremiumDownload) {
        const text = wallpaper.category === 'Premium' ? 'Premium (2 Ads)' : 'HD Download (Watch Ad)';
        DOM.ctxPremiumDownload.innerHTML = `<svg data-lucide="crown" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg><span>${text}</span>`;
    }
    createIcons();
}
function hideContextMenu() {
    if (DOM.customContextMenu) DOM.customContextMenu.classList.remove('active');
    contextMenuTarget = null;
}
function initMobileMenu() {
    if (!DOM.mobileMenuBtn || !DOM.mobileMenuOverlay || !DOM.mobileMenuClose) return;

    DOM.mobileMenuBtn.addEventListener('click', openMobileMenu);
    DOM.mobileMenuClose.addEventListener('click', closeMobileMenu);
    DOM.mobileMenuOverlay.addEventListener('click', (e) => {
        if (e.target === DOM.mobileMenuOverlay || e.target.classList.contains('mobile-menu-backdrop')) {
            closeMobileMenu();
        }
    });

    // Mobile menu category links
    document.querySelectorAll('.mobile-menu-link[data-category]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const category = link.dataset.category;
            closeMobileMenu();

            // Update active states
            document.querySelectorAll('.category-pill').forEach(p => {
                p.classList.toggle('active', p.dataset.category === category);
            });
            currentCategory = category;
            fetchWallpapers(category);

            // Scroll to gallery
            const gallerySection = document.querySelector('.gallery-section');
            if (gallerySection) {
                setTimeout(() => gallerySection.scrollIntoView({ behavior: 'smooth' }), 300);
            }
        });
    });

    // Mobile menu nav links
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

    // Swipe to close mobile menu
    let touchStartX = 0;
    DOM.mobileMenuOverlay.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
    }, { passive: true });

    DOM.mobileMenuOverlay.addEventListener('touchmove', (e) => {
        const touchX = e.touches[0].clientX;
        const diff = touchX - touchStartX;
        if (diff < -50) {
            closeMobileMenu();
        }
    }, { passive: true });
}

function openMobileMenu() {
    if (!DOM.mobileMenuOverlay) return;
    DOM.mobileMenuOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
    if (!DOM.mobileMenuOverlay) return;
    DOM.mobileMenuOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

function initContextMenu() {
    document.addEventListener('click', (e) => {
        if (DOM.customContextMenu && !DOM.customContextMenu.contains(e.target)) hideContextMenu();
    });
    window.addEventListener('scroll', hideContextMenu, { passive: true });
    if (DOM.ctxSaveImage) DOM.ctxSaveImage.addEventListener('click', () => {
        if (contextMenuTarget) { window.open(contextMenuTarget.image_url, '_blank'); hideContextMenu(); showToast('Opening image...'); }
    });
    if (DOM.ctxDownloadImage) DOM.ctxDownloadImage.addEventListener('click', () => {
        if (contextMenuTarget) { showDownloadModal(contextMenuTarget); hideContextMenu(); }
    });
    if (DOM.ctxOpenNewTab) DOM.ctxOpenNewTab.addEventListener('click', () => {
        if (contextMenuTarget) { window.open(contextMenuTarget.image_url, '_blank'); hideContextMenu(); }
    });
    if (DOM.ctxPremiumDownload) DOM.ctxPremiumDownload.addEventListener('click', () => {
        if (contextMenuTarget) { showDownloadModal(contextMenuTarget, true); hideContextMenu(); }
    });
}

// ==================== DOWNLOAD MODAL ====================
function showDownloadModal(wallpaper, isPremium = false) {
    if (!DOM.downloadModal || !DOM.downloadPhase1 || !DOM.downloadPhase2 || !DOM.countdownNumber || !DOM.countdownRing) {
        proceedWithDownload(wallpaper);
        return;
    }
    DOM.downloadPhase1.classList.remove('hidden');
    DOM.downloadPhase2.classList.add('hidden');
    DOM.downloadModal.classList.add('active');

    let countdown = 5;
    DOM.countdownNumber.textContent = countdown;
    const circumference = 2 * Math.PI * 15.9155;
    DOM.countdownRing.style.strokeDasharray = `${circumference} ${circumference}`;
    DOM.countdownRing.style.strokeDashoffset = 0;

    const timer = setInterval(() => {
        countdown--;
        DOM.countdownNumber.textContent = countdown;
        DOM.countdownRing.style.strokeDashoffset = circumference - (countdown / 5) * circumference;
        if (countdown <= 0) {
            clearInterval(timer);
            DOM.downloadPhase1.classList.add('hidden');
            DOM.downloadPhase2.classList.remove('hidden');
            setTimeout(() => proceedWithDownload(wallpaper), 600);
            setTimeout(() => DOM.downloadModal.classList.remove('active'), 3500);
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
    if (!DOM.btnDesktop || !DOM.btnPhone) return;
    DOM.btnDesktop.addEventListener('click', () => {
        currentDeviceType = 'desktop';
        DOM.btnDesktop.classList.add('active');
        DOM.btnPhone.classList.remove('active');
        fetchWallpapers(currentCategory);
    });
    DOM.btnPhone.addEventListener('click', () => {
        currentDeviceType = 'phone';
        DOM.btnPhone.classList.add('active');
        DOM.btnDesktop.classList.remove('active');
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
            if (gallerySection) gallerySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            fetchWallpapers(category);
        });
    });
}

// ==================== SEARCH ====================
function initSearch() {
    if (!DOM.searchInput) return;
    DOM.searchInput.addEventListener('input', (e) => {
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
    if (!DOM.uiPreviewToggle) return;
    DOM.uiPreviewToggle.addEventListener('click', () => {
        uiPreviewActive = !uiPreviewActive;
        DOM.uiPreviewToggle.classList.toggle('active', uiPreviewActive);
        if (currentDevice === 'phone') {
            if (DOM.phoneUiMock) DOM.phoneUiMock.classList.toggle('active', uiPreviewActive);
        } else {
            if (DOM.desktopUiMock) DOM.desktopUiMock.classList.toggle('active', uiPreviewActive);
        }
        const span = DOM.uiPreviewToggle.querySelector('span');
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
    if (!DOM.modalOverlay || !DOM.previewImage || !DOM.modalTitle) return;
    currentWallpaper = wallpaper;
    currentDevice = 'desktop';
    uiPreviewActive = false;

    if (DOM.uiPreviewToggle) {
        DOM.uiPreviewToggle.classList.remove('active');
        const span = DOM.uiPreviewToggle.querySelector('span');
        if (span) span.textContent = 'Preview UI';
    }
    if (DOM.phoneUiMock) DOM.phoneUiMock.classList.remove('active');
    if (DOM.desktopUiMock) DOM.desktopUiMock.classList.remove('active');

    DOM.previewImage.src = '';
    if (DOM.previewLoading) DOM.previewLoading.classList.remove('hidden');

    document.querySelectorAll('.device-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.device === 'desktop');
    });
    if (DOM.previewFrame) DOM.previewFrame.dataset.device = 'desktop';
    DOM.modalTitle.textContent = wallpaper.title || 'Wallpaper';
    if (DOM.modalResolution) DOM.modalResolution.textContent = '3840 × 2160';
    if (DOM.modalCategory) {
        if (wallpaper.category && wallpaper.category.toUpperCase() === 'AMOLED' && wallpaper.true_black_pct != null) {
            DOM.modalCategory.innerHTML = `${capitalize(wallpaper.category)} <span style="color:#00ff88;margin-left:8px;">• ${wallpaper.true_black_pct}% True Black</span>`;
        } else {
            DOM.modalCategory.textContent = capitalize(wallpaper.category || 'Wallpaper');
        }
    }
    DOM.modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    DOM.previewImage.addEventListener('contextmenu', (e) => { e.preventDefault(); showContextMenu(e, wallpaper); });

    const img = new Image();
    img.onload = () => {
        DOM.previewImage.src = wallpaper.image_url;
        if (DOM.previewLoading) DOM.previewLoading.classList.add('hidden');
    };
    img.onerror = () => {
        if (DOM.previewLoading) DOM.previewLoading.classList.add('hidden');
        DOM.previewImage.src = wallpaper.thumbnail_url || wallpaper.image_url;
    };
    img.src = wallpaper.image_url;
    createIcons();
}

function closeModal() {
    if (!DOM.modalOverlay) return;
    DOM.modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
    uiPreviewActive = false;
    if (DOM.phoneUiMock) DOM.phoneUiMock.classList.remove('active');
    if (DOM.desktopUiMock) DOM.desktopUiMock.classList.remove('active');
    setTimeout(() => {
        if (DOM.previewImage) DOM.previewImage.src = '';
        if (DOM.previewLoading) DOM.previewLoading.classList.remove('hidden');
    }, 400);
}

function switchDevice(device) {
    currentDevice = device;
    if (DOM.previewFrame) DOM.previewFrame.dataset.device = device;
    if (uiPreviewActive) {
        if (DOM.phoneUiMock) DOM.phoneUiMock.classList.toggle('active', device === 'phone');
        if (DOM.desktopUiMock) DOM.desktopUiMock.classList.toggle('active', device !== 'phone');
    }
    document.querySelectorAll('.device-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.device === device);
    });
}

function initModal() {
    if (!DOM.modalOverlay) return;
    DOM.modalOverlay.addEventListener('click', e => {
        if (e.target === DOM.modalOverlay || e.target.classList.contains('modal-backdrop')) closeModal();
    });
    if (DOM.modalClose) DOM.modalClose.addEventListener('click', closeModal);
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeModal();
            if (DOM.userPanel) closeUserPanel();
            if (DOM.downloadModal) DOM.downloadModal.classList.remove('active');
        }
    });
    document.querySelectorAll('.device-btn').forEach(btn => {
        btn.addEventListener('click', () => switchDevice(btn.dataset.device));
    });
    if (DOM.btnDownload) {
        DOM.btnDownload.addEventListener('click', () => {
            if (currentWallpaper) showDownloadModal(currentWallpaper);
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
            if (DOM.wotdTitle) DOM.wotdTitle.textContent = 'Coming Soon';
            if (DOM.wotdDesc) DOM.wotdDesc.textContent = 'Upload wallpapers to see them featured';
            return;
        }

        const today = new Date().toDateString();
        const hash = today.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const wotdIndex = hash % data.length;
        const wotd = data[wotdIndex];

        const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        if (DOM.wotdDate) DOM.wotdDate.textContent = dateStr;

        if (DOM.wotdImage) {
            DOM.wotdImage.src = wotd.thumbnail_url || wotd.image_url;
            DOM.wotdImage.onerror = () => { DOM.wotdImage.src = wotd.image_url; };
        }
        if (DOM.wotdTitle) DOM.wotdTitle.textContent = wotd.title || 'Featured Wallpaper';
        if (DOM.wotdDesc) DOM.wotdDesc.textContent = `Featured ${capitalize(wotd.category || 'Wallpaper')}`;

        if (DOM.wotdCard) {
            DOM.wotdCard.onclick = () => openModal(wotd);
            DOM.wotdCard.style.cursor = 'pointer';
        }
        if (DOM.wotdBtn) {
            DOM.wotdBtn.onclick = (e) => { e.stopPropagation(); openModal(wotd); };
        }
    } catch (e) {
        console.error('WOTD load error:', e);
        if (DOM.wotdTitle) DOM.wotdTitle.textContent = 'Loading...';
    }
}

// ==================== USER PANEL ====================
function initUserPanel() {
    const savedUser = localStorage.getItem('phonetic_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            showUserAvatar();
        } catch (e) {
            localStorage.removeItem('phonetic_user');
        }
    }
    if (DOM.accountBtn) DOM.accountBtn.addEventListener('click', openUserPanel);
    if (DOM.userAvatar) DOM.userAvatar.addEventListener('click', openUserPanel);
    if (DOM.userPanelClose) DOM.userPanelClose.addEventListener('click', closeUserPanel);
    if (DOM.userPanelOverlay) DOM.userPanelOverlay.addEventListener('click', closeUserPanel);
    if (DOM.userLoginBtn) DOM.userLoginBtn.addEventListener('click', handleLogin);
    if (DOM.usernameInput) {
        DOM.usernameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });
    }
    if (DOM.createCollectionBtn) DOM.createCollectionBtn.addEventListener('click', createCollection);
    if (DOM.newCollectionInput) {
        DOM.newCollectionInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') createCollection(); });
    }
}
function showUserAvatar() {
    if (!currentUser || !DOM.userAvatar) return;
    const initial = currentUser.username.charAt(0).toUpperCase();
    DOM.userAvatar.textContent = initial;
    DOM.userAvatar.style.display = 'flex';
    if (DOM.accountBtn) DOM.accountBtn.style.display = 'none';

    // Update panel avatar and name
    if (DOM.userAvatarLarge) {
        DOM.userAvatarLarge.textContent = initial;
    }
    if (DOM.userNameDisplay) {
        DOM.userNameDisplay.textContent = currentUser.username;
    }
}
function openUserPanel() {
    if (!DOM.userPanel) return;
    DOM.userPanel.classList.add('active');
    if (DOM.userPanelOverlay) DOM.userPanelOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (currentUser) {
        if (DOM.userLoginSection) DOM.userLoginSection.style.display = 'none';
        if (DOM.userCollections) DOM.userCollections.style.display = 'block';
        showUserAvatar();
        loadUserCollections();
    } else {
        if (DOM.userLoginSection) DOM.userLoginSection.style.display = 'flex';
        if (DOM.userCollections) DOM.userCollections.style.display = 'none';
    }
}
function closeUserPanel() {
    if (!DOM.userPanel) return;
    DOM.userPanel.classList.remove('active');
    if (DOM.userPanelOverlay) DOM.userPanelOverlay.classList.remove('active');
    document.body.style.overflow = '';
}
async function handleLogin() {
    if (!DOM.usernameInput) return;
    const username = DOM.usernameInput.value.trim();
    if (!username) { showToast('Please enter a username'); return; }
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
    } catch (e) { console.error('Login error:', e); showToast('Failed to login'); }
}
async function loadUserCollections() {
    if (!currentUser || !DOM.collectionsList) return;
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
        DOM.collectionsList.innerHTML = html;
        createIcons();
    } catch (e) { console.error('Load collections error:', e); }
}
function renderCollectionSection(name, items) {
    const collectionId = name.replace(/\s+/g, '_').toLowerCase();
    return `<div class="collection-section" data-collection="${name}"><div class="collection-header"><span class="collection-name">${name}</span><span class="collection-count">${items.length}</span></div><div class="collection-items">${items.map(item => `<div class="favorite-item" onclick="openModalFromFavorite(${item.wallpaper.id})"><img src="${item.wallpaper.thumbnail_url || item.wallpaper.image_url}" alt="${item.wallpaper.title}" onerror="this.src='${item.wallpaper.image_url}'"><div class="favorite-item-info"><div class="favorite-item-title">${item.wallpaper.title}</div><div class="favorite-item-cat">${capitalize(item.wallpaper.category)}</div></div></div>`).join('')}</div><div class="collection-actions"><button class="collection-action-btn edit" onclick="editCollection('${name}')" title="Edit name"><svg data-lucide="edit-3" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button><button class="collection-action-btn delete" onclick="deleteCollection('${name}')" title="Delete collection"><svg data-lucide="trash-2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></div></div>`;
}

function editCollection(oldName) {
    const newName = prompt('Enter new collection name:', oldName);
    if (!newName || newName === oldName) return;

    // Update all favorites in this collection
    if (!currentUser) return;

    // For now, update locally and refresh
    showToast(`Collection renamed to "${newName}"`);
    loadUserCollections();
}

function deleteCollection(name) {
    if (!confirm(`Delete collection "${name}"? This will remove all wallpapers from this collection.`)) return;

    if (!currentUser) return;

    // Remove all favorites in this collection
    fetch(`/api/favorites/${currentUser.id}`)
        .then(r => r.json())
        .then(favorites => {
            const toDelete = favorites.filter(f => f.collection_name === name);
            const promises = toDelete.map(f => 
                fetch('/api/favorites', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `user_id=${currentUser.id}&wallpaper_id=${f.wallpaper_id}&collection_name=${encodeURIComponent(name)}`
                })
            );
            return Promise.all(promises);
        })
        .then(() => {
            showToast(`Collection "${name}" deleted`);
            loadUserCollections();
        })
        .catch(e => console.error('Delete collection error:', e));
}
async function createCollection() {
    if (!DOM.newCollectionInput) return;
    const name = DOM.newCollectionInput.value.trim();
    if (!name) { showToast('Enter a collection name'); return; }
    showToast(`Collection "${name}" ready! Heart wallpapers to add them.`);
    DOM.newCollectionInput.value = '';
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

// ==================== TOAST ====================
function showToast(msg) {
    if (!DOM.toast || !DOM.toastMessage) return;
    DOM.toastMessage.textContent = msg;
    DOM.toast.classList.add('active');
    setTimeout(() => DOM.toast.classList.remove('active'), 3000);
}

// ==================== LOADING SCREEN ====================
function hideLoadingScreen() {
    if (DOM.loadingScreen) {
        DOM.loadingScreen.style.opacity = '0';
        setTimeout(() => { DOM.loadingScreen.style.display = 'none'; }, 500);
    }
}

// ==================== INIT ====================
function init() {
    console.log('=== PHONETIC INIT ===');
    cacheDOM();
    createIcons();
    initTheme();
    if (DOM.themeToggle) DOM.themeToggle.addEventListener('click', toggleTheme);
    initDeviceToggle();
    initCategories();
    initSearch();
    initModal();
    initUiPreview();
    initUserPanel();
    initMobileMenu();
    initContextMenu();

    // Account actions
    if (DOM.createNewAccountBtn) {
        DOM.createNewAccountBtn.addEventListener('click', () => {
            currentUser = null;
            localStorage.removeItem('phonetic_user');
            if (DOM.userAvatar) DOM.userAvatar.style.display = 'none';
            if (DOM.accountBtn) DOM.accountBtn.style.display = 'flex';
            openUserPanel();
            showToast('Create a new account');
        });
    }
    if (DOM.logoutBtn) {
        DOM.logoutBtn.addEventListener('click', () => {
            currentUser = null;
            localStorage.removeItem('phonetic_user');
            if (DOM.userAvatar) DOM.userAvatar.style.display = 'none';
            if (DOM.accountBtn) DOM.accountBtn.style.display = 'flex';
            closeUserPanel();
            showToast('Logged out successfully');
            // Refresh favorite buttons
            document.querySelectorAll('.favorite-btn').forEach(btn => {
                btn.classList.remove('active');
            });
        });
    }

    // Download modal close button
    if (DOM.downloadModalClose) {
        DOM.downloadModalClose.addEventListener('click', () => {
            if (DOM.downloadModal) DOM.downloadModal.classList.remove('active');
        });
    }

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
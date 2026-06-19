// Add this FIRST LINE to app.js
console.log('app.js loaded, lucide available:', typeof lucide);

// If lucide fails, create a fallback
if (typeof lucide === 'undefined') {
    window.lucide = {
        createIcons: function() { console.log('lucide fallback'); }
    };
}

let wallpapers = [];
let currentCategory = 'all';
let currentWallpaper = null;
let currentDevice = 'desktop';
let currentDeviceType = 'desktop';
let currentUser = null;
let uiPreviewActive = false;
let contextMenuTarget = null; 

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
const btnDesktop = document.getElementById('btnDesktop');
const btnPhone = document.getElementById('btnPhone');
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
const customContextMenu = document.getElementById('customContextMenu');
const ctxSaveImage = document.getElementById('ctxSaveImage');
const ctxDownloadImage = document.getElementById('ctxDownloadImage');
const ctxOpenNewTab = document.getElementById('ctxOpenNewTab');
const ctxPremiumDownload = document.getElementById('ctxPremiumDownload');

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
    const inner = document.createElement('div');
    inner.className = 'skeleton-image';
    card.appendChild(inner);
    return card;
}

function showSkeletons(count = 8) {
    if (!galleryGrid) return;
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
    if (!galleryGrid) return;
    showSkeletons(8);
    const apiCategory = getApiCategory(category);
    const url = apiCategory === 'all' ? '/api/wallpapers' : `/api/wallpapers?category=${apiCategory}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        wallpapers = await response.json();
        
        if (!wallpapers || !wallpapers.length) {
            galleryGrid.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:3rem;">No wallpapers found.</p>';
            return;
        }
        
        renderGallery(wallpapers);
        updateGalleryTitle(category);
        
        const statCount = document.getElementById('statCount');
        if (statCount) statCount.textContent = wallpapers.length;
    } catch (e) {
        galleryGrid.innerHTML = `<p style="text-align:center;color:var(--text-secondary);padding:3rem;">Error loading wallpapers</p>`;
    }
}

function updateGalleryTitle(category) {
    if (galleryTitle) {
        const prefix = currentDeviceType === 'phone' ? 'Phone ' : '';
        galleryTitle.textContent = prefix + (CATEGORY_NAMES[category] || 'Wallpapers');
    }
}

async function checkFavorite(wallpaperId) {
    if (!currentUser) return false;
    try {
        const response = await fetch(`/api/wallpapers/${wallpaperId}/is_favorite?user_id=${currentUser.id}`);
        const data = await response.json();
        return data.is_favorite;
    } catch (e) { return false; }
}

async function toggleFavorite(wallpaperId, btn) {
    if (!currentUser) {
        openUserPanel();
        showToast('Login to save favorites');
        setTimeout(() => { if (usernameInput) usernameInput.focus(); }, 300);
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
    if (wallpaper.category === 'AMOLED' && wallpaper.true_black_pct) {
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
    if (!galleryGrid) return;
    galleryGrid.innerHTML = '';
    if (!data || !data.length) {
        galleryGrid.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:3rem;">No wallpapers found</p>';
        return;
    }
    data.forEach(w => galleryGrid.appendChild(createWallpaperCard(w)));
    lucide.createIcons();
}

// ==================== CONTEXT MENU ====================
function showContextMenu(e, wallpaper) {
    if (!customContextMenu) return;
    contextMenuTarget = wallpaper;
    const x = e.clientX;
    const y = e.clientY;
    const menuWidth = 200;
    const menuHeight = 180;
    const finalX = Math.min(x, window.innerWidth - menuWidth - 10);
    const finalY = Math.min(y, window.innerHeight - menuHeight - 10);
    
    customContextMenu.style.left = finalX + 'px';
    customContextMenu.style.top = finalY + 'px';
    customContextMenu.classList.add('active');
    
    if (ctxPremiumDownload) {
        if (wallpaper.category === 'Premium') {
            ctxPremiumDownload.innerHTML = '<i data-lucide="crown"></i><span>Premium (Ad)</span>';
        } else {
            ctxPremiumDownload.innerHTML = '<i data-lucide="crown"></i><span>HD Download</span>';
        }
    }
    lucide.createIcons();
}

function hideContextMenu() {
    if (customContextMenu) customContextMenu.classList.remove('active');
    contextMenuTarget = null;
}

function initContextMenu() {
    document.addEventListener('click', (e) => {
        if (customContextMenu && !customContextMenu.contains(e.target)) hideContextMenu();
    });
    window.addEventListener('scroll', hideContextMenu);
    
    if (ctxSaveImage) {
        ctxSaveImage.addEventListener('click', () => {
            if (!contextMenuTarget) return;
            window.open(contextMenuTarget.image_url, '_blank');
            hideContextMenu();
            showToast('Opening image...');
        });
    }
    
    if (ctxDownloadImage) {
        ctxDownloadImage.addEventListener('click', () => {
            if (!contextMenuTarget) return;
            startDownloadWithAd(contextMenuTarget.image_url, contextMenuTarget.title);
            hideContextMenu();
        });
    }
    
    if (ctxOpenNewTab) {
        ctxOpenNewTab.addEventListener('click', () => {
            if (!contextMenuTarget) return;
            window.open(contextMenuTarget.image_url, '_blank');
            hideContextMenu();
        });
    }
    
    if (ctxPremiumDownload) {
        ctxPremiumDownload.addEventListener('click', () => {
            if (!contextMenuTarget) return;
            startDownloadWithAd(contextMenuTarget.image_url, contextMenuTarget.title);
            hideContextMenu();
        });
    }
}

// ==================== AD DOWNLOAD INTEGRATION ====================
function startDownloadWithAd(imageUrl, wallpaperTitle) {
    const overlay = document.getElementById('downloadAdOverlay');
    const statusText = document.getElementById('downloadStatusText');
    const timerText = document.getElementById('downloadTimerText');
    const tickAnim = document.getElementById('downloadTick');

    if (!overlay) return;

    const filename = (wallpaperTitle || 'phonetic_wallpaper').toLowerCase().replace(/\s+/g, '_') + '.jpg';

    // Reset UI State
    statusText.innerText = "Please wait, downloading your wallpaper for free...";
    timerText.style.display = "block";
    tickAnim.style.display = "none";
    timerText.innerText = "5";
    overlay.classList.add('active');

    let timeLeft = 5;
    const interval = setInterval(() => {
        timeLeft--;
        timerText.innerText = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(interval);
            timerText.style.display = "none";
            tickAnim.style.display = "block";
            statusText.innerText = "Wallpaper downloaded successfully!";
            
            if (window.lucide) window.lucide.createIcons(); 

            triggerActualDownload(imageUrl, filename);

            setTimeout(() => {
                overlay.classList.remove('active');
            }, 3000);
        }
    }, 1000);
}

function triggerActualDownload(url, filename) {
    fetch(url)
        .then(response => response.blob())
        .then(blob => {
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(blobUrl);
        })
        .catch(e => {
            console.error("Download failed via blob, opening fallback tab:", e);
            window.open(url, '_blank');
        });
}

// ==================== UI & MODALS ====================
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

function openModal(wallpaper) {
    if (!modalOverlay) return;
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
    
    if (previewImage) previewImage.src = '';
    if (previewLoading) previewLoading.classList.remove('hidden');
    
    document.querySelectorAll('.device-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.device === 'desktop');
    });
    
    if (previewFrame) previewFrame.dataset.device = 'desktop';
    if (modalTitle) modalTitle.textContent = wallpaper.title;
    if (modalResolution) modalResolution.textContent = '3840 × 2160';
    
    if (modalCategory) {
        if (wallpaper.category === 'AMOLED' && wallpaper.true_black_pct) {
            modalCategory.innerHTML = `${capitalize(wallpaper.category)} <span style="color:#00ff88;margin-left:8px;">• ${wallpaper.true_black_pct}% True Black</span>`;
        } else {
            modalCategory.textContent = capitalize(wallpaper.category);
        }
    }
    
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    const img = new Image();
    img.onload = () => {
        if (previewImage) previewImage.src = wallpaper.image_url;
        if (previewLoading) previewLoading.classList.add('hidden');
    };
    img.onerror = () => {
        if (previewLoading) previewLoading.classList.add('hidden');
        if (previewImage) previewImage.src = wallpaper.thumbnail_url || wallpaper.image_url;
    };
    img.src = wallpaper.image_url;
    
    lucide.createIcons();
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
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
    document.querySelectorAll('.device-btn').forEach(btn => {
        btn.addEventListener('click', () => switchDevice(btn.dataset.device));
    });
    
    if (btnDownload) {
        btnDownload.addEventListener('click', () => {
            if (!currentWallpaper) return;
            startDownloadWithAd(currentWallpaper.image_url, currentWallpaper.title);
        });
    }
}

// ==================== WALLPAPER OF THE DAY (HASH) ====================
async function loadWallpaperOfTheDay() {
    try {
        const response = await fetch('/api/wallpapers?category=all');
        if (!response.ok) throw new Error('API failed');
        
        const data = await response.json();
        
        if (!data || !data.length) {
            const wotdTitle = document.getElementById('wotdTitle');
            const wotdDesc = document.getElementById('wotdDesc');
            if (wotdTitle) wotdTitle.textContent = 'Coming Soon';
            if (wotdDesc) wotdDesc.textContent = 'Wallpapers loading...';
            return;
        }
        
        // Consistent Date Hashing 
        const today = new Date();
        const dateString = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
        let hash = 0;
        
        for (let i = 0; i < dateString.length; i++) {
            hash = ((hash << 5) - hash) + dateString.charCodeAt(i);
            hash |= 0;
        }

        const index = Math.abs(hash) % data.length;
        const wotd = data[index];
        
        const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const dateEl = document.getElementById('wotdDate');
        if (dateEl) dateEl.textContent = dateStr;
        
        const imgEl = document.getElementById('wotdImage');
        const titleEl = document.getElementById('wotdTitle');
        const descEl = document.getElementById('wotdDesc');
        const cardEl = document.getElementById('wotdCard');
        const btnEl = document.getElementById('wotdBtn');
        
        if (imgEl) imgEl.src = wotd.thumbnail_url || wotd.image_url;
        if (titleEl) titleEl.textContent = wotd.title || 'Featured Wallpaper';
        if (descEl) descEl.textContent = `Featured ${capitalize(wotd.category || 'Wallpaper')}`;
        
        if (cardEl) cardEl.onclick = () => openModal(wotd);
        if (btnEl) {
            btnEl.onclick = (e) => {
                e.stopPropagation();
                openModal(wotd);
            };
        }
    } catch (e) {
        const wotdTitle = document.getElementById('wotdTitle');
        if (wotdTitle) wotdTitle.textContent = 'Loading...';
    }
}

// ==================== USER PANEL ====================
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
    if (userLoginBtn) userLoginBtn.addEventListener('click', handleLogin);
    
    if (usernameInput) {
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
    }
    
    if (createCollectionBtn) createCollectionBtn.addEventListener('click', createCollection);
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
    if (!userPanel) return;
    userPanel.classList.add('active');
    if (userPanelOverlay) userPanelOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    if (currentUser) {
        if (userLoginSection) userLoginSection.style.display = 'none';
        if (userCollections) userCollections.style.display = 'block';
        loadUserCollections();
    } else {
        if (userLoginSection) userLoginSection.style.display = 'flex';
        if (userCollections) userCollections.style.display = 'none';
    }
}

function closeUserPanel() {
    if (!userPanel) return;
    userPanel.classList.remove('active');
    if (userPanelOverlay) userPanelOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

async function handleLogin() {
    if (!usernameInput) return;
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
    if (!currentUser || !collectionsList) return;
    
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
                    <img src="${item.wallpaper.thumbnail_url || item.wallpaper.image_url}" alt="${item.wallpaper.title}">
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
    if (!newCollectionInput) return;
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
    if (wallpaper) openModal(wallpaper);
    else showToast('Loading wallpaper...');
}

function showToast(msg) {
    if (!toast || !toastMessage) return;
    toastMessage.textContent = msg;
    toast.classList.add('active');
    setTimeout(() => toast.classList.remove('active'), 3000);
}

function init() {
    if (loadingScreen) setTimeout(() => loadingScreen.style.display = 'none', 2500);
    const helloScreen = document.getElementById('helloScreen');
    if (helloScreen) setTimeout(() => helloScreen.style.display = 'none', 4500);
    
    lucide.createIcons();
    initTheme();
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    initDeviceToggle();
    initCategories();
    initSearch();
    initModal();
    initUiPreview();
    initUserPanel();
    initContextMenu();
    loadWallpaperOfTheDay();
    fetchWallpapers('all');

    // === MOBILE BOTTOM NAV LOGIC ===
    const mobThemeToggle = document.getElementById('mobThemeToggle');
    const mobAccountBtn = document.getElementById('mobAccountBtn');
    
    if (mobThemeToggle) {
        mobThemeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            toggleTheme(); 
        });
    }
    
    if (mobAccountBtn) {
        mobAccountBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openUserPanel(); 
        });
    }

    document.querySelectorAll('.mob-nav-item[data-nav]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const nav = link.dataset.nav;
            const category = NAV_TO_CATEGORY[nav];
            if (!category) return;
            
            document.querySelectorAll('.mob-nav-item').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            currentCategory = category;
            fetchWallpapers(category);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    console.log('=== PHONETIC INIT COMPLETE ===');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
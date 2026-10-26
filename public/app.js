// ============================================================================
// STLSearch — Universal 3D Model Meta-Search Engine (100% English UI)
// Properly wired to /api/search, /api/suggest, /api/image & categories_data.js
// ============================================================================

const state = {
    allModels: [],
    filteredModels: [],
    currentQuery: '',
    currentPage: 1,
    isLoading: false,
    autoStream: true,
    activeRequestId: 0,

    // Filters
    sourceFilter: 'all',
    priceFilter: 'all',     // 'all' | 'free' | 'paid'
    techFilter: 'all',      // 'all' | 'FDM' | 'SLA' | 'CNC'
    featureFilter: 'all',   // 'all' | 'nosupport' | 'articulated' | 'multicolor' | 'vase' | 'functional'
    formatFilter: 'all',    // 'all' | 'STL' | '3MF' | 'STEP' | 'OBJ' | 'DXF'
    subSearchText: '',
    activeSmartTag: '',
    sortBy: 'relevance',

    // 3-Level Category Hierarchy State
    activeRootCategory: null,
    activeSubCategory: null,
    activeLeafCategory: null
};

const MARKETPLACE_SOURCES = [
    'Designmak',
    'MakerWorld',
    'Printables',
    'Thingiverse',
    'CrealityCloud',
    'Snapmaker',
    'Cults3D',
    'MyMiniFactory',
    'Thangs',
    'GrabCAD',
    'CGTrader'
];

const SOURCE_DOT_CLASS = {
    Designmak: 'mp-designmak',
    MakerWorld: 'mp-makerworld',
    Printables: 'mp-printables',
    Thingiverse: 'mp-thingiverse',
    CrealityCloud: 'mp-creality',
    Snapmaker: 'mp-snapmaker',
    Cults3D: 'mp-cults',
    MyMiniFactory: 'mp-mmf',
    Thangs: 'mp-thangs',
    GrabCAD: 'mp-grabcad',
    CGTrader: 'mp-cgtrader'
};

// DOM Elements
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const searchBtn = document.getElementById('searchBtn');
const liveSuggestDropdown = document.getElementById('liveSuggestDropdown');
const suggestWordsList = document.getElementById('suggestWordsList');
const suggestModelsList = document.getElementById('suggestModelsList');
const liveWordsBar = document.getElementById('liveWordsBar');
const liveWordsChips = document.getElementById('liveWordsChips');
const totalDbCounter = document.getElementById('totalDbCounter');
const infiniteStreamToggle = document.getElementById('infiniteStreamToggle');

const rootCategoriesGrid = document.getElementById('rootCategoriesGrid');
const categoryTreeSearchInput = document.getElementById('categoryTreeSearchInput');
const subCategoriesContainer = document.getElementById('subCategoriesContainer');
const level2Title = document.getElementById('level2Title');
const level2Grid = document.getElementById('level2Grid');
const level3Section = document.getElementById('level3Section');
const level3Title = document.getElementById('level3Title');
const level3Grid = document.getElementById('level3Grid');

const categoryBreadcrumbBar = document.getElementById('categoryBreadcrumbBar');
const breadcrumbPathText = document.getElementById('breadcrumbPathText');
const activeCategorySources = document.getElementById('activeCategorySources');
const clearCategoryBtn = document.getElementById('clearCategoryBtn');

const statusText = document.getElementById('statusText');
const streamSpinner = document.getElementById('streamSpinner');
const subSearchInput = document.getElementById('subSearchInput');
const sortSelect = document.getElementById('sortSelect');
const loadMorePagesBtn = document.getElementById('loadMorePagesBtn');
const loadMoreBottomBtn = document.getElementById('loadMoreBottomBtn');
const loadMoreFooter = document.getElementById('loadMoreFooter');
const currentPageBadge = document.getElementById('currentPageBadge');
const dynamicSubTagsBar = document.getElementById('dynamicSubTagsBar');
const resultsGrid = document.getElementById('resultsGrid');

let suggestDebounceTimer = null;
let autoTypeSearchTimer = null;

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    renderUniversalCategoryTree();
    renderMarketplaceComparisonModal();
    bindEvents();
    loadInitialPopularModels();
});

// ============================================================================
// NORMALIZATION: 100% English Price, Tech, Format & Image Proxy
// ============================================================================
function normalizeModelRecord(raw) {
    const m = { ...raw };

    // Normalize legacy price labels to English
    let rawPrice = String(m.price || 'Free').trim();
    if (
        rawPrice === '' ||
        rawPrice.toLowerCase() === 'free' ||
        rawPrice.toLowerCase() === 'ücretsiz' ||
        rawPrice === '$0' ||
        rawPrice === '$0.00'
    ) {
        rawPrice = 'Free';
    }

    const isPaidFlag =
        m.is_free === 0 ||
        m.isPaid === true ||
        (rawPrice !== 'Free' && /[\$€£₺]|[1-9]\d*(\.\d+)?/i.test(rawPrice));

    m.isPaid = Boolean(isPaidFlag);
    m.price = m.isPaid ? (rawPrice === 'Free' ? '$4.99' : rawPrice) : 'Free';

    const combinedText = `${m.title || ''} ${m.tags || ''} ${m.source || ''}`.toLowerCase();

    // Technology detection (FDM / SLA / CNC)
    if (combinedText.includes('tech_cnc') || /\b(cnc|laser|dxf|svg|router|plasma|engraving|plywood|mdf|relief)\b/i.test(combinedText)) {
        m.tech = 'CNC';
    } else if (combinedText.includes('tech_sla') || /\b(sla|resin|msla|dlp|miniature|warhammer|dnd|tabletop|figurine|bust|statue)\b/i.test(combinedText)) {
        m.tech = 'SLA';
    } else {
        m.tech = 'FDM';
    }

    // Format detection (STL / 3MF / STEP / OBJ / DXF)
    if (combinedText.includes('format_3mf') || /\b(3mf|bambu|ams)\b/i.test(combinedText) || m.source === 'MakerWorld') {
        m.format = '3MF';
    } else if (combinedText.includes('format_step') || /\b(step|stp|iges|igs|solidworks|fusion|cad)\b/i.test(combinedText) || m.source === 'GrabCAD') {
        m.format = 'STEP';
    } else if (combinedText.includes('format_dxf') || /\b(dxf|svg|cdr)\b/i.test(combinedText)) {
        m.format = 'DXF';
    } else if (combinedText.includes('format_obj') || /\b(obj|fbx|blend|zbrush)\b/i.test(combinedText) || m.source === 'CGTrader') {
        m.format = 'OBJ';
    } else {
        m.format = 'STL';
    }

    return m;
}

function buildProxiedImageUrl(rawThumb, fallbackFull = '') {
    if (!rawThumb) return '';
    if (rawThumb.startsWith('data:') || rawThumb.startsWith('/api/image')) return rawThumb;
    return `/api/image?url=${encodeURIComponent(rawThumb)}${fallbackFull ? `&fallback=${encodeURIComponent(fallbackFull)}` : ''}`;
}

// ============================================================================
// UNIVERSAL 3-LEVEL CATEGORY TREE (Matches categories_data.js `subs` & `items`)
// ============================================================================
function getSubcategoriesList(cat) {
    return cat?.subs || cat?.subcategories || [];
}

function renderUniversalCategoryTree(filterKeyword = '') {
    const tree = window.UNIVERSAL_CATEGORY_TREE || [];
    const kw = filterKeyword.trim().toLowerCase();
    rootCategoriesGrid.innerHTML = '';

    tree.forEach(cat => {
        const subs = getSubcategoriesList(cat);
        const subCount = subs.reduce(
            (acc, sub) => acc + 1 + (Array.isArray(sub.items) ? sub.items.length : 0),
            0
        );

        if (kw) {
            const matchesRoot = cat.name.toLowerCase().includes(kw);
            const matchesSub = subs.some(
                s =>
                    s.name.toLowerCase().includes(kw) ||
                    (s.items || []).some(leaf => {
                        const leafLabel = typeof leaf === 'string' ? leaf : leaf.name || '';
                        return leafLabel.toLowerCase().includes(kw);
                    })
            );
            if (!matchesRoot && !matchesSub) return;
        }

        const btn = document.createElement('button');
        btn.className = `root-cat-card ${state.activeRootCategory?.id === cat.id ? 'active' : ''}`;
        btn.innerHTML = `
            <div class="root-cat-left">
                <span class="root-cat-icon">${cat.icon || '📦'}</span>
                <span class="root-cat-name">${escapeHtml(cat.name)}</span>
            </div>
            <span class="root-cat-count">${subCount}</span>
        `;

        btn.addEventListener('click', () => selectRootCategory(cat));
        rootCategoriesGrid.appendChild(btn);
    });
}

function selectRootCategory(cat) {
    if (state.activeRootCategory?.id === cat.id && !state.activeSubCategory) {
        resetCategorySelection();
        return;
    }

    state.activeRootCategory = cat;
    state.activeSubCategory = null;
    state.activeLeafCategory = null;

    renderUniversalCategoryTree(categoryTreeSearchInput.value);
    renderLevel2Subcategories(cat);
    updateCategoryBreadcrumb();

    triggerSearch(cat.query || cat.name, true);
}

function renderLevel2Subcategories(cat) {
    const subs = getSubcategoriesList(cat);
    if (!cat || subs.length === 0) {
        subCategoriesContainer.classList.add('hidden');
        return;
    }

    subCategoriesContainer.classList.remove('hidden');
    level3Section.classList.add('hidden');
    level2Title.textContent = `${cat.name} — Subcategories`;
    level2Grid.innerHTML = '';

    subs.forEach(sub => {
        const chip = document.createElement('button');
        chip.className = `subcat-chip ${state.activeSubCategory?.id === sub.id ? 'active' : ''}`;
        const leafCount = (sub.items || []).length;
        chip.innerHTML = `
            <span>${escapeHtml(sub.name)}</span>
            ${leafCount ? `<span class="subcat-chip-count">(${leafCount})</span>` : ''}
        `;
        chip.addEventListener('click', () => selectLevel2Subcategory(cat, sub));
        level2Grid.appendChild(chip);
    });
}

function selectLevel2Subcategory(rootCat, subCat) {
    state.activeSubCategory = subCat;
    state.activeLeafCategory = null;

    renderLevel2Subcategories(rootCat);
    renderLevel3Leaves(rootCat, subCat);
    updateCategoryBreadcrumb();

    triggerSearch(subCat.query || subCat.name, true);
}

function renderLevel3Leaves(rootCat, subCat) {
    const items = subCat.items || [];
    if (items.length === 0) {
        level3Section.classList.add('hidden');
        return;
    }

    level3Section.classList.remove('hidden');
    level3Title.textContent = `${subCat.name} — Specific Topics`;
    level3Grid.innerHTML = '';

    items.forEach(leafItem => {
        const leafName = typeof leafItem === 'string' ? leafItem : leafItem.name;
        const leafQuery = typeof leafItem === 'string' ? leafItem : leafItem.query || leafItem.name;

        const chip = document.createElement('button');
        chip.className = `subcat-chip ${state.activeLeafCategory === leafName ? 'active' : ''}`;
        chip.textContent = leafName;
        chip.addEventListener('click', () => {
            state.activeLeafCategory = leafName;
            renderLevel3Leaves(rootCat, subCat);
            updateCategoryBreadcrumb();
            triggerSearch(leafQuery, true);
        });
        level3Grid.appendChild(chip);
    });
}

function updateCategoryBreadcrumb() {
    if (!state.activeRootCategory) {
        categoryBreadcrumbBar.classList.add('hidden');
        return;
    }

    categoryBreadcrumbBar.classList.remove('hidden');
    const parts = [state.activeRootCategory.name];
    if (state.activeSubCategory) parts.push(state.activeSubCategory.name);
    if (state.activeLeafCategory) parts.push(state.activeLeafCategory);
    breadcrumbPathText.textContent = parts.join(' › ');

    const rawSources = state.activeRootCategory.sources;
    const sourcesList = Array.isArray(rawSources)
        ? rawSources
        : String(rawSources || '')
              .split('·')
              .map(s => s.trim())
              .filter(Boolean);

    activeCategorySources.innerHTML = sourcesList
        .map(s => `<span class="cat-mp-pill">${escapeHtml(s)}</span>`)
        .join('');
}

function resetCategorySelection() {
    state.activeRootCategory = null;
    state.activeSubCategory = null;
    state.activeLeafCategory = null;
    subCategoriesContainer.classList.add('hidden');
    categoryBreadcrumbBar.classList.add('hidden');
    renderUniversalCategoryTree(categoryTreeSearchInput.value);
}

// ============================================================================
// INITIAL POPULAR MODELS LOAD (Calls `/api/search?q=`)
// ============================================================================
async function loadInitialPopularModels() {
    try {
        setStatus('Loading indexed 3D models across all 8 marketplaces...', true);
        const res = await fetch('/api/search?q=');
        const data = await res.json();

        if (data.totalIndexed !== undefined) {
            totalDbCounter.textContent = Number(data.totalIndexed).toLocaleString('en-US');
        }

        const models = (data.models || []).map(normalizeModelRecord);
        state.allModels = models;
        applyFiltersAndRender();
        setStatus(
            `Showing ${state.filteredModels.length.toLocaleString('en-US')} indexed 3D models across 8 marketplaces`,
            false
        );
    } catch (err) {
        setStatus('Ready — type any keyword or select a category to search.', false);
    }
}

// ============================================================================
// LIVE LETTER-BY-LETTER AUTOCOMPLETE (`c` -> `ca` -> `cat`)
// Properly reads `phrases` and `instantModels` from `/api/suggest`
// ============================================================================
async function fetchLiveSuggestions(rawText, updateGridImmediately = true) {
    const q = rawText.trim();
    if (!q) {
        liveSuggestDropdown.classList.add('hidden');
        liveWordsBar.classList.add('hidden');
        return;
    }

    try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`);
        const data = await res.json();

        const words = data.phrases || data.words || [];
        const instantModels = (data.instantModels || data.models || []).map(normalizeModelRecord);

        if (data.totalIndexed !== undefined) {
            totalDbCounter.textContent = Number(data.totalIndexed).toLocaleString('en-US');
        }

        // Instantly update the main grid as the user types each letter (`c` -> `ca` -> `cat`)!
        if (updateGridImmediately && instantModels.length > 0 && searchInput.value.trim() === q) {
            state.currentQuery = q;
            state.allModels = instantModels;
            applyFiltersAndRender();
            setStatus(
                `Instant matches for "${q}" — ${state.filteredModels.length.toLocaleString('en-US')} models in local index (crawling live marketplaces...)`,
                true
            );
        }

        // Render top related words bar
        if (words.length > 0) {
            liveWordsBar.classList.remove('hidden');
            liveWordsChips.innerHTML = words
                .slice(0, 16)
                .map(w => `<button class="live-word-chip" data-word="${escapeHtml(w)}">${escapeHtml(w)}</button>`)
                .join('');

            liveWordsChips.querySelectorAll('.live-word-chip').forEach(btn => {
                btn.addEventListener('click', () => {
                    const chosen = btn.dataset.word;
                    searchInput.value = chosen;
                    clearSearchBtn.classList.remove('hidden');
                    liveSuggestDropdown.classList.add('hidden');
                    triggerSearch(chosen, true);
                });
            });
        } else {
            liveWordsBar.classList.add('hidden');
        }

        // Render dropdown suggestions
        if (words.length === 0 && instantModels.length === 0) {
            liveSuggestDropdown.classList.add('hidden');
            return;
        }

        suggestWordsList.innerHTML = words
            .slice(0, 14)
            .map(w => {
                const highlighted = highlightQueryMatch(w, q);
                return `<button class="suggest-word-pill" data-word="${escapeHtml(w)}">${highlighted}</button>`;
            })
            .join('');

        suggestWordsList.querySelectorAll('.suggest-word-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                const chosen = btn.dataset.word;
                searchInput.value = chosen;
                clearSearchBtn.classList.remove('hidden');
                liveSuggestDropdown.classList.add('hidden');
                triggerSearch(chosen, true);
            });
        });

        suggestModelsList.innerHTML = instantModels
            .slice(0, 6)
            .map(m => {
                const thumbSrc = buildProxiedImageUrl(m.thumbnail, m.image_full);
                return `
                <a class="suggest-model-item" href="${escapeHtml(m.url)}" target="_blank" rel="noopener">
                    <img src="${escapeHtml(thumbSrc)}" alt="${escapeHtml(m.title)}" loading="lazy">
                    <div class="suggest-model-meta">
                        <div class="suggest-model-title">${escapeHtml(m.title)}</div>
                        <div class="suggest-model-source">${escapeHtml(m.source)} • ${escapeHtml(m.price)}</div>
                    </div>
                </a>
            `;
            })
            .join('');

        liveSuggestDropdown.classList.remove('hidden');
    } catch (e) {
        // Ignore transient suggestion errors
    }
}

function highlightQueryMatch(text, query) {
    const safeText = escapeHtml(text);
    const safeQuery = escapeHtml(query);
    if (!safeQuery) return safeText;
    const regex = new RegExp(`(${safeQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
    return safeText.replace(regex, '<strong>$1</strong>');
}

// ============================================================================
// MULTI-MARKETPLACE LIVE CRAWLER SEARCH (`/api/search`)
// ============================================================================
async function triggerSearch(queryText, resetExisting = true) {
    const cleanQuery = (queryText || '').trim();
    if (!cleanQuery) {
        loadInitialPopularModels();
        return;
    }

    const requestId = ++state.activeRequestId;

    if (resetExisting) {
        state.currentQuery = cleanQuery;
        state.currentPage = 1;
        state.activeSmartTag = '';
        searchInput.value = cleanQuery;
        clearSearchBtn.classList.remove('hidden');

        // Step 1: Immediately show instant database matches + suggestions while live crawlers work
        fetchLiveSuggestions(cleanQuery, true);
    }

    state.isLoading = true;
    currentPageBadge.textContent = `Page ${state.currentPage}`;
    loadMorePagesBtn.classList.remove('hidden');
    loadMoreFooter.classList.remove('hidden');

    const techParam = state.techFilter === 'all' ? 'all' : state.techFilter.toLowerCase();
    const formatParam = state.formatFilter === 'all' ? 'all' : state.formatFilter.toLowerCase();
    const featureParam = state.featureFilter;
    const priceParam = state.priceFilter;

    setStatus(
        `Crawling all 8 marketplaces for "${cleanQuery}" (Page ${state.currentPage})...`,
        true
    );

    try {
        const apiUrl =
            `/api/search?q=${encodeURIComponent(cleanQuery)}` +
            `&page=${state.currentPage}` +
            `&tech=${encodeURIComponent(techParam)}` +
            `&feature=${encodeURIComponent(featureParam)}` +
            `&format=${encodeURIComponent(formatParam)}` +
            `&price=${encodeURIComponent(priceParam)}`;

        const res = await fetch(apiUrl);
        const data = await res.json();

        // Ignore if a newer search was started
        if (requestId !== state.activeRequestId) return;

        if (data.totalIndexed !== undefined) {
            totalDbCounter.textContent = Number(data.totalIndexed).toLocaleString('en-US');
        }

        const incomingModels = (data.models || []).map(normalizeModelRecord);

        if (resetExisting && state.currentPage === 1) {
            state.allModels = incomingModels;
        } else {
            const seen = new Set(state.allModels.map(m => m.url));
            for (const item of incomingModels) {
                if (item.url && !seen.has(item.url)) {
                    seen.add(item.url);
                    state.allModels.push(item);
                }
            }
        }

        state.isLoading = false;
        applyFiltersAndRender();

        setStatus(
            `Found ${state.filteredModels.length.toLocaleString('en-US')} models for "${cleanQuery}" across 8 marketplaces (Page ${state.currentPage})`,
            false
        );

        // Auto-Stream Page 2 automatically if Auto-Stream is checked and result count is under 350
        if (
            state.autoStream &&
            state.currentPage < 2 &&
            state.allModels.length < 350 &&
            requestId === state.activeRequestId
        ) {
            state.currentPage += 1;
            triggerSearch(state.currentQuery, false);
        }
    } catch (err) {
        if (requestId !== state.activeRequestId) return;
        state.isLoading = false;
        setStatus(
            `Showing ${state.filteredModels.length.toLocaleString('en-US')} models for "${cleanQuery}"`,
            false
        );
    }
}

// ============================================================================
// FILTERING, SORTING, COUNTERS & RENDERING
// ============================================================================
function applyFiltersAndRender() {
    const subKw = state.subSearchText.trim().toLowerCase();
    const smartKw = state.activeSmartTag.trim().toLowerCase();

    // Step 1: Filter by Tech, Feature, Format, Sub-search, Smart Tag
    const baseMatches = state.allModels.filter(m => {
        const text = `${m.title || ''} ${m.tags || ''} ${m.author || ''}`.toLowerCase();

        if (state.techFilter !== 'all' && m.tech !== state.techFilter) {
            return false;
        }

        if (state.formatFilter !== 'all' && m.format !== state.formatFilter) {
            return false;
        }

        if (state.featureFilter !== 'all') {
            if (state.featureFilter === 'nosupport' && !/(no[- ]?support|supportless|support[- ]?free|feat_nosupport)/i.test(text)) return false;
            if (state.featureFilter === 'articulated' && !/(articulated|flexi|print[- ]?in[- ]?place|pip|hinge|joint|feat_articulated)/i.test(text)) return false;
            if (state.featureFilter === 'multicolor' && !/(multicolor|multi[- ]?color|ams|mmu|bambu|3mf|feat_multicolor)/i.test(text)) return false;
            if (state.featureFilter === 'vase' && !/(vase|spiral|planter|lamp|shade|feat_vase)/i.test(text)) return false;
            if (state.featureFilter === 'functional' && !/(holder|stand|mount|bracket|organizer|case|box|clip|gear|adapter|hook|tool)/i.test(text)) return false;
        }

        if (subKw && !text.includes(subKw)) return false;
        if (smartKw && !text.includes(smartKw)) return false;

        return true;
    });

    // Update Free / Paid Counters
    const freeCount = baseMatches.filter(m => !m.isPaid && (state.sourceFilter === 'all' || m.source === state.sourceFilter)).length;
    const paidCount = baseMatches.filter(m => m.isPaid && (state.sourceFilter === 'all' || m.source === state.sourceFilter)).length;
    document.getElementById('countPriceAll').textContent = (freeCount + paidCount).toLocaleString('en-US');
    document.getElementById('countPriceFree').textContent = freeCount.toLocaleString('en-US');
    document.getElementById('countPricePaid').textContent = paidCount.toLocaleString('en-US');

    // Step 2: Apply Price Filter
    const priceMatches = baseMatches.filter(m => {
        if (state.priceFilter === 'free') return !m.isPaid;
        if (state.priceFilter === 'paid') return m.isPaid;
        return true;
    });

    // Update Marketplace Tab Counters
    const countAllEl = document.getElementById('count-all');
    if (countAllEl) countAllEl.textContent = priceMatches.length.toLocaleString('en-US');

    MARKETPLACE_SOURCES.forEach(src => {
        const el = document.getElementById(`count-${src}`);
        if (el) {
            const c = priceMatches.filter(m => m.source === src).length;
            el.textContent = c.toLocaleString('en-US');
        }
    });

    // Step 3: Apply Marketplace Source Filter
    let finalResults = priceMatches.filter(m => {
        if (state.sourceFilter === 'all') return true;
        return m.source === state.sourceFilter;
    });

    // Step 4: Sort Results
    finalResults = sortModels(finalResults, state.sortBy, state.currentQuery);
    state.filteredModels = finalResults;

    renderSmartKeywordTags(priceMatches);
    renderModelCardsGrid(finalResults);
}

function sortModels(models, sortMode, query) {
    const list = [...models];
    const q = (query || '').trim().toLowerCase();

    if (sortMode === 'popular') {
        return list.sort((a, b) => (Number(b.likes) || 0) - (Number(a.likes) || 0));
    }
    if (sortMode === 'free_first') {
        return list.sort((a, b) => Number(a.isPaid) - Number(b.isPaid));
    }
    if (sortMode === 'paid_first') {
        return list.sort((a, b) => Number(b.isPaid) - Number(a.isPaid));
    }
    if (sortMode === 'title_asc') {
        return list.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
    }

    // Default: Best Match (Relevance while preserving marketplace diversity)
    if (!q) return list;
    return list.sort((a, b) => {
        const tA = String(a.title || '').toLowerCase();
        const tB = String(b.title || '').toLowerCase();
        const exactA = tA.includes(q) ? 1 : 0;
        const exactB = tB.includes(q) ? 1 : 0;
        if (exactA !== exactB) return exactB - exactA;
        return 0;
    });
}

function renderSmartKeywordTags(models) {
    if (!models || models.length < 6) {
        dynamicSubTagsBar.classList.add('hidden');
        return;
    }

    const stopWords = new Set([
        'the', 'and', 'for', 'with', 'stl', '3d', 'model', 'print', 'printable',
        'free', 'file', 'files', 'version', 'new', 'custom', 'part', 'parts', 'set'
    ]);
    const currentQ = state.currentQuery.toLowerCase();
    const freq = new Map();

    models.slice(0, 250).forEach(m => {
        const words = String(m.title || '')
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length >= 3 && !stopWords.has(w) && w !== currentQ);

        words.forEach(w => freq.set(w, (freq.get(w) || 0) + 1));
    });

    const topTags = [...freq.entries()]
        .filter(([, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 14)
        .map(([word]) => word);

    if (topTags.length === 0) {
        dynamicSubTagsBar.classList.add('hidden');
        return;
    }

    dynamicSubTagsBar.classList.remove('hidden');
    dynamicSubTagsBar.innerHTML = topTags
        .map(
            tag => `
            <button class="smart-tag-chip ${state.activeSmartTag === tag ? 'active' : ''}" data-tag="${escapeHtml(tag)}">
                #${escapeHtml(tag)}
            </button>
        `
        )
        .join('');

    dynamicSubTagsBar.querySelectorAll('.smart-tag-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            const tag = btn.dataset.tag;
            state.activeSmartTag = state.activeSmartTag === tag ? '' : tag;
            applyFiltersAndRender();
        });
    });
}

function renderModelCardsGrid(models) {
    if (!models || models.length === 0) {
        resultsGrid.innerHTML = `
            <div class="empty-state-box">
                <h3>No matching 3D models found for current filters</h3>
                <p>Try switching the price or technology filter to "All", or click "Crawl Next Page" to search deeper across all marketplaces.</p>
            </div>
        `;
        return;
    }

    const fallbackSvg =
        "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Inter,sans-serif' font-size='14' fill='%2364748b'%3E3D Model Preview%3C/text%3E%3C/svg%3E";

    const html = models
        .slice(0, 800)
        .map(m => {
            const dotClass = SOURCE_DOT_CLASS[m.source] || 'mp-all';
            const priceClass = m.isPaid ? 'is-paid' : 'is-free';
            const priceLabel = m.isPaid ? m.price : 'Free';
            const likesCount = Number(m.likes) || 0;
            const thumbUrl = buildProxiedImageUrl(m.thumbnail, m.image_full) || fallbackSvg;

            return `
            <a class="model-card" href="${escapeHtml(m.url)}" target="_blank" rel="noopener noreferrer">
                <div class="card-thumb-wrap">
                    <img
                        src="${escapeHtml(thumbUrl)}"
                        alt="${escapeHtml(m.title)}"
                        loading="lazy"
                        onerror="this.onerror=null;this.src='${fallbackSvg}';"
                    >
                    <span class="card-source-badge">
                        <span class="mp-dot ${dotClass}"></span>
                        ${escapeHtml(m.source)}
                    </span>
                    <span class="card-price-badge ${priceClass}">${escapeHtml(priceLabel)}</span>
                </div>
                <div class="card-body">
                    <div class="card-title" title="${escapeHtml(m.title)}">${escapeHtml(m.title)}</div>
                    <div class="card-specs-row">
                        <span class="spec-badge">${escapeHtml(m.tech || 'FDM')}</span>
                        <span class="spec-badge">${escapeHtml(m.format || 'STL')}</span>
                    </div>
                    <div class="card-footer">
                        <span class="card-author">by ${escapeHtml(m.author || m.source)}</span>
                        <span class="card-stats" title="Likes">♥ ${likesCount.toLocaleString('en-US')}</span>
                    </div>
                </div>
            </a>
        `;
        })
        .join('');

    resultsGrid.innerHTML = html;
}

// ============================================================================
// MARKETPLACE CATEGORY COMPARISON MODAL (Matches categories_data.js strings)
// ============================================================================
function renderMarketplaceComparisonModal() {
    const container = document.getElementById('marketplaceCompareGrid');
    const data = window.MARKETPLACE_ORIGINAL_CATEGORIES || {};
    if (!container) return;

    container.innerHTML = Object.entries(data)
        .map(([mpKey, mpInfo]) => {
            const mpTitle = mpInfo.name || mpKey;
            const rawCats = mpInfo.categories || [];

            const groupsHtml = rawCats
                .map(entry => {
                    if (typeof entry === 'string') {
                        // Format: "Art & Design (2D Plates, Sculptures, Wall Mounted)"
                        const match = entry.match(/^([^(]+)(?:\(([^)]+)\))?/);
                        const groupName = (match ? match[1] : entry).trim();
                        const subItems = match && match[2]
                            ? match[2].split(',').map(s => s.trim()).filter(Boolean)
                            : [];

                        return `
                            <div class="mp-directory-group">
                                <div class="mp-directory-group-title" data-q="${escapeHtml(groupName)}">
                                    ▸ ${escapeHtml(groupName)}
                                </div>
                                <div class="mp-directory-subs">
                                    ${subItems
                                        .map(
                                            s =>
                                                `<button class="mp-directory-sub-chip" data-q="${escapeHtml(s)}">${escapeHtml(s)}</button>`
                                        )
                                        .join('')}
                                </div>
                            </div>
                        `;
                    } else {
                        return `
                            <div class="mp-directory-group">
                                <div class="mp-directory-group-title" data-q="${escapeHtml(entry.group)}">
                                    ▸ ${escapeHtml(entry.group)}
                                </div>
                                <div class="mp-directory-subs">
                                    ${(entry.subs || [])
                                        .map(
                                            s =>
                                                `<button class="mp-directory-sub-chip" data-q="${escapeHtml(s)}">${escapeHtml(s)}</button>`
                                        )
                                        .join('')}
                                </div>
                            </div>
                        `;
                    }
                })
                .join('');

            return `
            <div class="mp-directory-card">
                <div class="mp-directory-header">
                    <h4>${escapeHtml(mpTitle)}</h4>
                    <span>${rawCats.length} main groups</span>
                </div>
                ${groupsHtml}
            </div>
        `;
        })
        .join('');

    container.querySelectorAll('[data-q]').forEach(el => {
        el.addEventListener('click', () => {
            const q = el.dataset.q;
            document.getElementById('compareModalBackdrop').classList.add('hidden');
            triggerSearch(q, true);
        });
    });
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================
function bindEvents() {
    // Live typing in Search Input: immediate suggestions + instant DB grid + debounced live crawl
    searchInput.addEventListener('input', e => {
        const val = e.target.value;
        clearSearchBtn.classList.toggle('hidden', !val);

        clearTimeout(suggestDebounceTimer);
        suggestDebounceTimer = setTimeout(() => {
            fetchLiveSuggestions(val, true);
        }, 90);

        clearTimeout(autoTypeSearchTimer);
        if (val.trim().length >= 2) {
            autoTypeSearchTimer = setTimeout(() => {
                triggerSearch(val.trim(), true);
            }, 650);
        } else if (val.trim().length === 0) {
            loadInitialPopularModels();
        }
    });

    searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(autoTypeSearchTimer);
            liveSuggestDropdown.classList.add('hidden');
            triggerSearch(searchInput.value, true);
        } else if (e.key === 'Escape') {
            liveSuggestDropdown.classList.add('hidden');
        }
    });

    searchBtn.addEventListener('click', () => {
        clearTimeout(autoTypeSearchTimer);
        liveSuggestDropdown.classList.add('hidden');
        triggerSearch(searchInput.value, true);
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.classList.add('hidden');
        liveSuggestDropdown.classList.add('hidden');
        liveWordsBar.classList.add('hidden');
        loadInitialPopularModels();
        searchInput.focus();
    });

    // Close autocomplete when clicking outside
    document.addEventListener('click', e => {
        if (!e.target.closest('.search-box')) {
            liveSuggestDropdown.classList.add('hidden');
        }
    });

    // Logo Reset
    document.getElementById('logoResetBtn').addEventListener('click', e => {
        e.preventDefault();
        searchInput.value = '';
        clearSearchBtn.classList.add('hidden');
        liveWordsBar.classList.add('hidden');
        resetAllFiltersAndCategories();
        loadInitialPopularModels();
    });

    // Auto-stream toggle
    infiniteStreamToggle.addEventListener('change', e => {
        state.autoStream = e.target.checked;
    });

    // Category Tree Filter Input
    categoryTreeSearchInput.addEventListener('input', e => {
        renderUniversalCategoryTree(e.target.value);
    });

    clearCategoryBtn.addEventListener('click', () => {
        resetCategorySelection();
        loadInitialPopularModels();
    });

    // Price Filter Segmented Buttons
    document.querySelectorAll('#priceFilterGroup .seg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#priceFilterGroup .seg-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.priceFilter = btn.dataset.price;

            // If user selected Paid and we have an active query, crawl paid models if count is low
            if (state.priceFilter === 'paid' && state.currentQuery) {
                const currentPaid = state.allModels.filter(m => m.isPaid).length;
                if (currentPaid < 15 && !state.isLoading) {
                    triggerSearch(state.currentQuery, false);
                }
            }
            applyFiltersAndRender();
        });
    });

    // Technology Filter Pills
    document.querySelectorAll('#techFilterGroup .filter-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#techFilterGroup .filter-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.techFilter = btn.dataset.tech;

            if (state.techFilter !== 'all' && state.currentQuery) {
                const matchingTech = state.allModels.filter(m => m.tech === state.techFilter).length;
                if (matchingTech < 15 && !state.isLoading) {
                    triggerSearch(state.currentQuery, false);
                }
            }
            applyFiltersAndRender();
        });
    });

    // Print Feature Filter Pills
    document.querySelectorAll('#featureFilterGroup .filter-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#featureFilterGroup .filter-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.featureFilter = btn.dataset.feature;
            applyFiltersAndRender();
        });
    });

    // File Format Filter Pills
    document.querySelectorAll('#formatFilterGroup .filter-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#formatFilterGroup .filter-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.formatFilter = btn.dataset.format;
            applyFiltersAndRender();
        });
    });

    // Reset All Filters Button
    document.getElementById('clearAllFiltersBtn').addEventListener('click', () => {
        resetAllFiltersAndCategories();
        applyFiltersAndRender();
    });

    // Marketplace Tabs
    document.querySelectorAll('#sourceFilterBar .mp-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('#sourceFilterBar .mp-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.sourceFilter = tab.dataset.source;
            applyFiltersAndRender();
        });
    });

    // Sub-search within results
    subSearchInput.addEventListener('input', e => {
        state.subSearchText = e.target.value;
        applyFiltersAndRender();
    });

    // Sort select
    sortSelect.addEventListener('change', e => {
        state.sortBy = e.target.value;
        applyFiltersAndRender();
    });

    // Fetch Next Page Buttons
    const fetchNextPage = () => {
        if (!state.currentQuery) {
            state.currentQuery = '3d model';
        }
        state.currentPage += 1;
        triggerSearch(state.currentQuery, false);
    };
    loadMorePagesBtn.addEventListener('click', fetchNextPage);
    loadMoreBottomBtn.addEventListener('click', fetchNextPage);

    // Marketplace Comparison Modal
    const modalBackdrop = document.getElementById('compareModalBackdrop');
    document.getElementById('openCompareModalBtn').addEventListener('click', () => {
        modalBackdrop.classList.remove('hidden');
    });
    document.getElementById('closeCompareModalBtn').addEventListener('click', () => {
        modalBackdrop.classList.add('hidden');
    });
    modalBackdrop.addEventListener('click', e => {
        if (e.target === modalBackdrop) modalBackdrop.classList.add('hidden');
    });
}

function resetAllFiltersAndCategories() {
    state.sourceFilter = 'all';
    state.priceFilter = 'all';
    state.techFilter = 'all';
    state.featureFilter = 'all';
    state.formatFilter = 'all';
    state.subSearchText = '';
    state.activeSmartTag = '';
    state.sortBy = 'relevance';

    subSearchInput.value = '';
    sortSelect.value = 'relevance';

    document.querySelectorAll('#sourceFilterBar .mp-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.source === 'all');
    });
    document.querySelectorAll('#priceFilterGroup .seg-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.price === 'all');
    });
    document.querySelectorAll('#techFilterGroup .filter-pill').forEach(b => {
        b.classList.toggle('active', b.dataset.tech === 'all');
    });
    document.querySelectorAll('#featureFilterGroup .filter-pill').forEach(b => {
        b.classList.toggle('active', b.dataset.feature === 'all');
    });
    document.querySelectorAll('#formatFilterGroup .filter-pill').forEach(b => {
        b.classList.toggle('active', b.dataset.format === 'all');
    });

    resetCategorySelection();
}

function setStatus(msg, spinning = false) {
    statusText.textContent = msg;
    streamSpinner.classList.toggle('hidden', !spinning);
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

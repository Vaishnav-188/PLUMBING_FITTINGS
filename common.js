/**
 * common.js
 * Handles Navigation Bar injection and Global Cart State (LocalStorage).
 */

// --- CONFIGURATION ---
const CART_STORAGE_KEY = 'plumbing_cart_v1';
const META_STORAGE_KEY = 'plumbing_meta_v1';

// Determine Relative Path to Root
function getPathToRoot() {
    // If we are deep (e.g. /PVC/file.html), we need "../"
    const path = window.location.pathname;

    // Simple check: if we are in a subdirectory, go up one level.
    if (path.includes('/PVC/') || path.includes('/CPVC/') || path.includes('/UPVC/') || path.includes('/EXTRA_FITTINGS_ITEMS/')) {
        return '../';
    }
    return './';
}

const ROOT = getPathToRoot();

// --- NAVIGATION DATA ---
const NAV_STRUCTURE = [
    { name: 'Home', link: 'index.html' },
    {
        name: 'CPVC Fittings',
        dropdown: [
            { name: '3/4" CPVC Fittings', link: 'CPVC/cpvc.html' }
        ]
    },
    {
        name: 'PVC Fittings',
        dropdown: [
            { name: '1 1/2" PVC Fittings', link: 'PVC/1_1_2_INCH.html' },
            { name: '2 1/2" PVC Fittings', link: 'PVC/2_1_2_INCH.html' },
            { name: '4" PVC Fittings', link: 'PVC/4_INCH.html' }
        ]
    },
    {
        name: 'UPVC Fittings',
        dropdown: [
            { name: '1" UPVC Fittings', link: 'UPVC/1INCH.html' },
            { name: '1 1/4" UPVC Fittings', link: 'UPVC/1_1_4_INCH.html' },
            { name: '3/4" UPVC Fittings', link: 'UPVC/3_4_INCH.html' }
        ]
    },
    {
        name: 'Extra Items',
        dropdown: [
            { name: 'Extra List', link: 'EXTRA_FITTINGS_ITEMS/one.html' }
        ]
    }
];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    injectNavbar();
    initializeCartDisplay();
    initializeGlobalInputs();
});

// --- NAVBAR GENERATOR ---
function injectNavbar() {
    // Create Element
    const navContainer = document.createElement('div');
    navContainer.id = 'navbar-container';

    let navHTML = `
        <nav class="navbar">
            <div class="brand-logo">
                <a href="${ROOT}index.html">PLUMBING FITTINGS</a>
            </div>
            <ul class="nav-links">
    `;

    NAV_STRUCTURE.forEach(item => {
        if (item.dropdown) {
            navHTML += `
                <li class="dropdown">
                    <a href="#">${item.name} ▾</a>
                    <div class="dropdown-content">
            `;
            item.dropdown.forEach(sub => {
                navHTML += `<a href="${ROOT}${sub.link}">${sub.name}</a>`;
            });
            navHTML += `
                    </div>
                </li>
            `;
        } else {
            navHTML += `<li><a href="${ROOT}${item.link}">${item.name}</a></li>`;
        }
    });

    navHTML += `
            </ul>
        </nav>
    `;

    navContainer.innerHTML = navHTML;
    document.body.prepend(navContainer);
}


// --- CART STATE MANAGEMENT ---

function getCart() {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
}

function saveCart(cart) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    // Dispatch event so other components update if needed
    window.dispatchEvent(new Event('cartUpdated'));
}

/**
 * Adds an item to the global cart.
 * Call this from the individual HTML pages.
 */
function addItemToCart(name, defaultBrand = "") {
    // Try to find the brand select on the page
    const brandSelect = document.getElementById('brand');
    let brand = defaultBrand;

    if (brandSelect) {
        // If the dropdown exists, enforce selection
        if (brandSelect.value === "") {
            showToast("⚠️ Please select a BRAND first!", true);
            brandSelect.focus();
            return;
        }
        brand = brandSelect.value;
    } else {
        // If no brand selector (e.g. Extra Items), use empty string
        brand = "";
    }

    const cart = getCart();
    const existingItem = cart.find(item => item.name === name && item.brand === brand);

    if (existingItem) {
        existingItem.qty += 1;
    } else {
        cart.push({
            id: Date.now() + Math.random(), // Unique ID
            name: name,
            brand: brand,
            qty: 1,
            sourcePage: document.title // Optional: track where it came from
        });
    }

    saveCart(cart);
    renderCartTable(); // Update table if it exists on this page

    // Show Feedback
    const displayBrand = brand ? `(${brand})` : "";
    showToast(`✅ Added: ${name} ${displayBrand}`);
}

/**
 * Toast Notification Logic
 */
function showToast(message, isError = false) {
    // Return if a toast is already shown to prevent overlapping (optional)

    let toast = document.createElement("div");
    toast.className = isError ? "toast toast-error" : "toast toast-success";
    toast.innerText = message;

    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
        toast.classList.add("show");
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

/**
 * Removes one quantity of an item.
 */
function removeItemFromCart(name) {
    const brandSelect = document.getElementById('brand');
    let brand = brandSelect ? brandSelect.value : null;

    // If we can't determine brand (e.g. user changed select), we might need robust logic.
    // For now, mirroring existing behavior: delete matching Name+Brand.

    if (brandSelect && brandSelect.value === "") {
        showToast("⚠️ Please select the BRAND to remove form.", true);
        return;
    }

    // For Extra items where brand is empty
    if (!brandSelect) brand = "";

    const cart = getCart();

    // Find item
    const index = cart.findIndex(item => item.name === name && (!brand || item.brand === brand));

    if (index !== -1) {
        if (cart[index].qty > 1) {
            cart[index].qty -= 1;
            showToast(`Removed 1 ${name}`);
        } else {
            cart.splice(index, 1);
            showToast(`🗑️ Removed ${name} from list`);
        }
        saveCart(cart);
        renderCartTable();
    } else {
        showToast("⚠️ Item selected to remove is not on the list", true);
    }
}

// --- GLOBAL METADATA PERSISTENCE (Site/Date) ---
function initializeGlobalInputs() {
    const dateInput = document.getElementById('date');
    const siteInput = document.getElementById('Site');

    if (dateInput && siteInput) {
        // Load saved values
        const meta = JSON.parse(localStorage.getItem(META_STORAGE_KEY) || '{}');
        if (meta.date) dateInput.value = meta.date;
        if (meta.site) siteInput.value = meta.site;

        // Save on change
        dateInput.addEventListener('change', () => {
            meta.date = dateInput.value;
            localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta));
        });

        siteInput.addEventListener('input', () => {
            meta.site = siteInput.value;
            localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta));
        });
    }
}

// --- DISPLAY LOGIC ---

function initializeCartDisplay() {
    // Listen for storage changes (cross-tab sync)
    window.addEventListener('storage', (e) => {
        if (e.key === CART_STORAGE_KEY) renderCartTable();
    });

    // Initial render
    renderCartTable();
}

/**
 * Renders the cart into #outputTable if it exists.
 * Used by both the Index page and sub-pages.
 */
function renderCartTable() {
    const tbody = document.querySelector("#outputTable tbody");
    if (!tbody) return; // This page doesn't have a table

    const cart = getCart();
    tbody.innerHTML = "";

    if (cart.length === 0) {
        tbody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>No items selected yet.</td></tr>";
        return;
    }

    cart.forEach((item, index) => {
        // Use hyphen if brand is empty
        const displayBrand = item.brand ? item.brand : "-";

        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.name}</td>
                <td>${item.qty}</td>
                <td>${displayBrand}</td>
                <td>
                    <!-- Optional Delete Button for Index Page -->
                    <button class="btn btn-remove action-btn" onclick="globalDelete('${item.name}', '${item.brand}')">X</button>
                </td>
            </tr>
        `;
    });
}

function globalDelete(name, brand) {
    // Direct delete from Table (used in Index page mainly)
    let cart = getCart();
    // Handle null brand string
    if (brand === 'null' || brand === 'undefined') brand = "";

    cart = cart.filter(item => !(item.name === name && item.brand === brand));
    saveCart(cart);
    renderCartTable();
}

// Expose key functions to global scope so HTML onclick works
window.addItem = addItemToCart;
window.removeItem = removeItemFromCart;
window.globalDelete = globalDelete;

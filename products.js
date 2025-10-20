// Enhanced Products JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initProductsPage();
});

let allProducts = [];
let displayedProducts = [];
let currentPage = 1; // Tracks the current page for pagination
const productsPerPage = 8;
let currentFilters = {
    search: '',
    category: '',
    sort: 'newest'
};

async function initProductsPage() {
    await loadAllProducts();
    setupEventListeners();
    applyInitialSearch(); // Check for search query from other pages
    filterAndDisplayProducts(); // Initial display of products
}

async function loadAllProducts() {
    try {
        showLoadingState();
        allProducts = await fetchAllProducts();
        hideLoadingState();
    } catch (error) {
        console.error('Error loading products:', error);
        showErrorState('Failed to load products. Please try again later.');
    }
}

async function fetchAllProducts() {
    if (!window.supabase) {
        throw new Error('Supabase client is not available.');
    }
    const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching products from Supabase:', error);
        throw error;
    }
    // Ensure image_url exists for consistency
    return (products || []).map(p => ({
        ...p,
        image_url: p.image_url || p.image
    }));
}

// Setup event listeners for filters and sorting
function setupEventListeners() {
    // Search input
    const searchBar = document.getElementById('search-bar');
    if (searchBar) {
        searchBar.addEventListener('input', function() {
            currentFilters.search = this.value.toLowerCase();
            currentPage = 1;
            filterAndDisplayProducts();
        });
    }

    // Category filter
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', function() {
            currentFilters.category = this.value;
            currentPage = 1;
            filterAndDisplayProducts();
        });
    }

    // Sort options
    const sortOptions = document.getElementById('sort-options');
    if (sortOptions) {
        sortOptions.addEventListener('change', function() {
            currentFilters.sort = this.value;
            currentPage = 1;
            filterAndDisplayProducts();
        });
    }

    // Load more button
    const loadMoreBtn = document.getElementById('load-more');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMoreProducts);
    }

    // Reset filters button
    const resetFiltersBtn = document.getElementById('reset-filters');
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', resetFilters);
    }
}

// Apply initial search from sessionStorage
function applyInitialSearch() {
    const searchQuery = sessionStorage.getItem('searchQuery');
    if (searchQuery) {
        const searchBar = document.getElementById('search-bar');
        if (searchBar) {
            searchBar.value = searchQuery;
            currentFilters.search = searchQuery.toLowerCase();
        }
        sessionStorage.removeItem('searchQuery');
    }
}

// Filter and display products based on current filters
function filterAndDisplayProducts() {
    let filteredProducts = [...allProducts];

    // Apply search filter
    if (currentFilters.search) {
        filteredProducts = filteredProducts.filter(product =>
            product.title.toLowerCase().includes(currentFilters.search) ||
            product.category.toLowerCase().includes(currentFilters.search)
        );
    }

    // Apply category filter
    if (currentFilters.category) {
        filteredProducts = filteredProducts.filter(product =>
            product.category === currentFilters.category
        );
    }

    // Apply sorting
    filteredProducts = sortProducts(filteredProducts, currentFilters.sort);

    displayedProducts = filteredProducts;
    currentPage = 1;
    displayProducts();
}

// Sort products based on selected option
function sortProducts(products, sortBy) {
    switch (sortBy) {
        case 'price-low':
            return [...products].sort((a, b) => a.price - b.price);
        case 'price-high':
            return [...products].sort((a, b) => b.price - a.price);
        case 'name':
            return [...products].sort((a, b) => a.title.localeCompare(b.title));
        case 'newest':
        default:
            return [...products].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
}

// Display products in grid with pagination
function displayProducts() {
    const productsGrid = document.getElementById('products-grid');
    const loadMoreContainer = document.querySelector('.load-more-container');
    const noProducts = document.getElementById('no-products');

    if (!productsGrid) return;

    // Calculate products to show for current page
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const productsToShow = displayedProducts.slice(0, endIndex);

    if (displayedProducts.length === 0) {
        productsGrid.style.display = 'none';
        if (loadMoreContainer) loadMoreContainer.style.display = 'none';
        if (noProducts) noProducts.style.display = 'block';
        return;
    }

    if (noProducts) noProducts.style.display = 'none';
    productsGrid.style.display = 'grid';

    // Render products
    productsGrid.innerHTML = productsToShow.map(product => `
        <div class="product-card" data-product-id="${product.id}">
            <div class="product-image">
                <img src="${product.image_url}" alt="${product.title}" onerror="this.onerror=null; this.src='https://placehold.co/600x600/f9f9f9/1a1a1a?text=Image+Not+Found&font=montserrat';">
                ${product.featured ? '<span class="featured-badge">Featured</span>' : ''}
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.title}</h3>
                <div class="product-category">${product.category}</div>
                <div class="product-price">₦${product.price.toLocaleString()}</div>
                <div class="product-stock">${product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</div>
                <div class="product-actions">
                    <a href="#" class="btn-buy" data-product='${JSON.stringify(product)}' 
                       ${product.stock === 0 ? 'style="opacity: 0.6; pointer-events: none;"' : ''}><span>${product.stock > 0 ? 'Buy Now' : 'Out of Stock'}</span></a>
                </div>
            </div>
        </div>
    `).join('');

    // Show/hide load more button
    if (loadMoreContainer) {
        if (endIndex < displayedProducts.length) {
            loadMoreContainer.style.display = 'block';
        } else {
            loadMoreContainer.style.display = 'none';
        }
    }

    // Add event listeners to buy buttons
    document.querySelectorAll('.btn-buy').forEach(button => {
        if (!button.style.pointerEvents) { // Only if not disabled
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const productData = JSON.parse(this.getAttribute('data-product'));
                initiateWhatsAppCheckout(productData);
            });

            // Handle hover color change via JavaScript
            button.addEventListener('mouseenter', function() {
                this.style.color = 'var(--primary)'; // Set text to black on hover
            });

            button.addEventListener('mouseleave', function() {
                this.style.color = 'var(--accent)'; // Revert text to white when not hovering
            });
        }
    });
}

// Load more products for pagination
function loadMoreProducts() {
    currentPage++;
    displayProducts();
    
    // Scroll to newly loaded products
    const productsGrid = document.getElementById('products-grid');
    if (productsGrid) {
        const newProducts = productsGrid.querySelectorAll('.product-card');
        if (newProducts.length > 0) {
            const lastProduct = newProducts[newProducts.length - 1];
            lastProduct.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
}

// Reset all filters
function resetFilters() {
    currentFilters = {
        search: '',
        category: '',
        sort: 'newest'
    };

    const searchBar = document.getElementById('search-bar');
    const categoryFilter = document.getElementById('category-filter');
    const sortOptions = document.getElementById('sort-options');

    if (searchBar) searchBar.value = '';
    if (categoryFilter) categoryFilter.value = '';
    if (sortOptions) sortOptions.value = 'newest';

    filterAndDisplayProducts();
}

// Show loading state
function showLoadingState() {
    const productsGrid = document.getElementById('products-grid');
    if (productsGrid) {
        productsGrid.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading products...</p>
            </div>
        `;
    }
}

// Hide loading state
function hideLoadingState() {
    // Loading state is replaced when products are displayed
}

// Show error state
function showErrorState(message) {
    const productsGrid = document.getElementById('products-grid');
    if (productsGrid) {
        productsGrid.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Something went wrong</h3>
                <p>${message}</p>
                <button onclick="location.reload()" class="btn">Try Again</button>
            </div>
        `;
    }
}

// Enhanced Main JavaScript with Fixed Product Loading
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all site functionality
    initNavigation();
    initSearch();
    loadNewArrivals();
    initMobileTabBar();
    initScrollAnimations();
    initContactForm();
    initParallaxEffects();
});

// WhatsApp checkout functionality
function initiateWhatsAppCheckout(product) {
    const phoneNumber = "2347031056948"; // Business WhatsApp number
    const message = `Hello Teejay Don Collections! I'm interested in purchasing:
Product: ${product.title}
Price: ₦${product.price.toLocaleString()}
Category: ${product.category}
Please confirm availability.`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    // Show confirmation before redirecting
    if (confirm(`You'll be redirected to WhatsApp to complete your order for "${product.title}". Continue?`)) {
        window.open(whatsappUrl, '_blank');
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Utility function to format currency
function formatCurrency(amount) {
    return '₦' + amount.toLocaleString();
}

// Check if user is admin
async function checkAdminAuth() {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
        return false;
    }
    
    // Check if user has admin role (you might want to store this in a user_metadata or a separate table)
    const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    
    if (userError || !userData || userData.role !== 'admin') {
        return false;
    }
    
    return true;
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { showToast, formatCurrency, initiateWhatsAppCheckout, checkAdminAuth };
}

// Fixed Navigation - Horizontal Only
function initNavigation() {
    const hamburger = document.querySelector('.hamburger');
    
    // Only create mobile menu overlay on mobile
    if (window.innerWidth <= 768) {
        const mobileMenuOverlay = createMobileMenuOverlay();
        
        if (hamburger) {
            hamburger.addEventListener('click', function() {
                this.classList.toggle('active');
                mobileMenuOverlay.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            });
        }
        
        const closeMenu = mobileMenuOverlay.querySelector('.close-menu');
        closeMenu.addEventListener('click', function() {
            mobileMenuOverlay.style.display = 'none';
            document.body.style.overflow = 'auto';
            hamburger.classList.remove('active');
        });
        
        const mobileLinks = mobileMenuOverlay.querySelectorAll('a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', function() {
                mobileMenuOverlay.style.display = 'none';
                document.body.style.overflow = 'auto';
                hamburger.classList.remove('active');
            });
        });
    }
    
    // Header scroll effect
    let lastScroll = 0;
    const header = document.querySelector('header');
    
    if (header) {
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            
            if (currentScroll <= 0) {
                header.style.background = 'rgba(255, 255, 255, 0.95)';
                header.style.backdropFilter = 'blur(20px)';
            } else if (currentScroll > lastScroll && currentScroll > 100) {
                header.style.transform = 'translateY(-100%)';
            } else {
                header.style.transform = 'translateY(0)';
            }
            
            lastScroll = currentScroll;
        });
    }
}

// Fixed Search Functionality
function initSearch() {
    const searchBtn = document.getElementById('search-btn');
    const searchOverlay = document.getElementById('search-overlay');
    const closeSearch = document.querySelector('.close-search');
    const searchTab = document.getElementById('search-tab');
    const searchInput = document.getElementById('search-input');
    
    // Desktop search button
    if (searchBtn) {
        searchBtn.addEventListener('click', function(e) {
            e.preventDefault();
            openSearchOverlay();
        });
    }
    
    // Mobile tab bar search - FIXED
    if (searchTab) {
        searchTab.addEventListener('click', function(e) {
            e.preventDefault();
            openSearchOverlay();
        });
    }
    
    function openSearchOverlay() {
        if (searchOverlay) {
            searchOverlay.style.display = 'flex';
            setTimeout(() => {
                searchOverlay.style.opacity = '1';
                if (searchInput) searchInput.focus();
            }, 10);

            // Set search tab to active
            if (searchTab) {
                document.querySelectorAll('.tab-item').forEach(tab => {
                    tab.classList.remove('active');
                });
                searchTab.classList.add('active');
            }
        }
    }
    
    function closeSearchOverlay() {
        if (searchOverlay) {
            searchOverlay.style.opacity = '0';
            setTimeout(() => {
                searchOverlay.style.display = 'none';
            }, 300);

            // Remove active state from search and restore page tab
            if (searchTab) {
                searchTab.classList.remove('active');
                initMobileTabBar(); // Re-run to set the correct page tab to active
            }
        }
    }
    
    if (closeSearch) {
        closeSearch.addEventListener('click', closeSearchOverlay);
    }
    
    if (searchOverlay) {
        searchOverlay.addEventListener('click', function(e) {
            if (e.target === searchOverlay) {
                closeSearchOverlay();
            }
        });
    }
    
    // Enhanced search functionality
    const searchSubmit = document.getElementById('search-submit');
    
    if (searchSubmit && searchInput) {
        searchSubmit.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
    
    // Close search with escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && searchOverlay && searchOverlay.style.display === 'flex') {
            closeSearchOverlay();
        }
    });
}

// FIXED: Product Loading - Auto-load without needing reset
async function loadNewArrivals() {
    const featuredContainer = document.getElementById('new-arrivals-grid');
    
    if (!featuredContainer) return;

    try {
        // Show loading state
        featuredContainer.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading new arrivals...</p>
            </div>
        `;

        // Simulate API call to Supabase
        const featuredProducts = await fetchNewestProducts();
        
        if (featuredProducts.length === 0) {
            featuredContainer.innerHTML = `
                <div class="no-products fade-in">
                    <i class="fas fa-box-open"></i>
                    <h3>No Featured Products</h3>
                    <p>Check back soon for new arrivals</p>
                </div>
            `;
            return;
        }
        
        // Display products
        featuredContainer.innerHTML = featuredProducts.map((product, index) => `
            <div class="product-card fade-in" style="animation-delay: ${index * 0.1}s">
                <div class="product-image">
                    <img src="${product.image_url}" alt="${product.title}" onerror="this.onerror=null; this.src='https://placehold.co/600x600/f9f9f9/1a1a1a?text=Image+Not+Found&font=montserrat';">
                    ${product.featured ? '<span class="featured-badge">Featured</span>' : ''}
                </div>
                <div class="product-info">
                    <h3 class="product-title">${product.title}</h3>
                    <div class="product-category">${product.category}</div>
                    <div class="product-price">₦${product.price.toLocaleString()}</div>
                    <div class="product-actions">
                        <a href="#" class="btn-buy" data-product='${JSON.stringify(product)}'><span>Buy Now</span></a>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add event listeners to buy buttons
        document.querySelectorAll('.btn-buy').forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const productData = JSON.parse(this.getAttribute('data-product'));
                initiateWhatsAppCheckout(productData);
            });
        });

        // Add hover effects to the newly loaded cards
        featuredContainer.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-10px) scale(1.02)';
            });
            card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0) scale(1)';
            });
        });
        
    } catch (error) {
        console.error('Error loading new arrivals:', error);
        featuredContainer.innerHTML = `
            <div class="error-message fade-in">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Something Went Wrong</h3>
                <p>We're having trouble loading products. Please try again.</p>
                <button onclick="loadNewArrivals()" class="btn">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
    }
}

// FIXED: Fetch products function
async function fetchNewestProducts() {
    if (!window.supabase) {
        throw new Error('Supabase client is not available.');
    }

    // Fetch the 4 most recent, active products.
    const { data: featuredProducts, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(4);

    if (error) {
        console.error('Error fetching newest products from Supabase:', error);
        throw error;
    }
    return featuredProducts || [];
}

// Fixed Mobile Tab Bar
function initMobileTabBar() {
    const tabItems = document.querySelectorAll('.tab-item');
    
    // Set the active tab based on the current page URL
    const currentPage = window.location.pathname.split('/').pop();
    tabItems.forEach(tab => {
        const tabLink = tab.getAttribute('href');
        // The search tab has no href, so it won't be marked active
        if (tabLink && currentPage.startsWith(tabLink)) {
            // Remove active from all
            tabItems.forEach(t => t.classList.remove('active'));
            // Add to current
            tab.classList.add('active');
            tab.style.transform = 'translateY(-10px)';
        } else if (currentPage === '' || currentPage === 'index.html') {
            // Handle homepage case
            document.querySelector('.tab-item[href="index.html"]').classList.add('active');
        }
    });
}

// Rest of your existing functions (initScrollAnimations, initInteractiveElements, etc.)
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.fade-in').forEach(el => {
        observer.observe(el);
    });
}

function initInteractiveElements() {
    // This function can be used for other static interactive elements if needed.
}

function initParallaxEffects() {
    const hero = document.querySelector('.hero');
    if (hero) {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.5;
            hero.style.transform = `translate3d(0px, ${rate}px, 0px)`;
        });
    }
}

// Create mobile menu overlay (only used on mobile)
function createMobileMenuOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'mobile-menu-overlay';
    overlay.innerHTML = `
        <div class="mobile-menu-container">
            <span class="close-menu">&times;</span>
            <ul>
                <li><a href="index.html">Home</a></li>
                <li><a href="products.html">Shop</a></li>
                <li><a href="about.html">About</a></li>
                <li><a href="contact.html">Contact</a></li>
            </ul>
        </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
}

// Perform search function
function performSearch() {
    const searchInput = document.getElementById('search-input');
    const query = searchInput.value.trim();
    
    if (query) {
        sessionStorage.setItem('searchQuery', query);
        window.location.href = 'products.html';
    }
}

// Handle contact form submission
function initContactForm() {
    const contactForm = document.getElementById('contact-form');
    if (!contactForm) return;

    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;

        // Show sending state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Sending...</span>';

        // Simulate form submission (e.g., to a serverless function or email service)
        setTimeout(() => {
            // On success:
            showToast('Message sent successfully! We will get back to you soon.', 'success');
            this.reset(); // Clear the form

            // Restore button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;

        }, 1500); // Simulate network delay
    });
}
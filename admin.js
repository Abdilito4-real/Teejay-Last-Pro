// Admin Dashboard functionality
class AdminManager {
    constructor() {
        this.currentView = 'dashboard';
        this.editingProduct = null;
        this.inactivityTimer = null;
        this.inactivityTimeout = 30 * 60 * 1000; // 30 minutes in milliseconds
        this.init();
    }

    async init() {
        // Check authentication
        if (!(await requireAuth())) return;

        this.setupEventListeners();
        await this.loadDashboardStats();
        this.resetInactivityTimer(); // Start the inactivity timer
        await this.loadProducts();
    }

    setupEventListeners() {
        // View navigation
        document.querySelectorAll('.admin-view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.target.dataset.view);
            });
        });

        // Product form
        const productForm = document.getElementById('product-form');
        if (productForm) {
            productForm.addEventListener('submit', (e) => this.handleProductSubmit(e));
        }

        // Image upload
        const imageInput = document.getElementById('product-image');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        }

        // Cancel edit
        const cancelEdit = document.getElementById('cancel-edit');
        if (cancelEdit) {
            cancelEdit.addEventListener('click', () => this.cancelEdit());
        }

        // Add new product button
        const addNewBtn = document.getElementById('add-new-product-btn');
        if (addNewBtn) {
            addNewBtn.addEventListener('click', () => this.showProductForm());
        }

        // Image drop zone events
        const dropZone = document.getElementById('image-upload-placeholder');
        if (dropZone) {
            this.setupImageDropZone(dropZone);
        }

        // Inactivity event listeners
        window.addEventListener('mousemove', () => this.resetInactivityTimer());
        window.addEventListener('mousedown', () => this.resetInactivityTimer());
        window.addEventListener('keypress', () => this.resetInactivityTimer());
        window.addEventListener('scroll', () => this.resetInactivityTimer());
        window.addEventListener('touchstart', () => this.resetInactivityTimer());
    }

    switchView(view) {
        this.currentView = view;
        
        // Update active button
        document.querySelectorAll('.admin-view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Show/hide views
        document.querySelectorAll('.admin-view').forEach(viewEl => {
            viewEl.style.display = viewEl.id === `${view}-view` ? 'block' : 'none';
        });

        // When switching to products view, hide the form initially
        document.querySelectorAll('.product-item.editing').forEach(item => {
            item.classList.remove('editing');
        });
    }

    async loadDashboardStats() {
        try {
            // Total products
            const { data: products, error: productsError } = await supabase
                .from('products')
                .select('*');
            
            if (productsError) throw productsError;

            // Featured products
            const { data: featuredProducts, error: featuredError } = await supabase
                .from('products')
                .select('*')
                .eq('featured', true);
            
            if (featuredError) throw featuredError;

            // Calculate stats
            const totalProducts = products.length;
            const featuredCount = featuredProducts.length;
            const totalInventory = products.reduce((sum, product) => sum + (product.price * product.stock), 0);
            const totalStock = products.reduce((sum, product) => sum + product.stock, 0);

            // Update DOM
            document.getElementById('stat-total-products').textContent = totalProducts;
            document.getElementById('stat-featured-products').textContent = featuredCount;
            document.getElementById('inventory-value').textContent = formatCurrency(totalInventory);
            document.getElementById('total-stock').textContent = totalStock;

        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            showToast('Failed to load dashboard statistics', 'error');
        }
    }

    async loadProducts() {
        try {
            const { data: products, error } = await supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            this.displayRecentProducts(products.slice(0, 5));

            this.displayProducts(products);
        } catch (error) {
            console.error('Error loading products:', error);
            showToast('Failed to load products', 'error');
        }
    }

    displayRecentProducts(products) {
        const container = document.getElementById('recent-products-list');
        if (!container) return;

        if (products.length === 0) {
            container.innerHTML = '<p>No recent products to display.</p>';
            return;
        }

        container.innerHTML = products.map(product => `
            <div class="product-item-mini">
                <img src="${product.image_url}" alt="${product.title}" class="product-item-image" onerror="this.onerror=null; this.src='https://placehold.co/80x80/f9f9f9/1a1a1a?text=Img&font=montserrat';">
                <div class="product-item-info">
                    <h4>${product.title}</h4>
                    <p>₦${product.price.toLocaleString()}</p>
                </div>
            </div>
        `).join('');
    }

    displayProducts(products) {
        const container = document.getElementById('products-list');
        if (!container) return;

        if (products.length === 0) {
            container.innerHTML = '<p>No products found.</p>';
            return;
        }

        container.innerHTML = products.map(product => `
            <div class="product-item" data-id="${product.id}">
                <img src="${product.image_url}" alt="${product.title}" class="product-item-image" onerror="this.onerror=null; this.src='https://placehold.co/80x80/f9f9f9/1a1a1a?text=Img&font=montserrat';">
                <div class="product-item-info">
                    <h4>${product.title}</h4>
                    <p>${product.category} • ₦${product.price.toLocaleString()} • Stock: ${product.stock}</p>
                    <div class="product-status">
                        ${product.featured ? '<span class="featured-badge">Featured</span>' : ''}
                        ${product.active ? '<span class="active-badge">Active</span>' : '<span class="inactive-badge">Inactive</span>'}
                    </div>
                </div>
                <div class="product-item-actions">
                    <button class="btn-edit" data-action="edit" data-id="${product.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-delete" data-action="delete" data-id="${product.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');

        // Re-apply event listeners after rendering
        const productList = document.getElementById('products-list');
        if (productList) {
            productList.addEventListener('click', (e) => {
                this.handleProductListClick(e);
            });
        }
    }

    handleProductListClick(e) {
        const button = e.target.closest('button');
        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id;

        if (action === 'edit') this.editProduct(id);
        if (action === 'delete') this.deleteProduct(id);
    }

    async handleProductSubmit(e) {
        e.preventDefault();
        const submitBtn = document.getElementById('submit-btn');
        const originalBtnHTML = submitBtn.innerHTML;

        // Disable button and show spinner
        submitBtn.disabled = true;
        const actionText = this.editingProduct ? 'Updating...' : 'Adding...';
        submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${actionText}`;
        
        const formData = new FormData(e.target);
        const productData = {
            title: formData.get('title'),
            description: formData.get('description'),
            price: parseFloat(formData.get('price')),
            category: formData.get('category'),
            stock: parseInt(formData.get('stock')),
            featured: formData.get('featured') === 'on',
            active: formData.get('active') === 'on'
        };

        const imageFile = document.getElementById('product-image').files[0];

        try {
            let imageUrl = this.editingProduct ? document.getElementById('image-preview').src : '';
            
            // Upload new image if provided
            if (imageFile) {
                imageUrl = await this.uploadImage(imageFile);
            }

            productData.image_url = imageUrl;

            if (this.editingProduct) {
                // Update existing product
                const { error } = await supabase
                    .from('products')
                    .update(productData)
                    .eq('id', this.editingProduct);

                if (error) throw error;
                showToast('Product updated successfully', 'success');
            } else {
                // Create new product
                const { error } = await supabase
                    .from('products')
                    .insert([productData]);

                if (error) throw error;
                showToast('Product created successfully', 'success');
            }

            // Reset form and reload data
            this.resetForm();
            await this.loadProducts();
            await this.loadDashboardStats();

        } catch (error) {
            console.error('Error saving product:', error);
            showToast('Failed to save product', 'error');
        } finally {
            // Re-enable button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHTML;
        }
    }

    async uploadImage(file) {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `products/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('product-images')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw new Error('Failed to upload image');
        }
    }

    async editProduct(productId) {
        try {
            const { data: product, error } = await supabase
                .from('products')
                .select('*')
                .eq('id', productId)
                .single();

            if (error) throw error;

            // Populate form
            document.getElementById('product-title').value = product.title;
            document.getElementById('product-description').value = product.description || '';
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-category').value = product.category;
            document.getElementById('product-stock').value = product.stock;
            document.getElementById('product-featured').checked = product.featured;
            document.getElementById('product-active').checked = product.active;
            
            // Set image preview
            this.showProductForm();
            const imagePreview = document.getElementById('image-preview');
            imagePreview.src = product.image_url;
            imagePreview.classList.add('has-image');

            // Update UI for editing
            this.editingProduct = productId;
            document.getElementById('form-title').textContent = 'Edit Product';
            document.getElementById('submit-btn').textContent = 'Update Product';
            document.getElementById('cancel-edit').style.display = 'inline-block';
            
            // Highlight the item being edited
            document.querySelectorAll('.product-item').forEach(item => {
                item.classList.toggle('editing', item.dataset.id === productId);
            });

            // Scroll form into view for better UX
            document.getElementById('form-title').scrollIntoView({ behavior: 'smooth' });
            
            // Switch to products view
            this.switchView('products');

        } catch (error) {
            console.error('Error loading product for edit:', error);
            showToast('Failed to load product', 'error');
        }
    }

    async deleteProduct(productId) {
        if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', productId);

            if (error) throw error;

            showToast('Product deleted successfully', 'success');
            await this.loadProducts();
            await this.loadDashboardStats();

        } catch (error) {
            console.error('Error deleting product:', error);
            showToast('Failed to delete product', 'error');
        }
    }

    showProductForm() {
        const formContainer = document.querySelector('.product-form-container');
        formContainer.style.display = 'block';
        formContainer.scrollIntoView({ behavior: 'smooth' });
    }

    setupImageDropZone(dropZone) {
        const input = dropZone.querySelector('.image-upload-input');

        dropZone.addEventListener('click', () => input.click());

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        ['dragleave', 'dragend'].forEach(type => {
            dropZone.addEventListener(type, () => {
                dropZone.classList.remove('drag-over');
            });
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            if (e.dataTransfer.files.length) {
                input.files = e.dataTransfer.files;
                // Manually trigger change event
                const event = new Event('change', { bubbles: true });
                input.dispatchEvent(event);
            }
        });

        input.addEventListener('change', (e) => {
            this.handleImageUpload(e);
        });
    }

    cancelEdit() {
        this.resetForm();
    }

    resetForm() {
        document.getElementById('product-form').reset();
        document.getElementById('form-title').textContent = 'Add New Product';
        document.getElementById('submit-btn').textContent = 'Add Product';
        document.getElementById('cancel-edit').style.display = 'none';
        this.editingProduct = null;

        // Remove highlighting from all items
        document.querySelectorAll('.product-item.editing').forEach(item => {
            item.classList.remove('editing');
        });

        // Hide the form
        const formContainer = document.querySelector('.product-form-container');
        
        // Reset image placeholder
        const imagePreview = document.getElementById('image-preview');
        imagePreview.src = '';
        imagePreview.classList.remove('has-image');

        formContainer.style.display = 'none';
    }

    handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const imagePreview = document.getElementById('image-preview');
            imagePreview.src = e.target.result;
            imagePreview.classList.add('has-image');
        };
        reader.readAsDataURL(file);
    }

    resetInactivityTimer() {
        clearTimeout(this.inactivityTimer);
        this.inactivityTimer = setTimeout(() => this.logoutDueToInactivity(), this.inactivityTimeout);
    }

    async logoutDueToInactivity() {
        showToast('You have been logged out due to inactivity.', 'info');
        // Wait a moment for the user to see the toast
        setTimeout(async () => {
            await authManager.logout();
            window.location.href = 'login.html';
        }, 2000);
    }
}

// Initialize admin manager when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    window.adminManager = new AdminManager();
});

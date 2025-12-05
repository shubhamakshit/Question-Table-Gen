// Folder Management System with Modern UI/UX
class FolderManager {
    constructor() {
        this.currentFolder = null;
        this.selectedImages = new Set();
        this.viewMode = 'grid'; // grid or list
        this.sortBy = 'name'; // name, date, size, status
        this.sortOrder = 'asc';
        this.searchQuery = '';
        
        this.init();
    }

    async init() {
        await window.imageDB.init();
        this.setupUI();
        this.attachEventListeners();
        await this.loadFolders();
        this.updateStats();
    }

    setupUI() {
        // Get existing folder section
        const folderSection = document.getElementById('folder-section');
        const folderContent = folderSection.querySelector('.card-content');
        
        if (folderContent) {
            // Clear existing content and add folder management
            folderContent.innerHTML = '';
            const folderHTML = this.createFolderHTML();
            folderContent.innerHTML = folderHTML;
        }

        // Update upload section to include folder selection
        this.enhanceUploadSection();
    }

    createFolderHTML() {
        return `
            <!-- Header with actions -->
            <div class="folder-header">
                <h2 class="section-title">
                    <span class="material-icons">folder</span>
                    My Folders
                </h2>
                <div class="folder-actions">
                    <div class="search-container">
                        <span class="material-icons search-icon">search</span>
                        <input type="text" id="folder-search" class="search-input" placeholder="Search images...">
                    </div>
                    <button id="create-folder-btn" class="button primary">
                        <span class="material-icons">create_new_folder</span>
                        New Folder
                    </button>
                    <div class="view-toggle-group">
                        <button id="grid-view-btn" class="icon-button active" title="Grid View">
                            <span class="material-icons">grid_view</span>
                        </button>
                        <button id="list-view-btn" class="icon-button" title="List View">
                            <span class="material-icons">view_list</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Stats Bar -->
            <div class="stats-bar">
                <div class="stat-item">
                    <span class="stat-number" id="total-folders">0</span>
                    <span class="stat-label">Folders</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number" id="total-images">0</span>
                    <span class="stat-label">Images</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number" id="processed-images">0</span>
                    <span class="stat-label">Processed</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number" id="unprocessed-images">0</span>
                    <span class="stat-label">Pending</span>
                </div>
            </div>

            <!-- Folder Grid/List -->
            <div class="folder-container">
                <div id="folders-grid" class="folders-grid"></div>
                <div id="folder-detail" class="folder-detail hidden">
                    <!-- Folder detail view will be populated here -->
                </div>
            </div>

            <!-- Empty State -->
            <div id="empty-folders" class="empty-state hidden">
                <span class="material-icons empty-icon">folder_open</span>
                <h3>No folders yet</h3>
                <p>Create your first folder to organize your images</p>
                <button class="button primary" onclick="folderManager.showCreateFolderDialog()">
                    <span class="material-icons">create_new_folder</span>
                    Create Folder
                </button>
            </div>
        `;
    }

    enhanceUploadSection() {
        const uploadSection = document.getElementById('upload-section');
        const cardContent = uploadSection.querySelector('.card-content');
        
        // Add folder selection to upload section
        const folderSelect = document.createElement('div');
        folderSelect.className = 'folder-select-container';
        folderSelect.innerHTML = `
            <div class="setting-item">
                <label for="upload-folder-select">Save to Folder</label>
                <div class="folder-select-wrapper">
                    <select id="upload-folder-select" class="folder-select">
                        <option value="">Select a folder...</option>
                    </select>
                    <button id="quick-create-folder" class="icon-button" title="Create new folder">
                        <span class="material-icons">add</span>
                    </button>
                </div>
            </div>
        `;
        
        // Insert after the title
        const title = cardContent.querySelector('.section-title');
        title.parentNode.insertBefore(folderSelect, title.nextSibling);
    }

    attachEventListeners() {
        // Folder actions
        document.getElementById('create-folder-btn')?.addEventListener('click', () => this.showCreateFolderDialog());
        document.getElementById('quick-create-folder')?.addEventListener('click', () => this.showCreateFolderDialog());
        
        // View toggles
        document.getElementById('grid-view-btn')?.addEventListener('click', () => this.setViewMode('grid'));
        document.getElementById('list-view-btn')?.addEventListener('click', () => this.setViewMode('list'));
        
        // Search
        document.getElementById('folder-search')?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.performSearch();
        });

        // Enhanced upload handling
        this.enhanceUploadHandling();
    }

    enhanceUploadHandling() {
        const originalUploadBtn = document.getElementById('upload-btn');
        if (originalUploadBtn) {
            originalUploadBtn.addEventListener('click', async (e) => {
                const folderId = document.getElementById('upload-folder-select')?.value;
                if (!folderId) {
                    this.showNotification('Please select a folder first', 'warning');
                    e.preventDefault();
                    return;
                }
                
                // Store selected folder for later use
                this.selectedUploadFolder = folderId;
            });
        }
    }

    async loadFolders() {
        try {
            const folders = await window.imageDB.getFolders();
            this.renderFolders(folders);
            this.updateFolderSelect(folders);
            
            if (folders.length === 0) {
                document.getElementById('empty-folders').classList.remove('hidden');
                document.getElementById('folders-grid').classList.add('hidden');
            } else {
                document.getElementById('empty-folders').classList.add('hidden');
                document.getElementById('folders-grid').classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error loading folders:', error);
            this.showNotification('Failed to load folders', 'error');
        }
    }

    renderFolders(folders) {
        const grid = document.getElementById('folders-grid');
        grid.innerHTML = '';

        folders.forEach(folder => {
            const folderCard = this.createFolderCard(folder);
            grid.appendChild(folderCard);
        });
    }

    createFolderCard(folder) {
        const card = document.createElement('div');
        card.className = 'folder-card';
        card.style.setProperty('--folder-color', folder.color);
        
        card.innerHTML = `
            <div class="folder-card-header">
                <div class="folder-icon" style="background-color: ${folder.color}">
                    <span class="material-icons">folder</span>
                </div>
                <div class="folder-menu">
                    <button class="icon-button" onclick="folderManager.showFolderMenu(${folder.id}, event)">
                        <span class="material-icons">more_vert</span>
                    </button>
                </div>
            </div>
            <div class="folder-card-content">
                <h3 class="folder-name">${this.escapeHtml(folder.name)}</h3>
                <p class="folder-description">${this.escapeHtml(folder.description || 'No description')}</p>
                <div class="folder-stats">
                    <span class="stat">
                        <span class="material-icons">image</span>
                        ${folder.imageCount || 0} images
                    </span>
                    <span class="stat">
                        <span class="material-icons">schedule</span>
                        ${this.formatDate(folder.updatedAt || folder.createdAt)}
                    </span>
                </div>
            </div>
            <div class="folder-card-actions">
                <button class="button secondary small" onclick="folderManager.openFolder(${folder.id})">
                    <span class="material-icons">folder_open</span>
                    Open
                </button>
                <button class="button primary small" onclick="folderManager.uploadToFolder(${folder.id})">
                    <span class="material-icons">add_photo_alternate</span>
                    Add Images
                </button>
            </div>
        `;

        return card;
    }

    async openFolder(folderId) {
        try {
            this.currentFolder = folderId;
            const folder = (await window.imageDB.getFolders()).find(f => f.id === folderId);
            const images = await window.imageDB.getImagesByFolder(folderId);
            
            this.showFolderDetail(folder, images);
            
            // Update URL to reflect current folder
            const url = new URL(window.location);
            url.searchParams.set('folder', folderId);
            window.history.pushState({}, '', url);
        } catch (error) {
            console.error('Error opening folder:', error);
            this.showNotification('Failed to open folder', 'error');
        }
    }

    showFolderDetail(folder, images) {
        const detailView = document.getElementById('folder-detail');
        const gridView = document.getElementById('folders-grid');
        
        gridView.classList.add('hidden');
        detailView.classList.remove('hidden');
        
        detailView.innerHTML = `
            <div class="folder-detail-header">
                <button class="button secondary" onclick="folderManager.backToFolders()">
                    <span class="material-icons">arrow_back</span>
                    Back to Folders
                </button>
                <div class="folder-title">
                    <div class="folder-icon-large" style="background-color: ${folder.color}">
                        <span class="material-icons">folder</span>
                    </div>
                    <div>
                        <h2>${this.escapeHtml(folder.name)}</h2>
                        <p>${this.escapeHtml(folder.description || 'No description')}</p>
                    </div>
                </div>
                <div class="folder-detail-actions">
                    <button class="button secondary" onclick="folderManager.editFolder(${folder.id})">
                        <span class="material-icons">edit</span>
                        Edit
                    </button>
                    <button class="button primary" onclick="folderManager.uploadToFolder(${folder.id})">
                        <span class="material-icons">add_photo_alternate</span>
                        Add Images
                    </button>
                </div>
            </div>
            
            <div class="images-toolbar">
                <div class="images-info">
                    <span>${images.length} images</span>
                    <span class="separator">•</span>
                    <span>${images.filter(img => img.processed).length} processed</span>
                </div>
                <div class="images-actions">
                    <select id="sort-images" class="sort-select">
                        <option value="name">Sort by Name</option>
                        <option value="date">Sort by Date</option>
                        <option value="size">Sort by Size</option>
                        <option value="status">Sort by Status</option>
                    </select>
                    <button id="select-all-images" class="button secondary small">Select All</button>
                    <button id="process-selected" class="button primary small" disabled>Process Selected</button>
                </div>
            </div>
            
            <div class="images-container ${this.viewMode}">
                ${this.renderImages(images)}
            </div>
        `;

        this.attachImageEventListeners();
    }

    renderImages(images) {
        if (images.length === 0) {
            return `
                <div class="empty-state">
                    <span class="material-icons empty-icon">image</span>
                    <h3>No images in this folder</h3>
                    <p>Add some images to get started</p>
                    <button class="button primary" onclick="folderManager.uploadToFolder(${this.currentFolder})">
                        <span class="material-icons">add_photo_alternate</span>
                        Add Images
                    </button>
                </div>
            `;
        }

        return images.map(image => this.createImageCard(image)).join('');
    }

    createImageCard(image) {
        const statusIcon = image.processed ? 'check_circle' : 'pending';
        const statusClass = image.processed ? 'processed' : 'pending';
        
        return `
            <div class="image-card" data-image-id="${image.id}">
                <div class="image-card-header">
                    <label class="image-checkbox">
                        <input type="checkbox" value="${image.id}">
                        <span class="checkmark"></span>
                    </label>
                    <div class="image-status ${statusClass}">
                        <span class="material-icons">${statusIcon}</span>
                    </div>
                </div>
                <div class="image-thumbnail">
                    <img src="${image.thumbnail}" alt="${this.escapeHtml(image.name)}" loading="lazy">
                </div>
                <div class="image-card-content">
                    <h4 class="image-name">${this.escapeHtml(image.name)}</h4>
                    <div class="image-meta">
                        <span class="meta-item">${this.formatFileSize(image.size)}</span>
                        <span class="meta-item">${this.formatDate(image.createdAt)}</span>
                    </div>
                </div>
                <div class="image-card-actions">
                    ${image.processed ? `
                        <button class="button secondary small" onclick="folderManager.viewResults(${image.id})">
                            <span class="material-icons">visibility</span>
                            View Results
                        </button>
                    ` : `
                        <button class="button primary small" onclick="folderManager.processImage(${image.id})">
                            <span class="material-icons">psychology</span>
                            Process
                        </button>
                    `}
                    <button class="icon-button" onclick="folderManager.showImageMenu(${image.id}, event)">
                        <span class="material-icons">more_vert</span>
                    </button>
                </div>
            </div>
        `;
    }

    attachImageEventListeners() {
        // Image selection
        document.querySelectorAll('.image-checkbox input').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const imageId = parseInt(e.target.value);
                if (e.target.checked) {
                    this.selectedImages.add(imageId);
                } else {
                    this.selectedImages.delete(imageId);
                }
                this.updateSelectionUI();
            });
        });

        // Select all
        document.getElementById('select-all-images')?.addEventListener('click', () => {
            this.toggleSelectAll();
        });

        // Process selected
        document.getElementById('process-selected')?.addEventListener('click', () => {
            this.processSelectedImages();
        });

        // Sort
        document.getElementById('sort-images')?.addEventListener('change', (e) => {
            this.sortImages(e.target.value);
        });
    }

    async showCreateFolderDialog() {
        const dialog = this.createDialog('Create New Folder', `
            <form id="create-folder-form">
                <div class="form-group">
                    <label for="folder-name">Folder Name *</label>
                    <input type="text" id="folder-name" class="text-input" required placeholder="Enter folder name">
                </div>
                <div class="form-group">
                    <label for="folder-description">Description</label>
                    <textarea id="folder-description" class="text-input" rows="3" placeholder="Optional description"></textarea>
                </div>
            </form>
        `, [
            {
                text: 'Cancel',
                class: 'secondary',
                action: () => this.closeDialog()
            },
            {
                text: 'Create Folder',
                class: 'primary',
                action: () => this.createFolder()
            }
        ]);

        document.body.appendChild(dialog);
        document.getElementById('folder-name').focus();
    }

    async createFolder() {
        const name = document.getElementById('folder-name').value.trim();
        const description = document.getElementById('folder-description').value.trim();

        if (!name) {
            this.showNotification('Folder name is required', 'error');
            return;
        }

        try {
            const folder = await window.imageDB.createFolder(name, description);
            this.closeDialog();
            this.showNotification(`Folder "${name}" created successfully`, 'success');
            await this.loadFolders();
            await this.updateStats();
        } catch (error) {
            console.error('Error creating folder:', error);
            this.showNotification('Failed to create folder. Name might already exist.', 'error');
        }
    }

    updateFolderSelect(folders) {
        const select = document.getElementById('upload-folder-select');
        if (!select) return;

        select.innerHTML = '<option value="">Select a folder...</option>';
        folders.forEach(folder => {
            const option = document.createElement('option');
            option.value = folder.id;
            option.textContent = folder.name;
            select.appendChild(option);
        });
    }

    async updateStats() {
        try {
            const stats = await window.imageDB.getStats();
            document.getElementById('total-folders').textContent = stats.totalFolders;
            document.getElementById('total-images').textContent = stats.totalImages;
            document.getElementById('processed-images').textContent = stats.processedImages;
            document.getElementById('unprocessed-images').textContent = stats.unprocessedImages;
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    // Utility methods
    createDialog(title, content, buttons) {
        const dialog = document.createElement('div');
        dialog.className = 'dialog-overlay';
        dialog.innerHTML = `
            <div class="dialog">
                <div class="dialog-header">
                    <h3>${title}</h3>
                    <button class="icon-button dialog-close-btn">
                        <span class="material-icons">close</span>
                    </button>
                </div>
                <div class="dialog-content">
                    ${content}
                </div>
                <div class="dialog-actions">
                    ${buttons.map((btn, index) => `
                        <button class="button ${btn.class}" data-action="${index}">${btn.text}</button>
                    `).join('')}
                </div>
            </div>
        `;
        
        // Add event listeners after creating the dialog
        setTimeout(() => {
            const dialogElement = dialog.querySelector('.dialog');
            
            // Close button
            const closeBtn = dialogElement.querySelector('.dialog-close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closeDialog());
            }
            
            // Action buttons
            const actionButtons = dialogElement.querySelectorAll('[data-action]');
            actionButtons.forEach((btn, index) => {
                btn.addEventListener('click', () => {
                    buttons[index].action();
                });
            });
            
            // Click outside to close
            dialog.addEventListener('click', (e) => {
                if (e.target === dialog) {
                    this.closeDialog();
                }
            });
        }, 0);
        
        return dialog;
    }

    closeDialog() {
        const dialog = document.querySelector('.dialog-overlay');
        if (dialog) {
            dialog.remove();
        }
    }

    showNotification(message, type = 'info') {
        // Create and show toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="material-icons">${this.getNotificationIcon(type)}</span>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check_circle',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };
        return icons[type] || 'info';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 24 * 60 * 60 * 1000) {
            return 'Today';
        } else if (diff < 7 * 24 * 60 * 60 * 1000) {
            return `${Math.floor(diff / (24 * 60 * 60 * 1000))} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    formatFileSize(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    backToFolders() {
        document.getElementById('folder-detail').classList.add('hidden');
        document.getElementById('folders-grid').classList.remove('hidden');
        this.currentFolder = null;
        
        // Update URL
        const url = new URL(window.location);
        url.searchParams.delete('folder');
        window.history.pushState({}, '', url);
    }

    setViewMode(mode) {
        this.viewMode = mode;
        document.getElementById('grid-view-btn').classList.toggle('active', mode === 'grid');
        document.getElementById('list-view-btn').classList.toggle('active', mode === 'list');
        
        const container = document.querySelector('.images-container');
        if (container) {
            container.className = `images-container ${mode}`;
        }
    }

    async performSearch() {
        if (!this.searchQuery) {
            await this.loadFolders();
            return;
        }

        try {
            const results = await window.imageDB.searchImages(this.searchQuery);
            // Render search results
            this.renderSearchResults(results);
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    // Image processing integration
    async processImage(imageId) {
        try {
            const images = await window.imageDB.getImagesByFolder(this.currentFolder);
            const image = images.find(img => img.id === imageId);
            
            if (!image) {
                this.showNotification('Image not found', 'error');
                return;
            }

            // Show processing status
            const imageCard = document.querySelector(`[data-image-id="${imageId}"]`);
            const statusEl = imageCard?.querySelector('.image-status');
            const processBtn = imageCard?.querySelector('button');
            
            if (statusEl) {
                statusEl.className = 'image-status processing';
                statusEl.innerHTML = '<span class="material-icons rotating">sync</span>';
            }
            if (processBtn) {
                processBtn.disabled = true;
                processBtn.innerHTML = '<span class="material-icons">hourglass_empty</span> Processing...';
            }

            // Process the image
            const formData = new FormData();
            formData.append('image', image.file);
            
            const settings = JSON.parse(localStorage.getItem('imageProcessorSettings') || '{}');
            const apiUrl = settings.apiUrl || 'http://127.0.0.1:5000/upload';
            const timeout = (settings.timeout || 30) * 1000;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'error') {
                throw new Error(data.message || 'Unknown error occurred');
            }

            // Save results to IndexedDB
            await window.imageDB.saveResult(imageId, this.currentFolder, data);

            // Update UI to show success
            if (statusEl) {
                statusEl.className = 'image-status processed';
                statusEl.innerHTML = '<span class="material-icons">check_circle</span>';
            }
            if (processBtn) {
                processBtn.disabled = false;
                processBtn.innerHTML = '<span class="material-icons">visibility</span> View Results';
                processBtn.onclick = () => this.viewResults(imageId);
            }

            this.showNotification('Image processed successfully', 'success');
            await this.updateStats();
            
        } catch (error) {
            console.error('Error processing image:', error);
            
            // Reset UI on error
            const imageCard = document.querySelector(`[data-image-id="${imageId}"]`);
            const statusEl = imageCard?.querySelector('.image-status');
            const processBtn = imageCard?.querySelector('button');
            
            if (statusEl) {
                statusEl.className = 'image-status pending';
                statusEl.innerHTML = '<span class="material-icons">pending</span>';
            }
            if (processBtn) {
                processBtn.disabled = false;
                processBtn.innerHTML = '<span class="material-icons">psychology</span> Process';
            }

            if (error.name === 'AbortError') {
                this.showNotification('Processing timed out. Please try again.', 'error');
            } else {
                this.showNotification(`Processing failed: ${error.message}`, 'error');
            }
        }
    }

    async processSelectedImages() {
        if (this.selectedImages.size === 0) {
            this.showNotification('No images selected', 'warning');
            return;
        }

        this.showNotification(`Processing ${this.selectedImages.size} selected images...`, 'info');
        
        let processed = 0;
        let failed = 0;
        
        for (const imageId of this.selectedImages) {
            try {
                await this.processImage(imageId);
                processed++;
            } catch (error) {
                failed++;
                console.error(`Failed to process image ${imageId}:`, error);
            }
        }

        this.selectedImages.clear();
        this.updateSelectionUI();
        
        this.showNotification(
            `Batch processing complete: ${processed} successful, ${failed} failed`, 
            failed > 0 ? 'warning' : 'success'
        );
    }

    async viewResults(imageId) {
        try {
            const result = await window.imageDB.getResultByImage(imageId);
            
            if (!result) {
                this.showNotification('No results found for this image', 'warning');
                return;
            }

            this.showResultsDialog(result.result);
            
        } catch (error) {
            console.error('Error viewing results:', error);
            this.showNotification('Failed to load results', 'error');
        }
    }

    showResultsDialog(results) {
        const content = this.generateResultsHTML(results);
        
        const dialog = this.createDialog('Analysis Results', content, [
            {
                text: 'Download JSON',
                class: 'secondary',
                action: () => this.downloadResults(results)
            },
            {
                text: 'Close',
                class: 'primary',
                action: () => this.closeDialog()
            }
        ]);

        document.body.appendChild(dialog);
    }

    generateResultsHTML(results) {
        const { data } = results;
        let html = '<div class="results-viewer">';
        
        if (Array.isArray(data)) {
            // No sections
            html += this.generateResultTable('Results', data);
        } else {
            // With sections
            for (const section in data) {
                html += this.generateResultTable(section, data[section]);
            }
        }
        
        html += '</div>';
        return html;
    }

    generateResultTable(sectionName, items) {
        let html = `
            <div class="result-section">
                <h4>${this.escapeHtml(sectionName)}</h4>
                <table class="results-table compact">
                    <thead>
                        <tr>
                            <th>Question</th>
                            <th>Answer</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        items.forEach(item => {
            html += `
                <tr>
                    <td>${this.escapeHtml(item.question_number)}</td>
                    <td><strong>${this.escapeHtml(item.answer)}</strong></td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        return html;
    }

    downloadResults(results) {
        const dataStr = JSON.stringify(results, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `analysis-results-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Results downloaded successfully', 'success');
    }

    showFolderMenu(folderId, event) {
        event.stopPropagation();
        this.showNotification('Folder menu coming soon', 'info');
    }

    showImageMenu(imageId, event) {
        event.stopPropagation();
        
        // Create context menu
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.innerHTML = `
            <div class="context-menu-item" data-action="load">
                <span class="material-icons">slideshow</span>
                Load in Slide View
            </div>
            <div class="context-menu-item" data-action="rename">
                <span class="material-icons">edit</span>
                Rename
            </div>
            <div class="context-menu-item" data-action="download">
                <span class="material-icons">download</span>
                Download
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item danger" data-action="delete">
                <span class="material-icons">delete</span>
                Delete
            </div>
        `;
        
        // Position menu
        const rect = event.target.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.left = `${rect.left}px`;
        menu.style.top = `${rect.bottom + 5}px`;
        menu.style.zIndex = '1002';
        
        // Add to document
        document.body.appendChild(menu);
        
        // Add event listeners
        menu.addEventListener('click', (e) => {
            const action = e.target.closest('.context-menu-item')?.dataset.action;
            if (action) {
                this.handleImageAction(imageId, action);
                this.closeContextMenu();
            }
        });
        
        // Close menu when clicking outside
        setTimeout(() => {
            const closeHandler = (e) => {
                if (!menu.contains(e.target)) {
                    this.closeContextMenu();
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        }, 0);
    }

    closeContextMenu() {
        const menu = document.querySelector('.context-menu');
        if (menu) {
            menu.remove();
        }
    }

    async handleImageAction(imageId, action) {
        try {
            const images = await window.imageDB.getImagesByFolder(this.currentFolder);
            const image = images.find(img => img.id === imageId);
            
            if (!image) {
                this.showNotification('Image not found', 'error');
                return;
            }

            switch (action) {
                case 'load':
                    await this.loadImageInSlideView(imageId, image);
                    break;
                case 'rename':
                    await this.renameImage(imageId, image);
                    break;
                case 'download':
                    await this.downloadImage(image);
                    break;
                case 'delete':
                    await this.deleteImage(imageId, image);
                    break;
            }
        } catch (error) {
            console.error('Error handling image action:', error);
            this.showNotification('Action failed', 'error');
        }
    }

    async loadImageInSlideView(imageId, image) {
        try {
            // Check if image has results
            const result = await window.imageDB.getResultByImage(imageId);
            
            if (!result) {
                this.showNotification('No analysis results found for this image. Process it first.', 'warning');
                return;
            }

            console.log('Loading image in slide view:', image.name);
            console.log('Result data:', result.result);

            // Load the image and results in the main slide view
            const data = result.result;
            
            // Hide all sections first
            document.getElementById('folder-section').style.display = 'none';
            document.getElementById('folder-section').classList.add('hidden');
            document.getElementById('upload-section').style.display = 'none';
            document.getElementById('upload-section').classList.add('hidden');
            
            // Show results section
            const resultsSection = document.getElementById('results-section');
            if (resultsSection) {
                resultsSection.classList.remove('hidden');
                resultsSection.style.display = 'block';
                
                // Update navigation tab
                document.querySelectorAll('.nav-tab').forEach(tab => {
                    tab.classList.remove('active');
                    if (tab.dataset.section === 'results') {
                        tab.classList.add('active');
                    }
                });
                
                // Set the global state for slide view properly
                if (window.state) {
                    console.log('Setting state...');
                    // Set the results data exactly as expected by the app
                    window.state.results = data;
                    window.state.currentImageId = imageId;
                    window.state.currentImageName = image.name;
                    window.state.currentSection = 'results';
                    
                    // Clear existing slides first
                    window.state.slides = [];
                    window.state.currentSlideIndex = 0;
                    
                    console.log('Processing results...');
                    // Call existing results processing function
                    if (window.processResults) {
                        window.processResults();
                    }
                    
                    console.log('Slides created:', window.state.slides.length);
                    
                    // Force switch to slide view after processing
                    setTimeout(() => {
                        console.log('Switching to slide view...');
                        
                        // Make sure table view is hidden and slide view is shown
                        const tableView = document.getElementById('table-view');
                        const slideView = document.getElementById('slide-view');
                        const tableViewBtn = document.getElementById('table-view-btn');
                        const slideViewBtn = document.getElementById('slide-view-btn');
                        
                        if (tableView) tableView.classList.add('hidden');
                        if (slideView) slideView.classList.remove('hidden');
                        
                        if (tableViewBtn) tableViewBtn.classList.remove('active');
                        if (slideViewBtn) slideViewBtn.classList.add('active');
                        
                        // Ensure the slide view is updated
                        if (window.updateSlideView) {
                            window.updateSlideView();
                            console.log('Slide view updated');
                        }
                        
                        // Scroll to results
                        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 200);
                }
            }
            
            // Add back navigation
            this.addBackToFoldersButton();
            
            this.showNotification(`Loaded "${image.name}" in slide view`, 'success');
            
        } catch (error) {
            console.error('Error loading image in slide view:', error);
            this.showNotification('Failed to load image in slide view', 'error');
        }
    }

    addBackToFoldersButton() {
        // Add a back button to the results section
        const resultsSection = document.getElementById('results-section');
        const cardContent = resultsSection?.querySelector('.card-content');
        
        if (cardContent && !cardContent.querySelector('.back-to-folders-btn')) {
            const backBtn = document.createElement('button');
            backBtn.className = 'button secondary back-to-folders-btn';
            backBtn.innerHTML = '<span class="material-icons">arrow_back</span> Back to Folders';
            backBtn.style.marginBottom = '1rem';
            
            backBtn.addEventListener('click', () => {
                this.returnToFolders();
            });
            
            cardContent.insertBefore(backBtn, cardContent.firstChild);
        }
    }

    returnToFolders() {
        // Hide results section and show folder section
        document.getElementById('results-section').classList.add('hidden');
        document.getElementById('folder-section').style.display = 'block';
        document.getElementById('upload-section').style.display = 'block';
        
        // Remove back button
        const backBtn = document.querySelector('.back-to-folders-btn');
        if (backBtn) {
            backBtn.remove();
        }
    }

    async renameImage(imageId, image) {
        const newName = prompt('Enter new name for the image:', image.name);
        
        if (newName && newName.trim() && newName.trim() !== image.name) {
            try {
                await window.imageDB.updateImage(imageId, { 
                    name: newName.trim(),
                    updatedAt: new Date().toISOString()
                });
                
                // Refresh the folder view
                const folder = (await window.imageDB.getFolders()).find(f => f.id === this.currentFolder);
                const images = await window.imageDB.getImagesByFolder(this.currentFolder);
                this.showFolderDetail(folder, images);
                
                this.showNotification('Image renamed successfully', 'success');
            } catch (error) {
                console.error('Error renaming image:', error);
                this.showNotification('Failed to rename image', 'error');
            }
        }
    }

    async downloadImage(image) {
        try {
            // Create download link for the original file
            const url = URL.createObjectURL(image.file);
            const a = document.createElement('a');
            a.href = url;
            a.download = image.originalName || `${image.name}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showNotification('Image download started', 'success');
        } catch (error) {
            console.error('Error downloading image:', error);
            this.showNotification('Failed to download image', 'error');
        }
    }

    async deleteImage(imageId, image) {
        const confirmDelete = confirm(`Are you sure you want to delete "${image.name}"? This action cannot be undone.`);
        
        if (confirmDelete) {
            try {
                // Delete from images table
                await this.deleteImageFromDB(imageId);
                
                // Delete associated results
                const result = await window.imageDB.getResultByImage(imageId);
                if (result) {
                    await this.deleteResultFromDB(result.id);
                }
                
                // Update folder image count
                await this.updateFolderImageCount(this.currentFolder, -1);
                
                // Refresh the folder view
                const folder = (await window.imageDB.getFolders()).find(f => f.id === this.currentFolder);
                const images = await window.imageDB.getImagesByFolder(this.currentFolder);
                this.showFolderDetail(folder, images);
                
                // Update stats
                await this.updateStats();
                
                this.showNotification('Image deleted successfully', 'success');
            } catch (error) {
                console.error('Error deleting image:', error);
                this.showNotification('Failed to delete image', 'error');
            }
        }
    }

    async deleteImageFromDB(imageId) {
        return new Promise((resolve, reject) => {
            const transaction = window.imageDB.db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            const request = store.delete(imageId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async deleteResultFromDB(resultId) {
        return new Promise((resolve, reject) => {
            const transaction = window.imageDB.db.transaction(['results'], 'readwrite');
            const store = transaction.objectStore('results');
            const request = store.delete(resultId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async updateFolderImageCount(folderId, delta) {
        return new Promise((resolve, reject) => {
            const transaction = window.imageDB.db.transaction(['folders'], 'readwrite');
            const store = transaction.objectStore('folders');
            const getRequest = store.get(folderId);

            getRequest.onsuccess = () => {
                const folder = getRequest.result;
                if (folder) {
                    folder.imageCount = Math.max(0, (folder.imageCount || 0) + delta);
                    folder.updatedAt = new Date().toISOString();
                    const putRequest = store.put(folder);
                    
                    putRequest.onsuccess = () => resolve();
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    resolve();
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    uploadToFolder(folderId) {
        document.getElementById('upload-folder-select').value = folderId;
        this.showNotification('Folder selected for upload. Go to upload section to add images.', 'info');
    }

    toggleSelectAll() {
        // Implementation for select all functionality
    }

    updateSelectionUI() {
        const processBtn = document.getElementById('process-selected');
        if (processBtn) {
            processBtn.disabled = this.selectedImages.size === 0;
            processBtn.textContent = `Process Selected (${this.selectedImages.size})`;
        }
    }
}

// Initialize folder manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.folderManager = new FolderManager();
});
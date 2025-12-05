// IndexedDB Database Manager for Folder-based Image Organization
class ImageDatabase {
    constructor() {
        this.dbName = 'ImageAnalyzerDB';
        this.version = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('Database failed to open');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database opened successfully');
                resolve();
            };

            request.onupgradeneeded = (e) => {
                this.db = e.target.result;
                this.setupSchema();
            };
        });
    }

    setupSchema() {
        // Folders store
        if (!this.db.objectStoreNames.contains('folders')) {
            const folderStore = this.db.createObjectStore('folders', {
                keyPath: 'id',
                autoIncrement: true
            });
            folderStore.createIndex('name', 'name', { unique: true });
            folderStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Images store
        if (!this.db.objectStoreNames.contains('images')) {
            const imageStore = this.db.createObjectStore('images', {
                keyPath: 'id',
                autoIncrement: true
            });
            imageStore.createIndex('folderId', 'folderId', { unique: false });
            imageStore.createIndex('name', 'name', { unique: false });
            imageStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Analysis results store
        if (!this.db.objectStoreNames.contains('results')) {
            const resultStore = this.db.createObjectStore('results', {
                keyPath: 'id',
                autoIncrement: true
            });
            resultStore.createIndex('imageId', 'imageId', { unique: true });
            resultStore.createIndex('folderId', 'folderId', { unique: false });
        }
    }

    // Folder operations
    async createFolder(name, description = '') {
        const folder = {
            name,
            description,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            imageCount: 0,
            color: this.generateFolderColor()
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['folders'], 'readwrite');
            const store = transaction.objectStore('folders');
            const request = store.add(folder);

            request.onsuccess = () => {
                folder.id = request.result;
                resolve(folder);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getFolders() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['folders'], 'readonly');
            const store = transaction.objectStore('folders');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateFolder(id, updates) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['folders'], 'readwrite');
            const store = transaction.objectStore('folders');
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const folder = getRequest.result;
                if (!folder) {
                    reject(new Error('Folder not found'));
                    return;
                }

                Object.assign(folder, updates, { updatedAt: new Date().toISOString() });
                const updateRequest = store.put(folder);
                
                updateRequest.onsuccess = () => resolve(folder);
                updateRequest.onerror = () => reject(updateRequest.error);
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async deleteFolder(id) {
        // Also delete all images and results in this folder
        const images = await this.getImagesByFolder(id);
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['folders', 'images', 'results'], 'readwrite');
            
            // Delete folder
            const folderStore = transaction.objectStore('folders');
            folderStore.delete(id);
            
            // Delete associated images and results
            const imageStore = transaction.objectStore('images');
            const resultStore = transaction.objectStore('results');
            
            images.forEach(image => {
                imageStore.delete(image.id);
                const resultIndex = resultStore.index('imageId');
                const resultRequest = resultIndex.get(image.id);
                resultRequest.onsuccess = () => {
                    if (resultRequest.result) {
                        resultStore.delete(resultRequest.result.id);
                    }
                };
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    // Image operations
    async addImage(folderId, name, file, thumbnail) {
        const image = {
            folderId,
            name,
            originalName: file.name,
            size: file.size,
            type: file.type,
            file: file, // Store the actual file
            thumbnail, // Base64 thumbnail
            createdAt: new Date().toISOString(),
            processed: false
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images', 'folders'], 'readwrite');
            const imageStore = transaction.objectStore('images');
            const folderStore = transaction.objectStore('folders');
            
            const imageRequest = imageStore.add(image);
            
            imageRequest.onsuccess = () => {
                image.id = imageRequest.result;
                
                // Update folder image count
                const folderRequest = folderStore.get(folderId);
                folderRequest.onsuccess = () => {
                    const folder = folderRequest.result;
                    if (folder) {
                        folder.imageCount = (folder.imageCount || 0) + 1;
                        folder.updatedAt = new Date().toISOString();
                        folderStore.put(folder);
                    }
                };
                
                resolve(image);
            };
            imageRequest.onerror = () => reject(imageRequest.error);
        });
    }

    async getImagesByFolder(folderId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readonly');
            const store = transaction.objectStore('images');
            const index = store.index('folderId');
            const request = index.getAll(folderId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateImage(id, updates) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const image = getRequest.result;
                if (!image) {
                    reject(new Error('Image not found'));
                    return;
                }

                Object.assign(image, updates);
                const updateRequest = store.put(image);
                
                updateRequest.onsuccess = () => resolve(image);
                updateRequest.onerror = () => reject(updateRequest.error);
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    // Result operations
    async saveResult(imageId, folderId, result) {
        const resultData = {
            imageId,
            folderId,
            result,
            createdAt: new Date().toISOString()
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['results', 'images'], 'readwrite');
            const resultStore = transaction.objectStore('results');
            const imageStore = transaction.objectStore('images');
            
            // Save result
            const resultRequest = resultStore.add(resultData);
            
            resultRequest.onsuccess = () => {
                resultData.id = resultRequest.result;
                
                // Mark image as processed
                const imageRequest = imageStore.get(imageId);
                imageRequest.onsuccess = () => {
                    const image = imageRequest.result;
                    if (image) {
                        image.processed = true;
                        image.processedAt = new Date().toISOString();
                        imageStore.put(image);
                    }
                };
                
                resolve(resultData);
            };
            resultRequest.onerror = () => reject(resultRequest.error);
        });
    }

    async getResultByImage(imageId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['results'], 'readonly');
            const store = transaction.objectStore('results');
            const index = store.index('imageId');
            const request = index.get(imageId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getResultsByFolder(folderId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['results'], 'readonly');
            const store = transaction.objectStore('results');
            const index = store.index('folderId');
            const request = index.getAll(folderId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Utility functions
    generateFolderColor() {
        const colors = [
            '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336',
            '#00BCD4', '#8BC34A', '#FFC107', '#673AB7', '#E91E63',
            '#009688', '#CDDC39', '#FF5722', '#3F51B5', '#795548'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    async getStats() {
        const folders = await this.getFolders();
        let totalImages = 0;
        let processedImages = 0;

        for (const folder of folders) {
            const images = await this.getImagesByFolder(folder.id);
            totalImages += images.length;
            processedImages += images.filter(img => img.processed).length;
        }

        return {
            totalFolders: folders.length,
            totalImages,
            processedImages,
            unprocessedImages: totalImages - processedImages
        };
    }

    // Search functionality
    async searchImages(query) {
        const allFolders = await this.getFolders();
        const results = [];

        for (const folder of allFolders) {
            const images = await this.getImagesByFolder(folder.id);
            const matchedImages = images.filter(image => 
                image.name.toLowerCase().includes(query.toLowerCase()) ||
                image.originalName.toLowerCase().includes(query.toLowerCase())
            );
            
            if (matchedImages.length > 0) {
                results.push({
                    folder,
                    images: matchedImages
                });
            }
        }

        return results;
    }

    // Export/Import functionality
    async exportData() {
        const folders = await this.getFolders();
        const data = { folders: [], version: this.version };

        for (const folder of folders) {
            const images = await this.getImagesByFolder(folder.id);
            const results = await this.getResultsByFolder(folder.id);
            
            data.folders.push({
                folder,
                images,
                results
            });
        }

        return data;
    }

    async importData(data) {
        // Clear existing data first
        await this.clearAll();

        for (const folderData of data.folders) {
            // Create folder
            const newFolder = await this.createFolder(
                folderData.folder.name, 
                folderData.folder.description
            );

            // Add images
            for (const image of folderData.images) {
                const newImage = await this.addImage(
                    newFolder.id,
                    image.name,
                    image.file,
                    image.thumbnail
                );

                // Add results
                const result = folderData.results.find(r => r.imageId === image.id);
                if (result) {
                    await this.saveResult(newImage.id, newFolder.id, result.result);
                }
            }
        }
    }

    async clearAll() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['folders', 'images', 'results'], 'readwrite');
            
            transaction.objectStore('folders').clear();
            transaction.objectStore('images').clear();
            transaction.objectStore('results').clear();

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }
}

// Global instance
window.imageDB = new ImageDatabase();
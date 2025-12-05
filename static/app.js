// Constants
const DEFAULT_API_URL = window.location.origin+'/upload';
const DEFAULT_TIMEOUT = 30; // seconds

// DOM Elements
const elements = {
    // Theme
    themeToggle: document.getElementById('theme-toggle'),
    themeIcon: document.querySelector('#theme-toggle .material-icons'),
    
    // Upload
    dropArea: document.getElementById('drop-area'),
    fileInput: document.getElementById('file-input'),
    previewContainer: document.getElementById('preview-container'),
    imagePreview: document.getElementById('image-preview'),
    changeImageBtn: document.getElementById('change-image-btn'),
    uploadBtn: document.getElementById('upload-btn'),
    
    // Results
    resultsSection: document.getElementById('results-section'),
    tableViewBtn: document.getElementById('table-view-btn'),
    slideViewBtn: document.getElementById('slide-view-btn'),
    tableView: document.getElementById('table-view'),
    slideView: document.getElementById('slide-view'),
    prevSlide: document.getElementById('prev-slide'),
    nextSlide: document.getElementById('next-slide'),
    currentSlide: document.getElementById('current-slide'),
    totalSlides: document.getElementById('total-slides'),
    slideNumber: document.getElementById('slide-number'),
    currentQuestion: document.getElementById('current-question'),
    currentAnswer: document.getElementById('current-answer'),
    slideTitle: document.getElementById('slide-title'),
    slideGoInput: document.getElementById('slide-go-input'),
    slideGoBtn: document.getElementById('slide-go-btn'),
    saveResultsBtn: document.getElementById('save-results-btn'),
    newUploadBtn: document.getElementById('new-upload-btn'),
    
    // Loading
    loadingContainer: document.getElementById('loading-container'),
    
    // Error
    errorContainer: document.getElementById('error-container'),
    errorMessage: document.getElementById('error-message'),
    dismissError: document.getElementById('dismiss-error'),
    
    // Settings
    settingsBtn: document.getElementById('settings-btn'),
    settingsModal: document.getElementById('settings-modal'),
    closeSettings: document.getElementById('close-settings'),
    saveSettings: document.getElementById('save-settings'),
    apiUrl: document.getElementById('api-url'),
    timeout: document.getElementById('timeout'),
    previewEnabled: document.getElementById('preview-enabled'),
    saveResults: document.getElementById('save-results'),

    // History
    historyBtn: document.getElementById('history-btn'),
    historyModal: document.getElementById('history-modal'),
    closeHistory: document.getElementById('close-history'),
    historyList: document.getElementById('history-list'),
    clearHistoryBtn: document.getElementById('clear-history-btn')
};

// State
const state = {
    theme: 'light',
    selectedFile: null,
    results: null,
    currentSlideIndex: 0,
    slides: [],
    currentSection: 'folders',
    settings: {
        apiUrl: DEFAULT_API_URL,
        timeout: DEFAULT_TIMEOUT,
        previewEnabled: true,
        saveResults: true
    }
};

// Initialize
function init() {
    loadSettings();
    setupEventListeners();
    applyTheme();
    
    // Initialize with folders section
    switchToSection('folders');
    
    // Wait for folder manager to load
    setTimeout(() => {
        if (window.folderManager) {
            console.log('Folder manager loaded');
        }
    }, 500);
}

// Settings
function loadSettings() {
    const savedSettings = localStorage.getItem('imageProcessorSettings');
    if (savedSettings) {
        try {
            const parsedSettings = JSON.parse(savedSettings);
            state.settings = { ...state.settings, ...parsedSettings };
            
            // Apply settings to form elements
            elements.apiUrl.value = state.settings.apiUrl;
            elements.timeout.value = state.settings.timeout;
            elements.previewEnabled.checked = state.settings.previewEnabled;
            elements.saveResults.checked = state.settings.saveResults;
            
            // Apply theme if saved
            if (parsedSettings.theme) {
                state.theme = parsedSettings.theme;
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
}

function saveSettings() {
    state.settings.apiUrl = elements.apiUrl.value;
    state.settings.timeout = parseInt(elements.timeout.value);
    state.settings.previewEnabled = elements.previewEnabled.checked;
    state.settings.saveResults = elements.saveResults.checked;
    state.settings.theme = state.theme;
    
    localStorage.setItem('imageProcessorSettings', JSON.stringify(state.settings));
    showNotification('Settings saved successfully');
}

// Theme
function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme();
    
    // Save theme preference
    const savedSettings = { ...state.settings, theme: state.theme };
    localStorage.setItem('imageProcessorSettings', JSON.stringify(savedSettings));
}

function applyTheme() {
    document.body.className = state.theme === 'dark' ? 'dark-theme' : 'light-theme';
    elements.themeIcon.textContent = state.theme === 'dark' ? 'light_mode' : 'dark_mode';
}

// File Upload
function handleFileSelect(file) {
    if (!file) return;
    
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        showError('Please select a valid image file (JPEG, PNG, GIF, BMP, or WEBP).');
        return;
    }
    
    state.selectedFile = file;
    elements.uploadBtn.disabled = false;
    
    if (state.settings.previewEnabled) {
        const reader = new FileReader();
        reader.onload = (e) => {
            elements.imagePreview.src = e.target.result;
            elements.previewContainer.classList.remove('hidden');
            elements.dropArea.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    } else {
        elements.dropArea.textContent = `Selected: ${file.name}`;
    }
}

function changeImage() {
    elements.previewContainer.classList.add('hidden');
    elements.dropArea.classList.remove('hidden');
    elements.fileInput.value = '';
    state.selectedFile = null;
    elements.uploadBtn.disabled = true;
}

async function uploadImage() {
    if (!state.selectedFile) return;
    
    // Check if folder is selected
    const selectedFolderId = document.getElementById('upload-folder-select')?.value;
    if (!selectedFolderId) {
        showError('Please select a folder first');
        return;
    }
    
    elements.uploadBtn.disabled = true;
    showLoading();
    
    try {
        // First, save image to IndexedDB with thumbnail
        const thumbnail = await createThumbnail(state.selectedFile);
        const imageName = state.selectedFile.name.replace(/\.[^/.]+$/, ""); // Remove extension
        
        const savedImage = await window.imageDB.addImage(
            parseInt(selectedFolderId),
            imageName,
            state.selectedFile,
            thumbnail
        );
        
        // Then upload to server for processing
        const formData = new FormData();
        formData.append('image', state.selectedFile);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), state.settings.timeout * 1000);
        
        const response = await fetch(state.settings.apiUrl, {
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
        await window.imageDB.saveResult(savedImage.id, parseInt(selectedFolderId), data);
        
        // Process successful response
        state.results = data;
        state.currentImageId = savedImage.id;
        processResults();
        hideLoading();
        showResultsSection();
        
        // Update folder manager stats
        if (window.folderManager) {
            await window.folderManager.updateStats();
        }
        
        showNotification('Image processed and saved successfully');
        
        // Save results to localStorage if enabled (for backward compatibility)
        if (state.settings.saveResults) {
            await saveResultsToLocalStorage();
        }
        
    } catch (error) {
        hideLoading();
        elements.uploadBtn.disabled = false;
        
        if (error.name === 'AbortError') {
            showError(`Request timed out after ${state.settings.timeout} seconds. Please try again or adjust timeout in settings.`);
        } else {
            showError(`Error processing image: ${error.message}`);
        }
    }
}

// Results Processing
function processResults() {
    const { data } = state.results;
    
    // Clear previous results
    elements.tableView.innerHTML = '';
    state.slides = [];
    state.currentSlideIndex = 0;
    
    if (Array.isArray(data)) {
        // No sections
        createTable('Results', data);
        createSlides('Results', data);
    } else {
        // With sections
        for (const section in data) {
            createTable(section, data[section]);
            createSlides(section, data[section]);
        }
    }
    
    updateSlideView();
}

function createTable(sectionName, items) {
    const table = document.createElement('table');
    table.className = 'results-table';
    
    const caption = document.createElement('caption');
    caption.textContent = sectionName;
    table.appendChild(caption);
    
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Question Number', 'Answer'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    items.forEach(item => {
        const row = document.createElement('tr');
        
        const questionCell = document.createElement('td');
        questionCell.textContent = item.question_number;
        row.appendChild(questionCell);
        
        const answerCell = document.createElement('td');
        answerCell.textContent = item.answer;
        row.appendChild(answerCell);
        
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    
    elements.tableView.appendChild(table);
}

function createSlides(sectionName, items) {
    items.forEach(item => {
        state.slides.push({
            section: sectionName,
            questionNumber: item.question_number,
            answer: item.answer
        });
    });
    
    elements.totalSlides.textContent = state.slides.length;
}

function updateSlideView() {
    if (state.slides.length === 0) return;
    
    const slide = state.slides[state.currentSlideIndex];
    elements.currentSlide.textContent = state.currentSlideIndex + 1;
    elements.slideNumber.textContent = state.currentSlideIndex + 1;
    elements.slideTitle.textContent = `${slide.section} - Question ${slide.questionNumber}`;
    elements.currentQuestion.textContent = slide.questionNumber;
    elements.currentAnswer.textContent = slide.answer;
    
    // Enable/disable navigation buttons
    elements.prevSlide.disabled = state.currentSlideIndex === 0;
    elements.nextSlide.disabled = state.currentSlideIndex === state.slides.length - 1;
}

function nextSlide() {
    if (state.currentSlideIndex < state.slides.length - 1) {
        state.currentSlideIndex++;
        updateSlideView();
    }
}

function prevSlide() {
    if (state.currentSlideIndex > 0) {
        state.currentSlideIndex--;
        updateSlideView();
    }
}

function goToSlide() {
    const slideNumber = parseInt(elements.slideGoInput.value);
    if (slideNumber && slideNumber > 0 && slideNumber <= state.slides.length) {
        state.currentSlideIndex = slideNumber - 1;
        updateSlideView();
        elements.slideGoInput.value = '';
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Create thumbnail for image
async function createThumbnail(file, maxWidth = 200, maxHeight = 150) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            // Calculate thumbnail dimensions
            let { width, height } = img;
            const aspectRatio = width / height;
            
            if (width > maxWidth) {
                width = maxWidth;
                height = width / aspectRatio;
            }
            
            if (height > maxHeight) {
                height = maxHeight;
                width = height * aspectRatio;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);
            const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
            resolve(thumbnail);
        };
        
        img.onerror = () => {
            // Fallback to original file as base64 if thumbnail creation fails
            fileToBase64(file).then(resolve);
        };
        
        // Create object URL for the image
        img.src = URL.createObjectURL(file);
    });
}

async function saveResultsToLocalStorage() {
    const imageBase64 = await fileToBase64(state.selectedFile);

    const savedResults = JSON.stringify({
        timestamp: new Date().toISOString(),
        results: state.results,
        image: imageBase64
    });
    
    try {
        const existingResults = localStorage.getItem('imageProcessorResults') || '[]';
        const resultsArray = JSON.parse(existingResults);
        
        // Limit to last 10 results to prevent localStorage overflow
        if (resultsArray.length >= 10) {
            resultsArray.shift();
        }
        
        resultsArray.push(JSON.parse(savedResults));
        localStorage.setItem('imageProcessorResults', JSON.stringify(resultsArray));
    } catch (error) {
        console.error('Error saving results:', error);
    }
}

function downloadResults() {
    if (!state.results) return;
    
    const resultsJSON = JSON.stringify(state.results, null, 2);
    const blob = new Blob([resultsJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `image-results-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Results downloaded successfully');
}

// History
function openHistoryModal() {
    const history = JSON.parse(localStorage.getItem('imageProcessorResults') || '[]');
    elements.historyList.innerHTML = ''; // Clear previous list

    if (history.length === 0) {
        elements.historyList.innerHTML = '<p>No history found.</p>';
    } else {
        history.forEach(item => {
            const listItem = document.createElement('div');
            listItem.className = 'history-item';
            listItem.innerHTML = `
                <p class="history-timestamp">${new Date(item.timestamp).toLocaleString()}</p>
                <button class="button secondary load-history-btn" data-timestamp="${item.timestamp}">Load</button>
            `;
            elements.historyList.appendChild(listItem);
        });
    }

    elements.historyModal.classList.remove('hidden');
}

function closeHistoryModal() {
    elements.historyModal.classList.add('hidden');
}

function clearHistory() {
    if (confirm('Are you sure you want to clear all history? This cannot be undone.')) {
        localStorage.removeItem('imageProcessorResults');
        openHistoryModal(); // Refresh the modal view
        showNotification('History cleared');
    }
}

function handleHistoryClick(e) {
    if (e.target.classList.contains('load-history-btn')) {
        const timestamp = e.target.dataset.timestamp;
        loadResultFromHistory(timestamp);
    }
}

function loadResultFromHistory(timestamp) {
    const history = JSON.parse(localStorage.getItem('imageProcessorResults') || '[]');
    const historyItem = history.find(item => item.timestamp === timestamp);

    if (historyItem) {
        state.results = historyItem.results;
        
        // Load image
        if (historyItem.image) {
            elements.imagePreview.src = historyItem.image;
            elements.previewContainer.classList.remove('hidden');
            elements.dropArea.classList.add('hidden');
        }
        
        processResults();
        closeHistoryModal();
        showResultsSection();
        showNotification('Loaded results from history');
    } else {
        showError('Could not find the selected history item.');
    }
}

// UI Helpers
function showResultsSection() {
    elements.resultsSection.classList.remove('hidden');
    
    // Apply staggered animations to results elements
    const animationElements = elements.resultsSection.querySelectorAll('.results-table, .slide-container, .results-actions');
    animationElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        setTimeout(() => {
            el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, index * 150);
    });
    
    // Scroll to results
    setTimeout(() => {
        elements.resultsSection.scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

function showLoading() {
    elements.loadingContainer.classList.remove('hidden');
}

function hideLoading() {
    elements.loadingContainer.classList.add('hidden');
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorContainer.classList.remove('hidden');
}

function hideError() {
    elements.errorContainer.classList.add('hidden');
}

function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    // Style the notification
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.backgroundColor = 'var(--primary)';
    notification.style.color = 'var(--on-primary)';
    notification.style.padding = '12px 24px';
    notification.style.borderRadius = '8px';
    notification.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
    notification.style.zIndex = '1000';
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s ease';
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.opacity = '1';
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function resetApp() {
    // Reset file selection
    elements.fileInput.value = '';
    state.selectedFile = null;
    elements.uploadBtn.disabled = true;
    
    // Reset preview
    if (state.settings.previewEnabled) {
        elements.previewContainer.classList.add('hidden');
        elements.dropArea.classList.remove('hidden');
    } else {
        elements.dropArea.textContent = 'Drag & drop image or click to browse';
    }
    
    // Hide results section
    elements.resultsSection.classList.add('hidden');
    
    // Reset results data
    state.results = null;
    state.slides = [];
    state.currentSlideIndex = 0;
    
    // Scroll back to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Event Listeners Setup
function setupEventListeners() {
    // Theme Toggle
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // File Upload
    elements.dropArea.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));
    elements.changeImageBtn.addEventListener('click', changeImage);
    elements.uploadBtn.addEventListener('click', uploadImage);
    
    // Drag and Drop
    elements.dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.dropArea.classList.add('dragover');
    });
    
    elements.dropArea.addEventListener('dragleave', () => {
        elements.dropArea.classList.remove('dragover');
    });
    
    elements.dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.dropArea.classList.remove('dragover');
        handleFileSelect(e.dataTransfer.files[0]);
    });
    
    // Results View Toggle
    elements.tableViewBtn.addEventListener('click', () => {
        elements.tableViewBtn.classList.add('active');
        elements.slideViewBtn.classList.remove('active');
        elements.tableView.classList.remove('hidden');
        elements.slideView.classList.add('hidden');
    });
    
    elements.slideViewBtn.addEventListener('click', () => {
        elements.slideViewBtn.classList.add('active');
        elements.tableViewBtn.classList.remove('active');
        elements.slideView.classList.remove('hidden');
        elements.tableView.classList.add('hidden');
    });
    
    // Slide Navigation
    elements.nextSlide.addEventListener('click', nextSlide);
    elements.prevSlide.addEventListener('click', prevSlide);
    elements.slideGoBtn.addEventListener('click', goToSlide);
    elements.slideGoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            goToSlide();
        }
    });
    
    // Keyboard navigation for slides
    document.addEventListener('keydown', (e) => {
        if (elements.slideView.classList.contains('hidden')) return;
        
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            nextSlide();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            prevSlide();
        }
    });
    
    // Results Actions
    elements.saveResultsBtn.addEventListener('click', downloadResults);
    elements.newUploadBtn.addEventListener('click', resetApp);
    
    // Error
    elements.dismissError.addEventListener('click', hideError);
    
    // Navigation tabs
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const section = tab.dataset.section;
            switchToSection(section);
            
            // Update active tab
            navTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });

    // Settings
    elements.settingsBtn.addEventListener('click', () => {
        elements.settingsModal.classList.remove('hidden');
    });
    
    const closeSettingsBtn = document.getElementById('close-settings');
    const cancelSettingsBtn = document.getElementById('cancel-settings');
    const resetSettingsBtn = document.getElementById('reset-settings');
    
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => {
        elements.settingsModal.classList.add('hidden');
    });
    
    if (cancelSettingsBtn) cancelSettingsBtn.addEventListener('click', () => {
        elements.settingsModal.classList.add('hidden');
    });
    
    if (resetSettingsBtn) resetSettingsBtn.addEventListener('click', () => {
        resetToDefaults();
    });
    
    elements.saveSettings.addEventListener('click', () => {
        saveSettings();
        elements.settingsModal.classList.add('hidden');
    });
    
    // Close modal on outside click
    elements.settingsModal.addEventListener('click', (e) => {
        if (e.target === elements.settingsModal) {
            elements.settingsModal.classList.add('hidden');
        }
    });

    // Enhanced data management buttons
    const exportDataBtn = document.getElementById('export-data-btn');
    const importDataBtn = document.getElementById('import-data-btn');
    const clearDataBtn = document.getElementById('clear-data-btn');
    
    if (exportDataBtn) exportDataBtn.addEventListener('click', exportAllData);
    if (importDataBtn) importDataBtn.addEventListener('click', importAllData);
    if (clearDataBtn) clearDataBtn.addEventListener('click', clearAllData);

    // History
    elements.historyBtn.addEventListener('click', openHistoryModal);
    elements.closeHistory.addEventListener('click', closeHistoryModal);
    elements.clearHistoryBtn.addEventListener('click', clearHistory);
    elements.historyList.addEventListener('click', handleHistoryClick);
    elements.historyModal.addEventListener('click', (e) => {
        if (e.target === elements.historyModal) {
            closeHistoryModal();
        }
    });
}

// Make functions globally accessible for folder manager
window.state = state;
window.processResults = processResults;
window.updateSlideView = updateSlideView;
window.showResultsSection = showResultsSection;

// Navigation function
function switchToSection(section) {
    const folderSection = document.getElementById('folder-section');
    const uploadSection = document.getElementById('upload-section');
    const resultsSection = document.getElementById('results-section');
    
    // Hide all sections first
    const sections = [folderSection, uploadSection, resultsSection];
    sections.forEach(sec => {
        if (sec) {
            sec.classList.add('hidden');
            sec.style.display = 'none';
        }
    });
    
    // Show selected section
    let targetSection = null;
    switch (section) {
        case 'folders':
            targetSection = folderSection;
            break;
        case 'upload':
            targetSection = uploadSection;
            break;
        case 'results':
            targetSection = resultsSection;
            break;
    }
    
    if (targetSection) {
        targetSection.classList.remove('hidden');
        targetSection.style.display = 'block';
    }
    
    // Update the current section state
    state.currentSection = section;
}

// Enhanced settings functions
function resetToDefaults() {
    if (confirm('Reset all settings to defaults? This cannot be undone.')) {
        state.settings = {
            apiUrl: DEFAULT_API_URL,
            timeout: DEFAULT_TIMEOUT,
            previewEnabled: true,
            saveResults: true
        };
        
        // Update form elements
        elements.apiUrl.value = state.settings.apiUrl;
        elements.timeout.value = state.settings.timeout;
        elements.previewEnabled.checked = state.settings.previewEnabled;
        elements.saveResults.checked = state.settings.saveResults;
        
        showNotification('Settings reset to defaults');
    }
}

// Data management functions
async function exportAllData() {
    try {
        const data = {
            timestamp: new Date().toISOString(),
            version: '1.0',
            settings: state.settings,
            localStorage: {
                imageProcessorSettings: localStorage.getItem('imageProcessorSettings'),
                imageProcessorResults: localStorage.getItem('imageProcessorResults')
            }
        };
        
        // Add IndexedDB data if available
        if (window.imageDB && window.imageDB.db) {
            const folderData = await window.imageDB.exportData();
            data.indexedDB = folderData;
        }
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `image-analyzer-backup-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('Data exported successfully');
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Failed to export data');
    }
}

async function importAllData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (confirm('Import data? This will replace all current data and cannot be undone.')) {
                // Import settings
                if (data.settings) {
                    state.settings = { ...state.settings, ...data.settings };
                    loadSettings();
                }
                
                // Import localStorage data
                if (data.localStorage) {
                    Object.entries(data.localStorage).forEach(([key, value]) => {
                        if (value) localStorage.setItem(key, value);
                    });
                }
                
                // Import IndexedDB data
                if (data.indexedDB && window.imageDB) {
                    await window.imageDB.importData(data.indexedDB);
                    if (window.folderManager) {
                        await window.folderManager.loadFolders();
                        await window.folderManager.updateStats();
                    }
                }
                
                showNotification('Data imported successfully');
                setTimeout(() => location.reload(), 1000);
            }
        } catch (error) {
            console.error('Import error:', error);
            showNotification('Failed to import data - invalid file format');
        }
    };
    
    input.click();
}

async function clearAllData() {
    const confirmText = prompt('Type "DELETE" to confirm clearing all data:');
    
    if (confirmText === 'DELETE') {
        try {
            // Clear localStorage
            localStorage.removeItem('imageProcessorSettings');
            localStorage.removeItem('imageProcessorResults');
            
            // Clear IndexedDB
            if (window.imageDB) {
                await window.imageDB.clearAll();
            }
            
            showNotification('All data cleared successfully');
            setTimeout(() => location.reload(), 1000);
        } catch (error) {
            console.error('Clear data error:', error);
            showNotification('Failed to clear some data');
        }
    } else if (confirmText !== null) {
        showNotification('Data not cleared - incorrect confirmation');
    }
}

// Enhanced theme toggle
function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme();
    
    // Update theme button
    const themeBtn = document.getElementById('theme-toggle');
    const themeBtnLabel = themeBtn.querySelector('.btn-label');
    if (themeBtnLabel) {
        themeBtnLabel.textContent = state.theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    }
    
    // Save theme preference
    const savedSettings = { ...state.settings, theme: state.theme };
    localStorage.setItem('imageProcessorSettings', JSON.stringify(savedSettings));
}

// Initialize app
document.addEventListener('DOMContentLoaded', init);
const DEFAULT_API_URL = window.location.origin+'/upload';
const DEFAULT_TIMEOUT = 30; // seconds

const elements = {
    themeToggle: document.getElementById('theme-toggle'),
    themeIcon: document.querySelector('#theme-toggle .material-icons'),
    dropArea: document.getElementById('drop-area'),
    fileInput: document.getElementById('file-input'),
    previewContainer: document.getElementById('preview-container'),
    imagePreview: document.getElementById('image-preview'),
    changeImageBtn: document.getElementById('change-image-btn'),
    uploadBtn: document.getElementById('upload-btn'),
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
    saveResultsBtn: document.getElementById('save-results-btn'),
    newUploadBtn: document.getElementById('new-upload-btn'),
    loadingContainer: document.getElementById('loading-container'),
    errorContainer: document.getElementById('error-container'),
    errorMessage: document.getElementById('error-message'),
    dismissError: document.getElementById('dismiss-error'),
    settingsBtn: document.getElementById('settings-btn'),
    settingsModal: document.getElementById('settings-modal'),
    closeSettings: document.getElementById('close-settings'),
    saveSettings: document.getElementById('save-settings'),
    apiUrl: document.getElementById('api-url'),
    timeout: document.getElementById('timeout'),
    previewEnabled: document.getElementById('preview-enabled'),
    saveResults: document.getElementById('save-results'),
    modalBtn: document.getElementById('modal-btn') // P541c
};

const state = {
    theme: 'light',
    selectedFile: null,
    results: null,
    currentSlideIndex: 0,
    slides: [],
    settings: {
        apiUrl: DEFAULT_API_URL,
        timeout: DEFAULT_TIMEOUT,
        previewEnabled: true,
        saveResults: true
    }
};

function init() {
    loadSettings();
    setupEventListeners();
    applyTheme();
}

function loadSettings() {
    const savedSettings = localStorage.getItem('imageProcessorSettings');
    if (savedSettings) {
        try {
            const parsedSettings = JSON.parse(savedSettings);
            state.settings = { ...state.settings, ...parsedSettings };
            elements.apiUrl.value = state.settings.apiUrl;
            elements.timeout.value = state.settings.timeout;
            elements.previewEnabled.checked = state.settings.previewEnabled;
            elements.saveResults.checked = state.settings.saveResults;
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

function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme();
    const savedSettings = { ...state.settings, theme: state.theme };
    localStorage.setItem('imageProcessorSettings', JSON.stringify(savedSettings));
}

function applyTheme() {
    document.body.className = state.theme === 'dark' ? 'dark-theme' : 'light-theme';
    elements.themeIcon.textContent = state.theme === 'dark' ? 'light_mode' : 'dark_mode';
}

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
    elements.uploadBtn.disabled = true;
    showLoading();
    const formData = new FormData();
    formData.append('image', state.selectedFile);
    try {
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
        state.results = data;
        processResults();
        hideLoading();
        showResultsSection();
        if (state.settings.saveResults) {
            saveResultsToLocalStorage();
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

function processResults() {
    const { data } = state.results;
    elements.tableView.innerHTML = '';
    state.slides = [];
    state.currentSlideIndex = 0;
    if (Array.isArray(data)) {
        createTable('Results', data);
        createSlides('Results', data);
    } else {
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

function saveResultsToLocalStorage() {
    const savedResults = JSON.stringify({
        timestamp: new Date().toISOString(),
        results: state.results
    });
    try {
        const existingResults = localStorage.getItem('imageProcessorResults') || '[]';
        const resultsArray = JSON.parse(existingResults);
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

function showResultsSection() {
    elements.resultsSection.classList.remove('hidden');
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
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
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
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = '1';
    }, 10);
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function resetApp() {
    elements.fileInput.value = '';
    state.selectedFile = null;
    elements.uploadBtn.disabled = true;
    if (state.settings.previewEnabled) {
        elements.previewContainer.classList.add('hidden');
        elements.dropArea.classList.remove('hidden');
    } else {
        elements.dropArea.textContent = 'Drag & drop image or click to browse';
    }
    elements.resultsSection.classList.add('hidden');
    state.results = null;
    state.slides = [];
    state.currentSlideIndex = 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-btn">&times;</span>
            <div class="modal-body">
                <h3 id="modal-slide-title">Question <span id="modal-slide-number">1</span></h3>
                <div id="modal-slide-data">
                    <p class="question-number">Question: <span id="modal-current-question"></span></p>
                    <p class="answer">Answer: <span id="modal-current-answer"></span></p>
                </div>
            </div>
            <div class="modal-navigation">
                <button id="modal-prev-slide" class="nav-btn" disabled>
                    <span class="material-icons">arrow_back</span>
                </button>
                <p><span id="modal-current-slide">1</span> / <span id="modal-total-slides">0</span></p>
                <button id="modal-next-slide" class="nav-btn" disabled>
                    <span class="material-icons">arrow_forward</span>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    const closeModalBtn = modal.querySelector('.close-btn');
    closeModalBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    updateModalSlideView(modal);
}

function updateModalSlideView(modal) {
    if (state.slides.length === 0) return;
    const slide = state.slides[state.currentSlideIndex];
    modal.querySelector('#modal-current-slide').textContent = state.currentSlideIndex + 1;
    modal.querySelector('#modal-slide-number').textContent = state.currentSlideIndex + 1;
    modal.querySelector('#modal-slide-title').textContent = `${slide.section} - Question ${slide.questionNumber}`;
    modal.querySelector('#modal-current-question').textContent = slide.questionNumber;
    modal.querySelector('#modal-current-answer').textContent = slide.answer;
    modal.querySelector('#modal-prev-slide').disabled = state.currentSlideIndex === 0;
    modal.querySelector('#modal-next-slide').disabled = state.currentSlideIndex === state.slides.length - 1;
}

function nextModalSlide(modal) {
    if (state.currentSlideIndex < state.slides.length - 1) {
        state.currentSlideIndex++;
        updateModalSlideView(modal);
    }
}

function prevModalSlide(modal) {
    if (state.currentSlideIndex > 0) {
        state.currentSlideIndex--;
        updateModalSlideView(modal);
    }
}

function setupEventListeners() {
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.dropArea.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));
    elements.changeImageBtn.addEventListener('click', changeImage);
    elements.uploadBtn.addEventListener('click', uploadImage);
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
    elements.nextSlide.addEventListener('click', nextSlide);
    elements.prevSlide.addEventListener('click', prevSlide);
    document.addEventListener('keydown', (e) => {
        if (elements.slideView.classList.contains('hidden')) return;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            nextSlide();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            prevSlide();
        }
    });
    elements.saveResultsBtn.addEventListener('click', downloadResults);
    elements.newUploadBtn.addEventListener('click', resetApp);
    elements.dismissError.addEventListener('click', hideError);
    elements.settingsBtn.addEventListener('click', () => {
        elements.settingsModal.classList.remove('hidden');
    });
    elements.closeSettings.addEventListener('click', () => {
        elements.settingsModal.classList.add('hidden');
    });
    elements.saveSettings.addEventListener('click', () => {
        saveSettings();
        elements.settingsModal.classList.add('hidden');
    });
    elements.settingsModal.addEventListener('click', (e) => {
        if (e.target === elements.settingsModal) {
            elements.settingsModal.classList.add('hidden');
        }
    });
    elements.modalBtn.addEventListener('click', openModal); // P541c
}

document.addEventListener('DOMContentLoaded', init);

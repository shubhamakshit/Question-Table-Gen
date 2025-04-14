// Settings handling
window.appSettings = (function() {
    // Default settings
    const defaultSettings = {
        apiUrl: 'http://127.0.0.1:5000/upload',
        timeout: 30,
        showPreview: true,
        saveResultsLocally: false,
        theme: 'light'
    };
    
    // DOM Elements
    let settingsDialog, apiUrlInput, timeoutInput, showPreviewCheckbox, 
        saveResultsLocallyCheckbox, settingsButton, saveSettingsButton, 
        resetSettingsButton, closeSettingsButton;
    
    function init() {
        // Initialize DOM references
        settingsDialog = document.getElementById('settingsDialog');
        apiUrlInput = document.getElementById('apiUrl');
        timeoutInput = document.getElementById('timeout');
        showPreviewCheckbox = document.getElementById('showPreview');
        saveResultsLocallyCheckbox = document.getElementById('saveResultsLocally');
        settingsButton = document.getElementById('settingsButton');
        saveSettingsButton = document.getElementById('saveSettings');
        resetSettingsButton = document.getElementById('resetSettings');
        closeSettingsButton = document.getElementById('closeSettings');
        
        // Attach event listeners
        settingsButton.addEventListener('click', openSettingsDialog);
        closeSettingsButton.addEventListener('click', closeSettingsDialog);
        saveSettingsButton.addEventListener('click', saveSettings);
        resetSettingsButton.addEventListener('click', resetSettings);
        
        // Close dialog when clicking outside
        settingsDialog.addEventListener('click', function(event) {
            if (event.target === settingsDialog) {
                closeSettingsDialog();
            }
        });
        
        // Load settings to form
        loadSettingsToForm();
    }
    
    function getSettings() {
        const storedSettings = localStorage.getItem('appSettings');
        if (storedSettings) {
            try {
                return {...defaultSettings, ...JSON.parse(storedSettings)};
            } catch (e) {
                console.error('Error parsing stored settings:', e);
                return {...defaultSettings};
            }
        }
        return {...defaultSettings};
    }
    
    function updateSetting(key, value) {
        const settings = getSettings();
        settings[key] = value;
        localStorage.setItem('appSettings', JSON.stringify(settings));
        return settings;
    }
    
    function openSettingsDialog() {
        loadSettingsToForm();
        settingsDialog.classList.add('visible');
        
        // Add animation class
        settingsDialog.querySelector('.dialog-content').classList.add('animate-in');
        setTimeout(() => {
            settingsDialog.querySelector('.dialog-content').classList.remove('animate-in');
        }, 500);
    }
    
    function closeSettingsDialog() {
        settingsDialog.classList.remove('visible');
    }
    
    function loadSettingsToForm() {
        const settings = getSettings();
        apiUrlInput.value = settings.apiUrl || defaultSettings.apiUrl;
        timeoutInput.value = settings.timeout || defaultSettings.timeout;
        showPreviewCheckbox.checked = settings.showPreview !== undefined ? settings.showPreview : defaultSettings.showPreview;
        saveResultsLocallyCheckbox.checked = settings.saveResultsLocally || defaultSettings.saveResultsLocally;
    }
    
    function saveSettings() {
        const settings = {
            apiUrl: apiUrlInput.value.trim(),
            timeout: parseInt(timeoutInput.value) || defaultSettings.timeout,
            showPreview: showPreviewCheckbox.checked,
            saveResultsLocally: saveResultsLocallyCheckbox.checked,
            theme: document.documentElement.getAttribute('data-theme') || 'light'
        };
        
        localStorage.setItem('appSettings', JSON.stringify(settings));
        
        // Show success animation
        const saveButton = saveSettingsButton;
        const originalText = saveButton.innerHTML;
        
        saveButton.innerHTML = `<span class="material-symbols-outlined">check</span> Saved`;
        saveButton.classList.add('success');
        
        setTimeout(() => {
            saveButton.innerHTML = originalText;
            saveButton.classList.remove('success');
            closeSettingsDialog();
        }, 1000);
    }
    
    function resetSettings() {
        localStorage.removeItem('appSettings');
        loadSettingsToForm();
        
        // Show animation
        const resetButton = resetSettingsButton;
        const originalText = resetButton.innerHTML;
        
        resetButton.innerHTML = `<span class="material-symbols-outlined">refresh</span> Reset`;
        resetButton.classList.add('animate-spin');
        
        setTimeout(() => {
            resetButton.innerHTML = originalText;
            resetButton.classList.remove('animate-spin');
        }, 1000);
    }
    
    // Initialize on DOM content loaded
    document.addEventListener('DOMContentLoaded', init);
    
    // Public API
    return {
        getSettings,
        updateSetting,
        openDialog: openSettingsDialog,
        closeDialog: closeSettingsDialog
    };
})();

// Add additional styles for the settings module
(function() {
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        .success {
            background-color: #4CAF50 !important;
        }
        
        .animate-spin {
            animation: spin 1s linear;
        }
        
        .animate-out {
            opacity: 0;
            transform: translateY(20px);
            transition: opacity var(--anim-duration-short) var(--anim-standard),
                         transform var(--anim-duration-short) var(--anim-standard);
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
    `;
    document.head.appendChild(styleEl);
})();
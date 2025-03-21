/**
 * Package Tracking Code Manager
 * A web application to manage tracking codes by week with quantity support
 */
import firebaseManager from './firebase-config.js';

// DOM Elements
const inputCode = document.getElementById("inputCode");
const codeList = document.getElementById("codeList");
const deleteBtn = document.getElementById("submit");
const weekSelect = document.getElementById("weekSelect");
const fileInput = document.getElementById("fileInput");
const importButton = document.getElementById("importButton");
const resetBtn = document.getElementById("resetBtn");
const exportBtn = document.getElementById("exportBtn");

// Global variables
let selectedWeek;
let activeCodes = [];
let deletedCodes = [];
let currentUser = null;
let syncEnabled = false;

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", function() {
    // Initialize the app
    populateWeekSelect();
    
    // Set current week
    const currentWeek = new Date().getWeekNumber();
    weekSelect.value = currentWeek;
    
    // Initialize week data
    selectedWeek = currentWeek;
    loadWeekData();
    
    // Display initial data
    showResults(filterCodes(inputCode.value));
    
    // Set up event listeners
    setupEventListeners();
    
    // Set up mobile optimizations
    setupMobileBehavior();
    
    // Setup authentication
    setupAuth();
    
    // Add sync settings
    addSyncSettings();
    
    // Initial focus
    inputCode.focus();
});

// ===== HELPER FUNCTIONS =====

/**
 * Set up all event listeners for the application
 */
function setupEventListeners() {
    weekSelect.addEventListener("change", changeWeek);
    deleteBtn.addEventListener("click", handleDeletion);
    inputCode.addEventListener("input", handleInput);
    inputCode.addEventListener("keypress", function(e) {
        if (e.key === "Enter") {
            handleDeletion();
        }
    });
    importButton.addEventListener("click", handleImportClick);
    fileInput.addEventListener("change", importCSV);
    resetBtn.addEventListener("click", resetWeek);
    exportBtn.addEventListener("click", exportData);
    
    // Add keyboard shortcuts
    document.addEventListener("keydown", function(e) {
        // Ctrl+S to export data
        if (e.ctrlKey && e.key === "s") {
            e.preventDefault();
            exportData();
        }
    });
}

/**
 * Load data for the currently selected week
 */
function loadWeekData() {
    const weekData = getWeekData(selectedWeek);
    activeCodes = weekData.active;
    deletedCodes = weekData.deleted;
    
    // Convert legacy data (arrays of strings) to object format if needed
    if (activeCodes.length > 0 && typeof activeCodes[0] === 'string') {
        activeCodes = activeCodes.map(code => ({ code: code, quantity: 1 }));
    }
    if (deletedCodes.length > 0 && typeof deletedCodes[0] === 'string') {
        deletedCodes = deletedCodes.map(code => ({ code: code, quantity: 1 }));
    }
}

/**
 * Handle code deletion
 */
function handleDeletion() {
    const codeToDelete = inputCode.value.trim();
    if (!codeToDelete) {
        showMessage("Please enter a code to delete", "error");
        return;
    }
    
    // Always delete the entire item
    deleteCode(codeToDelete);
    inputCode.value = "";
    inputCode.focus();
}

/**
 * Handle input changes
 */
function handleInput() {
    showResults(filterCodes(inputCode.value));
}

/**
 * Handle import button click
 */
function handleImportClick() {
    fileInput.click();
}

/**
 * Reset current week data
 */
function resetWeek() {
    // Ask for confirmation
    if (!confirm(`Are you sure you want to reset all data for week ${selectedWeek}? This action cannot be undone.`)) {
        return;
    }
    if (!confirm(`WARNING! All active and deleted codes will be erased.\n\nOnly proceed if you have a backup copy.`)) {
        return;
    }
    
    // Reset data
    activeCodes = [];
    deletedCodes = [];
    
    // Save and update UI
    saveData();
    showResults([]);
    showMessage(`Week ${selectedWeek} data has been successfully reset`, "success");
    
    // Clear input
    inputCode.value = "";
    inputQuantity.value = "1";
    inputCode.focus();
}

/**
 * Export data to CSV
 */
function exportData() {
    // Check if there is data to export
    if (activeCodes.length === 0 && deletedCodes.length === 0) {
        showMessage("No data to export", "info");
        return;
    }
    
    try {
        // Prepare data for CSV
        let csvRows = [];
        
        // Add headers
        csvRows.push("Code,Quantity,Status");
        
        // Add active codes
        activeCodes.forEach(item => {
            csvRows.push(`${item.code},${item.quantity},Active`);
        });
        
        // Add deleted codes
        deletedCodes.forEach(item => {
            csvRows.push(`${item.code},${item.quantity},Deleted`);
        });
        
        // Convert array to CSV string
        const csvString = csvRows.join('\n');
        
        // Create a Blob with the CSV data
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        
        // Create URL for download
        const url = URL.createObjectURL(blob);
        
        // Create and configure download element
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `tracking_codes_week_${selectedWeek}.csv`);
        link.style.visibility = 'hidden';
        
        // Add to DOM, start download and remove
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 300);
        
        showMessage("Data exported successfully", "success");
    } catch (error) {
        console.error("Export error:", error);
        showMessage("Error during export: " + error.message, "error");
    }
}

/**
 * Populate the week selector dropdown
 */
function populateWeekSelect() {
    const today = new Date();
    const currentWeek = today.getWeekNumber();
    const year = today.getFullYear();
    
    // Show last 10 weeks and next 52 weeks
    for (let i = currentWeek - 10; i <= currentWeek + 52; i++) {
        if (i > 0 && i <= 52) {
            const option = document.createElement("option");
            option.value = i;
            option.textContent = `Week ${i} (${year})`;
            weekSelect.appendChild(option);
        }
    }
}

/**
 * Get data from Local Storage
 */
function getWeekData(week) {
    return {
        active: JSON.parse(localStorage.getItem(`activeCodes_${week}`)) || [],
        deleted: JSON.parse(localStorage.getItem(`deletedCodes_${week}`)) || []
    };
}

/**
 * Filter active and deleted codes
 */
function filterCodes(input) {
    input = input.trim().toUpperCase(); // Normalize input
    return [
        ...activeCodes.filter(item => 
            item.code.toString().toUpperCase().includes(input)
        ),
        ...deletedCodes.filter(item => 
            item.code.toString().toUpperCase().includes(input)
        )
    ];
}

/**
 * Show filtered results
 */
function showResults(results) {
    codeList.innerHTML = "";
    
    if (results.length === 0) {
        codeList.innerHTML = "<p class='no-results'>No codes found.</p>";
        return;
    }
    
    const ul = document.createElement("ul");
    results.forEach(item => {
        const li = document.createElement("li");
        const isDeleted = deletedCodes.some(delItem => delItem.code === item.code);
        
        if (isDeleted) {
            li.innerHTML = `<s id="deleted">${item.code} (Qty: ${item.quantity})</s>`;
            li.className = "deleted";
        } else {
            li.innerHTML = `${item.code} <span class="quantity-badge">Qty: ${item.quantity}</span>`;
            li.className = "active";
            
            // Add quantity adjustment buttons
            const btnIncrease = document.createElement("button");
            btnIncrease.textContent = "+";
            btnIncrease.className = "qty-btn qty-increase";
            btnIncrease.title = "Increase quantity";
            btnIncrease.onclick = function(e) {
                e.stopPropagation();
                updateQuantity(item.code, item.quantity + 1);
            };
            
            const btnDecrease = document.createElement("button");
            btnDecrease.textContent = "-";
            btnDecrease.className = "qty-btn qty-decrease";
            btnDecrease.title = "Decrease quantity";
            btnDecrease.onclick = function(e) {
                e.stopPropagation();
                // Decrease by 1, and if it reaches 0, delete the item
                if (item.quantity > 1) {
                    updateQuantity(item.code, item.quantity - 1);
                } else {
                    deleteCode(item.code);
                }
            };
            
            // Add quick delete button
            const btnDelete = document.createElement("button");
            btnDelete.textContent = "✕";
            btnDelete.className = "quick-delete-btn";
            btnDelete.title = "Delete code";
            btnDelete.onclick = function(e) {
                e.stopPropagation();
                deleteCode(item.code);
            };
            
            const buttonGroup = document.createElement("div");
            buttonGroup.className = "button-group";
            buttonGroup.appendChild(btnDecrease);
            buttonGroup.appendChild(btnIncrease);
            buttonGroup.appendChild(btnDelete);
            li.appendChild(buttonGroup);
        }
        
        // Click to select code
        li.addEventListener("click", function(e) {
            if (!e.target.classList.contains('qty-btn') && e.target !== this.querySelector('.quick-delete-btn')) {
                inputCode.value = item.code;
                showResults(filterCodes(item.code));
                inputCode.focus();
            }
        });
        
        ul.appendChild(li);
    });
    
    codeList.appendChild(ul);
    
    // Add counter
    const statsDiv = document.createElement("div");
    statsDiv.className = "stats";
    
    const activeItems = results.filter(item => !deletedCodes.some(delItem => delItem.code === item.code));
    const deletedItems = results.filter(item => deletedCodes.some(delItem => delItem.code === item.code));
    
    // Calculate total quantities
    const totalActiveQuantity = activeItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalDeletedQuantity = deletedItems.reduce((sum, item) => sum + item.quantity, 0);
    
    statsDiv.innerHTML = `
        <p>Results: ${results.length} codes (${activeItems.length} active, ${deletedItems.length} deleted)</p>
        <p>Total quantity: ${totalActiveQuantity + totalDeletedQuantity} items (${totalActiveQuantity} active, ${totalDeletedQuantity} deleted)</p>
    `;
    codeList.appendChild(statsDiv);
}

/**
 * Update quantity for a code
 */
function updateQuantity(code, newQuantity) {
    // Find and update in active codes
    const index = activeCodes.findIndex(item => item.code === code);
    
    if (index !== -1) {
        activeCodes[index].quantity = newQuantity;
        saveData();
        showResults(filterCodes(inputCode.value));
        showMessage(`Updated quantity for code ${code} to ${newQuantity}`, "success");
    }
}

/**
 * Delete code and save
 * @param {string} code - The code to delete
 */
function deleteCode(code) {
    const index = activeCodes.findIndex(item => item.code === code);
    
    if (index !== -1) {
        const currentItem = activeCodes[index];
        
        // Delete entire item
        activeCodes.splice(index, 1);
        deletedCodes.push({...currentItem}); // Clone the item
        saveData();
        showMessage(`Code ${code} marked as deleted`, "error");
        
        showResults(filterCodes(inputCode.value));
    } else if (!deletedCodes.some(item => item.code === code)) {
        // Add directly to deleted list
        deletedCodes.push({ code, quantity: 1 });
        saveData();
        showMessage(`Added code ${code} directly to deleted list`, "info");
        showResults(filterCodes(inputCode.value));
    } else {
        // Already deleted
        showMessage(`Code ${code} already deleted`, "info");
    }
}

/**
 * Add new code with quantity
 */
function addCode(code, quantity = 1) {
    if (!code) return false;
    
    // Check if code already exists in active codes
    const activeIndex = activeCodes.findIndex(item => item.code === code);
    if (activeIndex !== -1) {
        // Add to existing quantity
        activeCodes[activeIndex].quantity += quantity;
        saveData();
        showMessage(`Added ${quantity} more items to code ${code}`, "success");
        showResults(filterCodes(""));
        return true;
    }
    
    // Check if code exists in deleted codes
    const deletedIndex = deletedCodes.findIndex(item => item.code === code);
    if (deletedIndex !== -1) {
        showMessage(`Code ${code} exists in deleted list`, "info");
        return false;
    }
    
    // Add new code
    activeCodes.push({ code, quantity });
    saveData();
    showResults(filterCodes(""));
    showMessage(`Added code ${code} with quantity ${quantity}`, "success");
    return true;
}

/**
 * Import codes from CSV
 */
function importCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Update file name display
    const fileNameDisplay = document.getElementById("fileNameDisplay");
    if (fileNameDisplay) {
        fileNameDisplay.textContent = file.name;
    }
    
    // Check file type with relaxed constraints
    const isCSV = 
        file.type === 'text/csv' || 
        file.type === 'application/csv' ||
        file.type === 'text/plain' ||
        file.name.endsWith('.csv') || 
        file.name.endsWith('.txt');
    
    if (!isCSV) {
        showMessage("Please select a valid CSV file (or .txt with comma-separated values)", "error");
        fileInput.value = "";
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const content = e.target.result;
            const lines = content.split(/\r?\n/);
            let importedCodes = 0;
            let updatedCodes = 0;
            let duplicateCodes = 0;
            let invalidCodes = 0;
            
            // Check for header row
            const hasHeader = lines[0].toLowerCase().includes('code') || 
                             lines[0].toLowerCase().includes('quantity') || 
                             lines[0].toLowerCase().includes('status');
            
            // Process each line
            for (let i = hasHeader ? 1 : 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                // Split the line into fields
                const fields = line.split(',');
                const code = fields[0]?.trim();
                
                // Try to get quantity from second column, default to 1
                let quantity = 1;
                if (fields.length > 1 && !isNaN(fields[1].trim())) {
                    quantity = parseInt(fields[1].trim()) || 1;
                }
                
                // Determine if this code should be marked as deleted
                const isDeleted = fields.length > 2 && 
                                 fields[2].trim().toLowerCase() === 'deleted';
                
                // Validate the code (can be any non-empty string)
                if (code && code !== "Code") {
                    const activeIndex = activeCodes.findIndex(item => item.code === code);
                    const deletedIndex = deletedCodes.findIndex(item => item.code === code);
                    
                    if (isDeleted) {
                        // Handle deleted code
                        if (deletedIndex !== -1) {
                            // Update existing deleted code
                            deletedCodes[deletedIndex].quantity += quantity;
                            updatedCodes++;
                        } else if (activeIndex !== -1) {
                            // Move from active to deleted
                            const activeQty = activeCodes[activeIndex].quantity;
                            
                            if (quantity >= activeQty) {
                                // Move all to deleted
                                activeCodes.splice(activeIndex, 1);
                                deletedCodes.push({ code, quantity: activeQty });
                            } else {
                                // Partial move
                                activeCodes[activeIndex].quantity -= quantity;
                                deletedCodes.push({ code, quantity });
                            }
                            updatedCodes++;
                        } else {
                            // New deleted code
                            deletedCodes.push({ code, quantity });
                            importedCodes++;
                        }
                    } else {
                        // Handle active code
                        if (activeIndex !== -1) {
                            // Update existing active code
                            activeCodes[activeIndex].quantity += quantity;
                            updatedCodes++;
                        } else if (deletedIndex === -1) {
                            // Add new active code
                            activeCodes.push({ code, quantity });
                            importedCodes++;
                        } else {
                            // Already in deleted list
                            duplicateCodes++;
                        }
                    }
                } else if (code !== "" && code !== "Code") {
                    invalidCodes++;
                }
            }
            
            // Only save if we imported or updated any codes
            if (importedCodes > 0 || updatedCodes > 0) {
                saveData();
                showResults(filterCodes(inputCode.value));
                
                let message = "";
                if (importedCodes > 0) {
                    message += `Imported ${importedCodes} new codes. `;
                }
                if (updatedCodes > 0) {
                    message += `Updated ${updatedCodes} existing codes. `;
                }
                showMessage(message.trim(), "success");
            } else {
                let message = "No valid new codes found in file";
                if (duplicateCodes > 0) {
                    message += ` (${duplicateCodes} duplicates found)`;
                }
                if (invalidCodes > 0) {
                    message += ` (${invalidCodes} invalid entries)`;
                }
                showMessage(message, "info");
            }
        } catch (error) {
            console.error("Import error:", error);
            showMessage("Error during import: " + error.message, "error");
        }
        
        // Reset file input
        fileInput.value = "";
    };
    
    reader.readAsText(file);
}

/**
 * Show feedback messages (replaced with console.log)
 */
function showMessage(message, type = "info") {
    console.log(`[${type.toUpperCase()}] ${message}`);
}

/**
 * Save data to Local Storage and Firebase if enabled
 */
function saveData() {
    // Save to local storage
    localStorage.setItem(`activeCodes_${selectedWeek}`, JSON.stringify(activeCodes));
    localStorage.setItem(`deletedCodes_${selectedWeek}`, JSON.stringify(deletedCodes));
    
    // If sync is enabled, also save to Firebase
    if (syncEnabled && currentUser) {
        firebaseManager.saveWeekData(selectedWeek.toString(), activeCodes, deletedCodes)
            .catch((error) => {
                console.error("Error saving to cloud:", error);
                showMessage("Error syncing data: " + error.message, "error");
            });
    }
}

/**
 * Save to local storage only (no cloud sync)
 */
function saveToLocalOnly() {
    localStorage.setItem(`activeCodes_${selectedWeek}`, JSON.stringify(activeCodes));
    localStorage.setItem(`deletedCodes_${selectedWeek}`, JSON.stringify(deletedCodes));
}

/**
 * Mobile focus behavior (completely redesigned for natural scrolling)
 */
function setupMobileBehavior() {
    // Only apply these changes on mobile devices
    if (window.innerWidth <= 600) {
        const controlsSection = document.querySelector('.controls');
        const resultsSection = document.querySelector('.results');
        const header = document.querySelector('header');
        const footer = document.querySelector('footer');
        const codeInputContainer = document.createElement('div');
        
        if (!controlsSection || !resultsSection) return;
        
        // Create a floating container for the code input
        codeInputContainer.className = 'floating-input-container';
        codeInputContainer.innerHTML = `
            <input type="number" id="floatingInput" placeholder="Search or enter code..." autocomplete="off">
        `;
        document.body.appendChild(codeInputContainer);
        
        const floatingInput = document.getElementById('floatingInput');
        
        // Sync the floating input with the main input
        floatingInput.addEventListener('input', function() {
            inputCode.value = this.value;
            inputCode.dispatchEvent(new Event('input'));
        });
        
        // Sync main input with floating input
        inputCode.addEventListener('input', function() {
            floatingInput.value = this.value;
        });
        
        // Handle scroll event on mobile
        window.addEventListener('scroll', function() {
            if (window.scrollY > 10) {
                // When scrolling down, show floating input
                header.classList.add('header-hidden');
                controlsSection.classList.add('controls-hidden');
                codeInputContainer.classList.add('floating-input-visible');
            } else {
                // When at the top, hide floating input
                header.classList.remove('header-hidden');
                controlsSection.classList.remove('controls-hidden');
                codeInputContainer.classList.remove('floating-input-visible');
            }
        });
        
        // Add a button to scroll back to top
        const scrollTopBtn = document.createElement('button');
        scrollTopBtn.className = 'scroll-top-btn';
        scrollTopBtn.innerHTML = '↑';
        scrollTopBtn.title = 'Scroll to top';
        scrollTopBtn.addEventListener('click', function() {
            window.scrollTo({top: 0, behavior: 'smooth'});
        });
        document.body.appendChild(scrollTopBtn);
        
        // Show scroll-to-top button only when scrolled
        window.addEventListener('scroll', function() {
            if (window.scrollY > 100) {
                scrollTopBtn.classList.add('visible');
            } else {
                scrollTopBtn.classList.remove('visible');
            }
        });
    }
}

/**
 * Get week number from date
 */
Date.prototype.getWeekNumber = function() {
    const d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

// Handle window resize for mobile behavior
window.addEventListener('resize', function() {
    setupMobileBehavior();
});

// ===== FIREBASE INTEGRATION =====

/**
 * Set up authentication UI and logic
 */
function setupAuth() {
    // Add login button to header
    const header = document.querySelector('header');
    if (!header) return;
    
    // Create login button if it doesn't exist
    let loginButton = document.getElementById('loginButton');
    if (!loginButton) {
        loginButton = document.createElement('button');
        loginButton.textContent = 'Login to Sync';
        loginButton.id = 'loginButton';
        loginButton.className = 'sync-button';
        header.appendChild(loginButton);
    }
    
    // Create sync status indicator if it doesn't exist
    let syncStatus = document.getElementById('syncStatus');
    if (!syncStatus) {
        syncStatus = document.createElement('div');
        syncStatus.id = 'syncStatus';
        syncStatus.className = 'sync-status offline';
        syncStatus.innerHTML = '<span>Offline</span>';
        header.appendChild(syncStatus);
    }
    
    // Add login click handler
    loginButton.addEventListener('click', handleLogin);
    
    // Register for Firebase auth changes
    firebaseManager.addListener(handleFirebaseEvent);
}

/**
 * Handle Firebase events
 */
function handleFirebaseEvent(event) {
    if (event.type === 'auth-change') {
        // Update user status
        currentUser = event.user;
        syncEnabled = event.isLoggedIn;
        
        // Load data from cloud if logged in
        if (syncEnabled) {
            loadCloudData();
        }
    } else if (event.type === 'data-loaded' && event.weekId === selectedWeek.toString()) {
        // Data loaded from cloud
        const data = event.data;
        
        // Merge with local data or replace entirely
        const mergeStrategy = localStorage.getItem('dataMergeStrategy') || 'replace';
        
        if (mergeStrategy === 'replace') {
            // Replace local data with cloud data
            activeCodes = data.activeCodes || [];
            deletedCodes = data.deletedCodes || [];
            saveToLocalOnly(); // Save to local storage only
            showResults(filterCodes(inputCode.value));
            showMessage("Loaded data from cloud", "success");
        } else {
            // Merge cloud and local data
            const mergedData = firebaseManager.mergeData(
                selectedWeek.toString(),
                activeCodes,
                deletedCodes,
                data.activeCodes,
                data.deletedCodes,
                mergeStrategy
            );
            
            activeCodes = mergedData.activeCodes;
            deletedCodes = mergedData.deletedCodes;
            saveToLocalOnly();
            showResults(filterCodes(inputCode.value));
            showMessage("Merged local and cloud data", "success");
        }
    }
}

/**
 * Handle login/logout button click
 */
function handleLogin() {
    if (currentUser) {
        // Log out
        firebaseManager.signOut()
            .then(() => {
                showMessage("Logged out successfully", "info");
            })
            .catch((error) => {
                showMessage("Error logging out: " + error.message, "error");
            });
    } else {
        // Show auth modal for login/signup
        import('./auth-forms.js')
            .then(module => {
                module.showAuthModal();
            })
            .catch(error => {
                console.error("Error loading auth forms:", error);
                showMessage("Error loading authentication form", "error");
            });
    }
}

/**
 * Load data from Firebase
 */
function loadCloudData() {
    if (!syncEnabled || !currentUser) return;
    
    firebaseManager.loadWeekData(selectedWeek.toString())
        .catch((error) => {
            console.error("Error loading cloud data:", error);
            showMessage("Error loading cloud data: " + error.message, "error");
        });
}

/**
 * Update your changeWeek function
 */
function changeWeek() {
    saveData(); // Save data from previous week
    selectedWeek = parseInt(weekSelect.value);
    
    // First load from local storage
    loadWeekData();
    
    // Then check for cloud data if sync is enabled
    if (syncEnabled && currentUser) {
        loadCloudData();
    } else {
        // Just show local data
        showResults(filterCodes(inputCode.value));
        showMessage(`Loaded data for week ${selectedWeek}`);
    }
}

/**
 * Add settings for sync
 */
function addSyncSettings() {
    // Create settings section in footer
    const settingsContent = `
        <div class="footer-sync-settings">
            <h3>Sync Settings</h3>
            <div class="control-group">
                <label for="mergeStrategy">When syncing data:</label>
                <select id="mergeStrategy">
                    <option value="replace">Cloud data overrides local data</option>
                    <option value="merge">Merge cloud and local data (keep both)</option>
                </select>
            </div>
            <button id="forceSyncButton">Force Sync Now</button>
        </div>
    `;
    
    // Insert into footer
    const footer = document.querySelector('footer');
    if (footer) {
        footer.innerHTML = settingsContent + footer.innerHTML;
    }
    
    // Set up event handlers
    const mergeStrategy = document.getElementById('mergeStrategy');
    if (mergeStrategy) {
        mergeStrategy.value = localStorage.getItem('dataMergeStrategy') || 'replace';
        mergeStrategy.addEventListener('change', function() {
            localStorage.setItem('dataMergeStrategy', this.value);
        });
    }
    
    const forceSyncButton = document.getElementById('forceSyncButton');
    if (forceSyncButton) {
        forceSyncButton.addEventListener('click', function() {
            if (syncEnabled && currentUser) {
                loadCloudData();
            } else {
                showMessage("Please login to sync data", "info");
            }
        });
    }
}
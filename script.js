/**
 * Package Tracking Code Manager
 * A web application to manage tracking codes by week with quantity support
 */

// DOM Elements
const inputCode = document.getElementById("inputCode");
const inputQuantity = document.getElementById("inputQuantity");
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

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", function() {
    // Populate week selector (last 10 weeks and next 52 weeks)
    populateWeekSelect();
    
    // Set current week
    const currentWeek = new Date().getWeekNumber();
    weekSelect.value = currentWeek;
    
    // Initialize week data
    selectedWeek = currentWeek;
    loadWeekData();
    
    // Set default quantity
    inputQuantity.value = "1";
    
    // Display initial data
    showResults(filterCodes(inputCode.value));
    
    // Set up event listeners
    setupEventListeners();
    
    // Set up mobile optimizations
    setupMobileBehavior();
    
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
 * Change the currently selected week
 */
function changeWeek() {
    saveData(); // Save data from previous week
    selectedWeek = parseInt(weekSelect.value);
    loadWeekData();
    showResults(filterCodes(inputCode.value));
    
    // Visual feedback
    showMessage(`Loaded data for week ${selectedWeek}`);
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
    
    // Get quantity to delete (default to 1 if not specified)
    const quantityToDelete = parseInt(inputQuantity.value) || 1;
    
    deleteCode(codeToDelete, quantityToDelete);
    inputCode.value = "";
    inputQuantity.value = "1";
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
    console.log(`Loading data for week ${selectedWeek}`);
    console.log(`Active Codes: ${localStorage.getItem(`activeCodes_${selectedWeek}`)}`);
    console.log(`Deleted Codes: ${localStorage.getItem(`deletedCodes_${selectedWeek}`)}`);
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
                if (item.quantity > 1) {
                    updateQuantity(item.code, item.quantity - 1);
                }
            };
            
            // Add quick delete button
            const btnDelete = document.createElement("button");
            btnDelete.textContent = "✕";
            btnDelete.className = "quick-delete-btn";
            btnDelete.title = "Delete code";
            btnDelete.onclick = function(e) {
                e.stopPropagation();
                deleteCode(item.code, item.quantity); // Delete entire quantity
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
                inputQuantity.value = item.quantity;
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
 * @param {number} quantity - The quantity to delete (default: entire quantity)
 */
function deleteCode(code, quantityToDelete = null) {
    const index = activeCodes.findIndex(item => item.code === code);
    
    if (index !== -1) {
        const currentItem = activeCodes[index];
        
        // If quantityToDelete is null or undefined, delete the entire item
        if (quantityToDelete === null || quantityToDelete === undefined) {
            activeCodes.splice(index, 1);
            deletedCodes.push({...currentItem}); // Clone the item
            saveData();
            showMessage(`Code ${code} marked as deleted`, "success");
        } else {
            // Partial deletion
            if (quantityToDelete >= currentItem.quantity) {
                // Delete entire quantity
                activeCodes.splice(index, 1);
                deletedCodes.push({...currentItem}); // Clone the item
                saveData();
                showMessage(`Code ${code} marked as deleted (all ${currentItem.quantity} items)`, "success");
            } else {
                // Reduce the quantity in active codes
                currentItem.quantity -= quantityToDelete;
                
                // Check if the code already exists in deleted codes
                const deletedIndex = deletedCodes.findIndex(item => item.code === code);
                if (deletedIndex !== -1) {
                    // Add to existing deleted entry
                    deletedCodes[deletedIndex].quantity += quantityToDelete;
                } else {
                    // Create a new deleted entry
                    deletedCodes.push({
                        code: code,
                        quantity: quantityToDelete
                    });
                }
                
                saveData();
                showMessage(`Deleted ${quantityToDelete} items of code ${code}`, "success");
            }
        }
        
        showResults(filterCodes(inputCode.value));
    } else if (!deletedCodes.some(item => item.code === code)) {
        // Check if we have input in the quantity field to add a new deleted code
        const quantity = parseInt(inputQuantity.value) || 1;
        deletedCodes.push({ code, quantity });
        saveData();
        showMessage(`Added code ${code} directly to deleted list`, "info");
        showResults(filterCodes(inputCode.value));
    } else {
        // Code is already in the deleted list
        // Check if we want to add more to the deleted quantity
        if (quantityToDelete !== null && quantityToDelete !== undefined) {
            const deletedIndex = deletedCodes.findIndex(item => item.code === code);
            if (deletedIndex !== -1) {
                deletedCodes[deletedIndex].quantity += quantityToDelete;
                saveData();
                showMessage(`Added ${quantityToDelete} more items to deleted code ${code}`, "info");
                showResults(filterCodes(inputCode.value));
            } else {
                showMessage(`Code ${code} already deleted`, "info");
            }
        } else {
            showMessage(`Code ${code} already deleted`, "info");
        }
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
    document.getElementById("fileNameDisplay").textContent = file.name;
    
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
 * Show feedback messages
 */
function showMessage(message, type = "info") {
    // Remove previous messages
    const oldMessage = document.querySelector(".message");
    if (oldMessage) {
        oldMessage.remove();
    }
    
    // Create new message
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // Insert after h1
    const h1 = document.querySelector("h1");
    h1.parentNode.insertBefore(messageDiv, h1.nextSibling);
    
    // Remove after 3 seconds
    setTimeout(() => {
        messageDiv.classList.add("fade-out");
        setTimeout(() => messageDiv.remove(), 500);
    }, 3000);
}

/**
 * Save data to Local Storage
 */
function saveData() {
    localStorage.setItem(`activeCodes_${selectedWeek}`, JSON.stringify(activeCodes));
    localStorage.setItem(`deletedCodes_${selectedWeek}`, JSON.stringify(deletedCodes));
}

/**
 * Mobile focus behavior
 */
function setupMobileBehavior() {
    // Only apply these changes on mobile devices
    if (window.innerWidth <= 600) {
        const controlsSection = document.querySelector('.controls');
        const resultsSection = document.querySelector('.results');
        
        // When input is focused
        inputCode.addEventListener('focus', function() {
            controlsSection.classList.add('minimized');
            resultsSection.classList.add('results-expanded');
            
            // Scroll to make sure input and results are visible
            setTimeout(() => {
                window.scrollTo({
                    top: inputCode.getBoundingClientRect().top + window.scrollY - 20,
                    behavior: 'smooth'
                });
            }, 300);
        });
        
        // When input loses focus
        inputCode.addEventListener('blur', function() {
            // Small delay to allow for clicking on results
            setTimeout(() => {
                // Check if the focus was moved to an element in the results
                const activeElement = document.activeElement;
                if (!resultsSection.contains(activeElement)) {
                    controlsSection.classList.remove('minimized');
                    resultsSection.classList.remove('results-expanded');
                }
            }, 200);
        });
        
        // Make sure results stay visible when interacting with them
        codeList.addEventListener('touchstart', function() {
            controlsSection.classList.add('minimized');
            resultsSection.classList.add('results-expanded');
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
/**
 * Package Tracking Code Manager
 * A web application to manage tracking codes by week
 */

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
        csvRows.push("Code,Status");
        
        // Add active codes
        activeCodes.forEach(code => {
            csvRows.push(`${code},Active`);
        });
        
        // Add deleted codes
        deletedCodes.forEach(code => {
            csvRows.push(`${code},Deleted`);
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
    return [...activeCodes, ...deletedCodes].filter(code => 
        code.toUpperCase().includes(input)
    );
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
    results.forEach(code => {
        const li = document.createElement("li");
        
        if (deletedCodes.includes(code)) {
            li.innerHTML = `<s id="deleted">${code}</s>`;
            li.className = "deleted";
        } else {
            li.textContent = code;
            li.className = "active";
            
            // Add quick delete button
            const btnDelete = document.createElement("button");
            btnDelete.textContent = "✕";
            btnDelete.className = "quick-delete-btn";
            btnDelete.title = "Delete code";
            btnDelete.onclick = function(e) {
                e.stopPropagation();
                deleteCode(code);
            };
            li.appendChild(btnDelete);
        }
        
        // Click to select code
        li.addEventListener("click", function(e) {
            if (e.target !== this.querySelector('.quick-delete-btn')) {
                inputCode.value = code;
                showResults(filterCodes(code));
                inputCode.focus();
            }
        });
        
        ul.appendChild(li);
    });
    
    codeList.appendChild(ul);
    
    // Add counter
    const statsDiv = document.createElement("div");
    statsDiv.className = "stats";
    statsDiv.innerHTML = `
        <p>Results: ${results.length} codes 
        (${results.filter(c => !deletedCodes.includes(c)).length} active, 
        ${results.filter(c => deletedCodes.includes(c)).length} deleted)</p>
    `;
    codeList.appendChild(statsDiv);
}

/**
 * Delete code and save
 */
function deleteCode(code) {
    const index = activeCodes.indexOf(code);
    
    if (index !== -1) { 
        activeCodes.splice(index, 1);
        deletedCodes.push(code);
        saveData();
        showMessage(`Code ${code} marked as deleted`, "success");
        showResults(filterCodes(inputCode.value));
    } else if (!deletedCodes.includes(code)) {
        showMessage(`Code ${code} not found in database`, "error");
    } else {
        showMessage(`Code ${code} already deleted`, "info");
    }
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
            let duplicateCodes = 0;
            let invalidCodes = 0;
            
            lines.forEach(line => {
                // Assume each line contains a code (first field)
                const fields = line.split(',');
                const code = fields[0].trim();
                
                // Validate the code
                if (code && code !== "Code" && !isNaN(code)) {
                    if (!activeCodes.includes(code) && !deletedCodes.includes(code)) {
                        activeCodes.push(code);
                        importedCodes++;
                    } else {
                        duplicateCodes++;
                    }
                } else if (code && code !== "Code") {
                    invalidCodes++;
                }
            });
            
            // Only save if we imported any codes
            if (importedCodes > 0) {
                saveData();
                showResults(filterCodes(inputCode.value));
                showMessage(`Imported ${importedCodes} new codes`, "success");
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
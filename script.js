// DOM Elements
const dataInput = document.getElementById('dataInput');
const fieldSelector = document.getElementById('fieldSelector');
const fieldOptions = document.getElementById('fieldOptions');
const errorMessage = document.getElementById('errorMessage');
const outputContainer = document.getElementById('outputContainer');
const toggleButton = document.getElementById('toggleButton');
const leftPanel = document.getElementById('leftPanel');
const rightPanel = document.getElementById('rightPanel');
const content = document.querySelector('.content');
const filtersContainer = document.getElementById('filtersContainer');
const filterRows = document.getElementById('filterRows');
const addFilterButton = document.getElementById('addFilterButton');
const applyFiltersButton = document.getElementById('applyFiltersButton');
const clearFiltersButton = document.getElementById('clearFiltersButton');
const dataTypeIndicator = document.getElementById('dataTypeIndicator');

// State
let dataType = null; // 'json' or 'csv'
let parsedData = null;
let originalData = null; // Keep the original data for filtering
let selectedFields = ['title', 'reason', 'useCaseId']; // Default selected fields
let isPanelHidden = false;
let filters = [];
let availableFields = [];

// Event Listeners
dataInput.addEventListener('input', handleDataInput);
toggleButton.addEventListener('click', togglePanel);
addFilterButton.addEventListener('click', addFilterRow);
applyFiltersButton.addEventListener('click', applyFilters);
clearFiltersButton.addEventListener('click', clearFilters);

// Functions
function handleDataInput(e) {
    const inputText = e.target.value;
    
    if (inputText.trim() === '') {
        resetOutput();
        return;
    }
    
    try {
        // Try to detect if this is JSON or CSV
        detectDataType(inputText);
        
        if (dataType === 'json') {
            originalData = JSON.parse(inputText);
        } else if (dataType === 'csv') {
            originalData = parseCSV(inputText);
        }
        
        parsedData = Array.isArray(originalData) ? [...originalData] : originalData; // Copy for filtering
        hideError();
        updateFieldSelector();
        updateFilterOptions();
        renderOutput();
        
        // Show data type indicator
        dataTypeIndicator.textContent = dataType.toUpperCase();
        dataTypeIndicator.className = 'data-type-indicator data-type-' + dataType;
        dataTypeIndicator.style.display = 'block';
    } catch (err) {
        showError(`Invalid data: ${err.message}`);
        resetOutput();
    }
}

function detectDataType(inputText) {
    // Trim whitespace and check first character
    const trimmed = inputText.trim();
    
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            // Try parsing as JSON
            JSON.parse(trimmed);
            dataType = 'json';
            return;
        } catch (e) {
            // If JSON parse fails, fall through to CSV check
        }
    }
    
    // Check for CSV traits
    const lines = trimmed.split(/\r?\n/);
    if (lines.length > 0) {
        const firstLine = lines[0];
        const commas = (firstLine.match(/,/g) || []).length;
        const semicolons = (firstLine.match(/;/g) || []).length;
        const tabs = (firstLine.match(/\t/g) || []).length;
        
        // If we see delimiters and multiple lines, assume CSV
        if ((commas > 0 || semicolons > 0 || tabs > 0) && lines.length > 1) {
            dataType = 'csv';
            return;
        }
    }
    
    // Try to go back to JSON if nothing else matches
    try {
        JSON.parse(trimmed);
        dataType = 'json';
        return;
    } catch (e) {
        // Default to CSV if all else fails
        dataType = 'csv';
    }
}

function parseCSV(csvText) {
    // Try to auto-detect the delimiter
    const detectDelimiter = (text) => {
        const firstLine = text.split(/\r?\n/)[0];
        const commas = (firstLine.match(/,/g) || []).length;
        const semicolons = (firstLine.match(/;/g) || []).length;
        const tabs = (firstLine.match(/\t/g) || []).length;
        
        if (tabs > commas && tabs > semicolons) return '\t';
        if (commas > semicolons) return ',';
        if (semicolons > commas) return ';';
        return '\t'; // Default to tab if can't determine
    };
    
    const delimiter = detectDelimiter(csvText);
    
    // Split the CSV text into lines
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length === 0) {
        throw new Error("No data found");
    }
    
    // Get headers from the first line
    const headers = lines[0].split(delimiter).map(header => 
        header.trim().replace(/^["'](.*)["']$/, '$1') // Remove quotes if present
    );
    
    // Parse each data row
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines
        
        // Handle quoted fields with delimiters inside
        let fields = [];
        let field = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            
            if (char === '"' && (j === 0 || line[j-1] !== '\\')) {
                inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
                fields.push(field.trim().replace(/^["'](.*)["']$/, '$1'));
                field = '';
            } else {
                field += char;
            }
        }
        fields.push(field.trim().replace(/^["'](.*)["']$/, '$1'));
        
        // If we don't have the right number of fields, try simple split
        if (fields.length !== headers.length) {
            fields = line.split(delimiter).map(f => 
                f.trim().replace(/^["'](.*)["']$/, '$1')
            );
        }
        
        // Create an object for each row
        const obj = {};
        for (let j = 0; j < headers.length && j < fields.length; j++) {
            obj[headers[j]] = fields[j];
        }
        
        data.push(obj);
    }
    
    return data;
}

function resetOutput() {
    parsedData = null;
    originalData = null;
    dataType = null;
    outputContainer.innerHTML = '<div class="placeholder">Enter valid JSON or CSV data on the left to see the list view here</div>';
    fieldSelector.style.display = 'none';
    filtersContainer.style.display = 'none';
    dataTypeIndicator.style.display = 'none';
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

function hideError() {
    errorMessage.style.display = 'none';
}

function updateFieldSelector() {
    // Only show field selector for array data with objects
    if (Array.isArray(parsedData) && parsedData.length > 0 && typeof parsedData[0] === 'object') {
        availableFields = Object.keys(parsedData[0]);
        
        // Create checkboxes for each field
        fieldOptions.innerHTML = '';
        availableFields.forEach(field => {
            const label = document.createElement('label');
            label.className = 'field-option';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = selectedFields.some(f => f.toLowerCase() === field.toLowerCase());
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    selectedFields.push(field);
                } else {
                    selectedFields = selectedFields.filter(f => f.toLowerCase() !== field.toLowerCase());
                }
                renderOutput();
            });
            
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(field));
            fieldOptions.appendChild(label);
        });
        
        fieldSelector.style.display = 'block';
    } else {
        fieldSelector.style.display = 'none';
    }
}

function updateFilterOptions() {
    if (Array.isArray(parsedData) && parsedData.length > 0 && typeof parsedData[0] === 'object') {
        // Clear existing filters
        filterRows.innerHTML = '';
        filters = [];
        
        // Add initial filters for common fields
        const commonFilters = ['title', 'reason', 'useCaseId'];
        commonFilters.forEach(field => {
            const matchingField = availableFields.find(f => f.toLowerCase() === field.toLowerCase());
            if (matchingField) {
                addFilterRow(matchingField);
            }
        });
        
        filtersContainer.style.display = 'block';
    } else {
        filtersContainer.style.display = 'none';
    }
}

function addFilterRow(predefinedField) {
    const filterRow = document.createElement('div');
    filterRow.className = 'filter-row';
    
    // Field dropdown
    const fieldLabel = document.createElement('label');
    fieldLabel.className = 'filter-label';
    
    const fieldSelect = document.createElement('select');
    fieldSelect.className = 'filter-input';
    
    // Add an empty option
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '-- Select Field --';
    fieldSelect.appendChild(emptyOption);
    
    // Add all available fields
    availableFields.forEach(field => {
        const option = document.createElement('option');
        option.value = field;
        option.textContent = field;
        
        // Select the field if it's predefined
        if (predefinedField && typeof predefinedField === 'string' && 
            field.toLowerCase() === predefinedField.toLowerCase()) {
            option.selected = true;
        }
        
        fieldSelect.appendChild(option);
    });
    
    fieldLabel.appendChild(fieldSelect);
    
    // Value input
    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.className = 'filter-input';
    valueInput.placeholder = 'Filter value...';
    
    // Remove button
    const removeButton = document.createElement('button');
    removeButton.className = 'filter-button';
    removeButton.textContent = 'X';
    removeButton.addEventListener('click', () => {
        filterRow.remove();
        
        // Update the filters array
        const index = filters.findIndex(f => f.row === filterRow);
        if (index !== -1) {
            filters.splice(index, 1);
        }
    });
    
    // Add to row
    filterRow.appendChild(fieldLabel);
    filterRow.appendChild(valueInput);
    filterRow.appendChild(removeButton);
    
    // Add to container
    filterRows.appendChild(filterRow);
    
    // Add to filters array
    filters.push({
        row: filterRow,
        fieldSelect: fieldSelect,
        valueInput: valueInput
    });
}

function applyFilters() {
    if (!originalData || !Array.isArray(originalData)) {
        return;
    }
    
    // Start with the original data
    parsedData = [...originalData];
    
    // Apply each active filter
    filters.forEach(filter => {
        const field = filter.fieldSelect.value;
        const value = filter.valueInput.value.trim().toLowerCase();
        
        if (field && value) {
            parsedData = parsedData.filter(item => {
                if (item[field] === undefined) return false;
                
                const itemValue = String(item[field]).toLowerCase();
                return itemValue.includes(value);
            });
        }
    });
    
    // Render the filtered output
    renderOutput();
}

function clearFilters() {
    // Clear filter inputs
    filters.forEach(filter => {
        filter.fieldSelect.selectedIndex = 0;
        filter.valueInput.value = '';
    });
    
    // Reset to original data
    if (originalData) {
        parsedData = Array.isArray(originalData) ? [...originalData] : originalData;
        renderOutput();
    }
}

function renderHtmlContent(htmlString) {
    if (!htmlString || typeof htmlString !== 'string') return '';
    
    // Create a div to safely render the HTML content
    const tempDiv = document.createElement('div');
    
    // Set the HTML content
    tempDiv.innerHTML = htmlString;
    
    // Return the div to be used directly in the DOM
    return tempDiv;
}

function renderOutput() {
    outputContainer.innerHTML = '';
    
    if (!parsedData || !Array.isArray(parsedData) || parsedData.length === 0) {
        outputContainer.innerHTML = '<div class="placeholder">No results to display</div>';
        return;
    }
    
    parsedData.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'item';
        
        selectedFields.forEach(selectedField => {
            // Find the actual field name with correct casing
            const field = Object.keys(item).find(
                f => f.toLowerCase() === selectedField.toLowerCase()
            );
            
            if (field && field in item) {
                const fieldElement = document.createElement('div');
                fieldElement.className = 'field';
                
                const fieldNameElement = document.createElement('div');
                fieldNameElement.className = 'field-name';
                fieldNameElement.textContent = field + ':';
                
                const fieldValueElement = document.createElement('div');
                fieldValueElement.className = 'field-value';
                
                if (typeof item[field] === 'string') {
                    // Check if content appears to have HTML
                    if (item[field].includes('<') && item[field].includes('>')) {
                        // Handle HTML content properly
                        const renderedHtml = renderHtmlContent(item[field]);
                        fieldValueElement.innerHTML = ''; // Clear any existing content
                        fieldValueElement.appendChild(renderedHtml);
                    } else {
                        // Handle plain text
                        fieldValueElement.textContent = item[field];
                    }
                } else {
                    fieldValueElement.textContent = JSON.stringify(item[field], null, 2);
                }
                
                fieldElement.appendChild(fieldNameElement);
                fieldElement.appendChild(fieldValueElement);
                itemElement.appendChild(fieldElement);
            }
        });
        
        outputContainer.appendChild(itemElement);
    });
    
    // Show total count
    const countElement = document.createElement('div');
    countElement.className = 'placeholder';
    countElement.textContent = `Displaying ${parsedData.length} ${parsedData.length === 1 ? 'item' : 'items'}`;
    outputContainer.appendChild(countElement);
}

function togglePanel() {
    isPanelHidden = !isPanelHidden;
    
    if (isPanelHidden) {
        content.classList.add('left-hidden');
        toggleButton.innerHTML = 'Show input panel';
        toggleButton.title = 'Show input panel';
    } else {
        content.classList.remove('left-hidden');
        toggleButton.innerHTML = 'Hide Input Panel';
        toggleButton.title = 'Hide Input Panel';
    }
}
let currentStores = [];
let employeesList = [];
let outputFolder = ""; 

async function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav li').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    if (event) event.target.classList.add('active');
    
    if(tabId === 'tracking') { 
        await loadEmployees(); 
        await loadTracking(); 
    }
}

async function loadMaster() {
    const path = await pywebview.api.select_file();
    if (!path) return;
    document.getElementById('master-status').innerText = `Loading: ${path}...`;
    const res = await pywebview.api.load_master_file(path);
    if (res.error) alert("Error: " + res.error);
    else document.getElementById('master-status').innerText = `Success! Loaded ${res.count} stores into memory.`;
}

async function loadEstimate() {
    const path = await pywebview.api.select_file();
    if (!path) return;
    document.getElementById('estimate-status').innerText = `Loading: ${path}...`;
    const res = await pywebview.api.load_estimate_file(path);
    if (res.error) { alert("Error: " + res.error); return; }
    
    document.getElementById('estimate-status').innerText = `Success! Found data for ${res.matched_count} valid stores.`;
    currentStores = res.stores;
    
    const warnDiv = document.getElementById('unmatched-warning');
    if (res.unmatched.length > 0) {
        warnDiv.style.display = 'block';
        document.getElementById('unmatched-list').innerText = res.unmatched.join(', ');
    } else {
        warnDiv.style.display = 'none';
    }

    if (currentStores.length > 0) {
        const genSection = document.getElementById('generation-section');
        genSection.style.opacity = "1";
        genSection.style.pointerEvents = "auto";
        const select = document.getElementById('single-store-select');
        select.innerHTML = '<option value="">-- Select a specific store --</option>';
        currentStores.forEach(store => {
            let opt = document.createElement('option');
            opt.value = store.code;       // Hidden value for the backend to use
            opt.innerHTML = store.name;   // Human-readable name for the user to see
            select.appendChild(opt);
        });
    }
}

async function selectOutputFolder() {
    const path = await pywebview.api.select_folder();
    if (path) {
        outputFolder = path;
        const textElement = document.getElementById('save-location-text');
        textElement.innerText = "Saving to: " + path;
        textElement.style.color = "#27ae60"; 
    }
}

async function selectCustomLogo() {
    const path = await pywebview.api.select_logo_file();
    if (!path) return;

    const res = await pywebview.api.set_custom_logo(path);
    if (res.error) {
        alert("Error: " + res.error);
        return;
    }

    const textElement = document.getElementById('logo-status-text');
    textElement.innerText = "Using custom logo: " + path;
    textElement.style.color = "#0e8578";
}

async function clearCustomLogo() {
    const res = await pywebview.api.clear_custom_logo();
    if (res.error) {
        alert("Error: " + res.error);
        return;
    }

    const textElement = document.getElementById('logo-status-text');
    textElement.innerText = "Using default logo";
    textElement.style.color = "#6e655b";
}

async function generateBulk() {
    const state = document.getElementById('state-select').value;
    const clientName = document.getElementById('client-name').value || "Unknown Client";
    const selectedMode = document.querySelector('input[name="bulk-output-mode"]:checked');
    const bulkOutputMode = selectedMode ? selectedMode.value : 'combined';
    if (!outputFolder) return alert("Please click 'Choose Save Location' to select where to save the files.");
    if (!state) return alert("Please select a state from the dropdown first.");
   
    document.body.style.cursor = 'wait';
    
    // NEW: We extract just the string codes from the objects to send to Python
    const storeCodesOnly = currentStores.map(store => store.code);
    
    // Pass the cleaned array of strings to the backend
    const res = await pywebview.api.generate_pdfs(storeCodesOnly, state, outputFolder, clientName, bulkOutputMode);
    document.body.style.cursor = 'default';
   
    if (res.success) {
        const modeText = bulkOutputMode === 'separate' ? 'as separate PDFs' : 'as a single combined PDF';
        alert(`Successfully generated ${res.count} Chalaans ${modeText}.\nSaved to: ${res.path}`);
    }
    else alert("Error: " + res.error);
}

async function generateSingle() {
    const state = document.getElementById('state-select').value;
    
    // Grab the select element itself so we can read both the value AND the text
    const storeSelect = document.getElementById('single-store-select');
    const storeCode = storeSelect.value;
    const storeName = storeCode ? storeSelect.options[storeSelect.selectedIndex].text : "";
    
    const clientName = document.getElementById('client-name').value || "Unknown Client";
    
    if (!outputFolder) return alert("Please click 'Choose Save Location' first.");
    if (!state) return alert("Please select a state.");
    if (!storeCode) return alert("Please select a store.");

    document.body.style.cursor = 'wait';
    
    // Pass the storeCode to the backend to process the PDF
    const res = await pywebview.api.generate_pdfs([storeCode], state, outputFolder, clientName);
    document.body.style.cursor = 'default';
   
    // Show the human-readable storeName in the success popup
    if (res.success) alert(`Successfully generated Challan for ${storeName}.\nSaved to: ${res.path}`);
    else alert("Error: " + res.error);
}

async function loadEmployees() {
    employeesList = await pywebview.api.get_employees();
   
    // Populate the bulk update dropdown
    const bulkEmpSelect = document.getElementById('bulk-emp-select');
    if (bulkEmpSelect) {
        let opts = '<option value="">-- No Change --</option><option value="Unassigned">Unassigned</option>';
        employeesList.forEach(e => { opts += `<option value="${e}">${e}</option>`; });
        bulkEmpSelect.innerHTML = opts;
    }

    // NEW: Populate the Delete Employee dropdown
    const deleteEmpSelect = document.getElementById('delete-emp-select');
    if (deleteEmpSelect) {
        let delOpts = '<option value="">-- Remove Employee --</option>';
        employeesList.forEach(e => { delOpts += `<option value="${e}">${e}</option>`; });
        deleteEmpSelect.innerHTML = delOpts;
    }
}

async function addEmployee() {
    const name = document.getElementById('new-emp-name').value;
    if (!name) return;
    const res = await pywebview.api.add_employee(name);
    if (res.error) alert(res.error);
    else { document.getElementById('new-emp-name').value = ''; loadEmployees(); }
}

async function deleteEmployee() {
    const selectEl = document.getElementById('delete-emp-select');
    const name = selectEl.value;
    
    if (!name) return alert("Please select an employee from the dropdown to delete.");
    
    const isConfirmed = confirm(`Are you sure you want to remove "${name}" from the system?\n\nNote: Any past challans assigned to them will safely retain their name for your records.`);
    
    if (isConfirmed) {
        document.body.style.cursor = 'wait';
        const res = await pywebview.api.delete_employee(name);
        document.body.style.cursor = 'default';
        
        if (res.error) {
            alert(res.error);
        } else {
            await loadEmployees();
            await loadTracking();
        }
    }
}

async function loadTracking() {
    const data = await pywebview.api.get_tracking_data();
    if (!data) return; 
    
    const tbody = document.getElementById('tracking-body');
    tbody.innerHTML = ''; 
    
    // Reset bulk panel on reload
    document.getElementById('select-all').checked = false;
    handleSelectionChange(); 
    
    data.forEach(row => {
        let tr = document.createElement('tr');
        
        let empSelect = `<select onchange="updateRow(${row.chalaan_no}, this)">
            <option value="Unassigned" ${row.employee === 'Unassigned' ? 'selected' : ''}>Unassigned</option>`;
        
        // NEW: If an employee was deleted but is assigned to this old challan, safely display them
        let employeeExists = employeesList.includes(row.employee) || row.employee === 'Unassigned';
        if (!employeeExists && row.employee) {
            empSelect += `<option value="${row.employee}" selected>${row.employee} (Deleted)</option>`;
        }

        employeesList.forEach(e => {
            empSelect += `<option value="${e}" ${row.employee === e ? 'selected' : ''}>${e}</option>`;
        });
        empSelect += `</select>`;

        let statSelect = `<select onchange="updateRow(${row.chalaan_no}, this)">
            <option value="Pending" ${row.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Received" ${row.status === 'Received' ? 'selected' : ''}>Received</option>
        </select>`;

        tr.innerHTML = `
            <td><input type="checkbox" class="row-checkbox" value="${row.chalaan_no}" onchange="handleSelectionChange()"></td>
            <td>${row.chalaan_no}</td>
            <td>${row.store_code}</td>
            <td>${row.store_name}</td>
            <td>${row.campaign_name}</td>
            <td>${row.date}</td>
            <td>${empSelect}</td>
            <td>${statSelect}</td>
            <td>
                <span style="color:green; display:none; font-weight:bold; margin-right:10px;" id="saved-${row.chalaan_no}">Saved!</span>
                <button onclick="deleteChalaan(${row.chalaan_no})" style="background-color: #e74c3c; padding: 6px 12px; font-size: 12px;">Delete</button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

async function updateRow(chalaan_no, selectEl) {
    const tr = selectEl.closest('tr');
    const empSelect = tr.querySelectorAll('select')[0];
    const statSelect = tr.querySelectorAll('select')[1];
    
    const emp = empSelect.value;
    const stat = statSelect.value;
    
    // NEW VALIDATION: Block status change if no employee is assigned
    if (emp === 'Unassigned' && stat !== 'Pending') {
        alert("Cannot change status: Please assign an employee to this Challan first.");
        statSelect.value = 'Pending'; // Revert the dropdown back to Pending
        return; // Stop the update process
    }
    
    await pywebview.api.update_tracking(chalaan_no, emp, stat);
    
    const savedMsg = tr.querySelector(`#saved-${chalaan_no}`);
    savedMsg.style.display = 'inline';
    setTimeout(() => { savedMsg.style.display = 'none'; }, 2000);
}

function filterTracking() {
    const filterText = document.getElementById('search-tracking').value.toLowerCase();
    const rows = document.getElementById('tracking-body').getElementsByTagName('tr');

    for (let i = 0; i < rows.length; i++) {
        const tds = rows[i].getElementsByTagName('td');
        const chalaanNo = tds[1].innerText.toLowerCase();
        const storeCode = tds[2].innerText.toLowerCase();
        const storeName = tds[3].innerText.toLowerCase();
        const campaign = tds[4].innerText.toLowerCase();
        const dateStr = tds[5].innerText.toLowerCase();
        
        const selects = rows[i].querySelectorAll('select');
        const employee = selects[0].value.toLowerCase();
        const status = selects[1].value.toLowerCase();
        
        const combinedData = `${chalaanNo} ${storeCode} ${storeName} ${campaign} ${dateStr} ${employee} ${status}`;
        
        if (combinedData.includes(filterText)) {
            rows[i].style.display = "";
        } else {
            rows[i].style.display = "none";
        }
    }
}

async function deleteChalaan(chalaan_no) {
    // Built-in browser confirmation popup
    const isConfirmed = confirm(`Are you sure you want to permanently delete Challan No. ${chalaan_no} from the tracking system?`);
    
    if (isConfirmed) {
        const res = await pywebview.api.delete_tracking(chalaan_no);
        if (res.success) {
            // Instantly refresh the table to show the row is gone
            await loadTracking(); 
        } else {
            alert("Error deleting record.");
        }
    }
}

/* =========================================================
   BACKUP SYSTEM LOGIC 
   ========================================================= */

async function exportData() {
    document.body.style.cursor = 'wait';
    const res = await pywebview.api.export_backup();
    document.body.style.cursor = 'default';
    
    if (res.success) {
        alert(`Backup successfully saved to:\n${res.path}`);
    } else if (res.error !== "Export cancelled.") {
        alert(`Error exporting data: ${res.error}`);
    }
}

async function importData() {
    // Safety confirmation before overwriting data
    const isConfirmed = confirm("WARNING: Restoring a backup will permanently overwrite your current tracking data and sequence numbers. Are you sure you want to proceed?");
    
    if (isConfirmed) {
        document.body.style.cursor = 'wait';
        const res = await pywebview.api.import_backup();
        document.body.style.cursor = 'default';
        
        if (res.success) {
            alert("Backup restored successfully! Your tracking data has been updated.");
            // Refresh the data in the background so it's ready if they switch to the Tracking tab
            await loadEmployees();
            await loadTracking();
        } else if (res.error !== "Import cancelled.") {
            alert(`Error restoring data: ${res.error}`);
        }
    }
}

/* =========================================================
   BULK ACTION LOGIC 
   ========================================================= */

function toggleAllCheckboxes() {
    const isChecked = document.getElementById('select-all').checked;
    const checkboxes = document.querySelectorAll('.row-checkbox');
    
    checkboxes.forEach(cb => {
        // Only select rows that are currently visible (respecting the search filter!)
        if (cb.closest('tr').style.display !== "none") {
            cb.checked = isChecked;
        }
    });
    handleSelectionChange();
}

function handleSelectionChange() {
    const checkboxes = document.querySelectorAll('.row-checkbox:checked');
    const count = checkboxes.length;
    const panel = document.getElementById('bulk-actions');
    
    if (count > 0) {
        panel.style.display = 'block';
        document.getElementById('selected-count').innerText = count;
    } else {
        panel.style.display = 'none';
        document.getElementById('select-all').checked = false;
    }
}

async function applyBulkUpdate() {
    const checkboxes = document.querySelectorAll('.row-checkbox:checked');
    const chalaan_nos = Array.from(checkboxes).map(cb => parseInt(cb.value));
    const emp = document.getElementById('bulk-emp-select').value;
    const stat = document.getElementById('bulk-status-select').value;

    if (chalaan_nos.length === 0) return;
    if (!emp && !stat) return alert("Please select an employee or status to update.");

    // NEW VALIDATION: Check selected rows before applying bulk status
    if (stat !== '' && stat !== 'Pending') {
        let hasUnassigned = false;
        
        checkboxes.forEach(cb => {
            const tr = cb.closest('tr');
            const currentEmp = tr.querySelectorAll('select')[0].value;
            
            // If the row is currently unassigned AND the bulk tool isn't assigning someone right now
            if (currentEmp === 'Unassigned' && (emp === '' || emp === 'Unassigned')) {
                hasUnassigned = true;
            }
        });

        if (hasUnassigned) {
            return alert("Cannot bulk update status: One or more selected Challans do not have an employee assigned. Please assign an employee first.");
        }
    }

    document.body.style.cursor = 'wait';
    const res = await pywebview.api.bulk_update_tracking(chalaan_nos, emp, stat);
    document.body.style.cursor = 'default';

    if (res.success) {
        await loadTracking();
        document.getElementById('bulk-emp-select').value = "";
        document.getElementById('bulk-status-select').value = "";
    } else {
        alert("Error updating records: " + res.error);
    }
}

async function applyBulkDelete() {
    const checkboxes = document.querySelectorAll('.row-checkbox:checked');
    const chalaan_nos = Array.from(checkboxes).map(cb => parseInt(cb.value));
    
    if (chalaan_nos.length === 0) return;

    const isConfirmed = confirm(`Are you sure you want to permanently delete these ${chalaan_nos.length} selected chalaans?`);
    if (isConfirmed) {
        document.body.style.cursor = 'wait';
        const res = await pywebview.api.bulk_delete_tracking(chalaan_nos);
        document.body.style.cursor = 'default';

        if (res.success) {
            await loadTracking();
        } else {
            alert("Error deleting records: " + res.error);
        }
    }
}

async function triggerRefresh() {
    const btn = document.getElementById('refresh-btn');
    const originalText = "Refresh Data";
    btn.innerText = "Refreshing...";
    
    await loadTracking(); // Reload the data
    
    btn.innerText = "✓ Data Refreshed";
    setTimeout(() => { btn.innerText = originalText; }, 1000);
}
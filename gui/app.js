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
            opt.value = store;
            opt.innerHTML = store;
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

async function generateBulk() {
    const state = document.getElementById('state-select').value;
    const clientName = document.getElementById('client-name').value || "Unknown Client";
    if (!outputFolder) return alert("Please click 'Choose Save Location' to select where to save the files.");
    if (!state) return alert("Please select a state from the dropdown first.");
    
    document.body.style.cursor = 'wait'; 
    const res = await pywebview.api.generate_pdfs(currentStores, state, outputFolder, clientName);
    document.body.style.cursor = 'default'; 
    
    if (res.success) alert(`Successfully generated ${res.count} Chalaans.\nSaved to: ${res.path}`);
    else alert("Error: " + res.error);
}

async function generateSingle() {
    const state = document.getElementById('state-select').value;
    const store = document.getElementById('single-store-select').value;
    const clientName = document.getElementById('client-name').value || "Unknown Client";
    if (!outputFolder) return alert("Please click 'Choose Save Location' first.");
    if (!state) return alert("Please select a state.");
    if (!store) return alert("Please select a store.");

    document.body.style.cursor = 'wait';
    const res = await pywebview.api.generate_pdfs([store], state, outputFolder, clientName);
    document.body.style.cursor = 'default';
    
    if (res.success) alert(`Successfully generated Challan for ${store}.\nSaved to: ${res.path}`);
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
}

async function addEmployee() {
    const name = document.getElementById('new-emp-name').value;
    if (!name) return;
    const res = await pywebview.api.add_employee(name);
    if (res.error) alert(res.error);
    else { document.getElementById('new-emp-name').value = ''; loadEmployees(); }
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
            <td>${row.store_name}</td>
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
    const emp = tr.querySelectorAll('select')[0].value;
    const stat = tr.querySelectorAll('select')[1].value;
    
    await pywebview.api.update_tracking(chalaan_no, emp, stat);
    
    const savedMsg = tr.querySelector(`#saved-${chalaan_no}`);
    savedMsg.style.display = 'inline';
    setTimeout(() => { savedMsg.style.display = 'none'; }, 2000);
}

function filterTracking() {
    const filterText = document.getElementById('search-tracking').value.toLowerCase();
    const tbody = document.getElementById('tracking-body');
    const rows = tbody.getElementsByTagName('tr');

    for (let i = 0; i < rows.length; i++) {
        // Grab standard text from the first 3 columns (No, Store, Date)
        const chalaanNo = rows[i].getElementsByTagName('td')[0].innerText.toLowerCase();
        const storeName = rows[i].getElementsByTagName('td')[1].innerText.toLowerCase();
        const dateStr = rows[i].getElementsByTagName('td')[2].innerText.toLowerCase();
        
        // Grab the actively selected values from the dropdowns (Employee, Status)
        const selects = rows[i].querySelectorAll('select');
        const employee = selects[0].value.toLowerCase();
        const status = selects[1].value.toLowerCase();
        
        // Combine all data into one searchable string
        const combinedData = `${chalaanNo} ${storeName} ${dateStr} ${employee} ${status}`;
        
        // Hide or show row based on match
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

# Automated Challan Generator

A custom, standalone desktop application developed for **Timeless Impressions 24 Retail**. This tool automates the process of matching Store Master data with daily Campaign Estimate data (via Excel) to instantly generate perfectly formatted PDF Delivery Challans. It also features a fully functional, locally hosted database for tracking delivery staff, shipment statuses, and historical records.

---

## 🌟 Comprehensive Feature Set

### 1. Document Generation Engine
* **Intelligent Excel Parsing:** Automatically ingests `.xlsx` files using `openpyxl`. Matches store codes between the Master spreadsheet and the daily Estimate spreadsheet, gracefully handling missing data and falling back to Estimate store names if Master names are absent.
* **Automated PDF Rendering:** Utilizes `reportlab` to render pixel-perfect, branded PDF challans. Includes custom typography rules (strictly matched 7pt fonts across all table and header elements for visual consistency).
* **Single & Bulk Modes:** * *Single Mode:* Generates an individual PDF for a specific store. The UI dropdown intelligently displays human-readable Store Names while passing precise Store Codes to the backend.
  * *Bulk Mode:* Compiles dozens or hundreds of store challans into a single, massive, multi-page PDF document for easy mass-printing.
* **Filename Sanitization:** Employs Regular Expressions (`Regex`) to automatically strip illegal Windows characters (`\ / * ? : " < > |`) from store names, preventing OS-level file-saving crashes.

### 2. Employee & Delivery Tracking (SQLite)
* **Local Database:** A built-in SQLite database (`~/ChalaanApp_Data.db`) automatically logs every generated challan, assigning it a unique sequential tracking number.
* **Employee Management:** Add or remove delivery staff. 
  * *Historical Safety:* Deleting an employee removes them from future dropdowns but safely preserves their name marked as "(Deleted)" on historical challan records to maintain data integrity.
* **Status Tracking:** Update challan statuses (Pending / Received). 
  * *Strict Validation:* The system actively prevents marking a challan as "Received" if the assigned employee is currently "Unassigned".

### 3. Bulk Actions Dashboard
* Select multiple tracking records simultaneously via UI checkboxes.
* **Bulk Assign:** Assign a specific delivery driver to dozens of shipments in one click.
* **Bulk Status Update:** Update the delivery status of multiple records. Includes the same strict validation to prevent closing unassigned shipments en masse.
* **Bulk Delete:** Permanently purge selected test or erroneous records from the database.

### 4. Data Security & Portability
* **One-Click Backup:** Export the entire SQLite database (`.db` file) to a USB drive or cloud folder.
* **Database Restore:** Safely import an older backup to instantly overwrite and restore the application's tracking data and sequence numbers.

---

## 🛠️ Technology Stack

* **Backend Engine:** Python 3
* **Frontend UI:** HTML5, CSS3, Vanilla JavaScript
* **GUI Bridge:** `pywebview` (Renders the web interface natively in a desktop window without requiring a browser)
* **PDF Rendering:** `reportlab`
* **Excel Processing:** `openpyxl`
* **Database:** SQLite3

---

## 💻 Developer Setup & Installation

To run this project from the source code, follow these steps:

**1. Directory Structure**
Ensure your folder structure looks exactly like this:
```text
ChallanGenerator/
│
├── app.py                 # Core Python backend API
├── requirements.txt       # Python dependencies
│
├── gui/                   # Frontend interface assets
│   ├── index.html
│   ├── style.css
│   └── app.js
│
├── assets/                # Images and Branding
│   ├── logo.png   
│   └── sign.png
│
└── app_icon.ico           # Application Icon

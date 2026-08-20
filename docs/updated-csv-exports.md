# Updating Source CSV Files

This guide walks you through downloading and preparing the official SUCKit data files for use with the map generator.  
Follow each step carefully. If anything looks different in your spreadsheet, stop and ask for help.

## Prerequisites

- A Google account
- A web browser
- Access to your project folder:
  - `<script directory>/data`
  - `<script directory>/data/Custom`

> Important: Editing the original SUCKit spreadsheet is NEVER allowed. Always work on your own copy.

---

## Step 1: Create Your Working Copy

1. Open the official SUCKit spreadsheet:  
   https://docs.google.com/spreadsheets/d/1uO6aZ20rfEcAZJ-nDRhCnaNUiCPemuoOOd67Zqi1MVM
2. Click **File** → **Make a copy**.
3. Choose a location in your Google Drive and click **OK**.
4. Open the new copy in your Drive.

---

## Step 2: Show Required Sheets

1. Click **View** → **Show Systems CSV Export**.
2. Click **View** → **Show Factions CSV Export**.
3. At the bottom of the page, click the sheet tab named **Systems Sheet Description**.

---

## Step 3: Download Systems Sheet Description

1. With **Systems Sheet Description** selected, click **File** → **Download** → **Comma Separated Values (.csv)**.
2. Save the file.  
   Expected name:  
   `Sarna Unified Cartography Kit (Official) - Systems Sheet Description`

---

## Step 4: Update and Download Factions CSV

1. At the bottom of the page, click the sheet tab **Show Factions CSV Export**.
2. Right-click the column header **C** and choose **Insert 2 columns right**.
3. Click cell **A1**.
4. In the formula bar at the top, change:
   - From: `={!Factions!A:C}`
   - To:   `={!Factions!A:E}`
   - Press **Enter**. The new columns will fill automatically.
5. Click **File** → **Download** → **Comma Separated Values (.csv)**.
6. Save the file.  
   Expected name:  
   `Sarna Unified Cartography Kit (Official) - Factions CSV Export`

---

## Step 5: Update and Download Systems CSV

1. At the bottom of the page, click the sheet tab **Show Systems CSV Export**.
2. Right-click column **E** (labeled 2271) and choose **Insert 1 column left**.
   - A new empty column E is created.
3. At the bottom of the page, click the sheet tab **Systems**.
4. Click cell **F2** (the “size” column).
5. Select all cells below it:
   - On Windows: `Ctrl + Shift + ↓`
   - On Mac: `Cmd + Shift + ↓`
6. Copy the selection:
   - On Windows: `Ctrl + C`
   - On Mac: `Cmd + C`
7. Return to the **Show Systems CSV Export** sheet.
8. Click the new column **E** (the first empty cell).
9. Paste the data:
   - On Windows: `Ctrl + V`
   - On Mac: `Cmd + V`
10. Click **File** → **Download** → **Comma Separated Values (.csv)**.
11. Save the file.  
    Expected name:  
    `Sarna Unified Cartography Kit (Official) - Systems CSV Export`

---

## Step 6: Add Files to Your Project

1. In your project folder, locate:
   - `<script directory>/data`
   - `<script directory>/data/Custom`
2. If you plan to customize the data:
   - Copy the default CSV files from `/data` into `/data/Custom`.
   - Always edit files in `/data/Custom`, never in `/data`.
3. Move your newly downloaded CSV files into `/data/Custom`.
4. Keep the full original names exactly as shown:
   - `Sarna Unified Cartography Kit (Official) - Systems CSV Export`
   - `Sarna Unified Cartography Kit (Official) - Factions CSV Export`
   - `Sarna Unified Cartography Kit (Official) - Systems Sheet Description`

Your data is now ready for the map generator.

---

## Quick Checklist

- [ ] Made a copy of the official SUCKit spreadsheet
- [ ] Downloaded Systems Sheet Description CSV
- [ ] Updated and downloaded Factions CSV
- [ ] Updated and downloaded Systems CSV
- [ ] Placed all three files in `/data/Custom` with their full original names

If you get stuck or see unexpected columns/labels, take a screenshot and share it with the maintainers.

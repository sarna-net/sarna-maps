import csv

def column_index(col_letter: str) -> int:
    """
    Convert Excel-style column letter(s) to 0-based index.
    Example: 'A' -> 0, 'B' -> 1, 'Y' -> 24
    """
    index = 0
    for char in col_letter.upper():
        index = index * 26 + (ord(char) - ord('A') + 1)
    return index - 1

# Abbreviations dictionary
# Abbreviations = factionID
# Strings = systemName (alt names supported)
abbreviations = {
    # Add more key-value pairs as needed
    # Ref: "abbr1": ["string1", "string2"],
}

# Configuration
file_path = '' # <script directory>/data/Custom/<CUSTOM NAME> - Systems CSV Export.csv
col_b_letter = 'B'  # systemName column
col_y_letter = 'Y'  # target era column

col_b_index = column_index(col_b_letter)
col_y_index = column_index(col_y_letter)

# Read CSV into memory
with open(file_path, mode='r', encoding='utf-8', newline='') as f:
    reader = csv.reader(f)
    rows = list(reader)

# Process each row
for row in rows:
    # Ensure row has enough columns for B
    if len(row) <= col_b_index:
        continue

    cell_b_value = row[col_b_index].strip()
    if not cell_b_value:
        continue

    # Split into parts: outside [] and inside []
    parts = []
    if '[' in cell_b_value and ']' in cell_b_value:
        outside = cell_b_value.split('[')[0].strip()
        inside = cell_b_value.split(']')[1].strip()
        parts = [outside, inside]
    else:
        parts = [cell_b_value]

    # Check each part against abbreviations (first match wins, in dict order)
    for abbr, strings in abbreviations.items():
        for s in strings:
            for part in parts:
                if s in part:
                    # Ensure row has enough columns for Y
                    if len(row) <= col_y_index:
                        row.extend([''] * (col_y_index - len(row) + 1))
                    row[col_y_index] = abbr
                    break
            else:
                continue
            break
        else:
            continue
        break

# Write updated rows back to CSV
with open(file_path, mode='w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f)
    writer.writerows(rows)
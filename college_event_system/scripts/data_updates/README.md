# Folder-Based Data Updates

Drop update files into table folders, then run one command.

Supported file types per folder:
- `.json`
- `.csv`
- `.xlsx` / `.xls`
- `.txt`

## Folder Layout

- `data_updates/departments/`
- `data_updates/users/`
- `data_updates/clubs/`
- `data_updates/venues/`
- `data_updates/events/`
- `data_updates/registrations/`
- `data_updates/money_collection/`

## Commands

From `college_event_system/scripts`:

```bat
update_data_folder.bat setup
update_data_folder.bat dry
update_data_folder.bat run
```

Run only one table folder:

```bat
update_data_folder.bat table-dry users
update_data_folder.bat table-run users
```

## TXT File Formats

TXT supports these forms:
1. JSON Lines (one JSON object per line)
2. CSV-like text (first line header, comma-separated)
3. Plain lines (fallback: imported as `{ "value": "..." }`)

For reliable updates, prefer CSV/JSON/XLSX.

## Cleaning Rules

- Unknown columns are removed before upsert.
- Common aliases are mapped to DB column names.
- Empty/null-like values are normalized.
- Per-table defaults are applied when needed.
- Rows missing required conflict keys are skipped.
- Duplicate rows in the same run are merged by conflict key (latest row wins).

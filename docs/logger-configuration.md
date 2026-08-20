# Faction Traversal Logger Configuration

This document explains how to configure the faction traversal logger, which tracks how faction values flow through the map generation pipeline. This is useful for debugging why certain systems get unexpected colors.

---

## What the Logger Does

When enabled, the logger writes a line to `faction-traversal-log.txt` every time a faction value is encountered during map generation. Each log entry includes:

- **timestamp** - When the value was processed
- **file** - Which file/process stage
- **stage** - The processing stage name
- **value** - The faction ID (e.g., `FWL`, `CIZ3B`, `LCAF`)

---

## Default Configuration (Recommended)

The logger automatically loads settings from `config/global/faction-traversal.config.yaml`. This is the **default and recommended** way to configure the logger.

### Configuration File

Create or edit `config/global/faction-traversal.config.yaml`:

```yaml
# Enable/disable faction traversal logging
enabled: true

# Logging level: 'debug' | 'info' | 'warn' | 'error'
level: 'debug'

# Log frequency: 'all' | 'every-fifth' | 'every-tenth'
logFrequency: 'all'

# Regex pattern to match faction values
# Only logs values matching this pattern when enabled=true
pattern: 'FWL'

# Files to exclude from tracing (by file identifier)
excludeFiles:
  # - 'extract-border-state-affiliation.ts'
  # - 'retain-faction-affiliation-pairing.ts'
```

### Settings Explained

| Setting | Options | Description |
|---------|---------|-------------|
| `enabled` | `true` / `false` | Toggle logging on/off. Default: `true` |
| `level` | `debug` / `info` / `warn` / `error` | Controls internal logger level for faction traces |
| `logFrequency` | `all` / `every-fifth` / `every-tenth` | Reduce log volume by logging only every Nth matching call |
| `pattern` | Any regex | Only log faction values matching this pattern. Default: `FWL` |
| `excludeFiles` | Array of strings | List of files to exclude from tracing (partial match) |

### Log Frequency Options

| Option | Behavior |
|--------|----------|
| `all` | Log every matching call |
| `every-fifth` | Log every 5th matching call |
| `every-tenth` | Log every 10th matching call |

---

## Option 2: Override via Generator Config

You can also override YAML settings via your map generator config file (e.g., `innersphere-3059-dark.config.yaml`):

```yaml
# Enable debug mode to log ALL faction values
debugMode: true

# Optional: Set a custom regex pattern to match only specific factions
factionTracePattern: 'FWL'
```

### How It Works

When `main.ts` runs:
1. **YAML config loads first** - Settings from `config/global/faction-traversal.config.yaml` are used as defaults
2. **Generator config can override** - If `debugMode` or `factionTracePattern` are set in the generator config, they override the YAML values

---

## Option 3: Programmatic Override

Import and call `configureFactionTracing()` directly in `src/main.ts` to override YAML settings at runtime:

```typescript
import { configureFactionTracing } from './common/utils/faction-traversal-logger';

configureFactionTracing({
  enabled: true,
  level: 'debug',
  pattern: 'FWL',
  logFrequency: 'all',
  excludeFiles: ['extract-border-state-affiliation.ts']
});
```

### Function Signature

```typescript
function configureFactionTracing(options: {
  enabled?: boolean;
  level?: 'debug' | 'info' | 'warn' | 'error';
  pattern?: string;
  logFrequency?: 'all' | 'every-fifth' | 'every-tenth';
  excludeFiles?: string[];
}): void;
```

---

## Example Scenarios

### Scenario 1: Find why Marik shows wrong color

```yaml
# config/global/faction-traversal.config.yaml
enabled: true
pattern: 'FWL'
```

Run the generator, then check `faction-traversal-log.txt` for all `FWL` entries.

### Scenario 2: Debug multiple factions at once

```yaml
enabled: true
pattern: 'FWL|LCAF|CC|Davion'
```

### Scenario 3: Exclude noisy files

```yaml
enabled: true
pattern: 'FWL'
excludeFiles:
  - 'extract-border-state-affiliation.ts'
  - 'parse-single-system.ts'
```

### Scenario 4: Reduce log volume

```yaml
enabled: true
pattern: 'CIZ'
logFrequency: 'every-tenth'
```

---

## Output Location

Logs are written to:

```
faction-traversal-log.txt
```

in the project root (where you run `npm start`).

---

## Programmatic Access

### Get Current Config

```typescript
import { getFactionTracingConfig } from './common/utils/faction-traversal-logger';

const config = getFactionTracingConfig();
console.log(config.enabled, config.pattern, config.excludeFiles);
```

### Reset Config (Testing)

```typescript
import { resetFactionTracingConfig } from './common/utils/faction-traversal-logger';

// Resets to defaults - useful for testing
resetFactionTracingConfig();
```
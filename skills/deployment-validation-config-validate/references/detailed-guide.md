# Configuration Validation - Detailed Guide

> This file contains the detailed procedure and reference material extracted from `SKILL.md` for focused loading. The root skill defines activation, examples, safety constraints, and limitations.

## Context
The user needs to validate configuration files, implement configuration schemas, ensure consistency across environments, and prevent configuration-related errors. Focus on creating robust validation rules, type safety, security checks, and automated validation processes.


## Requirements
$ARGUMENTS


## Instructions

The examples are independent architecture fragments, not complete applications. Missing helpers (ignore/type/environment detection, secret heuristic, config loading and envelope detection) must be implemented and reviewed before use; do not claim a scan or runtime reload from these stubs. Never execute config.js to inspect untrusted configuration. Bound file size/depth, refuse symlink escapes, deduplicate discovery and parse YAML safely. Runtime watching needs serialized/debounced reloads and a stored watcher closed on shutdown. Schemas validate shape, not TLS connectivity, password strength or secret absence; environment encryption/password rules need explicit checks before claiming enforcement. Redact examples and documentation defaults.

### 1. Configuration Analysis

Analyze existing configuration structure and identify validation needs:

```python
import os
import re
import yaml
import json
from pathlib import Path
from typing import Dict, List, Any

class ConfigurationAnalyzer:
    def analyze_project(self, project_path: str) -> Dict[str, Any]:
        analysis = {
            'config_files': self._find_config_files(project_path),
            'security_issues': self._check_security_issues(project_path),
            'consistency_issues': self._check_consistency(project_path),
            'recommendations': []
        }
        return analysis

    def _find_config_files(self, project_path: str) -> List[Dict]:
        config_patterns = [
            '**/*.json', '**/*.yaml', '**/*.yml', '**/*.toml',
            '**/*.ini', '**/*.env*', '**/config.js'
        ]

        config_files = []
        for pattern in config_patterns:
            for file_path in Path(project_path).glob(pattern):
                if not self._should_ignore(file_path):
                    config_files.append({
                        'path': str(file_path),
                        'type': self._detect_config_type(file_path),
                        'environment': self._detect_environment(file_path)
                    })
        return config_files

    def _check_security_issues(self, project_path: str) -> List[Dict]:
        issues = []
        secret_patterns = [
            r'(api[_-]?key|apikey)',
            r'(secret|password|passwd)',
            r'(token|auth)',
            r'(aws[_-]?access)'
        ]

        for config_file in self._find_config_files(project_path):
            content = Path(config_file['path']).read_text()
            for pattern in secret_patterns:
                if re.search(pattern, content, re.IGNORECASE):
                    if self._looks_like_real_secret(content, pattern):
                        issues.append({
                            'file': config_file['path'],
                            'type': 'potential_secret',
                            'severity': 'high'
                        })
        return issues
```

### 2. Schema Validation

Implement configuration schema validation with JSON Schema:

```typescript
import Ajv from 'ajv';
import ajvFormats from 'ajv-formats';
import { JSONSchema7 } from 'json-schema';

interface ValidationResult {
  valid: boolean;
  errors?: Array<{
    path: string;
    message: string;
    keyword: string;
  }>;
}

export class ConfigValidator {
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      strict: true,
      coerceTypes: false
    });
    ajvFormats(this.ajv);
    this.addCustomFormats();
    for (const [name, schema] of Object.entries(schemas)) this.ajv.addSchema(schema, name);
  }

  private addCustomFormats() {
    this.ajv.addFormat('url-https', {
      type: 'string',
      validate: (data: string) => {
        try {
          return new URL(data).protocol === 'https:';
        } catch { return false; }
      }
    });

    this.ajv.addFormat('port', {
      type: 'number',
      validate: (data: number) => Number.isInteger(data) && data >= 1 && data <= 65535
    });

    this.ajv.addFormat('simple-duration', {
      type: 'string',
      validate: /^\d+[smhd]$/
    });
  }

  validate(configData: any, schemaName: string): ValidationResult {
    const validate = this.ajv.getSchema(schemaName);
    if (!validate) throw new Error(`Schema '${schemaName}' not found`);

    const valid = validate(configData);

    if (!valid && validate.errors) {
      return {
        valid: false,
        errors: validate.errors.map(error => ({
          path: error.instancePath || '/',
          message: error.message || 'Validation error',
          keyword: error.keyword
        }))
      };
    }
    return { valid: true };
  }
}

// Example schema
export const schemas = {
  database: {
    type: 'object',
    properties: {
      host: { type: 'string', format: 'hostname' },
      port: { type: 'integer', format: 'port' },
      database: { type: 'string', minLength: 1 },
      user: { type: 'string', minLength: 1 },
      password: { type: 'string', minLength: 8 },
      ssl: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' }
        },
        required: ['enabled']
      }
    },
    required: ['host', 'port', 'database', 'user', 'password']
  }
};
```

### 3. Environment-Specific Validation

```python
from typing import Dict, List, Any
from urllib.parse import urlparse

class EnvironmentValidator:
    def __init__(self):
        self.environments = ['development', 'production'] # Add explicit reviewed staging policy before accepting it.
        self.environment_rules = {
            'development': {
                'allow_debug': True,
                'require_https': False,
                'min_password_length': 8
            },
            'production': {
                'allow_debug': False,
                'require_https': True,
                'min_password_length': 16,
                'require_encryption': True
            }
        }

    def validate_config(self, config: Dict, environment: str) -> List[Dict]:
        if environment not in self.environment_rules:
            raise ValueError(f"Unknown environment: {environment}")

        rules = self.environment_rules[environment]
        violations = []

        if not rules['allow_debug'] and config.get('debug', False):
            violations.append({
                'rule': 'no_debug_in_production',
                'message': 'Debug mode not allowed in production',
                'severity': 'critical'
            })

        if rules['require_https']:
            urls = self._extract_urls(config)
            for url_path, url in urls:
                if urlparse(url).scheme != 'https':
                    violations.append({
                        'rule': 'require_https',
                        'message': f'HTTPS required for {url_path}',
                        'severity': 'high'
                    })

        return violations
```

### 4. Configuration Testing

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { ConfigValidator } from './config-validator';

describe('Configuration Validation', () => {
  let validator: ConfigValidator;

  beforeEach(() => {
    validator = new ConfigValidator();
  });

  it('should validate database config', () => {
    const config = {
      host: 'localhost',
      port: 5432,
      database: 'myapp',
      user: 'dbuser',
      password: 'securepass123'
    };

    const result = validator.validate(config, 'database');
    expect(result.valid).toBe(true);
  });

  it('should reject invalid port', () => {
    const config = {
      host: 'localhost',
      port: 70000,
      database: 'myapp',
      user: 'dbuser',
      password: 'securepass123'
    };

    const result = validator.validate(config, 'database');
    expect(result.valid).toBe(false);
  });
});
```

### 5. Runtime Validation

```typescript
import { EventEmitter } from 'events';
import * as chokidar from 'chokidar';

export class RuntimeConfigValidator extends EventEmitter {
  private currentConfig: any;
  constructor(private validator: ConfigValidator, private schemaName: string) { super(); }

  async initialize(configPath: string): Promise<void> {
    this.currentConfig = await this.loadAndValidate(configPath);
    this.watchConfig(configPath);
  }

  private async loadAndValidate(configPath: string): Promise<any> {
    const config = await this.loadConfig(configPath);

    const validationResult = this.validator.validate(
      config,
      this.schemaName
    );

    if (!validationResult.valid) {
      this.emit('validation:error', {
        path: configPath,
        errors: validationResult.errors
      });

      throw new Error('Configuration validation failed'); // Never install invalid config, including development.
    }

    return config;
  }

  private watchConfig(configPath: string): void {
    const watcher = chokidar.watch(configPath, {
      persistent: true,
      ignoreInitial: true
    });

    watcher.on('change', async () => {
      try {
        const newConfig = await this.loadAndValidate(configPath);

        if (JSON.stringify(newConfig) !== JSON.stringify(this.currentConfig)) {
          this.emit('config:changed', {
            changed: true // Do not emit raw configs containing secrets.
          });
          this.currentConfig = newConfig;
        }
      } catch (error) {
        this.emit('config:error', { error });
      }
    });
  }
}
```

### 6. Configuration Migration

```python
from typing import Dict, List
from copy import deepcopy
from abc import ABC, abstractmethod
import semver

class ConfigMigration(ABC):
    @property
    @abstractmethod
    def version(self) -> str:
        pass

    @abstractmethod
    def up(self, config: Dict) -> Dict:
        pass

    @abstractmethod
    def down(self, config: Dict) -> Dict:
        pass

class ConfigMigrator:
    def __init__(self):
        self.migrations: List[ConfigMigration] = []

    def migrate(self, config: Dict, target_version: str) -> Dict:
        current_version = config.get('_version', '0.0.0')

        if semver.compare(current_version, target_version) == 0:
            return config

        if semver.compare(current_version, target_version) > 0:
            raise ValueError('Downgrade not implemented; refusing silent no-op')
        result = deepcopy(config)
        for migration in sorted(self.migrations, key=lambda m: semver.Version.parse(m.version)):
            if (semver.compare(migration.version, current_version) > 0 and
                semver.compare(migration.version, target_version) <= 0):
                result = migration.up(result)
                result['_version'] = migration.version

        if result.get('_version', '0.0.0') != target_version:
            raise ValueError('Migration path does not reach requested version')
        return result
```

### 7. Secure Configuration

```typescript
import * as crypto from 'crypto';

interface EncryptedValue {
  encrypted: true;
  value: string;
  algorithm: string;
  iv: string;
  authTag: string;
}

export class SecureConfigManager {
  private encryptionKey: Buffer;

  constructor(key: Buffer) {
    if (key.length !== 32) throw new Error('Require a 32-byte key from an approved secret manager');
    this.encryptionKey = Buffer.from(key);
  }

  encrypt(value: any): EncryptedValue {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(JSON.stringify(value), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted: true,
      value: encrypted,
      algorithm,
      iv: iv.toString('hex'),
      authTag: cipher.getAuthTag().toString('hex')
    };
  }

  decrypt(encryptedValue: EncryptedValue): any {
    if (encryptedValue.algorithm !== 'aes-256-gcm' || !/^[a-f0-9]{32}$/i.test(encryptedValue.iv) || !/^[a-f0-9]{32}$/i.test(encryptedValue.authTag)) throw new Error('Invalid encrypted envelope');
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      Buffer.from(encryptedValue.iv, 'hex')
    );

    if (encryptedValue.authTag) {
      decipher.setAuthTag(Buffer.from(encryptedValue.authTag, 'hex'));
    }

    let decrypted = decipher.update(encryptedValue.value, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  async processConfig(config: any): Promise<any> {
    if (Array.isArray(config)) return Promise.all(config.map(v => this.processConfig(v)));
    if (config === null || typeof config !== 'object') return config;
    const processed: Record<string, unknown> = Object.create(null);

    for (const [key, value] of Object.entries(config)) {
      if (this.isEncryptedValue(value)) {
        processed[key] = this.decrypt(value as EncryptedValue);
      } else if (typeof value === 'object' && value !== null) {
        processed[key] = await this.processConfig(value);
      } else {
        processed[key] = value;
      }
    }

    return processed;
  }
}
```

### 8. Documentation Generation

```python
from typing import Dict, List
import yaml

class ConfigDocGenerator:
    def generate_docs(self, schema: Dict, examples: Dict) -> str:
        docs = ["# Configuration Reference\n"]

        docs.append("## Configuration Options\n")
        sections = self._generate_sections(schema.get('properties', {}), examples)
        docs.extend(sections)

        return '\n'.join(docs)

    def _generate_sections(self, properties: Dict, examples: Dict, level: int = 3) -> List[str]:
        sections = []

        for prop_name, prop_schema in properties.items():
            sections.append(f"{'#' * level} {prop_name}\n")

            if 'description' in prop_schema:
                sections.append(f"{prop_schema['description']}\n")

            sections.append(f"**Type:** `{prop_schema.get('type', 'any')}`\n")

            if 'default' in prop_schema:
                sections.append(f"**Default:** `{prop_schema['default']}`\n")

            if prop_name in examples:
                sections.append("**Example:**\n```yaml")
                sections.append(yaml.dump({prop_name: examples[prop_name]}))
                sections.append("```\n")

        return sections
```


## Output Format

1. **Configuration Analysis**: Current configuration assessment
2. **Validation Schemas**: JSON Schema definitions
3. **Environment Rules**: Environment-specific validation
4. **Test Suite**: Configuration tests
5. **Migration Scripts**: Version migrations
6. **Security Report**: Issues and recommendations
7. **Documentation**: Auto-generated reference

Focus on preventing configuration errors, ensuring consistency, and maintaining security best practices.

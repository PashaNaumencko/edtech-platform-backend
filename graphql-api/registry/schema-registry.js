#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Schema Registry - Day 3 Implementation
 * Manages schema versions, validates changes, and integrates with Apollo Studio
 */
class SchemaRegistry {
  constructor(options = {}) {
    this.registryPath = options.registryPath || path.join(__dirname, 'versions');
    this.currentVersion = options.currentVersion || '1.0.0';
    this.environment = options.environment || 'development';
    this.apolloStudioConfig = options.apolloStudio || {
      graphId: 'edtech-platform',
      variant: this.environment
    };
    
    this.ensureRegistryDirectory();
  }

  ensureRegistryDirectory() {
    if (!fs.existsSync(this.registryPath)) {
      fs.mkdirSync(this.registryPath, { recursive: true });
    }
  }

  /**
   * Register a new schema version
   * @param {string} schema - The GraphQL schema SDL
   * @param {object} metadata - Version metadata (service, author, etc.)
   * @returns {Promise<string>} - The version hash
   */
  async registerSchema(schema, metadata = {}) {
    const timestamp = new Date().toISOString();
    const schemaHash = this.generateSchemaHash(schema);
    
    const versionInfo = {
      version: this.generateVersion(),
      hash: schemaHash,
      timestamp,
      environment: this.environment,
      schema,
      metadata: {
        author: metadata.author || 'system',
        service: metadata.service || 'supergraph',
        description: metadata.description || 'Schema update',
        breaking: metadata.breaking || false,
        ...metadata
      },
      validation: {
        compositionErrors: [],
        validationWarnings: [],
        status: 'pending'
      }
    };

    // Validate schema before registering
    const validationResult = await this.validateSchema(schema);
    versionInfo.validation = validationResult;

    if (validationResult.status === 'invalid') {
      throw new Error(`Schema validation failed: ${validationResult.compositionErrors.join(', ')}`);
    }

    // Save version to registry
    const versionFile = path.join(this.registryPath, `${versionInfo.version}.json`);
    fs.writeFileSync(versionFile, JSON.stringify(versionInfo, null, 2));

    // Update latest version pointer
    const latestFile = path.join(this.registryPath, 'latest.json');
    fs.writeFileSync(latestFile, JSON.stringify({ version: versionInfo.version, hash: schemaHash }, null, 2));

    console.log(`✅ Schema registered: ${versionInfo.version} (${schemaHash.substring(0, 8)})`);
    
    // Push to Apollo Studio if configured
    if (process.env.APOLLO_KEY) {
      await this.publishToApolloStudio(schema, versionInfo);
    }

    return versionInfo.version;
  }

  /**
   * Validate schema composition and compatibility
   */
  async validateSchema(schema) {
    const result = {
      status: 'valid',
      compositionErrors: [],
      validationWarnings: [],
      breakingChanges: []
    };

    try {
      // Basic SDL validation
      const { buildSchema } = require('graphql');
      buildSchema(schema);

      // Get previous version for compatibility check
      const previousVersion = this.getLatestVersion();
      if (previousVersion) {
        const breakingChanges = this.detectBreakingChanges(previousVersion.schema, schema);
        result.breakingChanges = breakingChanges;
        
        if (breakingChanges.length > 0) {
          result.validationWarnings.push(`Found ${breakingChanges.length} breaking changes`);
        }
      }

    } catch (error) {
      result.status = 'invalid';
      result.compositionErrors.push(error.message);
    }

    return result;
  }

  /**
   * Detect breaking changes between schema versions
   */
  detectBreakingChanges(oldSchema, newSchema) {
    // Simplified breaking change detection
    // In production, use @apollo/composition or graphql-inspector
    const breakingChanges = [];
    
    // Check for removed types/fields (basic implementation)
    const oldLines = oldSchema.split('\n').filter(line => line.trim().startsWith('type ') || line.trim().includes(':'));
    const newLines = newSchema.split('\n').filter(line => line.trim().startsWith('type ') || line.trim().includes(':'));
    
    oldLines.forEach(oldLine => {
      if (!newLines.includes(oldLine) && oldLine.trim().length > 0) {
        breakingChanges.push({
          type: 'REMOVED',
          description: `Possibly removed: ${oldLine.trim()}`,
          severity: 'breaking'
        });
      }
    });

    return breakingChanges;
  }

  /**
   * Publish schema to Apollo Studio
   */
  async publishToApolloStudio(schema, versionInfo) {
    try {
      const { execSync } = require('child_process');
      
      const command = `npx apollo-tooling schema:publish \
        --graph=${this.apolloStudioConfig.graphId} \
        --variant=${this.apolloStudioConfig.variant} \
        --tag=${versionInfo.version}`;

      console.log('🚀 Publishing to Apollo Studio...');
      execSync(command, { stdio: 'inherit' });
      console.log('✅ Published to Apollo Studio successfully');
    } catch (error) {
      console.warn('⚠️  Apollo Studio publish failed:', error.message);
    }
  }

  /**
   * Generate schema hash for tracking
   */
  generateSchemaHash(schema) {
    return crypto.createHash('sha256').update(schema).digest('hex');
  }

  /**
   * Generate semantic version
   */
  generateVersion() {
    const latest = this.getLatestVersion();
    if (!latest) {
      return '1.0.0';
    }

    const [major, minor, patch] = latest.version.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }

  /**
   * Get latest registered version
   */
  getLatestVersion() {
    const latestFile = path.join(this.registryPath, 'latest.json');
    if (!fs.existsSync(latestFile)) {
      return null;
    }

    const latest = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
    const versionFile = path.join(this.registryPath, `${latest.version}.json`);
    
    if (fs.existsSync(versionFile)) {
      return JSON.parse(fs.readFileSync(versionFile, 'utf8'));
    }

    return null;
  }

  /**
   * List all schema versions
   */
  listVersions() {
    if (!fs.existsSync(this.registryPath)) {
      return [];
    }

    return fs.readdirSync(this.registryPath)
      .filter(file => file.endsWith('.json') && file !== 'latest.json')
      .map(file => {
        const versionInfo = JSON.parse(fs.readFileSync(path.join(this.registryPath, file), 'utf8'));
        return {
          version: versionInfo.version,
          hash: versionInfo.hash.substring(0, 8),
          timestamp: versionInfo.timestamp,
          author: versionInfo.metadata.author,
          breaking: versionInfo.metadata.breaking,
          status: versionInfo.validation.status
        };
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Rollback to previous version
   */
  async rollback(targetVersion) {
    const versionFile = path.join(this.registryPath, `${targetVersion}.json`);
    if (!fs.existsSync(versionFile)) {
      throw new Error(`Version ${targetVersion} not found`);
    }

    const versionInfo = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
    
    // Update latest pointer
    const latestFile = path.join(this.registryPath, 'latest.json');
    fs.writeFileSync(latestFile, JSON.stringify({ 
      version: versionInfo.version, 
      hash: versionInfo.hash 
    }, null, 2));

    console.log(`✅ Rolled back to version ${targetVersion}`);
    return versionInfo;
  }
}

module.exports = { SchemaRegistry };

// CLI usage
if (require.main === module) {
  const registry = new SchemaRegistry();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'list':
      console.log('📋 Schema Versions:');
      console.table(registry.listVersions());
      break;
      
    case 'latest':
      const latest = registry.getLatestVersion();
      if (latest) {
        console.log(`📌 Latest: ${latest.version} (${latest.hash.substring(0, 8)})`);
        console.log(`📅 Date: ${latest.timestamp}`);
        console.log(`👤 Author: ${latest.metadata.author}`);
      } else {
        console.log('No versions registered');
      }
      break;
      
    default:
      console.log('Usage: node schema-registry.js [list|latest]');
  }
} 
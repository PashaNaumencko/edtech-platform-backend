#!/usr/bin/env node

const { composeServices } = require('@apollo/composition');
const fs = require('fs');
const path = require('path');

/**
 * Enhanced Schema Composition - Day 3 Implementation
 * Integrates with schema registry and error handling
 */

class EnhancedSchemaComposer {
  constructor(options = {}) {
    this.environment = options.environment || process.env.NODE_ENV || 'development';
    this.outputPath = options.outputPath || '../schemas/schema.graphql';
    this.registryPath = options.registryPath || '../registry';
    this.validateSchemas = options.validateSchemas !== false;
    this.publishToRegistry = options.publishToRegistry !== false;
  }

  async compose() {
    console.log('🚀 Starting enhanced schema composition...');
    console.log(`📝 Environment: ${this.environment}`);

    try {
      // Load service configurations
      const services = await this.loadServiceSchemas();
      
      if (services.length === 0) {
        throw new Error('No services found for composition');
      }

      // Validate individual schemas
      if (this.validateSchemas) {
        await this.validateIndividualSchemas(services);
      }

      // Compose supergraph
      const result = await this.composeSupergraph(services);

      // Register schema version
      if (this.publishToRegistry) {
        await this.registerSchemaVersion(result.supergraphSdl, services);
      }

      // Write output file
      await this.writeOutput(result.supergraphSdl);

      console.log('✅ Schema composition completed successfully!');
      return result;

    } catch (error) {
      console.error('❌ Schema composition failed:', error.message);
      
      // Log detailed error information
      if (error.validationErrors) {
        console.error('📋 Validation errors:');
        error.validationErrors.forEach((err, index) => {
          console.error(`  ${index + 1}. ${err.message}`);
        });
      }

      throw error;
    }
  }

  async loadServiceSchemas() {
    console.log('📁 Loading service schemas...');
    
    const serviceConfigs = [
      {
        name: 'user-service',
        url: `http://user-service.${this.environment}:3001/graphql`,
        schemaPath: '../apps/user-service/src/presentation/graphql/schemas/user.subgraph.graphql'
      },
      {
        name: 'learning-service',
        url: `http://learning-service.${this.environment}:3002/graphql`,
        schemaPath: '../apps/learning-service/src/presentation/graphql/schemas/learning.subgraph.graphql'
      },
      {
        name: 'tutor-matching-service',
        url: `http://tutor-matching-service.${this.environment}:3003/graphql`,
        schemaPath: '../apps/tutor-matching-service/src/presentation/graphql/schemas/tutor-matching.subgraph.graphql'
      },
      {
        name: 'payment-service',
        url: `http://payment-service.${this.environment}:3004/graphql`,
        schemaPath: '../apps/payment-service/src/presentation/graphql/schemas/payment.subgraph.graphql'
      }
    ];

    const services = [];

    for (const config of serviceConfigs) {
      const schemaFile = path.resolve(__dirname, config.schemaPath);
      
      if (fs.existsSync(schemaFile)) {
        try {
          const typeDefs = fs.readFileSync(schemaFile, 'utf8');
          
          if (typeDefs.trim().length === 0) {
            console.log(`⚠️  Empty schema file for ${config.name}`);
            continue;
          }

          services.push({
            name: config.name,
            url: config.url,
            typeDefs
          });
          
          console.log(`✅ Loaded ${config.name} (${typeDefs.length} chars)`);
        } catch (error) {
          console.log(`❌ Failed to load ${config.name}: ${error.message}`);
        }
      } else {
        console.log(`⚠️  Schema not found: ${config.name} at ${schemaFile}`);
      }
    }

    return services;
  }

  async validateIndividualSchemas(services) {
    console.log('🔍 Validating individual schemas...');
    
    const { buildSchema } = require('graphql');
    const validationErrors = [];

    for (const service of services) {
      try {
        buildSchema(service.typeDefs);
        console.log(`✅ ${service.name} schema is valid`);
      } catch (error) {
        const validationError = `${service.name}: ${error.message}`;
        validationErrors.push(validationError);
        console.log(`❌ ${validationError}`);
      }
    }

    if (validationErrors.length > 0) {
      const error = new Error('Schema validation failed');
      error.validationErrors = validationErrors;
      throw error;
    }
  }

  async composeSupergraph(services) {
    console.log('🔧 Composing supergraph...');
    
    const result = composeServices(services);
    
    if (result.errors && result.errors.length > 0) {
      console.error('❌ Composition errors:');
      result.errors.forEach((error, index) => {
        console.error(`  ${index + 1}. ${error.message}`);
      });
      
      const compositionError = new Error('Federation composition failed');
      compositionError.validationErrors = result.errors.map(e => e.message);
      throw compositionError;
    }

    console.log('✅ Supergraph composed successfully');
    console.log(`📊 Services: ${services.map(s => s.name).join(', ')}`);
    console.log(`📏 Schema size: ${result.supergraphSdl.length} characters`);

    return result;
  }

  async registerSchemaVersion(schema, services) {
    console.log('📝 Registering schema version...');
    
    try {
      // Import schema registry (if available)
      const { SchemaRegistry } = require('../registry/schema-registry.js');
      
      const registry = new SchemaRegistry({
        environment: this.environment
      });

      const metadata = {
        author: process.env.USER || 'system',
        service: 'supergraph',
        description: `Composed from: ${services.map(s => s.name).join(', ')}`,
        breaking: false,
        services: services.map(s => ({ name: s.name, url: s.url }))
      };

      const version = await registry.registerSchema(schema, metadata);
      console.log(`✅ Schema registered as version: ${version}`);
      
    } catch (error) {
      console.warn(`⚠️  Schema registry unavailable: ${error.message}`);
    }
  }

  async writeOutput(schema) {
    console.log('📄 Writing output file...');
    
    const outputFile = path.resolve(__dirname, this.outputPath);
    const outputDir = path.dirname(outputFile);
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Add header comment
    const header = `# EdTech Platform Supergraph Schema
# Generated: ${new Date().toISOString()}
# Environment: ${this.environment}
# DO NOT EDIT MANUALLY - This file is auto-generated

`;

    fs.writeFileSync(outputFile, header + schema);
    console.log(`✅ Schema written to: ${outputFile}`);
  }

  // Watch mode for development
  async watch() {
    console.log('👀 Starting schema composition in watch mode...');
    
    const chokidar = require('chokidar');
    const watchPaths = [
      '../apps/*/src/presentation/graphql/schemas/*.graphql'
    ];

    let isComposing = false;

    const compose = async () => {
      if (isComposing) return;
      
      isComposing = true;
      try {
        await this.compose();
      } catch (error) {
        console.error('Watch mode composition failed:', error.message);
      } finally {
        isComposing = false;
      }
    };

    // Initial composition
    await compose();

    // Watch for changes
    const watcher = chokidar.watch(watchPaths, { 
      ignored: /node_modules/,
      persistent: true,
      ignoreInitial: true
    });

    watcher.on('change', path => {
      console.log(`📝 Schema file changed: ${path}`);
      console.log('🔄 Recomposing...');
      compose();
    });

    console.log('👁️  Watching for schema changes...');
    console.log('Press Ctrl+C to stop');
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'compose';
  
  const composer = new EnhancedSchemaComposer({
    environment: process.env.NODE_ENV || 'development'
  });

  try {
    switch (command) {
      case 'compose':
        await composer.compose();
        break;
        
      case 'watch':
        await composer.watch();
        break;
        
      case 'validate':
        console.log('🔍 Running schema validation only...');
        const services = await composer.loadServiceSchemas();
        await composer.validateIndividualSchemas(services);
        console.log('✅ All schemas are valid');
        break;
        
      default:
        console.log(`Usage: node enhanced-compose.js [compose|watch|validate]`);
        console.log(`Current command: ${command}`);
    }
  } catch (error) {
    console.error('❌ Command failed:', error.message);
    process.exit(1);
  }
}

// Export for programmatic use
module.exports = { EnhancedSchemaComposer };

// Run if called directly
if (require.main === module) {
  main();
} 
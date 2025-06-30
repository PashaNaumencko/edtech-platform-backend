#!/usr/bin/env node

const { composeServices } = require('@apollo/composition');
const fs = require('fs');
const path = require('path');
const { serviceConfigs } = require('./compose-schemas');

async function validateSchemas() {
  console.log('🔍 Starting schema validation...');
  
  const services = [];
  const validationResults = {
    totalServices: serviceConfigs.length,
    loadedServices: 0,
    errors: [],
    warnings: []
  };
  
  // Load and validate individual schemas
  for (const config of serviceConfigs) {
    const schemaFile = path.resolve(__dirname, config.schemaPath);
    
    if (fs.existsSync(schemaFile)) {
      try {
        const typeDefs = fs.readFileSync(schemaFile, 'utf8');
        
        // Basic GraphQL syntax validation
        if (!typeDefs.trim()) {
          validationResults.errors.push(`${config.name}: Schema file is empty`);
          continue;
        }
        
        // Check for required federation directives
        if (!typeDefs.includes('@key') && !typeDefs.includes('extend type')) {
          validationResults.warnings.push(`${config.name}: No federation directives found (might not be federated)`);
        }
        
        services.push({
          name: config.name,
          url: config.url,
          typeDefs
        });
        
        validationResults.loadedServices++;
        console.log(`✅ ${config.name}: Schema loaded and basic validation passed`);
        
      } catch (error) {
        validationResults.errors.push(`${config.name}: Failed to read schema - ${error.message}`);
      }
    } else {
      validationResults.warnings.push(`${config.name}: Schema file not found at ${schemaFile}`);
    }
  }
  
  // Validate composition if we have any services
  if (services.length > 0) {
    console.log(`\n🔧 Validating composition with ${services.length} service(s)...`);
    
    try {
      const result = composeServices(services);
      
      if (result.errors && result.errors.length > 0) {
        console.log('\n❌ Composition errors found:');
        result.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error.message}`);
          validationResults.errors.push(`Composition: ${error.message}`);
        });
      } else {
        console.log('✅ Composition validation passed!');
      }
      
    } catch (error) {
      validationResults.errors.push(`Composition failed: ${error.message}`);
    }
  }
  
  // Print validation summary
  console.log('\n📊 Validation Summary:');
  console.log(`   Total services configured: ${validationResults.totalServices}`);
  console.log(`   Services with schemas: ${validationResults.loadedServices}`);
  console.log(`   Errors: ${validationResults.errors.length}`);
  console.log(`   Warnings: ${validationResults.warnings.length}`);
  
  if (validationResults.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    validationResults.warnings.forEach((warning, index) => {
      console.log(`   ${index + 1}. ${warning}`);
    });
  }
  
  if (validationResults.errors.length > 0) {
    console.log('\n❌ Errors:');
    validationResults.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
    
    console.log('\n💡 Please fix the errors above before proceeding with deployment.');
    process.exit(1);
  }
  
  console.log('\n🎉 All validations passed!');
  return validationResults;
}

// Run validation if called directly
if (require.main === module) {
  validateSchemas().catch(error => {
    console.error('❌ Unexpected validation error:', error);
    process.exit(1);
  });
}

module.exports = { validateSchemas }; 
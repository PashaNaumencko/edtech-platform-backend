#!/usr/bin/env node

const { composeServices } = require('@apollo/composition');
const fs = require('fs');
const path = require('path');

// Configuration for all microservices
const serviceConfigs = [
  {
    name: 'user-service',
    url: 'http://localhost:3001/graphql',
    schemaPath: '../apps/user-service/src/presentation/graphql/schemas/user.subgraph.graphql'
  },
  {
    name: 'learning-service', 
    url: 'http://localhost:3002/graphql',
    schemaPath: '../apps/learning-service/src/presentation/graphql/schemas/learning.subgraph.graphql'
  },
  {
    name: 'content-service',
    url: 'http://localhost:3003/graphql', 
    schemaPath: '../apps/content-service/src/presentation/graphql/schemas/content.subgraph.graphql'
  },
  {
    name: 'payment-service',
    url: 'http://localhost:3004/graphql',
    schemaPath: '../apps/payment-service/src/presentation/graphql/schemas/payment.subgraph.graphql'
  },
  {
    name: 'tutor-matching-service',
    url: 'http://localhost:3005/graphql',
    schemaPath: '../apps/tutor-matching-service/src/presentation/graphql/schemas/tutor-matching.subgraph.graphql'
  },
  {
    name: 'communication-service',
    url: 'http://localhost:3006/graphql',
    schemaPath: '../apps/communication-service/src/presentation/graphql/schemas/communication.subgraph.graphql'
  },
  {
    name: 'reviews-service',
    url: 'http://localhost:3007/graphql',
    schemaPath: '../apps/reviews-service/src/presentation/graphql/schemas/reviews.subgraph.graphql'
  },
  {
    name: 'analytics-service',
    url: 'http://localhost:3008/graphql',
    schemaPath: '../apps/analytics-service/src/presentation/graphql/schemas/analytics.subgraph.graphql'
  }
];

async function composeSupergraph() {
  console.log('🔧 Starting schema composition...');
  
  const services = [];
  
  // Load existing subgraph schemas
  for (const config of serviceConfigs) {
    const schemaFile = path.resolve(__dirname, config.schemaPath);
    
    if (fs.existsSync(schemaFile)) {
      const typeDefs = fs.readFileSync(schemaFile, 'utf8');
      services.push({
        name: config.name,
        url: config.url,
        typeDefs
      });
      console.log(`✅ Loaded schema for ${config.name}`);
    } else {
      console.log(`⚠️  Schema not found for ${config.name} at ${schemaFile}`);
    }
  }
  
  if (services.length === 0) {
    console.log('❌ No subgraph schemas found. Make sure services are implemented.');
    process.exit(1);
  }
  
  try {
    // Compose the supergraph
    const result = composeServices(services);
    
    if (result.errors && result.errors.length > 0) {
      console.error('❌ Composition errors:');
      result.errors.forEach(error => {
        console.error(`  - ${error.message}`);
      });
      process.exit(1);
    }
    
    // Write the composed supergraph schema
    const outputPath = path.resolve(__dirname, '../schemas/schema.graphql');
    fs.writeFileSync(outputPath, result.supergraphSdl);
    
    console.log('✅ Supergraph schema composed successfully!');
    console.log(`📁 Output saved to: ${outputPath}`);
    console.log(`🔗 Services composed: ${services.map(s => s.name).join(', ')}`);
    
  } catch (error) {
    console.error('❌ Composition failed:', error.message);
    process.exit(1);
  }
}

// Run composition if called directly
if (require.main === module) {
  composeSupergraph().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { composeSupergraph, serviceConfigs }; 
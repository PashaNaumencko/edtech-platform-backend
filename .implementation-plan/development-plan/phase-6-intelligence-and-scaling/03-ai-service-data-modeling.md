# Step 3: AI Service - Data Modeling & Vector Embeddings

**Objective**: Convert key platform entities into vector embeddings to power similarity-based recommendations.

## 1. Vector Database

-   **Choice**: **Amazon OpenSearch Serverless** with the k-NN plugin.

## 2. Embedding Generation Pipeline (Lambda Pattern)

This pipeline is a core example of the **"Event-Driven Worker" Lambda Pattern**, specifically for AI/ML workloads.

**Flow for a `TutorProfile`:**

1.  **`TutorProfileUpdated` Event**: The `tutor-matching-service` publishes an event.
2.  **Trigger Lambda**: An EventBridge rule filters for this event and triggers a "generate-embedding" Lambda function.
3.  **Generate Embedding Lambda**:
    -   **Language**: This is an ideal use case for **Python**, given its superior ecosystem for data science and AI.
    -   **Job**:
        a.  Receives the event with tutor profile data.
        b.  Constructs a text document from the profile's key fields.
        c.  Calls an embedding model via **Amazon Bedrock** to get the vector.
        d.  Stores the vector in the OpenSearch index.

### Implementation Sketch - Generate Embedding Lambda (Python)

```python
# apps/ai-service/infrastructure/lambda/generate_embedding.py
import json
import boto3
from opensearchpy import OpenSearch, RequestsHttpConnection, AWSV4SignerAuth

# Clients are initialized outside the handler for reuse
bedrock_client = boto3.client('bedrock-runtime')
opensearch_client = # ... initialize OpenSearch client with AWS auth

def get_embedding(text):
    # ... (implementation as before)

def handler(event, context):
    # 1. Extract data from the event
    detail = event['detail']['payload']
    tutor_id = detail['userId']
    document_text = f"Tutor bio: {detail['bio']}. Subjects: {', '.join(detail['subjects'])}"

    # 2. Generate the embedding
    embedding = get_embedding(document_text)

    # 3. Index the vector in OpenSearch
    document = {
        'vector_field': embedding,
        'metadata': { 'type': 'tutor', 'updatedAt': event['detail']['metadata']['timestamp'] }
    }
    opensearch_client.index(
        index='recommendations',
        body=document,
        id=tutor_id,
        refresh=True
    )
    return {'status': 'success', 'tutorId': tutor_id}
```

## 3. OpenSearch Index Setup

The OpenSearch index setup remains the same, defined in the CDK. This serverless, event-driven approach ensures that our AI models are always kept up-to-date as our platform data changes, without requiring a dedicated, always-on server for processing.
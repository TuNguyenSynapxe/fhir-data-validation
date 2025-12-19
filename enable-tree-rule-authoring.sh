#!/bin/bash

# Script to enable treeRuleAuthoring feature for a project
# Usage: ./enable-tree-rule-authoring.sh <project-id>

PROJECT_ID=$1

if [ -z "$PROJECT_ID" ]; then
  echo "Usage: $0 <project-id>"
  echo "Example: $0 1ec6192b-1a3f-41f1-8613-ef1ec6978152"
  exit 1
fi

PROJECT_FILE="backend/src/Pss.FhirProcessor.Playground.Api/ProjectStorage/$PROJECT_ID.json"

if [ ! -f "$PROJECT_FILE" ]; then
  echo "Error: Project file not found: $PROJECT_FILE"
  exit 1
fi

echo "Enabling treeRuleAuthoring feature for project: $PROJECT_ID"

# Use jq to add featuresJson field
jq '. + {"featuresJson": "{\"treeRuleAuthoring\":true}"}' "$PROJECT_FILE" > temp.json && mv temp.json "$PROJECT_FILE"

echo "✅ Feature enabled successfully!"
echo ""
echo "The project file has been updated. The API will load the feature on next request."
echo ""
echo "To verify:"
echo "curl http://localhost:5000/api/projects/$PROJECT_ID | jq '.features'"

#!/bin/bash
set -e

# Create new structure
mkdir -p resources datatypes base

# Core resources (20 essential files)
CORE_RESOURCES=(
  "Bundle"
  "Patient"
  "Observation"
  "Encounter"
  "Organization"
  "Location"
  "Practitioner"
  "PractitionerRole"
  "HealthcareService"
  "OperationOutcome"
  "Condition"
  "Procedure"
  "MedicationRequest"
  "AllergyIntolerance"
  "DiagnosticReport"
  "Specimen"
  "ServiceRequest"
  "Device"
  "Medication"
  "ImagingStudy"
)

# Core datatypes (15 essential files)
DATATYPES=(
  "Address"
  "HumanName"
  "Identifier"
  "ContactPoint"
  "CodeableConcept"
  "Coding"
  "Reference"
  "Period"
  "Quantity"
  "Ratio"
  "Range"
  "Timing"
  "Annotation"
  "Attachment"
  "Narrative"
)

# Base types (4 essential files)
BASE_TYPES=(
  "Resource"
  "DomainResource"
  "BackboneElement"
  "Element"
)

# Copy core resources
for resource in "${CORE_RESOURCES[@]}"; do
  if [ -f "StructureDefinitions/StructureDefinition-${resource}.json" ]; then
    cp "StructureDefinitions/StructureDefinition-${resource}.json" "resources/"
    echo "✓ Copied ${resource}"
  else
    echo "✗ Missing ${resource}"
  fi
done

# Copy datatypes
for datatype in "${DATATYPES[@]}"; do
  if [ -f "StructureDefinitions/StructureDefinition-${datatype}.json" ]; then
    cp "StructureDefinitions/StructureDefinition-${datatype}.json" "datatypes/"
    echo "✓ Copied ${datatype}"
  else
    echo "✗ Missing ${datatype}"
  fi
done

# Copy base types
for basetype in "${BASE_TYPES[@]}"; do
  if [ -f "StructureDefinitions/StructureDefinition-${basetype}.json" ]; then
    cp "StructureDefinitions/StructureDefinition-${basetype}.json" "base/"
    echo "✓ Copied ${basetype}"
  else
    echo "✗ Missing ${basetype}"
  fi
done

echo ""
echo "=== Summary ==="
echo "Resources: $(ls -1 resources/ | wc -l | tr -d ' ')"
echo "Datatypes: $(ls -1 datatypes/ | wc -l | tr -d ' ')"
echo "Base types: $(ls -1 base/ | wc -l | tr -d ' ')"
echo "Total: $(( $(ls -1 resources/ | wc -l) + $(ls -1 datatypes/ | wc -l) + $(ls -1 base/ | wc -l) ))"

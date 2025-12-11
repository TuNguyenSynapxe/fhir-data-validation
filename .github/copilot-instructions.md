# GitHub Copilot Instructions — FHIR Processor V2

## Overview
This repository implements the FHIR Processor V2 Engine as defined in the /docs folder.  
All code must follow these specifications strictly.

## Architecture References
- /docs/01_architecture_spec.md  
- /docs/02_migration_map.md  
- /docs/03_rule_dsl_spec.md  
- /docs/04_data_inputs_spec.md  
- /docs/05_validation_pipeline.md  
- /docs/06_frontend_requirements.md  
- /docs/07_smart_path_navigation.md  
- /docs/08_unified_error_model.md  
- /docs/09_ai_assisted_ruleset_generation.md  
- /docs/10_do_not_do.md  

## Code Standards
- Use clean architecture principles
- No CPS1 syntax or logic
- No duplicate Firely validation
- Bundle input is immutable
- Business rules come only from rules.json
- All errors must follow unified error model
- All paths must resolve via SmartPathNavigationService

## Required Backend Components
Copilot should assist in generating the following complete implementations:

### Validation Engine
- ValidationPipeline
- FirelyValidationService
- FhirPathRuleEngine
- CodeMasterEngine
- ReferenceResolver
- SmartPathNavigationService
- UnifiedErrorModelBuilder

All implementations must strictly follow /docs/05, /docs/07, and /docs/08.

## Required DI Setup
Copilot should generate DI registrations for:
- IValidationPipeline
- IFirelyValidationService
- IFhirPathRuleEngine
- ICodeMasterEngine
- IReferenceResolver
- ISmartPathNavigationService
- IUnifiedErrorModelBuilder

## Required API Endpoint
ProjectsController.ValidateProject must:
1. Load project data
2. Build ValidationRequest
3. Run ValidationPipeline
4. Return unified error model

## Rules Validation
Copilot must implement rule DSL logic exactly as in /docs/03_rule_dsl_spec.md.

## Navigation
Copilot must implement navigation resolution exactly as in /docs/07_smart_path_navigation.md.

---
**Copilot: All generated code must strictly follow the above specifications.**
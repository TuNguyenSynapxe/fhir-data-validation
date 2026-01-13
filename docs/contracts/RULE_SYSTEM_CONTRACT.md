AUTHORITATIVE CONTRACT
This document defines the current, binding behavior of the PSS FHIR Processor Rule System.
All implementations MUST conform to this contract.

Historical phase documents, explorations, and prior DSL drafts are non-authoritative.

⸻

1. Purpose

The Rule System exists to enforce and explain constraints on FHIR Bundles and Resources within PSS.

It supports:
	•	Runtime validation (via Firely)
	•	Deterministic rule execution
	•	Clear, explainable validation output
	•	Separation of system-generated rules and user-authored rules

This contract defines what the rule system is, not how it evolved.

⸻

2. Core Principles (Non-Negotiable)

2.1 Firely Is the Sole Validator
	•	Firely SDK is the only authority for:
	•	FHIR structural validation
	•	Profile conformance
	•	Terminology validation
	•	The Rule System does not replace, simulate, or reinterpret Firely.

2.2 Single Unified Rule Model
	•	All rules (imported or custom) use the same rule definition model.
	•	There is no execution branching based on rule origin.

2.3 Provenance Is Metadata Only
	•	Rule provenance (Imported vs Custom) affects:
	•	UI display
	•	Governance
	•	Audit
	•	Provenance must NOT affect execution behavior.

⸻

3. Rule Categories

The system recognizes two conceptual rule categories:

3.1 Imported Rules (System-Generated)
	•	Extracted from FHIR StructureDefinitions
	•	Explanation-only
	•	Read-only
	•	Never persisted as enforcement rules
	•	Used to:
	•	Explain profile intent
	•	Provide context during validation review

3.2 Custom Rules (User-Authored)
	•	Explicitly created by users
	•	Persisted per project
	•	Enforced during runtime validation
	•	May be stricter than imported rules

Both categories share the same execution model.

⸻

4. Rule Execution Model

4.1 Determinants of Behavior

Rule execution behavior is determined only by:
	1.	Rule Type
(e.g. Required, FixedValue, Regex, CodeSystem, Resource, QuestionAnswer)
	2.	Instance Scope
(e.g. AllInstances, FirstInstance, FilteredInstances)
	3.	Severity
(Error / Warning / Info)
	4.	Validation Class
(Contract / Structural / Advisory)

Execution behavior is NOT influenced by:
	•	Rule provenance
	•	UI tab or grouping
	•	SD origin
	•	Confidence score

⸻

4.2 Supported Rule Types (Current)

The following rule types are fully supported end-to-end:
	•	Required
	•	FixedValue
	•	AllowedValues
	•	Regex
	•	ArrayLength
	•	CodeSystem
	•	CustomFHIRPath
	•	QuestionAnswer
	•	Resource / RequiredResources (alias)

Unknown or unsupported rule types:
	•	Are logged
	•	Do NOT crash execution
	•	Do NOT block validation

⸻

5. Validation vs Explanation Boundary

5.1 Validation Responsibilities

The Rule System:
	•	Executes deterministic rule logic
	•	Produces structured validation results
	•	Emits error codes and structured details

5.2 Explanation Responsibilities

The Rule System:
	•	Does NOT generate human prose
	•	Does NOT localize messages
	•	Does NOT decide UI wording

Explanation is handled by:
	•	Frontend mapping
	•	Error explanation registries
	•	Imported rule explanation metadata

⸻

6. Error Model Contract
	•	Every validation issue has:
	•	ErrorCode
	•	Severity
	•	Resource context
	•	Path / breadcrumb
	•	Structured details (key-value)
	•	ErrorCode is:
	•	Backend-defined
	•	Stable
	•	Used by frontend for explanation mapping

The rule engine must not embed human-readable messages.

⸻

7. Safety & Guardrails

The Rule System MUST NOT:
	•	Infer missing rules
	•	Auto-correct data
	•	Relax Firely validation failures
	•	Execute FHIRPath outside defined rule scopes
	•	Perform snapshot or profile generation

⸻

8. Relationship to SD Builder
	•	Imported rules may be derived from StructureDefinitions.
	•	SD Builder:
	•	Authors StructureDefinitions
	•	Does NOT create runtime rules
	•	Imported rules are explanatory, not executable artifacts.

The Rule System remains independent of SD authoring workflows.

⸻

9. Change Policy

Any change to:
	•	Rule execution semantics
	•	Supported rule types
	•	Severity handling
	•	Provenance behavior

REQUIRES:
	•	Contract update
	•	Explicit architectural approval

⸻

10. Final Authority

If any other document conflicts with this contract:

This contract takes precedence.

⸻

END OF CONTRACT

⸻
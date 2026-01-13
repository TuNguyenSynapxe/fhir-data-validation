

AUTHORITATIVE REQUIREMENTS (PHASE 1)
This document defines the functional and non-functional requirements for the StructureDefinition (SD) Builder in Phase 1.

All implementations MUST conform to this document and to:
	•	SYSTEM_OVERVIEW.md
	•	SD_BUILDER_CONTRACT.md

⸻

1. Purpose & Scope

1.1 Purpose

The SD Builder enables users to author FHIR StructureDefinitions without writing raw JSON by:
	•	Starting from a base FHIR resource
	•	Applying minimal or full design modes
	•	Editing cardinality, bindings, and extensions
	•	Exporting a clean, valid StructureDefinition (differential only)

1.2 Scope (Phase 1)

In Phase 1, the SD Builder supports resource-level profile authoring only.

⸻

2. In Scope (Phase 1)

The system SHALL support:
	•	Loading base FHIR StructureDefinitions (core resources)
	•	Minimal and Full design modes
	•	Element include / exclude control
	•	Cardinality overrides
	•	Terminology bindings for coded elements
	•	HL7 core extension selection
	•	Template application
	•	Authoring-time validation
	•	Differential-only StructureDefinition export

⸻

3. Explicitly Out of Scope (Phase 1)

The system SHALL NOT support:
	•	Instance validation
	•	Snapshot generation
	•	Invariant authoring
	•	FHIRPath authoring
	•	Slicing authoring
	•	IG packaging or publication
	•	Terminology expansion or value set closure
	•	UI rendering or layout logic

⸻

4. High-Level Functional Flow
	1.	Select base resource
	2.	Select start mode (Minimal / Full)
	3.	Optionally apply template
	4.	Design phase (edit elements)
	5.	Validate design
	6.	Export StructureDefinition

⸻

5. Resource Initialization

FR-01 Base Resource Selection

The system SHALL allow initialization for any supported FHIR resource (e.g. Patient, Observation).

FR-02 Base StructureDefinition Loading

The system SHALL load the base StructureDefinition including snapshot.element.

Failure to load snapshot SHALL block initialization.

⸻

6. Start Modes (Design-Time Only)

FR-03 Minimal Mode

When Minimal mode is selected:
	•	All base elements with cardinality 0..* SHALL be treated as excluded (0..0) in design state
	•	Elements with base min ≥ 1 SHALL remain included

FR-04 Full Mode

When Full mode is selected:
	•	All elements SHALL inherit their base cardinality

FR-05 Design-Time Only

Start mode SHALL:
	•	Affect design state only
	•	NOT immediately generate StructureDefinition differentials

⸻

7. Element Editing

7.1 Inclusion / Exclusion

FR-06 Include / Exclude Toggle
For elements with base cardinality 0..*, the system SHALL support:
	•	Include → inherit base cardinality
	•	Exclude → effective cardinality 0..0

FR-07 Required Protection
Elements with base min ≥ 1:
	•	SHALL always be included
	•	SHALL NOT be excludable

⸻

7.2 Cardinality Override

FR-08 Optional Override
The system SHALL support optional cardinality override per element (e.g. 1..1, 1..*).

FR-09 Constraint Validation
Overrides SHALL:
	•	Not violate base constraints
	•	Be validated before export

⸻

7.3 Visibility Modes (UX Only)

FR-10 Visibility Toggle
The system SHALL support:
	•	Minimal view → hide excluded elements
	•	Full view → show excluded elements with explicit marker

FR-11 Non-Mutating
Visibility mode SHALL NOT affect:
	•	Design state
	•	Exported StructureDefinition

⸻

8. Terminology Binding

FR-12 Eligible Element Types

Bindings SHALL be allowed only for:
	•	code
	•	Coding
	•	CodeableConcept

FR-13 Binding Attributes

A binding SHALL include:
	•	Strength (required | extensible | preferred)
	•	ValueSet canonical URL

FR-14 HL7-First Experience

The system SHALL:
	•	Prefer HL7 core ValueSets for suggestion
	•	Treat ValueSet URLs as canonical identifiers

FR-15 Binding Validation

Before export:
	•	ValueSet URLs SHALL be resolvable
	•	Invalid bindings SHALL block export

⸻

9. Extensions

FR-16 Extension Selection

The system SHALL allow adding extensions by canonical URL.

FR-17 HL7 Core Extensions

The system SHALL support HL7 core extension suggestions.

FR-18 Extension Validation

Each extension:
	•	MUST resolve to a valid StructureDefinition
	•	SHALL block export if missing

⸻

10. Templates

FR-19 Template Purpose

Templates MAY preconfigure:
	•	Cardinality overrides
	•	Bindings
	•	Element exclusion

FR-20 Application Order

Templates SHALL be applied:
	1.	After start mode initialization
	2.	Before user edits

Templates SHALL NOT override explicit user edits.

⸻

11. Authoring Validation

FR-21 Validation Scope

Before export, the system SHALL validate:
	•	Cardinality correctness
	•	Required element protection
	•	Binding eligibility
	•	ValueSet existence
	•	Extension existence

FR-22 Severity Handling
	•	Errors SHALL block export
	•	Warnings SHALL allow export

⸻

12. StructureDefinition Export

FR-23 Export Output

The system SHALL export a valid FHIR StructureDefinition with:
	•	derivation = constraint
	•	Correct baseDefinition
	•	Correct resource type
	•	Differential elements only

FR-24 Clean Differential

The exporter SHALL:
	•	Emit differential elements ONLY when constraints differ from base
	•	Avoid redundant or inherited constraints

⸻

13. Metadata Requirements

FR-25 Required Metadata

At export time, the system SHALL collect:
	•	Name
	•	Canonical URL
	•	Version
	•	Status
	•	Optional description

FR-26 Auto-Derived Metadata

The system SHALL auto-populate:
	•	Resource type
	•	Kind
	•	BaseDefinition
	•	FHIR version
	•	Publisher (configurable)

⸻

14. Non-Functional Requirements

NFR-01 Standalone

The SD Builder SHALL:
	•	Be UI-agnostic
	•	Be callable via API or service layer
	•	Not depend on runtime validation

NFR-02 Deterministic Output

Given identical inputs, the exported StructureDefinition SHALL be byte-stable (excluding timestamps).

NFR-03 Testability

The system SHALL support:
	•	Unit tests
	•	Golden-file export tests

⸻

15. Definition of Done (Phase 1)

Phase 1 is complete when:
	•	Minimal and Full modes function correctly
	•	Templates apply deterministically
	•	Cardinality, binding, and extension rules are enforced
	•	Invalid designs cannot be exported
	•	Clean StructureDefinition JSON is produced
	•	No UI dependency exists

⸻

16. Final Authority

If any document or implementation conflicts with this specification:

This document takes precedence for Phase 1 SD Builder implementation.

⸻

END OF REQUIREMENTS

⸻

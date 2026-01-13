
AUTHORITATIVE CONTRACT
This document defines the architectural boundaries and invariants of the StructureDefinition (SD) Builder within the PSS FHIR Processor.

All SD Builder implementations MUST conform to this contract.

⸻

1. Purpose

The SD Builder exists to author FHIR StructureDefinitions in a controlled, deterministic, and UI-agnostic manner.

It enables users to design resource profiles without writing raw JSON, while preserving:
	•	FHIR correctness
	•	Clean differentials
	•	Governance clarity

The SD Builder is a design-time authoring engine, not a validator.

⸻

2. Design-Time Only (Non-Negotiable)

The SD Builder operates exclusively at design time.

It MUST:
	•	Author StructureDefinition artifacts
	•	Validate authoring intent (design safety only)
	•	Produce exportable FHIR profiles

It MUST NOT:
	•	Validate FHIR instances
	•	Execute runtime rules
	•	Interpret or simulate Firely validation
	•	Enforce profile conformance on data

⸻

3. Firely Authority Boundary

Firely SDK is the sole authority for:
	•	FHIR structural validation
	•	Profile conformance
	•	Terminology validation
	•	Snapshot generation

The SD Builder:
	•	Does NOT replace Firely
	•	Does NOT reimplement Firely logic
	•	Does NOT generate or interpret snapshots

All exported StructureDefinitions are expected to be validated by Firely externally.

⸻

4. Scope of Authoring (Phase 1)

In Phase 1, the SD Builder supports:
	•	Resource-level profile authoring
	•	Cardinality control:
	•	Include / exclude (0..0)
	•	Cardinality override
	•	Terminology bindings:
	•	code
	•	Coding
	•	CodeableConcept
	•	HL7 core extensions (by canonical URL)
	•	Minimal and Full design modes
	•	Template application
	•	Differential-only StructureDefinition export

⸻

5. Explicit Non-Goals (Phase 1)

The SD Builder MUST NOT support:
	•	Snapshot generation
	•	Instance validation
	•	Invariant authoring
	•	FHIRPath authoring
	•	Slicing authoring
	•	IG packaging or publication
	•	Terminology expansion or closure tables

These capabilities may be introduced in later phases only via explicit contracts.

⸻

6. Validation Responsibilities (Authoring Safety Only)

The SD Builder MAY validate:
	•	Cardinality correctness against base definitions
	•	Required element protection
	•	Binding eligibility (coded elements only)
	•	ValueSet existence
	•	Extension definition existence

The SD Builder MUST NOT:
	•	Evaluate FHIRPath expressions
	•	Validate actual instance data
	•	Produce validation results for Bundles or Resources

Authoring validation errors block export.
Warnings do not.

⸻

7. Output Contract

The SD Builder MUST produce:
	•	A valid FHIR StructureDefinition
	•	derivation = constraint
	•	Correct baseDefinition
	•	Differential elements ONLY when constraints differ from base
	•	Deterministic output (stable ordering, no noise)

The SD Builder MUST NOT:
	•	Copy snapshot elements into differential
	•	Emit redundant constraints
	•	Modify base StructureDefinitions

⸻

8. Independence from Rule System

The SD Builder:
	•	Does NOT create runtime rules
	•	Does NOT persist rules
	•	Does NOT influence rule execution

Imported rules derived from StructureDefinitions are:
	•	Explanatory only
	•	Owned by the Rule System
	•	Outside SD Builder responsibility

⸻

9. UI Independence

The SD Builder:
	•	Is UI-agnostic
	•	Exposes state via APIs or sessions
	•	Does not assume any frontend framework or workflow

All UX behavior is external orchestration.

⸻

10. Change Policy

Any expansion of SD Builder capabilities REQUIRES:
	•	An updated contract
	•	Explicit phase declaration
	•	Architectural approval

⸻

11. Final Authority

If any other document or implementation conflicts with this contract:

This contract takes precedence.

⸻

END OF CONTRACT

⸻

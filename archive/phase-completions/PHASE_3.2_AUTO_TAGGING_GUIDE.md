# Phase 3.2 Auto-Tagging: User Guide

## Understanding Two Bundle Systems

Your FHIR Processor V2 instance currently has **two separate bundle storage systems**:

### 1. Old Validation Bundles (Pre-Phase 3)
- **Location**: Stored in old validation tables
- **Shown in UI**: "Bundles Without Resolved Profile" section
- **Count**: 8 bundles in your project
- **Auto-Tagging**: ❌ NOT SUPPORTED (legacy system)
- **Purpose**: Historical validation testing

### 2. New Sample Bundles (Phase 3+)
- **Location**: Stored in ProjectBundles table
- **Shown in UI**: "Sample Bundles (0)" tab for each StructureDefinition
- **Count**: 0 bundles currently
- **Auto-Tagging**: ✅ FULLY SUPPORTED
- **Purpose**: SD-centric bundle management with auto-tagging

---

## Why Aren't My Bundles Auto-Tagged?

The 8 bundles shown in your screenshot are in the **old validation bundles system** which:
- Was created before Phase 3.2
- Does NOT have auto-tagging fields in the database
- Is separate from the new StructureDefinition-scoped system

**Solution**: Upload bundles through the new UI to enable auto-tagging.

---

## How to Use Auto-Tagging

### Step 1: Navigate to a StructureDefinition
1. Go to Projects → Your Project
2. Click on "StructureDefinitions & Sample Bundles" tab
3. Click on any StructureDefinition (e.g., "BundleCommunicationObservation")

### Step 2: Upload a Bundle
1. Click the **"Add Sample Bundle"** button
2. Paste your FHIR Bundle JSON
3. Click "Upload"

### Step 3: Observe Auto-Tagging
The system will automatically:
1. Parse the bundle JSON
2. Extract all `meta.profile` URLs from:
   - `Bundle.meta.profile[]`
   - `entry[*].resource.meta.profile[]`
3. Match against StructureDefinitions in your project
4. Display tagging badge:

#### Auto-Matched Badge (Blue)
- Appears when bundle declares exactly ONE SD in meta.profile
- Example: `Bundle.meta.profile = ["http://example.com/StructureDefinition/BundleCommunicationObservation"]`
- **This is authoritative** - the bundle explicitly declares this profile

#### Unassigned Badge (Yellow)
- Appears when:
  - Bundle has NO meta.profile declarations
  - Bundle declares profiles not in your project
  - Bundle declares MULTIPLE SDs (system won't guess)

#### Manually Associated Badge (Gray)
- Appears when you manually tag a bundle
- Use the "Manual Tag" button to associate
- **This is non-authoritative** - for organization only

---

## Testing Auto-Tagging

### Test Case 1: Single Meta.Profile
Upload a bundle with this structure:

```json
{
  "resourceType": "Bundle",
  "meta": {
    "profile": ["http://synapxe.rcm.sg/StructureDefinition/BundleCommunicationObservation"]
  },
  "type": "collection",
  "entry": [...]
}
```

**Expected Result**: Blue "Auto-matched" badge appears

### Test Case 2: No Meta.Profile
Upload a bundle without meta.profile:

```json
{
  "resourceType": "Bundle",
  "type": "collection",
  "entry": [...]
}
```

**Expected Result**: Yellow "Unassigned" badge appears

### Test Case 3: Multiple Meta.Profiles
Upload a bundle declaring multiple SDs:

```json
{
  "resourceType": "Bundle",
  "meta": {
    "profile": [
      "http://synapxe.rcm.sg/StructureDefinition/BundleA",
      "http://synapxe.rcm.sg/StructureDefinition/BundleB"
    ]
  },
  "type": "collection",
  "entry": [...]
}
```

**Expected Result**: Yellow "Unassigned" badge (system doesn't guess which one)

---

## Migrating Old Bundles (Optional)

If you want to move your 8 old bundles to the new system:

### Option 1: Manual Re-Upload (Recommended)
1. Download each old bundle JSON
2. Upload through the new "Add Sample Bundle" UI
3. Auto-tagging will happen automatically

### Option 2: Recompute Tags Endpoint
For existing bundles in the NEW system only:

```bash
curl -X POST "http://localhost:5000/api/v2/projects/{projectId}/sample-bundles/recompute-tags"
```

**Note**: This endpoint ONLY works for bundles already in the ProjectBundles table.

---

## FAQ

### Q: Why can't I see auto-tagging for my existing bundles?
**A**: Your existing bundles are in the old validation system (pre-Phase 3). Upload new bundles through the "Add Sample Bundle" button to use auto-tagging.

### Q: What if my bundle has meta.profile but shows "Unassigned"?
**A**: Check that:
1. The canonical URL exactly matches a SD in your project
2. The bundle declares ONLY ONE SD (not multiple)
3. The SD is imported/exists in the project

### Q: Can I manually tag a bundle that has auto-tag?
**A**: Yes, but the auto-tag takes precedence. The manual tag is stored but ignored.

### Q: What happens if I edit a bundle's JSON to change meta.profile?
**A**: The auto-tag is computed on upload only. Re-upload the bundle or call the recompute-tags endpoint.

### Q: Do I need meta.profile for validation to work?
**A**: No. Validation works independently. Auto-tagging is for **organization and UI display** only.

---

## Next Steps

1. **Upload a test bundle** through the new UI
2. **Verify auto-tagging** badge appears
3. **Migrate old bundles** if needed (manual re-upload)
4. **Use manual tagging** for bundles without meta.profile declarations

For detailed technical documentation, see [PHASE_3.2_BUNDLE_TAGGING_IMPLEMENTATION.md](./PHASE_3.2_BUNDLE_TAGGING_IMPLEMENTATION.md).

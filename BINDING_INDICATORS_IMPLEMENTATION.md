# Binding Indicators Implementation

## Overview
Added visual indicators to the SD Builder tree view to show elements with ValueSet bindings, their previewability status, and override state.

## Features Implemented

### 1. Link Icon (🔗)
- Shows next to element names when a ValueSet binding exists (base or override)
- Indicates presence of terminology binding
- Size: 12px, color: gray (#6b7280)

### 2. Previewability Dot
- Small colored dot (6px) indicating binding previewability status:
  - **Blue (#3b82f6)**: Explicit or Computed (preview available)
  - **Amber (#f59e0b)**: External (e.g., BCP-47, IANA, ISO)
  - **Gray (#9ca3af)**: Unsupported (no preview)
- Dynamically fetched from backend API
- Updates based on actual ValueSet previewability runtime logic

### 3. Override Badge (ⓞ)
- Shows when current binding overrides base binding
- Font size: 10px, color: amber (#f59e0b)
- Indicates user customization

### 4. Hover Tooltip
- Displays on hover over binding indicators:
  - **ValueSet name**: Full name from backend
  - **Type**: Previewability classification (Explicit/Computed/External/Unsupported)
  - **Status**: Human-readable availability message
  - **Binding**: Base or Overridden + strength (Required/Extensible/etc.)
- Dark themed tooltip with arrow pointer
- Non-intrusive, positioned below indicators

## Implementation Details

### Files Created
1. **BindingTooltip.tsx** - Tooltip component with async ValueSet data loading
2. **BINDING_INDICATORS_IMPLEMENTATION.md** - This documentation

### Files Modified
1. **TreeNode.tsx**
   - Added binding indicator rendering logic
   - Added `getActiveBinding()` helper function
   - Added useEffect to fetch previewability status
   - Added hover state management

2. **SdTreeView.css**
   - Added `.binding-indicators` container styles
   - Added `.binding-link-icon` styles
   - Added `.binding-previewability-dot` with data-attribute color mapping
   - Added `.binding-override-badge` styles
   - Added `.binding-tooltip` styles with dark theme

3. **terminologyApi.ts**
   - Updated `getPreviewability()` to accept both ValueSetSummaryDto and ValueSetPreviewDto

4. **sdBuilderApi.ts**
   - Added metadata fields to ValueSetPreviewDto (publisher, description, capability, previewability)
   - Updated `getPreviewability()` to accept both summary and preview types

## Usage Example

```tsx
// TreeNode now automatically shows binding indicators
{bindingInfo && (
  <div className="binding-indicators">
    <Link size={12} className="binding-link-icon" />
    <span 
      className="binding-previewability-dot" 
      data-previewability={previewability}
    />
    {bindingInfo.isOverride && (
      <span className="binding-override-badge">ⓞ</span>
    )}
    {showBindingTooltip && (
      <BindingTooltip 
        binding={bindingInfo.binding}
        isOverride={bindingInfo.isOverride}
      />
    )}
  </div>
)}
```

## Design Principles

1. **Minimal & Non-Intrusive**: Small icons that don't clutter the tree
2. **Information on Demand**: Details shown only on hover
3. **Visual Hierarchy**: Icons positioned between state indicators and element name
4. **Consistent with Existing Design**: Uses same color palette and styling patterns
5. **Performance Optimized**: Lazy loading of ValueSet details on hover

## Backend Integration

- Leverages existing `/api/sd-builder/valuesets/preview` endpoint
- Uses runtime previewability system (Explicit/Computed/External/Unsupported)
- Respects base vs override binding precedence
- No breaking changes to existing APIs

## Future Enhancements

1. Add click handler to open ValueSet selection drawer
2. Cache previewability results to reduce API calls
3. Add loading state indicator for slow network
4. Consider adding binding strength indicator color coding
5. Add keyboard navigation support for tooltip

## Testing Recommendations

1. Test with elements that have:
   - Base bindings only
   - Override bindings (should show ⓞ badge)
   - No bindings (no indicators)
   
2. Test with ValueSets of different previewability:
   - Explicit (e.g., AdministrativeGender) → blue dot
   - Computed (e.g., local expansions) → blue dot
   - External (e.g., AllLanguages/BCP-47) → amber dot
   - Unsupported (e.g., SNOMED with filters) → gray dot

3. Test tooltip display:
   - Hover behavior
   - Loading states
   - Error handling
   - Positioning

4. Test tree scrolling with tooltips visible
5. Test with many elements with bindings (performance)

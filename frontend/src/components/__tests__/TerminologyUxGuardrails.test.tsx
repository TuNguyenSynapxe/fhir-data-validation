/**
 * Terminology UX Guardrail Tests
 * 
 * Ensures Phase 4A UX constraints are enforced:
 * 1. No free-text ValueSet input exists
 * 2. Binding always emits canonicalUrl only
 * 3. Preview does not mutate state
 * 4. Binding selection does not auto-validate
 * 5. No terminology API calls during render
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ValueSetPicker } from '../ValueSetPicker';
import * as terminologyApi from '../../api/terminologyApi';

// Mock terminology API
jest.mock('../../api/terminologyApi');

describe('Terminology UX Guardrails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // GUARDRAIL 1: No free-text ValueSet input exists
  // ============================================================================

  it('does not allow free-text ValueSet URL input - search only', () => {
    const onChange = jest.fn();
    
    render(
      <ValueSetPicker 
        value={null} 
        onChange={onChange} 
      />
    );

    // Input should be search field, not URL entry
    const searchInput = screen.getByPlaceholderText(/search valuesets/i);
    expect(searchInput).toBeInTheDocument();
    
    // Verify it triggers search, not direct URL entry
    expect(searchInput).toHaveAttribute('type', 'text');
    expect(searchInput).not.toHaveAttribute('name', 'url');
    expect(searchInput).not.toHaveAttribute('name', 'valueSetUrl');
  });

  it('displays selected ValueSet URL as read-only', () => {
    const testUrl = 'http://hl7.org/fhir/ValueSet/administrative-gender';
    
    render(
      <ValueSetPicker 
        value={testUrl} 
        onChange={() => {}} 
      />
    );

    // URL should be displayed but not editable
    expect(screen.getByText(testUrl)).toBeInTheDocument();
    
    // No direct URL input field
    const inputs = screen.queryAllByRole('textbox');
    const urlInput = inputs.find(input => 
      input.getAttribute('value') === testUrl
    );
    expect(urlInput).toBeUndefined();
  });

  // ============================================================================
  // GUARDRAIL 2: Binding always emits canonicalUrl only
  // ============================================================================

  it('emits only canonicalUrl on selection, no additional metadata', async () => {
    const onChange = jest.fn();
    const mockResults = [
      {
        url: 'http://hl7.org/fhir/ValueSet/test',
        name: 'Test ValueSet',
        description: 'Test description',
        publisher: 'HL7',
        layer: 'Hl7' as const,
      },
    ];

    (terminologyApi.searchValueSets as jest.Mock).mockResolvedValue(mockResults);

    render(
      <ValueSetPicker 
        value={null} 
        onChange={onChange} 
      />
    );

    // Trigger search
    const searchInput = screen.getByPlaceholderText(/search valuesets/i);
    await userEvent.type(searchInput, 'test');
    
    const searchButton = screen.getByRole('button', { name: /search/i });
    await userEvent.click(searchButton);

    // Wait for results and select
    await waitFor(() => {
      expect(screen.getByText('Test ValueSet')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Test ValueSet'));

    // Verify onChange called with URL ONLY
    expect(onChange).toHaveBeenCalledWith('http://hl7.org/fhir/ValueSet/test');
    expect(onChange).toHaveBeenCalledTimes(1);
    
    // Verify no complex object passed
    const callArg = onChange.mock.calls[0][0];
    expect(typeof callArg).toBe('string');
  });

  it('emits null on clear, not empty string or undefined', async () => {
    const onChange = jest.fn();
    const testUrl = 'http://hl7.org/fhir/ValueSet/test';
    
    (terminologyApi.getValueSetDetails as jest.Mock).mockResolvedValue({
      url: testUrl,
      name: 'Test',
      layer: 'Hl7',
    });

    render(
      <ValueSetPicker 
        value={testUrl} 
        onChange={onChange} 
      />
    );

    // Wait for details to load
    await waitFor(() => {
      expect(screen.getByText('Selected ValueSet')).toBeInTheDocument();
    });

    // Clear selection
    const clearButton = screen.getByRole('button', { name: /clear/i });
    await userEvent.click(clearButton);

    // Verify onChange called with explicit null
    expect(onChange).toHaveBeenCalledWith(null);
    expect(onChange).not.toHaveBeenCalledWith('');
    expect(onChange).not.toHaveBeenCalledWith(undefined);
  });

  // ============================================================================
  // GUARDRAIL 3: Preview does not mutate state
  // ============================================================================

  it('preview modal is read-only and does not trigger onChange', async () => {
    const onChange = jest.fn();
    const testUrl = 'http://hl7.org/fhir/ValueSet/test';
    
    (terminologyApi.getValueSetDetails as jest.Mock).mockResolvedValue({
      url: testUrl,
      name: 'Test',
      layer: 'Hl7',
    });

    (terminologyApi.previewValueSetCodes as jest.Mock).mockResolvedValue({
      url: testUrl,
      name: 'Test',
      codes: [
        { code: 'M', display: 'Male' },
        { code: 'F', display: 'Female' },
      ],
      totalCodes: 2,
    });

    render(
      <ValueSetPicker 
        value={testUrl} 
        onChange={onChange} 
      />
    );

    // Wait for details
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /preview codes/i })).toBeInTheDocument();
    });

    // Open preview
    await userEvent.click(screen.getByRole('button', { name: /preview codes/i }));

    // Wait for preview to load
    await waitFor(() => {
      expect(screen.getByText('Male')).toBeInTheDocument();
    });

    // Verify onChange NOT called during preview
    expect(onChange).not.toHaveBeenCalled();

    // Close preview
    const closeButton = screen.getByRole('button', { name: '×' });
    await userEvent.click(closeButton);

    // Verify onChange still not called
    expect(onChange).not.toHaveBeenCalled();
  });

  // ============================================================================
  // GUARDRAIL 4: Binding selection does not auto-validate
  // ============================================================================

  it('does not call validation API when ValueSet is selected', async () => {
    const onChange = jest.fn();
    const validateSpy = jest.spyOn(terminologyApi, 'valueSetExists');
    
    const mockResults = [
      {
        url: 'http://hl7.org/fhir/ValueSet/test',
        name: 'Test',
        layer: 'Hl7' as const,
      },
    ];

    (terminologyApi.searchValueSets as jest.Mock).mockResolvedValue(mockResults);

    render(
      <ValueSetPicker 
        value={null} 
        onChange={onChange} 
      />
    );

    // Search and select
    const searchInput = screen.getByPlaceholderText(/search valuesets/i);
    await userEvent.type(searchInput, 'test');
    await userEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Test'));

    // Verify no validation call
    expect(validateSpy).not.toHaveBeenCalled();
  });

  // ============================================================================
  // GUARDRAIL 5: No terminology API calls during render
  // ============================================================================

  it('does not make API calls on mount with null value', () => {
    const searchSpy = jest.spyOn(terminologyApi, 'searchValueSets');
    const detailsSpy = jest.spyOn(terminologyApi, 'getValueSetDetails');
    const previewSpy = jest.spyOn(terminologyApi, 'previewValueSetCodes');

    render(
      <ValueSetPicker 
        value={null} 
        onChange={() => {}} 
      />
    );

    // Verify no API calls on initial render
    expect(searchSpy).not.toHaveBeenCalled();
    expect(detailsSpy).not.toHaveBeenCalled();
    expect(previewSpy).not.toHaveBeenCalled();
  });

  it('does not auto-search on typing - requires explicit search action', async () => {
    const searchSpy = jest.spyOn(terminologyApi, 'searchValueSets');

    render(
      <ValueSetPicker 
        value={null} 
        onChange={() => {}} 
      />
    );

    // Type in search box
    const searchInput = screen.getByPlaceholderText(/search valuesets/i);
    await userEvent.type(searchInput, 'test');

    // Wait a bit to ensure no debounced calls
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify search NOT called automatically
    expect(searchSpy).not.toHaveBeenCalled();

    // Only called when button clicked
    await userEvent.click(screen.getByRole('button', { name: /search/i }));
    
    expect(searchSpy).toHaveBeenCalledTimes(1);
  });

  // ============================================================================
  // ARCHITECTURAL CONSTRAINT: HL7 layer only (for now)
  // ============================================================================

  it('defaults to HL7 layer and disables PSS/Project layers', () => {
    render(
      <ValueSetPicker 
        value={null} 
        onChange={() => {}} 
      />
    );

    const layerSelect = screen.getByRole('combobox', { name: /layer/i });
    expect(layerSelect).toHaveValue('Hl7');

    // PSS and Project options should be disabled
    const pssOption = screen.getByRole('option', { name: /pss.*coming soon/i });
    const projectOption = screen.getByRole('option', { name: /project.*coming soon/i });
    
    expect(pssOption).toBeDisabled();
    expect(projectOption).toBeDisabled();
  });

  // ============================================================================
  // INTEGRATION CONSTRAINT: Canonical URL preservation
  // ============================================================================

  it('preserves exact canonical URL from backend without transformation', async () => {
    const onChange = jest.fn();
    const canonicalUrl = 'http://hl7.org/fhir/ValueSet/observation-status|5.0.0';
    
    const mockResults = [
      {
        url: canonicalUrl,
        name: 'Observation Status',
        layer: 'Hl7' as const,
      },
    ];

    (terminologyApi.searchValueSets as jest.Mock).mockResolvedValue(mockResults);

    render(
      <ValueSetPicker 
        value={null} 
        onChange={onChange} 
      />
    );

    // Search and select
    const searchInput = screen.getByPlaceholderText(/search valuesets/i);
    await userEvent.type(searchInput, 'observation');
    await userEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      expect(screen.getByText('Observation Status')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Observation Status'));

    // Verify exact URL preserved (including version)
    expect(onChange).toHaveBeenCalledWith(canonicalUrl);
    
    const callArg = onChange.mock.calls[0][0];
    expect(callArg).toBe(canonicalUrl); // Exact string match
    expect(callArg).toContain('|5.0.0'); // Version preserved
  });
});

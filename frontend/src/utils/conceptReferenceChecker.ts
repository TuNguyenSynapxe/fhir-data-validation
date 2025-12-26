/**
 * Concept Reference Checker
 * 
 * Checks if a concept (system + code) is referenced by:
 * - QuestionSets (in questions with answer type = 'Code')
 * - Rules (in FhirPath expressions or CodeMaster rules)
 * - Mappings (if applicable)
 * 
 * Used to determine if a concept's code can be edited (locked if referenced)
 */

import { questionSetsApi } from '../api/questionSetsApi';

export interface ConceptReferenceInfo {
  isReferenced: boolean;
  referenceCount: number;
  referenceDetails: string;
}

/**
 * Check if a concept is referenced in QuestionSets, rules, or mappings
 */
export async function checkConceptReferences(
  projectId: string,
  systemUrl: string,
  conceptCode: string
): Promise<ConceptReferenceInfo> {
  const references: string[] = [];
  let count = 0;

  try {
    // Check QuestionSets
    const questionSets = await questionSetsApi.getQuestionSets(projectId);
    
    for (const qs of questionSets) {
      // Check if any question references this concept
      // For now, we check if the question has a valueSet binding that matches the system
      // TODO: In Phase 2, implement more sophisticated checking based on actual concept usage
      
      // Simple heuristic: if question has answerType = 'Code' and the valueSet URL contains the system
      const referencingQuestions = qs.questions.filter(q => {
        // This is a placeholder - actual implementation would need to:
        // 1. Fetch the full question details
        // 2. Check if it has valueSet binding matching this system
        // 3. Check if enumConfig contains this code
        return false; // Placeholder
      });

      if (referencingQuestions.length > 0) {
        count += referencingQuestions.length;
        references.push(`QuestionSet "${qs.name}" (${referencingQuestions.length} question${referencingQuestions.length !== 1 ? 's' : ''})`);
      }
    }

    // TODO: Check Rules (would need to scan rule definitions for system + code references)
    // This would require:
    // 1. Loading all rules for the project
    // 2. Searching FhirPath expressions for the concept code
    // 3. Checking CodeMaster rule configurations

    // TODO: Check Mappings (if applicable in future phases)

  } catch (error) {
    console.error('Error checking concept references:', error);
  }

  const isReferenced = count > 0;
  const referenceDetails = isReferenced
    ? `This concept is referenced in ${references.join(', ')}. The code cannot be changed to prevent breaking existing configurations.`
    : '';

  return {
    isReferenced,
    referenceCount: count,
    referenceDetails,
  };
}

/**
 * Batch check multiple concepts
 */
export async function checkMultipleConceptReferences(
  projectId: string,
  systemUrl: string,
  conceptCodes: string[]
): Promise<Map<string, ConceptReferenceInfo>> {
  const results = new Map<string, ConceptReferenceInfo>();

  // For performance, we could optimize this with a single API call
  // For now, check each concept individually
  for (const code of conceptCodes) {
    const info = await checkConceptReferences(projectId, systemUrl, code);
    results.set(code, info);
  }

  return results;
}

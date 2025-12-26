import React from 'react';
import { QuestionSetListPanel } from './QuestionSetListPanel';
import { QuestionSetEditorPanel } from './QuestionSetEditorPanel';
import { questionSetsApi } from '../../../../api/questionSetsApi';
import type { QuestionSetDto } from './questionSet.types';

interface QuestionSetsProps {
  projectId: string;
}

export const QuestionSets: React.FC<QuestionSetsProps> = ({ projectId }) => {
  const [selectedQuestionSet, setSelectedQuestionSet] = React.useState<QuestionSetDto | null | undefined>(undefined);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const handleSave = async () => {
    setRefreshTrigger((prev) => prev + 1);
    
    // If a question set is selected, reload it to get updated data
    if (selectedQuestionSet?.id) {
      setLoading(true);
      try {
        const fullQuestionSet = await questionSetsApi.getQuestionSet(projectId, selectedQuestionSet.id);
        setSelectedQuestionSet(fullQuestionSet);
      } catch (err) {
        console.error('Failed to reload question set:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSelectQuestionSet = async (questionSet: QuestionSetDto | null) => {
    // null = create new, undefined = no selection
    if (questionSet === null) {
      setSelectedQuestionSet(null);
      return;
    }

    // Fetch full question set with hydrated questions
    setLoading(true);
    try {
      const fullQuestionSet = await questionSetsApi.getQuestionSet(projectId, questionSet.id);
      setSelectedQuestionSet(fullQuestionSet);
    } catch (err) {
      console.error('Failed to load question set details:', err);
      setSelectedQuestionSet(questionSet); // Fallback to list data
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full">
      <QuestionSetListPanel
        projectId={projectId}
        selectedQuestionSetId={selectedQuestionSet?.id || null}
        onSelectQuestionSet={handleSelectQuestionSet}
        refreshTrigger={refreshTrigger}
      />
      <QuestionSetEditorPanel
        projectId={projectId}
        selectedQuestionSet={loading ? undefined : selectedQuestionSet}
        onSave={handleSave}
        onCancel={() => setSelectedQuestionSet(undefined)}
      />
    </div>
  );
};

export * from './questionSet.types';
export * from './questionSet.utils';
export * from './questionAuthoring.types';

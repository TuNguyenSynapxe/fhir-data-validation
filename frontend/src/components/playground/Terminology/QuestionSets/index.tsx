import React from 'react';
import { QuestionSetListPanel } from './QuestionSetListPanel';
import { QuestionSetEditorPanel } from './QuestionSetEditorPanel';
import type { QuestionSetDto } from './questionSet.types';

interface QuestionSetsProps {
  projectId: string;
}

export const QuestionSets: React.FC<QuestionSetsProps> = ({ projectId }) => {
  const [selectedQuestionSet, setSelectedQuestionSet] = React.useState<QuestionSetDto | null>(null);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  const handleSave = () => {
    setRefreshTrigger((prev) => prev + 1);
    setSelectedQuestionSet(null);
  };

  const handleCancel = () => {
    setSelectedQuestionSet(null);
  };

  return (
    <div className="flex h-full">
      <QuestionSetListPanel
        projectId={projectId}
        selectedQuestionSetId={selectedQuestionSet?.id || null}
        onSelectQuestionSet={setSelectedQuestionSet}
        refreshTrigger={refreshTrigger}
      />
      {selectedQuestionSet !== undefined && (
        <QuestionSetEditorPanel
          projectId={projectId}
          selectedQuestionSet={selectedQuestionSet}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};

export * from './questionSet.types';
export * from './questionSet.utils';
export * from './questionAuthoring.types';

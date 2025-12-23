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
  const [isEditing, setIsEditing] = React.useState(false);

  const handleSelectQuestionSet = (questionSet: QuestionSetDto | null) => {
    setSelectedQuestionSet(questionSet);
    setIsEditing(true);
  };

  const handleSave = () => {
    setSelectedQuestionSet(null);
    setIsEditing(false);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleCancel = () => {
    setSelectedQuestionSet(null);
    setIsEditing(false);
  };

  return (
    <div className="flex h-full">
      <QuestionSetListPanel
        projectId={projectId}
        selectedQuestionSetId={selectedQuestionSet?.id || null}
        onSelectQuestionSet={handleSelectQuestionSet}
        refreshTrigger={refreshTrigger}
      />

      {isEditing ? (
        <QuestionSetEditorPanel
          projectId={projectId}
          selectedQuestionSet={selectedQuestionSet}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center text-gray-500">
            <p className="text-lg mb-2">No question set selected</p>
            <p className="text-sm">Select a question set from the list or create a new one</p>
          </div>
        </div>
      )}
    </div>
  );
};

export * from './questionSet.types';
export * from './questionSet.utils';

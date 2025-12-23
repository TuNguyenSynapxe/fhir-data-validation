import React from 'react';
import { QuestionListPanel } from './QuestionListPanel';
import { QuestionEditorPanel } from './QuestionEditorPanel';
import type { QuestionDto } from './question.types';

interface QuestionsProps {
  projectId: string;
}

export const Questions: React.FC<QuestionsProps> = ({ projectId }) => {
  const [selectedQuestion, setSelectedQuestion] = React.useState<QuestionDto | null>(null);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [isEditing, setIsEditing] = React.useState(false);

  const handleSelectQuestion = (question: QuestionDto | null) => {
    setSelectedQuestion(question);
    setIsEditing(true);
  };

  const handleSave = () => {
    setSelectedQuestion(null);
    setIsEditing(false);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleCancel = () => {
    setSelectedQuestion(null);
    setIsEditing(false);
  };

  return (
    <div className="flex h-full">
      <QuestionListPanel
        projectId={projectId}
        selectedQuestionId={selectedQuestion?.id || null}
        onSelectQuestion={handleSelectQuestion}
        refreshTrigger={refreshTrigger}
      />
      
      {isEditing ? (
        <QuestionEditorPanel
          projectId={projectId}
          selectedQuestion={selectedQuestion}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center text-gray-500">
            <p className="text-lg mb-2">No question selected</p>
            <p className="text-sm">Select a question from the list or create a new one</p>
          </div>
        </div>
      )}
    </div>
  );
};

export * from './question.types';
export * from './question.utils';

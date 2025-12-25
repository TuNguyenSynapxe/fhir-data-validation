import React from 'react';
import { QuestionAuthoringScreen } from './QuestionAuthoringScreen';
import type { QuestionSetDto } from './questionSet.types';

interface QuestionSetsProps {
  projectId: string;
}

export const QuestionSets: React.FC<QuestionSetsProps> = ({ projectId }) => {
  return <QuestionAuthoringScreen projectId={projectId} />;
};

export * from './questionSet.types';
export * from './questionSet.utils';
export * from './questionAuthoring.types';

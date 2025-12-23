import axios from 'axios';

const API_BASE = '/api';

export interface CodingDto {
  system: string;
  code: string;
  display?: string;
}

export interface QuestionUnitDto {
  system: string;
  code: string;
  display: string;
}

export interface QuestionConstraintsDto {
  min?: number;
  max?: number;
  precision?: number;
  maxLength?: number;
  regex?: string;
}

export interface ValueSetBindingDto {
  url: string;
  bindingStrength: string;
}

export interface QuestionMetadataDto {
  text: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionDto {
  id: string;
  code: CodingDto;
  answerType: string;
  unit?: QuestionUnitDto;
  constraints?: QuestionConstraintsDto;
  valueSet?: ValueSetBindingDto;
  metadata: QuestionMetadataDto;
}

export interface CreateQuestionDto {
  id?: string;
  code: CodingDto;
  answerType: string;
  unit?: QuestionUnitDto;
  constraints?: QuestionConstraintsDto;
  valueSet?: ValueSetBindingDto;
  text: string;
  description?: string;
}

export const questionsApi = {
  async getQuestions(projectId: string): Promise<QuestionDto[]> {
    const response = await axios.get(`${API_BASE}/projects/${projectId}/questions`);
    return response.data;
  },

  async getQuestion(projectId: string, id: string): Promise<QuestionDto> {
    const response = await axios.get(`${API_BASE}/projects/${projectId}/questions/${id}`);
    return response.data;
  },

  async createQuestion(projectId: string, dto: CreateQuestionDto): Promise<QuestionDto> {
    const response = await axios.post(`${API_BASE}/projects/${projectId}/questions`, dto);
    return response.data;
  },

  async updateQuestion(projectId: string, id: string, dto: CreateQuestionDto): Promise<QuestionDto> {
    const response = await axios.put(`${API_BASE}/projects/${projectId}/questions/${id}`, dto);
    return response.data;
  },

  async deleteQuestion(projectId: string, id: string): Promise<void> {
    await axios.delete(`${API_BASE}/projects/${projectId}/questions/${id}`);
  },
};

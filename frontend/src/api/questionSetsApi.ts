import axios from 'axios';

const API_BASE = '/api';

export interface CodingDto {
  system: string;
  code: string;
  display?: string;
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
  metadata: QuestionMetadataDto;
}

export interface QuestionSetQuestionRefDto {
  questionId: string;
  required: boolean;
  // Hydrated question details (loaded separately)
  question?: QuestionDto;
}

export interface QuestionSetDto {
  id: string;
  name: string;
  description?: string;
  terminologyUrl: string;
  questions: QuestionSetQuestionRefDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuestionSetDto {
  id?: string;
  name: string;
  description?: string;
  terminologyUrl: string;
  questions: QuestionSetQuestionRefDto[];
}

export const questionSetsApi = {
  async getQuestionSets(projectId: string): Promise<QuestionSetDto[]> {
    const response = await axios.get(`${API_BASE}/projects/${projectId}/questionsets`);
    return response.data;
  },

  async getQuestionSet(projectId: string, id: string): Promise<QuestionSetDto> {
    const response = await axios.get(`${API_BASE}/projects/${projectId}/questionsets/${id}`);
    return response.data;
  },

  async createQuestionSet(projectId: string, dto: CreateQuestionSetDto): Promise<QuestionSetDto> {
    const response = await axios.post(`${API_BASE}/projects/${projectId}/questionsets`, dto);
    return response.data;
  },

  async updateQuestionSet(projectId: string, id: string, dto: CreateQuestionSetDto): Promise<QuestionSetDto> {
    const response = await axios.put(`${API_BASE}/projects/${projectId}/questionsets/${id}`, dto);
    return response.data;
  },

  async deleteQuestionSet(projectId: string, id: string): Promise<void> {
    await axios.delete(`${API_BASE}/projects/${projectId}/questionsets/${id}`);
  },
};

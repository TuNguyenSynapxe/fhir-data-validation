import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProjectsPage from '../pages/ProjectsPage';
import PlaygroundPage from '../pages/PlaygroundPage';

// Public validation pages
import { ValidatePage } from '../pages/public/ValidatePage';
import { ProjectListPage } from '../pages/public/ProjectListPage';
import { ProjectDetailPage } from '../pages/public/ProjectDetailPage';
import { ProjectValidatePage } from '../pages/public/ProjectValidatePage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Validation Routes (MVP) */}
        <Route path="/validate" element={<ValidatePage />} />
        <Route path="/public/projects" element={<ProjectListPage />} />
        <Route path="/public/projects/:slug" element={<ProjectDetailPage />} />
        <Route path="/public/projects/:slug/validate" element={<ProjectValidatePage />} />

        {/* Existing Authoring Routes */}
        <Route path="/" element={<ProjectsPage />} />
        {/* Use wildcard to capture all tab paths */}
        <Route path="/projects/:projectId/*" element={<PlaygroundPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

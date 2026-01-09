import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProjectsPage from '../pages/ProjectsPage';
import PlaygroundPage from '../pages/PlaygroundPage';
import ProjectImportPage from '../pages/admin/ProjectImportPage';
import AdminProjectOverviewPage from '../pages/admin/AdminProjectOverviewPage';
import { AdminValidationPlaygroundPage } from '../pages/admin/AdminValidationPlaygroundPage';

// Public validation pages
import { ValidatePage } from '../pages/public/ValidatePage';
import { ProjectListPage } from '../pages/public/ProjectListPage';
import PublicProjectsPage from '../pages/public/PublicProjectsPage';
import { ProjectDetailPage } from '../pages/public/ProjectDetailPage';
import { ProjectValidatePage } from '../pages/public/ProjectValidatePage';
import { PublicValidationPlaygroundPage } from '../pages/public/PublicValidationPlaygroundPage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Validation Routes (MVP) */}
        <Route path="/validate" element={<ValidatePage />} />
        <Route path="/projects" element={<PublicProjectsPage />} />
        <Route path="/public/projects" element={<ProjectListPage />} />
        <Route path="/public/projects/:slug" element={<ProjectDetailPage />} />
        <Route path="/public/projects/:slug/validate" element={<ProjectValidatePage />} />
        
        {/* Phase 9.5: Public Validation Playground (via public link) */}
        <Route path="/p/:publicId" element={<PublicValidationPlaygroundPage />} />

        {/* Admin Routes */}
        <Route path="/admin/projects/import" element={<ProjectImportPage />} />
        <Route path="/admin/projects/:projectId" element={<AdminProjectOverviewPage />} />
        <Route path="/admin/projects/:projectId/bundles/:bundleId/validate" element={<AdminValidationPlaygroundPage />} />

        {/* Existing Authoring Routes */}
        <Route path="/" element={<ProjectsPage />} />
        {/* Use wildcard to capture all tab paths */}
        <Route path="/projects/:projectId/*" element={<PlaygroundPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

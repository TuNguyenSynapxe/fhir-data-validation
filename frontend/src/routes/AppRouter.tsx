import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProjectsPage from '../pages/ProjectsPage';
import PlaygroundPage from '../pages/PlaygroundPage';
import CoverageDemo from '../pages/CoverageDemo';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<PlaygroundPage />} />
        <Route path="/coverage-demo" element={<CoverageDemo />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

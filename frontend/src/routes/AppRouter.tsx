import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProjectsPage from '../pages/ProjectsPage';
import PlaygroundPage from '../pages/PlaygroundPage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectsPage />} />
        {/* Use wildcard to capture all tab paths */}
        <Route path="/projects/:projectId/*" element={<PlaygroundPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

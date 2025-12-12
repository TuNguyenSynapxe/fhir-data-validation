import type { ReactNode } from 'react';

interface PlaygroundLayoutProps {
  bundleViewer: ReactNode;
  rulesEditor: ReactNode;
  codeMasterEditor: ReactNode;
  validationRunBar: ReactNode;
  validationResults: ReactNode;
  smartPathPanel: ReactNode;
}

export default function PlaygroundLayout({
  bundleViewer,
  rulesEditor,
  codeMasterEditor,
  validationRunBar,
  validationResults,
  smartPathPanel,
}: PlaygroundLayoutProps) {
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Validation Run Bar */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white">
        {validationRunBar}
      </div>

      {/* Three Column Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 overflow-hidden">
        {/* Left Column: Bundle Viewer with Jump */}
        <div className="flex flex-col min-h-0">
          {bundleViewer}
        </div>

        {/* Middle Column: Rules */}
        <div className="flex flex-col min-h-0">
          {rulesEditor}
        </div>

        {/* Right Column: CodeMaster + Validation Results + Smart Path */}
        <div className="flex flex-col gap-4 min-h-0">
          <div className="flex-shrink-0" style={{ height: '35%' }}>
            {codeMasterEditor}
          </div>
          <div className="flex-shrink-0" style={{ height: '35%' }}>
            {validationResults}
          </div>
          <div className="flex-1 min-h-0">
            {smartPathPanel}
          </div>
        </div>
      </div>
    </div>
  );
}

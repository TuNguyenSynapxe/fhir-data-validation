import React from 'react';
import { VerticalPane } from '../components/playground/SplitPane/VerticalPane';

interface PlaygroundLayoutProps {
  // Left panel (Bundle)
  bundleContent: React.ReactNode;
  
  // Right panel (Rules/Validation/Observations modes)
  rulesContent: React.ReactNode;
}

/**
 * IDE-style playground layout with resizable split panes:
 * - Horizontal split (Bundle 40% | Right Panel 60%)
 * - Right Panel switches between Rules/Validation/Observations modes
 */
export const PlaygroundLayout: React.FC<PlaygroundLayoutProps> = ({
  bundleContent,
  rulesContent,
}) => {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <VerticalPane
        defaultLeftWidth={40}
        minLeftWidth={25}
        minRightWidth={35}
        leftContent={bundleContent}
        rightContent={rulesContent}
      />
    </div>
  );
};

export default PlaygroundLayout;

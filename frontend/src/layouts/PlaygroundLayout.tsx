import React from 'react';
import { HorizontalPane } from '../components/playground/SplitPane/HorizontalPane';
import { VerticalPane } from '../components/playground/SplitPane/VerticalPane';

interface PlaygroundLayoutProps {
  // Left panel (Bundle)
  bundleContent: React.ReactNode;
  
  // Right panel (Rules/CodeMaster/Metadata tabs)
  rulesContent: React.ReactNode;
  
  // Bottom panel (Validation)
  validationContent: React.ReactNode;
}

/**
 * IDE-style playground layout with resizable split panes:
 * - Top: Horizontal split (Bundle 40% | Rules 60%)
 * - Bottom: Validation panel (collapsible)
 */
export const PlaygroundLayout: React.FC<PlaygroundLayoutProps> = ({
  bundleContent,
  rulesContent,
  validationContent,
}) => {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <HorizontalPane
        defaultTopHeight={70}
        minTopHeight={30}
        minBottomHeight={15}
        topContent={
          <VerticalPane
            defaultLeftWidth={40}
            minLeftWidth={25}
            minRightWidth={35}
            leftContent={bundleContent}
            rightContent={rulesContent}
          />
        }
        bottomContent={validationContent}
      />
    </div>
  );
};

export default PlaygroundLayout;

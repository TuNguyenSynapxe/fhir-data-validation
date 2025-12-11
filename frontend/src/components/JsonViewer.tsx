// TODO: Implement tree-based JSON viewer with highlight + scroll-to-path.
// For now this is just a placeholder component.
import React from 'react'

export const JsonViewer: React.FC<{ json: any }> = ({ json }) => {
  return (
    <pre className="text-xs font-mono whitespace-pre-wrap">
      {JSON.stringify(json, null, 2)}
    </pre>
  )
}

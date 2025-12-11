// TODO: Implement grouped error panel using the unified error model.
import React from 'react'

export interface ValidationError {
  source: string
  severity: string
  resourceType: string
  path: string
  jsonPointer: string
  errorCode: string
  message: string
}

export const ErrorPanel: React.FC<{ errors: ValidationError[] }> = ({ errors }) => {
  if (!errors?.length) return <div className="text-xs text-slate-400">No errors.</div>

  return (
    <div className="space-y-1 text-xs">
      {errors.map((e, idx) => (
        <div key={idx} className="border rounded p-2 bg-red-50">
          <div className="font-semibold">{e.errorCode}</div>
          <div>{e.message}</div>
          <div className="text-[10px] text-slate-500">
            {e.resourceType} @ {e.path}
          </div>
        </div>
      ))}
    </div>
  )
}

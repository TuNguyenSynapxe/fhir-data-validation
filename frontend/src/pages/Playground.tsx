import React, { useState } from 'react'

export const Playground: React.FC = () => {
  const [bundleJson, setBundleJson] = useState<string>('{}')
  const [result, setResult] = useState<any | null>(null)

  const handleValidate = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundle: JSON.parse(bundleJson) })
      })
      const data = await response.json()
      setResult(data)
    } catch (err) {
      console.error(err)
      alert('Validation call failed. Check console.')
    }
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <section>
        <h2 className="font-medium mb-2 text-sm">FHIR Bundle JSON</h2>
        <textarea
          className="w-full h-[400px] border rounded text-xs font-mono p-2"
          value={bundleJson}
          onChange={e => setBundleJson(e.target.value)}
        />
        <button
          className="mt-2 px-3 py-1 text-sm border rounded bg-slate-900 text-white"
          onClick={handleValidate}
        >
          Validate
        </button>
      </section>
      <section>
        <h2 className="font-medium mb-2 text-sm">Validation Result (Raw)</h2>
        <pre className="w-full h-[400px] border rounded text-xs font-mono p-2 overflow-auto">
{JSON.stringify(result, null, 2)}
        </pre>
      </section>
    </div>
  )
}

import React from 'react'
import { Playground } from './pages/Playground'

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="px-4 py-3 border-b bg-white">
        <h1 className="text-lg font-semibold">FHIR Processor V2 – Playground</h1>
        <p className="text-xs text-slate-500">
          Paste a FHIR Bundle and validate against your rules.json.
        </p>
      </header>
      <main className="p-4">
        <Playground />
      </main>
    </div>
  )
}

import type { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <img 
                src="https://mc-ae878fb3-424b-4ec4-86b1-1740-cdn-endpoint.azureedge.net/-/media/project/ihis/ihis/synapxe-singapore-healthtech-agency-logo.gif?rev=c75184b5ee584c24bc750468787e784a" 
                alt="Synapxe" 
                className="h-8"
              />
              <div className="h-8 w-px bg-gray-300" />
              <h1 className="text-xl font-semibold text-gray-900">
                FHIR Processor V2
              </h1>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

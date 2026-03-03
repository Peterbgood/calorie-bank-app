import React from 'react';
import CalorieTracker from './CalorieTracker';

function App() {
  return (
    <div className="min-vh-100 d-flex flex-column" style={{ 
      backgroundColor: '#f8f9fa', 
      backgroundImage: 'radial-gradient(#d1d9e6 0.5px, transparent 0.5px)', 
      backgroundSize: '20px 20px' 
    }}>
      
      {/* MAIN CONTENT AREA */}
      <main className="flex-grow-1 container py-2">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-10 col-xl-9">
            {/* Your fancy CalorieTracker.js header starts here */}
            <CalorieTracker />
          </div>
        </div>
      </main>

      {/* MODERN MINIMAL FOOTER */}
      <footer className="py-4 mt-auto border-top bg-white" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
        <div className="container text-center">
          <div className="d-flex justify-content-center align-items-center gap-2 mb-1">
             <div className="bg-primary" style={{ width: '8px', height: '8px', borderRadius: '50%' }}></div>
             <span className="fw-bold text-dark" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>SYSTEM ACTIVE</span>
          </div>
          <small className="text-muted fw-semibold" style={{ letterSpacing: '2px', fontSize: '0.6rem', textTransform: 'uppercase' }}>
            © 2026 CALORIE TRACKER PRO • PERFORMANCE DASHBOARD
          </small>
        </div>
      </footer>
    </div>
  );
}

export default App;
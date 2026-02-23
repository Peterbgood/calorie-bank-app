import React from 'react';
import CalorieTracker from './CalorieTracker'; // Import your new component

function App() {
  return (
    <div className="bg-light min-vh-100">
      {/* Simple Header */}
      <nav className="navbar navbar-dark bg-primary shadow-sm mb-4">
        <div className="container">
          <span className="navbar-brand fw-bold">
            <i className="bi bi-activity me-2"></i> Health & Wealth Portal
          </span>
        </div>
      </nav>

      <div className="container">
        <div className="row">
          <div className="col-12">
            {/* This is where your tracker lives */}
            <CalorieTracker />
          </div>
        </div>
      </div>
      
      <footer className="text-center py-4 text-muted">
        <small>© 2026 My Portfolio Project</small>
      </footer>
    </div>
  );
}

export default App;

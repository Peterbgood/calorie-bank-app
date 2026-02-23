import React from 'react';
import CalorieTracker from './CalorieTracker'; // Matches the file name exactly

function App() {
  return (
    <div className="bg-light min-vh-100">
      <nav className="navbar navbar-dark bg-primary shadow-sm mb-4">
        <div className="container">
          <span className="navbar-brand fw-bold">
            <i className="bi bi-fire me-2"></i> Calorie Tracker Pro
          </span>
        </div>
      </nav>

      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-10 col-lg-8">
            <CalorieTracker />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
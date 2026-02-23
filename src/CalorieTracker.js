import React, { useState, useEffect } from 'react';

function CalorieTracker() {
  const [food, setFood] = useState('');
  const [calories, setCalories] = useState('');
  const [logs, setLogs] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // YOUR NEW API URL
  const API_URL = "https://sheetdb.io/api/v1/zbceyj9yrll6m";

  const fetchLogs = () => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setLogs(data);
        }
      })
      .catch(err => console.error("Fetch error:", err));
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Structure matches a sheet with headers: food, calories
    const payload = {
      data: [
        {
          food: food,
          calories: calories
        }
      ]
    };

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(result => {
      if (result.created === 1) {
        setFood('');
        setCalories('');
        fetchLogs();
      } else {
        // This will tell us EXACTLY what SheetDB is complaining about
        alert("Server says: " + JSON.stringify(result));
      }
    })
    .catch(err => alert("Network error: " + err))
    .finally(() => setIsSubmitting(false));
  };

  const totalCals = logs.reduce((acc, curr) => acc + (Number(curr.calories) || 0), 0);

  return (
    <div className="card shadow border-0 mt-4">
      <div className="card-header bg-success text-white">
        <h3 className="h5 mb-0">Calorie Tracker (Live)</h3>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit} className="row g-2 mb-4">
          <div className="col-md-6">
            <input 
              className="form-control" 
              placeholder="Food name" 
              value={food} 
              onChange={(e) => setFood(e.target.value)} 
              required 
            />
          </div>
          <div className="col-md-4">
            <input 
              className="form-control" 
              type="number" 
              placeholder="Cals" 
              value={calories} 
              onChange={(e) => setCalories(e.target.value)} 
              required 
            />
          </div>
          <div className="col-md-2">
            <button type="submit" className="btn btn-success w-100" disabled={isSubmitting}>
              {isSubmitting ? '...' : 'Add'}
            </button>
          </div>
        </form>

        <div className="table-responsive">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Food Item</th>
                <th className="text-end">Calories</th>
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? logs.map((item, i) => (
                <tr key={i}>
                  <td>{item.food}</td>
                  <td className="text-end fw-bold">{item.calories}</td>
                </tr>
              )) : (
                <tr><td colSpan="2" className="text-center text-muted">No data found in sheet.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="table-light">
                <td className="text-end fw-bold">Total:</td>
                <td className="text-end text-danger fw-bold">{totalCals}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

export default CalorieTracker;
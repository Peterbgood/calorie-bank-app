import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

function CalorieTracker() {
  const [logs, setLogs] = useState([]);
  const [food, setFood] = useState('');
  const [calories, setCalories] = useState('');
  const [weight, setWeight] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingId, setEditingId] = useState(null);
  
  const API_URL = "https://sheetdb.io/api/v1/zbceyj9yrll6m";
  const GOAL = 1700;

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = () => {
    fetch(API_URL).then(res => res.json()).then(data => {
      if (Array.isArray(data)) setLogs(data);
    });
  };

  const handleSubmit = (e, type) => {
    e.preventDefault();
    const isWeight = type === 'weight';
    
    // Weight Overwrite Logic
    const existingWeight = isWeight ? logs.find(l => l.date === selectedDate && l.type === 'weight') : null;
    const id = isWeight ? (existingWeight?.id || Date.now()) : (editingId || Date.now());
    
    const entry = { 
      id, 
      date: selectedDate, 
      food: isWeight ? 'Weight Entry' : food, 
      calories: isWeight ? 0 : calories, 
      weight: isWeight ? weight : 0, 
      type 
    };

    const isEdit = editingId || (isWeight && existingWeight);
    const method = isEdit ? 'PATCH' : 'POST';
    const url = isEdit ? `${API_URL}/id/${id}` : API_URL;

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isEdit ? { data: entry } : { data: [entry] })
    }).then(() => {
      setFood(''); setCalories(''); setWeight(''); setEditingId(null);
      fetchLogs();
    });
  };

  const deleteEntry = (id) => {
    if(window.confirm("Delete this entry?")) {
      fetch(`${API_URL}/id/${id}`, { method: 'DELETE' }).then(fetchLogs);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setFood(item.food);
    setCalories(item.calories);
    setSelectedDate(item.date);
  };

  // --- MATH & FILTERING ---
  const dailyLogs = logs.filter(l => l.date === selectedDate && l.type === 'food');
  const dailyWeight = logs.find(l => l.date === selectedDate && l.type === 'weight');
  const usedToday = dailyLogs.reduce((a, c) => a + Number(c.calories), 0);
  const remaining = GOAL - usedToday;

  // --- CHART 1: WEEKLY CALORIES ---
  const getWeekData = () => {
    const now = new Date();
    const monday = new Date(now.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)));
    return [...Array(7)].map((_, i) => {
      const d = new Date(monday); d.setDate(monday.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      return logs.filter(l => l.date === dStr && l.type === 'food').reduce((s, c) => s + Number(c.calories), 0);
    });
  };

  // --- CHART 2: 3-MONTH WEIGHT ---
  const weightTrendData = logs
    .filter(l => l.type === 'weight')
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .filter(l => {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return new Date(l.date) >= threeMonthsAgo;
    });

  return (
    <div className="container py-4" style={{ maxWidth: '900px' }}>
      <h2 className="text-center mb-4 fw-bold text-primary">Health Dashboard</h2>

      {/* 1. Quick Stats View */}
      <div className="card shadow-sm mb-4 bg-white p-3 border-0">
        <div className="row align-items-center text-center">
          <div className="col-md-3 border-end">
            <small className="text-muted fw-bold">DATE</small>
            <input type="date" className="form-control form-control-sm mt-1" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>
          <div className="col-md-3 border-end">
            <small className="text-muted fw-bold">USED</small>
            <h4 className="mb-0">{usedToday} <small className="fs-6">kcal</small></h4>
          </div>
          <div className="col-md-3 border-end">
            <small className="text-muted fw-bold">REMAINING</small>
            <h4 className={`mb-0 ${remaining < 0 ? 'text-danger' : 'text-success'}`}>
              {remaining} <small className="fs-6">kcal</small>
            </h4>
          </div>
          <div className="col-md-3">
            <small className="text-muted fw-bold">WEIGHT</small>
            <h4 className="mb-0 text-dark">{dailyWeight ? dailyWeight.weight : '--'} <small className="fs-6">lbs</small></h4>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        {/* 2. Log Food */}
        <div className="col-md-6">
          <div className="card shadow-sm p-3 h-100 border-0">
            <h6 className="fw-bold mb-3">{editingId ? '✏️ Edit Item' : '🥗 Add Food'}</h6>
            <form onSubmit={(e) => handleSubmit(e, 'food')}>
              <input className="form-control mb-2" placeholder="What did you eat?" value={food} onChange={(e) => setFood(e.target.value)} required />
              <input className="form-control mb-2" type="number" placeholder="Calories" value={calories} onChange={(e) => setCalories(e.target.value)} required />
              <button className={`btn w-100 ${editingId ? 'btn-warning' : 'btn-primary'}`}>
                {editingId ? 'Update Entry' : 'Add to Log'}
              </button>
              {editingId && <button className="btn btn-link btn-sm w-100" onClick={() => setEditingId(null)}>Cancel</button>}
            </form>
          </div>
        </div>

        {/* 3. Log Weight */}
        <div className="col-md-6">
          <div className="card shadow-sm p-3 h-100 border-0">
            <h6 className="fw-bold mb-3">⚖️ Update Weight</h6>
            <form onSubmit={(e) => handleSubmit(e, 'weight')}>
              <p className="small text-muted mb-2">Entering weight for {selectedDate} will update any previous entry for this day.</p>
              <input className="form-control mb-2" type="number" step="0.1" placeholder="Weight in lbs" value={weight} onChange={(e) => setWeight(e.target.value)} required />
              <button className="btn btn-dark w-100">Save Weight</button>
            </form>
          </div>
        </div>
      </div>

      {/* 4. Weekly Calorie Chart */}
      <div className="card shadow-sm mb-4 p-3 border-0">
        <h6 className="fw-bold text-muted mb-3">Weekly Calorie Intake</h6>
        <div style={{ height: '220px' }}>
          <Bar data={{
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
              data: getWeekData(),
              backgroundColor: getWeekData().map(v => v > GOAL ? '#dc3545' : '#198754'),
              borderRadius: 5
            }]
          }} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
        </div>
      </div>

      {/* 5. Food Log Table */}
      <div className="card shadow-sm mb-4 border-0">
        <div className="card-header bg-white fw-bold border-0">Meals for {selectedDate}</div>
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Food Item</th>
                <th>Cals</th>
                <th className="text-end">Manage</th>
              </tr>
            </thead>
            <tbody>
              {dailyLogs.map((l) => (
                <tr key={l.id}>
                  <td><strong>{l.food}</strong></td>
                  <td>{l.calories} kcal</td>
                  <td className="text-end">
                    <button onClick={() => startEdit(l)} className="btn btn-sm btn-outline-info me-2">Edit</button>
                    <button onClick={() => deleteEntry(l.id)} className="btn btn-sm btn-outline-danger">Del</button>
                  </td>
                </tr>
              ))}
              {dailyLogs.length === 0 && <tr><td colSpan="3" className="text-center py-4 text-muted">No entries found for this date.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. 3-Month Weight Trend */}
      <div className="card shadow-sm p-3 border-0">
        <h6 className="fw-bold text-muted mb-3">Weight Trend (90 Days)</h6>
        <div style={{ height: '200px' }}>
          <Line data={{
            labels: weightTrendData.map(l => l.date),
            datasets: [{
              label: 'Weight (lbs)',
              data: weightTrendData.map(l => l.weight),
              borderColor: '#0d6efd',
              backgroundColor: 'rgba(13, 110, 253, 0.1)',
              tension: 0.3,
              fill: true,
              pointRadius: 4
            }]
          }} options={{ maintainAspectRatio: false }} />
        </div>
      </div>
    </div>
  );
}

export default CalorieTracker;
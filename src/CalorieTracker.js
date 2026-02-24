import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, LineElement, PointElement } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import FOOD_PRESETS from './presets.json';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

function CalorieTracker() {
  // Fix for Eastern Time: Use local date string (YYYY-MM-DD)
  const getLocalDate = () => new Date().toLocaleDateString('en-CA');
  
  const [logs, setLogs] = useState([]);
  const [food, setFood] = useState('');
  const [calories, setCalories] = useState('');
  const [weight, setWeight] = useState('');
  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [editingId, setEditingId] = useState(null);
  
  const API_URL = "https://sheetdb.io/api/v1/zbceyj9yrll6m";
  const DAILY_GOAL = 1700;
  const TARGET_WEIGHT = 150;

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = () => {
    fetch(API_URL).then(res => res.json()).then(data => {
      if (Array.isArray(data)) setLogs(data);
    });
  };

  const handleAddFood = (name, cals, idToReplace = null) => {
    const trimmedName = name.trim();
    const existing = logs.find(l => 
      l.date === selectedDate && 
      l.type === 'food' && 
      l.food.toLowerCase() === trimmedName.toLowerCase() &&
      l.id !== idToReplace
    );

    if (existing) {
      const updatedEntry = { ...existing, calories: Number(existing.calories) + Number(cals) };
      fetch(`${API_URL}/id/${existing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: updatedEntry })
      }).then(() => {
        if (idToReplace) fetch(`${API_URL}/id/${idToReplace}`, { method: 'DELETE' }).then(fetchLogs);
        else fetchLogs();
      });
    } else {
      const entry = { id: idToReplace || Date.now(), date: selectedDate, food: trimmedName, calories: cals, weight: 0, type: 'food' };
      fetch(idToReplace ? `${API_URL}/id/${idToReplace}` : API_URL, {
        method: idToReplace ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(idToReplace ? { data: entry } : { data: [entry] })
      }).then(fetchLogs);
    }
  };

  const deleteEntry = (id) => {
    fetch(`${API_URL}/id/${id}`, { method: 'DELETE' }).then(fetchLogs);
  };

  const getWeekData = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));

    return [...Array(7)].map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = d.toLocaleDateString('en-CA');
      return logs.filter(l => l.date === dStr && l.type === 'food').reduce((s, c) => s + Number(c.calories || 0), 0);
    });
  };

  const dailyLogs = logs.filter(l => l.date === selectedDate && l.type === 'food')
    .sort((a, b) => (a.food.toLowerCase().includes('coffee') ? -1 : 1));
  const usedToday = dailyLogs.reduce((a, c) => a + Number(c.calories), 0);
  const progressPercent = Math.min((usedToday / DAILY_GOAL) * 100, 100);
  const avg7Day = Math.round(getWeekData().reduce((a, b) => a + b, 0) / 7);

  const weightTrendData = logs
    .filter(l => l.type === 'weight')
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-90);

  return (
    <div className="container py-4" style={{ maxWidth: '950px' }}>
      <h2 className="text-center mb-4 fw-bold text-primary">Health Tracker</h2>

      {/* 1. Progress Bar (Card 1) */}
      <div className="card shadow-sm mb-4 border-0 p-3">
        <div className="d-flex justify-content-between mb-2 fw-bold">
          <input type="date" className="form-control w-auto" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          <span>{usedToday} / {DAILY_GOAL} kcal</span>
        </div>
        <div className="progress" style={{ height: '20px' }}>
          <div className={`progress-bar progress-bar-striped progress-bar-animated ${usedToday > DAILY_GOAL ? 'bg-danger' : 'bg-success'}`} style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>

      <div className="row g-4">
        {/* Main Column */}
        <div className="col-lg-7 order-lg-2">
          {/* 2. Food Log (Card 2) */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-white fw-bold">Food Log (Coffee Priority)</div>
            <div className="list-group list-group-flush">
              {dailyLogs.length > 0 ? dailyLogs.map(l => (
                <div key={l.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <div><strong>{l.food}</strong><br/><small>{l.calories} kcal</small></div>
                  <div>
                    <button onClick={() => { setEditingId(l.id); setFood(l.food); setCalories(l.calories); }} className="btn btn-sm text-info">Edit</button>
                    <button onClick={() => deleteEntry(l.id)} className="btn btn-sm text-danger">Del</button>
                  </div>
                </div>
              )) : <div className="p-3 text-center text-muted">No food logged today.</div>}
            </div>
          </div>

          {/* 3. Quick Add (Card 3 on Mobile) */}
          <div className="card shadow-sm p-3 border-0 mb-4 d-lg-none">
             <h6 className="fw-bold mb-3">⚡ Quick Add</h6>
             <div className="overflow-auto" style={{ maxHeight: '300px' }}>
              {FOOD_PRESETS.map((cat, idx) => (
                <div key={idx} className="mb-2">
                  <small className="text-uppercase text-muted fw-bold" style={{ fontSize: '0.7rem' }}>{cat.category}</small>
                  <div className="d-flex flex-wrap gap-2 mt-1">
                    {cat.items.map((item, i) => (
                      <button key={i} onClick={() => handleAddFood(item.name, item.calories)} className="btn btn-sm btn-outline-secondary">
                        {item.name} <span className="text-primary fw-bold ms-1">{item.calories}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Manual Log (Card 4 on Mobile) */}
          <div className="card shadow-sm p-3 mb-4 border-0 d-lg-none">
            <h6 className="fw-bold mb-3">{editingId ? '✏️ Edit Food' : '🥗 Manual Log'}</h6>
            <form onSubmit={(e) => { e.preventDefault(); handleAddFood(food, calories, editingId); setFood(''); setCalories(''); setEditingId(null); }}>
              <input className="form-control mb-2" placeholder="Food" value={food} onChange={(e) => setFood(e.target.value)} required />
              <input className="form-control mb-2" type="number" placeholder="kcal" value={calories} onChange={(e) => setCalories(e.target.value)} required />
              <button className="btn btn-primary w-100">{editingId ? 'Save' : 'Add'}</button>
            </form>
          </div>

          {/* Weekly Chart */}
          <div className="card shadow-sm mb-4 p-3 border-0">
            <h6 className="fw-bold text-muted mb-3 text-center">Weekly Intake</h6>
            <div style={{ height: '180px' }}>
              <Bar data={{
                labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
                datasets: [{ data: getWeekData(), backgroundColor: getWeekData().map(v => v > DAILY_GOAL ? '#dc3545' : '#198754'), borderRadius: 5 }]
              }} options={{ plugins: { legend: { display: false } }, maintainAspectRatio: false }} />
            </div>
          </div>

          {/* Weight Trend */}
          <div className="card shadow-sm p-3 border-0 mb-4">
            <h6 className="fw-bold text-muted mb-2 text-center">Weight Trend vs. {TARGET_WEIGHT}lb Goal</h6>
            <div style={{ height: '220px' }}>
              <Line data={{
                labels: weightTrendData.map(l => l.date),
                datasets: [
                  { label: 'Weight', data: weightTrendData.map(l => l.weight), borderColor: '#0d6efd', tension: 0.3, fill: false },
                  { label: 'Goal', data: weightTrendData.map(() => TARGET_WEIGHT), borderColor: '#ffc107', borderDash: [5, 5], pointRadius: 0 }
                ]
              }} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
            </div>
          </div>
        </div>

        {/* Sidebar Column (Desktop) */}
        <div className="col-lg-5 order-lg-1 d-none d-lg-block">
          {/* Quick Add (Desktop Sidebar) */}
          <div className="card shadow-sm p-3 border-0 mb-4">
            <h6 className="fw-bold mb-3">⚡ Quick Add</h6>
            <div className="overflow-auto" style={{ maxHeight: '350px' }}>
              {FOOD_PRESETS.map((cat, idx) => (
                <div key={idx} className="mb-2">
                  <small className="text-uppercase text-muted fw-bold" style={{ fontSize: '0.7rem' }}>{cat.category}</small>
                  <div className="d-flex flex-wrap gap-2 mt-1">
                    {cat.items.map((item, i) => (
                      <button key={i} onClick={() => handleAddFood(item.name, item.calories)} className="btn btn-sm btn-outline-secondary">
                        {item.name} <span className="text-primary fw-bold ms-1">{item.calories}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Manual Log (Desktop Sidebar) */}
          <div className="card shadow-sm p-3 mb-4 border-0">
            <h6 className="fw-bold mb-3">{editingId ? 'Edit Item' : 'Manual Log'}</h6>
            <form onSubmit={(e) => { e.preventDefault(); handleAddFood(food, calories, editingId); setFood(''); setCalories(''); setEditingId(null); }}>
              <input className="form-control mb-2" placeholder="Item Name" value={food} onChange={(e) => setFood(e.target.value)} required />
              <input className="form-control mb-2" type="number" placeholder="kcal" value={calories} onChange={(e) => setCalories(e.target.value)} required />
              <button className="btn btn-primary w-100">{editingId ? 'Save' : 'Add'}</button>
            </form>
          </div>

          {/* Weight Log */}
          <div className="card shadow-sm p-3 border-0 mb-4">
            <h6 className="fw-bold mb-3">⚖️ Log Weight</h6>
            <form onSubmit={(e) => {
              e.preventDefault();
              const entry = { id: Date.now(), date: selectedDate, food: 'Weight Entry', calories: 0, weight, type: 'weight' };
              fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: [entry] }) }).then(() => { setWeight(''); fetchLogs(); });
            }}>
              <input className="form-control mb-2" type="number" step="0.1" placeholder="lbs" value={weight} onChange={(e) => setWeight(e.target.value)} required />
              <button className="btn btn-dark w-100">Save Weight</button>
            </form>
          </div>
        </div>
      </div>

      <div className="alert alert-light border shadow-sm mt-4 d-flex justify-content-between align-items-center">
        <span>7-Day Average: <strong>{avg7Day} kcal</strong></span>
        <span className="badge bg-warning text-dark">Goal: {TARGET_WEIGHT} lbs</span>
      </div>
    </div>
  );
}

export default CalorieTracker;
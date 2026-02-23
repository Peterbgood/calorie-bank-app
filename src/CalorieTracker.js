import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import FOOD_PRESETS from './presets.json';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

function CalorieTracker() {
  const [logs, setLogs] = useState([]);
  const [food, setFood] = useState('');
  const [calories, setCalories] = useState('');
  const [weight, setWeight] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
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

  // --- SMART MERGE LOGIC ---
  const handleAddFood = (name, cals, idToReplace = null) => {
    const trimmedName = name.trim();
    // Look for an existing item with the same name (excluding the one we are currently editing)
    const existing = logs.find(l => 
      l.date === selectedDate && 
      l.type === 'food' && 
      l.food.toLowerCase() === trimmedName.toLowerCase() &&
      l.id !== idToReplace
    );

    if (existing) {
      // Merge: Add calories to the existing record
      const updatedEntry = { ...existing, calories: Number(existing.calories) + Number(cals) };
      fetch(`${API_URL}/id/${existing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: updatedEntry })
      }).then(() => {
        // If we were editing a different item and renamed it to an existing one, delete the old ID
        if (idToReplace && idToReplace !== existing.id) {
          fetch(`${API_URL}/id/${idToReplace}`, { method: 'DELETE' }).then(fetchLogs);
        } else {
          fetchLogs();
        }
      });
    } else if (idToReplace) {
      // Regular Edit: No name collision found
      const entry = { id: idToReplace, date: selectedDate, food: trimmedName, calories: cals, weight: 0, type: 'food' };
      fetch(`${API_URL}/id/${idToReplace}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: entry })
      }).then(fetchLogs);
    } else {
      // New Entry
      const entry = { id: Date.now(), date: selectedDate, food: trimmedName, calories: cals, weight: 0, type: 'food' };
      fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: [entry] })
      }).then(fetchLogs);
    }
  };

  const handleSubmit = (e, type) => {
    e.preventDefault();
    if (type === 'food') {
      handleAddFood(food, calories, editingId);
      setFood(''); setCalories(''); setEditingId(null);
    } else {
      const existingWeight = logs.find(l => l.date === selectedDate && l.type === 'weight');
      const id = existingWeight?.id || Date.now();
      const entry = { id, date: selectedDate, food: 'Weight Entry', calories: 0, weight, type: 'weight' };
      
      fetch(existingWeight ? `${API_URL}/id/${id}` : API_URL, {
        method: existingWeight ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(existingWeight ? { data: entry } : { data: [entry] })
      }).then(() => { setWeight(''); fetchLogs(); });
    }
  };

  const deleteEntry = (id) => {
    fetch(`${API_URL}/id/${id}`, { method: 'DELETE' }).then(fetchLogs);
  };

  const getSortedLogs = () => {
    return logs
      .filter(l => l.date === selectedDate && l.type === 'food')
      .sort((a, b) => {
        const aIsCoffee = a.food.toLowerCase().includes('coffee');
        const bIsCoffee = b.food.toLowerCase().includes('coffee');
        if (aIsCoffee && !bIsCoffee) return -1;
        if (!aIsCoffee && bIsCoffee) return 1;
        return 0;
      });
  };

  const weightTrendData = logs
    .filter(l => l.type === 'weight')
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-90);

  return (
    <div className="container py-4" style={{ maxWidth: '950px' }}>
      <h2 className="text-center mb-4 fw-bold text-primary">Health Tracker</h2>

      <div className="card shadow-sm mb-4 border-0 p-3">
        <div className="row mb-2 align-items-center">
          <div className="col-4">
            <input type="date" className="form-control form-control-sm" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>
          <div className="col-8 text-end fw-bold">
            {getSortedLogs().reduce((a, c) => a + Number(c.calories), 0)} / {DAILY_GOAL} kcal
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-5">
          {/* Input Form */}
          <div className="card shadow-sm p-3 mb-4 border-0">
            <h6 className="fw-bold mb-3">{editingId ? '✏️ Edit Entry' : '🥗 Manual Log'}</h6>
            <form onSubmit={(e) => handleSubmit(e, 'food')}>
              <input className="form-control mb-2" placeholder="Item Name" value={food} onChange={(e) => setFood(e.target.value)} required />
              <input className="form-control mb-2" type="number" placeholder="Calories" value={calories} onChange={(e) => setCalories(e.target.value)} required />
              <button className={`btn w-100 ${editingId ? 'btn-warning' : 'btn-primary'}`}>{editingId ? 'Save Changes' : 'Add Food'}</button>
              {editingId && <button type="button" onClick={() => {setEditingId(null); setFood(''); setCalories('');}} className="btn btn-link btn-sm w-100 text-muted mt-2">Cancel Edit</button>}
            </form>
          </div>

          {/* Quick Add Section with Visible Values */}
          <div className="card shadow-sm p-3 border-0 mb-4">
            <h6 className="fw-bold mb-3">⚡ Quick Add (kcal)</h6>
            <div className="overflow-auto" style={{ maxHeight: '400px' }}>
              {FOOD_PRESETS.map((cat, idx) => (
                <div key={idx} className="mb-3">
                  <small className="text-muted fw-bold d-block mb-2 text-uppercase" style={{ fontSize: '0.7rem' }}>{cat.category}</small>
                  <div className="d-grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
                    {cat.items.map((item, i) => (
                      <button key={i} onClick={() => handleAddFood(item.name, item.calories)} className="btn btn-sm btn-outline-secondary d-flex justify-content-between">
                        <span>{item.name}</span>
                        <span className="fw-bold text-primary">{item.calories}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-white fw-bold">Daily Log</div>
            <table className="table align-middle mb-0">
              <tbody>
                {getSortedLogs().map((l) => (
                  <tr key={l.id}>
                    <td><strong>{l.food}</strong><br/><small className="text-muted">{l.calories} kcal</small></td>
                    <td className="text-end">
                      <button onClick={() => { setEditingId(l.id); setFood(l.food); setCalories(l.calories); }} className="btn btn-sm btn-outline-info me-2">Edit</button>
                      <button onClick={() => deleteEntry(l.id)} className="btn btn-sm btn-outline-danger">Del</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="card shadow-sm p-3 border-0">
            <h6 className="fw-bold text-muted mb-3">Weight Trend vs 150lb Goal</h6>
            <div style={{ height: '220px' }}>
              <Line data={{
                labels: weightTrendData.map(l => l.date),
                datasets: [
                  { label: 'Weight', data: weightTrendData.map(l => l.weight), borderColor: '#0d6efd', tension: 0.3, fill: false },
                  { label: 'Goal', data: weightTrendData.map(() => TARGET_WEIGHT), borderColor: '#ffc107', borderDash: [5, 5], pointRadius: 0 }
                ]
              }} options={{ maintainAspectRatio: false }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalorieTracker;
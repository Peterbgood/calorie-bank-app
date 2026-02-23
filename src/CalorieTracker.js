import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import FOOD_PRESETS from './presets.json'; // Import your separate data file here

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
  const WEEKLY_GOAL = DAILY_GOAL * 7;

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = () => {
    fetch(API_URL).then(res => res.json()).then(data => {
      if (Array.isArray(data)) setLogs(data);
    });
  };

  const handleQuickAdd = (item) => {
    const entry = { id: Date.now(), date: selectedDate, food: item.name, calories: item.calories, weight: 0, type: 'food' };
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [entry] })
    }).then(fetchLogs);
  };

  const handleSubmit = (e, type) => {
    e.preventDefault();
    const isWeight = type === 'weight';
    const existingWeight = isWeight ? logs.find(l => l.date === selectedDate && l.type === 'weight') : null;
    const id = isWeight ? (existingWeight?.id || Date.now()) : (editingId || Date.now());
    
    const entry = { id, date: selectedDate, food: isWeight ? 'Weight Entry' : food, calories: isWeight ? 0 : calories, weight: isWeight ? weight : 0, type };
    const isEdit = editingId || (isWeight && existingWeight);

    fetch(isEdit ? `${API_URL}/id/${id}` : API_URL, {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isEdit ? { data: entry } : { data: [entry] })
    }).then(() => {
      setFood(''); setCalories(''); setWeight(''); setEditingId(null); fetchLogs();
    });
  };

  const deleteEntry = (id) => {
    if(window.confirm("Delete this entry?")) fetch(`${API_URL}/id/${id}`, { method: 'DELETE' }).then(fetchLogs);
  };

  // --- MATH & DATA ---
  const dailyLogs = logs.filter(l => l.date === selectedDate && l.type === 'food');
  const usedToday = dailyLogs.reduce((a, c) => a + Number(c.calories), 0);
  const remainingToday = DAILY_GOAL - usedToday;
  
  const now = new Date();
  const monday = new Date(now.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))).toISOString().split('T')[0];
  const weeklyUsed = logs.filter(l => l.date >= monday && l.type === 'food').reduce((a, c) => a + Number(c.calories), 0);
  const weeklyStatus = WEEKLY_GOAL - weeklyUsed;

  const getWeekData = () => {
    const start = new Date();
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(start.setDate(diff));
    return [...Array(7)].map((_, i) => {
      const d = new Date(mon); d.setDate(mon.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      return logs.filter(l => l.date === dStr && l.type === 'food').reduce((s, c) => s + Number(c.calories), 0);
    });
  };

  return (
    <div className="container py-4" style={{ maxWidth: '950px' }}>
      <h2 className="text-center mb-4 fw-bold text-primary">Health Tracker</h2>

      {/* Progress & Stats Bar */}
      <div className="card shadow-sm mb-4 border-0 p-3">
        <div className="row mb-2 align-items-center">
          <div className="col-4">
            <input type="date" className="form-control form-control-sm" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>
          <div className="col-8 text-end fw-bold">
            {usedToday} / {DAILY_GOAL} kcal <span className={remainingToday < 0 ? 'text-danger' : 'text-success'}>({remainingToday} Left)</span>
          </div>
        </div>
        <div className="progress" style={{ height: '15px' }}>
          <div className={`progress-bar progress-bar-striped ${usedToday > DAILY_GOAL ? 'bg-danger' : 'bg-success'}`} style={{ width: `${Math.min((usedToday/DAILY_GOAL)*100, 100)}%` }}></div>
        </div>
      </div>

      <div className="row g-4">
        {/* Left Column: Logging Inputs */}
        <div className="col-lg-5">
          <div className="card shadow-sm p-3 mb-4 border-0">
            <h6 className="fw-bold mb-3">{editingId ? '✏️ Edit Food' : '🥗 Manual Log'}</h6>
            <form onSubmit={(e) => handleSubmit(e, 'food')}>
              <input className="form-control mb-2" placeholder="Item" value={food} onChange={(e) => setFood(e.target.value)} required />
              <input className="form-control mb-2" type="number" placeholder="Calories" value={calories} onChange={(e) => setCalories(e.target.value)} required />
              <button className={`btn w-100 ${editingId ? 'btn-warning' : 'btn-primary'}`}>{editingId ? 'Update' : 'Add'}</button>
            </form>
          </div>

          <div className="card shadow-sm p-3 border-0">
            <h6 className="fw-bold mb-3">⚖️ Update Weight</h6>
            <form onSubmit={(e) => handleSubmit(e, 'weight')}>
              <input className="form-control mb-2" type="number" step="0.1" placeholder="lbs" value={weight} onChange={(e) => setWeight(e.target.value)} required />
              <button className="btn btn-dark w-100">Save Weight</button>
            </form>
          </div>
        </div>

        {/* Right Column: Log Table (Now Above Quick Add) & Charts */}
        <div className="col-lg-7">
          {/* Weekly Status Banner */}
          <div className={`card shadow-sm mb-4 border-0 p-3 text-white ${weeklyStatus < 0 ? 'bg-danger' : 'bg-success'}`}>
             <h6 className="mb-0 text-center">Weekly Budget: <strong>{weeklyStatus < 0 ? `${Math.abs(weeklyStatus)} Over` : `${weeklyStatus} Left`}</strong></h6>
          </div>

          {/* FOOD LOG TABLE - Now at the top of the right column */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-white fw-bold d-flex justify-content-between align-items-center">
                <span>Meals for {selectedDate}</span>
                <span className="badge bg-secondary">Weight: {logs.find(l => l.date === selectedDate && l.type === 'weight')?.weight || '--'} lbs</span>
            </div>
            <table className="table align-middle mb-0">
              <tbody>
                {dailyLogs.map((l) => (
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

          {/* QUICK ADD ITEMS */}
          <div className="card shadow-sm p-3 border-0 mb-4">
            <h6 className="fw-bold mb-3">⚡ Quick Add Items</h6>
            <div className="overflow-auto" style={{ maxHeight: '350px' }}>
              {FOOD_PRESETS.map((cat, idx) => (
                <div key={idx} className="mb-3">
                  <small className="text-muted fw-bold d-block mb-2 text-uppercase">{cat.category}</small>
                  <div className="d-flex flex-wrap gap-2">
                    {cat.items.map((item, i) => (
                      <button key={i} onClick={() => handleQuickAdd(item)} className="btn btn-sm btn-outline-secondary">
                        {item.name} ({item.calories})
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WEEKLY CHART */}
          <div className="card shadow-sm mb-4 p-3 border-0">
            <h6 className="fw-bold text-muted mb-3">Weekly Progress</h6>
            <Bar data={{
              labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
              datasets: [{ data: getWeekData(), backgroundColor: getWeekData().map(v => v > DAILY_GOAL ? '#dc3545' : '#198754') }]
            }} options={{ plugins: { legend: { display: false } } }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalorieTracker;
import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, LineElement, PointElement } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import FOOD_PRESETS from './presets.json';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

function CalorieTracker() {
  const getLocalDate = () => new Date().toLocaleDateString('en-CA');
  
  const [logs, setLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [food, setFood] = useState('');
  const [calories, setCalories] = useState('');
  const [weight, setWeight] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const API_URL = "https://script.google.com/macros/s/AKfycbwKE4zeTe2ASxwqSH_Uw6xJX67yAFPy0aiRKnUXDMDnzXpDkWpxfGZb7KTBZVNLov0/exec";
  const DAILY_GOAL = 1700;

  // Prevent iPhone Zoom Style
  const inputStyle = {
    fontSize: '16px', // Minimum size to prevent iOS zoom
  };

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = () => {
    setIsSyncing(true);
    const proxyUrl = "https://corsproxy.io/?";
    const targetUrl = encodeURIComponent(`${API_URL}?t=${Date.now()}`);
    fetch(`${proxyUrl}${targetUrl}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const cleanData = data.map(item => {
            let itemDate = item.date;
            if (itemDate && typeof itemDate === 'string' && itemDate.includes('T')) {
                itemDate = itemDate.split('T')[0];
            }
            return {
              ...item,
              date: itemDate,
              calories: Number(item.calories || 0),
              weight: Number(item.weight || 0),
              id: item.id ? item.id.toString() : Math.random().toString()
            };
          });
          setLogs(cleanData);
        }
        setIsSyncing(false);
      })
      .catch(() => setIsSyncing(false));
  };

  const handleAddFood = (name, cals) => {
    if (!name || !cals) return;
    const foodName = name.trim();
    const foodCals = Number(cals);
    
    const existingEntry = logs.find(l => 
      l.date === selectedDate && 
      l.food.toLowerCase() === foodName.toLowerCase() && 
      l.type === 'food'
    );

    let entry;
    if (existingEntry && !editingId) {
      entry = { ...existingEntry, calories: Number(existingEntry.calories) + foodCals };
      setLogs(prev => prev.map(l => l.id === existingEntry.id ? entry : l));
    } else if (editingId) {
        entry = { id: editingId, date: selectedDate, food: foodName, calories: foodCals, weight: 0, type: 'food' };
        setLogs(prev => prev.map(l => l.id === editingId ? entry : l));
    } else {
      entry = { id: Date.now().toString(), date: selectedDate, food: foodName, calories: foodCals, weight: 0, type: 'food' };
      setLogs(prev => [...prev, entry]);
    }

    fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(entry) }).then(() => setTimeout(fetchLogs, 2000));
    setFood(''); setCalories(''); setEditingId(null);
  };

  const removeEntry = (id) => {
    setLogs(prev => prev.filter(l => l.id !== id));
    fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ id, action: 'delete' }) }).then(() => setTimeout(fetchLogs, 2000));
  };

  const logWeight = (e) => {
    e.preventDefault();
    const entry = { id: Date.now().toString(), date: selectedDate, food: 'Weight Entry', calories: 0, weight: Number(weight), type: 'weight' };
    setLogs(prev => [...prev, entry]);
    fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(entry) });
    setWeight('');
  };

  const getWeekData = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    const weeklyCals = [...Array(7)].map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = d.toLocaleDateString('en-CA');
      return logs.filter(l => l.date === dStr && l.type === 'food').reduce((s, c) => s + c.calories, 0);
    });
    
    const currentDayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    const daysElapsed = weeklyCals.slice(0, currentDayIdx + 1);
    const avg = daysElapsed.reduce((a, b) => a + b, 0) / (daysElapsed.length || 1);

    return { data: weeklyCals, avg: Math.round(avg) };
  };

  const weekInfo = getWeekData();

  const dailyLogs = logs
    .filter(l => l.date === selectedDate && l.type === 'food')
    .sort((a, b) => {
      const aC = a.food.toLowerCase().includes('coffee');
      const bC = b.food.toLowerCase().includes('coffee');
      if (aC && !bC) return -1;
      if (!aC && bC) return 1;
      return a.id.localeCompare(b.id);
    });

  const usedToday = dailyLogs.reduce((a, c) => a + c.calories, 0);
  const weightTrendData = logs.filter(l => l.type === 'weight').sort((a, b) => new Date(a.date) - new Date(b.date));
  const currentWeight = weightTrendData.length > 0 ? weightTrendData[weightTrendData.length - 1].weight : '--';

  return (
    <div className="container py-3" style={{ maxWidth: '950px' }}>
      <header className="text-center mb-3">
        <h3 className="fw-bold text-primary mb-0">Health Tracker</h3>
        <small className="text-muted">Current Weight: <span className="fw-bold text-dark">{currentWeight} lbs</span></small>
      </header>

      {/* 1. PROGRESS BAR */}
      <div className="card shadow-sm mb-3 border-0 p-3">
        <div className="d-flex justify-content-between mb-2 fw-bold align-items-center text-dark">
          <input type="date" className="form-control form-control-sm w-auto" style={inputStyle} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          <div className="text-end" style={{lineHeight: '1'}}>
             <span className="small">{usedToday} / {DAILY_GOAL} kcal</span><br/>
             <button className="btn btn-link btn-sm p-0 text-decoration-none" style={{fontSize: '0.7rem'}} onClick={fetchLogs} disabled={isSyncing}>
                {isSyncing ? 'Syncing...' : '🔄 Refresh'}
             </button>
          </div>
        </div>
        <div className="progress" style={{ height: '10px', borderRadius: '10px' }}>
          <div className={`progress-bar progress-bar-striped ${usedToday > DAILY_GOAL ? 'bg-danger' : 'bg-success'}`} style={{ width: `${Math.min((usedToday/DAILY_GOAL)*100, 100)}%` }}></div>
        </div>
      </div>

      <div className="d-flex flex-column gap-3">
        
        {/* 2. DAILY FOOD LOG */}
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white fw-bold py-2 d-flex justify-content-between align-items-center">
              <span>Today's Food</span>
              {editingId && <span className="badge bg-warning text-dark" style={{fontSize: '0.6rem'}}>Editing</span>}
          </div>
          <div className="list-group list-group-flush" style={{maxHeight: '250px', overflowY: 'auto'}}>
            {dailyLogs.length === 0 ? (
              <div className="list-group-item text-center text-muted py-3">No food logged yet.</div>
            ) : (
              dailyLogs.map((l) => (
                <div key={l.id} className="list-group-item d-flex justify-content-between align-items-center py-2">
                  <div style={{lineHeight: '1.1'}}><strong>{l.food}</strong><br/><small className="text-muted">{l.calories} kcal</small></div>
                  <div className="d-flex">
                    <button onClick={() => {setEditingId(l.id); setFood(l.food); setCalories(l.calories); window.scrollTo(0, 500);}} className="btn btn-sm text-info px-2">Edit</button>
                    <button onClick={() => removeEntry(l.id)} className="btn btn-sm text-danger px-2">Del</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3. QUICK ADD */}
        <div className="card shadow-sm p-3 border-0">
          <h6 className="fw-bold mb-2 small text-uppercase text-muted">⚡ Quick Add</h6>
          {FOOD_PRESETS.map((cat, idx) => (
            <div key={idx} className="mb-2">
              <div className="d-flex flex-wrap gap-2">
                {cat.items.map((item, i) => (
                  <button key={i} onClick={() => handleAddFood(item.name, item.calories)} className="btn btn-sm btn-outline-secondary py-1 px-2" style={{fontSize: '0.8rem'}}>
                    {item.name} <span className="fw-bold">{item.calories}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 4. MANUAL ENTRY - FONT SIZE FIX HERE */}
        <div className="card shadow-sm p-3 border-0 bg-light">
          <h6 className="fw-bold mb-2 small text-uppercase text-muted">{editingId ? '📝 Update' : '🥗 Manual Entry'}</h6>
          <div className="d-flex gap-2 mb-2">
              <input 
                className="form-control" 
                style={inputStyle} 
                placeholder="Food Name" 
                value={food} 
                onChange={(e) => setFood(e.target.value)} 
              />
              <input 
                className="form-control w-25" 
                style={inputStyle} 
                type="number" 
                placeholder="kcal" 
                value={calories} 
                onChange={(e) => setCalories(e.target.value)} 
              />
          </div>
          <div className="d-flex gap-2">
              <button className={`btn btn-sm w-100 ${editingId ? 'btn-warning' : 'btn-primary'}`} onClick={() => handleAddFood(food, calories)}>
                  {editingId ? 'Confirm Update' : 'Save Entry'}
              </button>
              {editingId && <button className="btn btn-sm btn-secondary" onClick={() => {setEditingId(null); setFood(''); setCalories('');}}>Cancel</button>}
          </div>
        </div>

        {/* 5. WEEK LOG & AVG */}
        <div className="card shadow-sm p-3 border-0">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="fw-bold mb-0 small text-uppercase text-muted">Weekly Log</h6>
            <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1" style={{fontSize: '0.75rem'}}>
                Avg: {weekInfo.avg} kcal/day
            </span>
          </div>
          <div style={{ height: '140px' }}>
            <Bar data={{
                labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
                datasets: [{ label: 'Kcal', data: weekInfo.data, backgroundColor: '#198754', borderRadius: 4 }]
            }} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
          </div>
        </div>

        {/* 6. WEIGHT LOG - FONT SIZE FIX HERE */}
        <div className="card shadow-sm p-3 border-0">
          <h6 className="fw-bold mb-2 small text-uppercase text-muted">⚖️ Log Weight</h6>
          <form onSubmit={logWeight} className="d-flex gap-2">
              <input 
                className="form-control" 
                style={inputStyle} 
                type="number" 
                step="0.1" 
                value={weight} 
                onChange={(e) => setWeight(e.target.value)} 
                placeholder="Enter lbs" 
                required 
              />
              <button className="btn btn-sm btn-dark px-4">Log</button>
          </form>
        </div>

        {/* 7. WEIGHT CHART */}
        <div className="card shadow-sm p-2 border-0" style={{ height: '160px' }}>
          <Line data={{
            labels: weightTrendData.slice(-7).map(l => l.date.split('-').slice(1).join('/')),
            datasets: [{ label: 'Weight Trend', data: weightTrendData.slice(-7).map(l => l.weight), borderColor: '#0d6efd', tension: 0.3, pointRadius: 4 }]
          }} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
        </div>

      </div>
    </div>
  );
}

export default CalorieTracker;
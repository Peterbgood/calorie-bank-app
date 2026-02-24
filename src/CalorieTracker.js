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

  useEffect(() => { 
    fetchLogs(); 
  }, []);

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
      .catch(err => {
        console.error("Fetch error:", err);
        setIsSyncing(false);
      });
  };

  const handleAddFood = (name, cals) => {
    if (!name || !cals) return;
    
    const foodName = name.trim();
    const foodCals = Number(cals);

    // Check if this food already exists for the SELECTED DATE
    const existingEntry = logs.find(l => 
      l.date === selectedDate && 
      l.food.toLowerCase() === foodName.toLowerCase() &&
      l.type === 'food'
    );

    let entry;
    if (existingEntry && !editingId) {
      // CONSOLIDATION: Add calories to existing row
      entry = { 
        ...existingEntry, 
        calories: Number(existingEntry.calories) + foodCals 
      };
      setLogs(prev => prev.map(l => l.id === existingEntry.id ? entry : l));
    } else if (editingId) {
        // EDIT MODE: Update existing entry being edited
        entry = { id: editingId, date: selectedDate, food: foodName, calories: foodCals, weight: 0, type: 'food' };
        setLogs(prev => prev.map(l => l.id === editingId ? entry : l));
    } else {
      // NEW ROW: Create fresh entry
      entry = { 
        id: Date.now().toString(), 
        date: selectedDate, 
        food: foodName, 
        calories: foodCals, 
        weight: 0, 
        type: 'food' 
      };
      setLogs(prev => [...prev, entry]);
    }

    // Post to Google (Script handles "Update if ID exists")
    fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(entry)
    }).then(() => {
        setTimeout(fetchLogs, 2000);
    });

    setFood(''); 
    setCalories(''); 
    setEditingId(null);
  };

  const removeEntry = (id) => {
    setLogs(prev => prev.filter(l => l.id !== id));
    fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({ id: id, action: 'delete' })
    }).then(() => {
        setTimeout(fetchLogs, 2000);
    });
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
    return [...Array(7)].map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = d.toLocaleDateString('en-CA');
      return logs.filter(l => l.date === dStr && l.type === 'food').reduce((s, c) => s + c.calories, 0);
    });
  };

  // SORTING: Coffee first, then Alphabetical
  const dailyLogs = logs
    .filter(l => l.date === selectedDate && l.type === 'food')
    .sort((a, b) => {
      const aCoffee = a.food.toLowerCase().includes('coffee');
      const bCoffee = b.food.toLowerCase().includes('coffee');
      if (aCoffee && !bCoffee) return -1;
      if (!aCoffee && bCoffee) return 1;
      return a.food.localeCompare(b.food);
    });

  const usedToday = dailyLogs.reduce((a, c) => a + c.calories, 0);
  const weightTrendData = logs.filter(l => l.type === 'weight').sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-30);

  return (
    <div className="container py-4" style={{ maxWidth: '950px' }}>
      <header className="text-center mb-4">
        <h2 className="fw-bold text-primary">Health Tracker</h2>
        <button className="btn btn-sm btn-outline-secondary" onClick={fetchLogs}>
          {isSyncing ? 'Syncing...' : '🔄 Refresh Data'}
        </button>
      </header>

      {/* Progress Card */}
      <div className="card shadow-sm mb-4 border-0 p-3">
        <div className="d-flex justify-content-between mb-2 fw-bold">
          <input type="date" className="form-control w-auto" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          <span>{usedToday} / {DAILY_GOAL} kcal</span>
        </div>
        <div className="progress" style={{ height: '20px', borderRadius: '10px' }}>
          <div className={`progress-bar progress-bar-striped ${usedToday > DAILY_GOAL ? 'bg-danger' : 'bg-success'}`} style={{ width: `${Math.min((usedToday/DAILY_GOAL)*100, 100)}%` }}></div>
        </div>
      </div>

      <div className="row g-4">
        {/* Logs & Charts Column */}
        <div className="col-lg-7 order-lg-2">
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-white fw-bold d-flex justify-content-between align-items-center">
                <span>Daily Log</span>
                {editingId && <span className="badge bg-warning text-dark">Editing Item</span>}
            </div>
            <div className="list-group list-group-flush">
              {dailyLogs.length === 0 ? (
                <div className="list-group-item text-center text-muted py-4">No entries for this date.</div>
              ) : (
                dailyLogs.map((l) => (
                  <div key={l.id} className="list-group-item d-flex justify-content-between align-items-center">
                    <div><strong>{l.food}</strong><br/><small className="text-muted">{l.calories} kcal</small></div>
                    <div>
                      <button onClick={() => {setEditingId(l.id); setFood(l.food); setCalories(l.calories);}} className="btn btn-sm text-info me-2">Edit</button>
                      <button onClick={() => removeEntry(l.id)} className="btn btn-sm text-danger">Del</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card shadow-sm mb-4 p-3 border-0" style={{ height: '200px' }}>
            <Bar data={{
              labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
              datasets: [{ label: 'Calories', data: getWeekData(), backgroundColor: '#198754' }]
            }} options={{ maintainAspectRatio: false }} />
          </div>

          <div className="card shadow-sm p-3 border-0" style={{ height: '200px' }}>
            <Line data={{
              labels: weightTrendData.map(l => l.date),
              datasets: [{ label: 'Weight', data: weightTrendData.map(l => l.weight), borderColor: '#0d6efd', tension: 0.3 }]
            }} options={{ maintainAspectRatio: false }} />
          </div>
        </div>

        {/* Input Controls Column */}
        <div className="col-lg-5 order-lg-1">
          <div className="card shadow-sm p-3 mb-4 border-0">
            <h6 className="fw-bold mb-3">⚡ Quick Add</h6>
            {FOOD_PRESETS.map((cat, idx) => (
              <div key={idx} className="mb-3">
                <small className="text-muted fw-bold text-uppercase" style={{fontSize: '0.7rem'}}>{cat.category}</small>
                <div className="d-flex flex-wrap gap-2 mt-1">
                  {cat.items.map((item, i) => (
                    <button key={i} onClick={() => handleAddFood(item.name, item.calories)} className="btn btn-sm btn-outline-secondary">
                      {item.name} <span className="badge bg-light text-dark ms-1">{item.calories}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="card shadow-sm p-3 mb-4 border-0 bg-light">
            <h6 className="fw-bold mb-3">{editingId ? '📝 Update Entry' : '🥗 Manual Log'}</h6>
            <input className="form-control mb-2" placeholder="Item Name" value={food} onChange={(e) => setFood(e.target.value)} />
            <input className="form-control mb-2" type="number" placeholder="Calories" value={calories} onChange={(e) => setCalories(e.target.value)} />
            <div className="d-flex gap-2">
                <button className={`btn w-100 ${editingId ? 'btn-warning' : 'btn-primary'}`} onClick={() => handleAddFood(food, calories)}>
                    {editingId ? 'Update' : 'Add Food'}
                </button>
                {editingId && <button className="btn btn-outline-secondary" onClick={() => {setEditingId(null); setFood(''); setCalories('');}}>Cancel</button>}
            </div>
          </div>

          <div className="card shadow-sm p-3 border-0">
            <h6 className="fw-bold mb-3">⚖️ Log Weight</h6>
            <form onSubmit={logWeight}>
                <input className="form-control mb-2" type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="lbs" required />
                <button className="btn btn-dark w-100">Save Weight</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalorieTracker;
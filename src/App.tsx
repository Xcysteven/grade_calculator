import { useEffect, useState } from 'react';
import './App.css'; 
import type { Assignment } from './types'; 

function App() {
  // State to store the courses we find
  const [courses, setCourses] = useState<{ [key: string]: Assignment[] }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if we are in the Chrome Extension environment
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(null, (data) => {
        console.log("Popup loaded data:", data);
        
        // FIX: Cast the data so TypeScript stops complaining
        setCourses(data as { [key: string]: Assignment[] }); 
        
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <div className="container">
      <h1>UCSD Grade Dashboard</h1>
      
      {loading ? (
        <p>Loading your grades...</p>
      ) : Object.keys(courses).length === 0 ? (
        <div className="empty-state">
          <p>No grades found yet.</p>
          <small>Go to Gradescope and refresh the page!</small>
        </div>
      ) : (
        <div className="course-list">
          {Object.entries(courses).map(([courseName, assignments]) => (
            <div key={courseName} className="course-card">
              <h2>{courseName}</h2>
              <p>{assignments.length} Assignments Tracked</p>
              
              <ul className="assignment-preview">
                {assignments.slice(0, 3).map((a) => (
                  <li key={a.id}>
                    <span>{a.name}</span>
                    <strong>{a.score}/{a.maxScore}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
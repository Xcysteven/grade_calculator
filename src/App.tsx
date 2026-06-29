import { useEffect, useState } from 'react';
import './App.css';
import { calculateGradeFromAssignments } from './calculator';
import type { Assignment } from './types';

function App() {
  const canUseChromeStorage = typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
  const [courses, setCourses] = useState<{ [key: string]: Assignment[] }>({});
  const [selectedCourse, setSelectedCourse] = useState<string>(""); // New state for "Which one?"
  const [loading, setLoading] = useState(canUseChromeStorage);

  useEffect(() => {
    if (!canUseChromeStorage) {
      return;
    }

    chrome.storage.local.get(null, (data) => {
      const parsedData = data as { [key: string]: Assignment[] };
      setCourses(parsedData);
      
      // Auto-select the first course found (if any)
      const courseNames = Object.keys(parsedData);
      if (courseNames.length > 0) {
        setSelectedCourse(courseNames[0]);
      }
      setLoading(false);
    });
  }, [canUseChromeStorage]);

  // Helper to render the currently selected course
  const renderSelectedCourse = () => {
    if (!selectedCourse || !courses[selectedCourse]) return null;

    const assignments = courses[selectedCourse];
    const grade = calculateGradeFromAssignments(assignments);

    return (
      <div className="course-card">
        <div className="course-header">
          <div className="header-text">
            <h2>Current Grade</h2>
            <span className="total-assignments">{assignments.length} assignments</span>
          </div>
          <span className="course-grade">{grade.percent.toFixed(1)}%</span>
        </div>
        
        <div className="category-list">
          {grade.categories.map((cat) => (
            <div key={cat.name} className="category-row">
              <div className="cat-info">
                <span className="cat-name">{cat.name}</span>
                <span className="cat-count">{cat.count} items</span>
              </div>
              <div className="cat-stats">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${Math.min(cat.percent, 100)}%`,
                      backgroundColor: cat.percent >= 90 ? '#22c55e' : cat.percent >= 80 ? '#3b82f6' : '#f59e0b'
                    }}
                  ></div>
                </div>
                <span className="cat-percent">{cat.percent.toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="container">
      {/* HEADER: DROPDOWN MENU */}
      <div className="top-bar">
        <h1>Grade Dashboard</h1>
        {Object.keys(courses).length > 0 && (
          <select 
            className="course-selector"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
          >
            {Object.keys(courses).map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : Object.keys(courses).length === 0 ? (
        <div className="empty-state">
          <p>No grades found.</p>
          <small>Go to Gradescope and refresh!</small>
        </div>
      ) : (
        // RENDER ONLY THE ONE SELECTED COURSE
        renderSelectedCourse()
      )}
    </div>
  );
}

export default App;

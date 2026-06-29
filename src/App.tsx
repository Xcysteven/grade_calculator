import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import './App.css';
import {
  buildEqualWeightScheme,
  calculateGrade,
  groupAssignmentsByCategory,
} from './calculator';
import { discoverCoursePolicy, type CoursePolicyResult } from './coursePolicy';
import { getKnownCourseScheme } from './courseSchemes';
import type { Assignment, GradingScheme, WeightedStrategy } from './types';

type AssignmentGroups = Record<string, Assignment[]>;
type AssignmentFlags = Record<string, boolean>;
type CategoryOverrides = Record<string, string>;
type ScoreOverrides = Record<string, { score: number; maxScore: number }>;
type WeightOverrides = Record<string, number>;

function App() {
  const isFullDashboard = new URLSearchParams(window.location.search).get('view') === 'full';
  const canUseChromeStorage = typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
  const [courses, setCourses] = useState<{ [key: string]: Assignment[] }>({});
  const [selectedCourse, setSelectedCourse] = useState<string>(""); // New state for "Which one?"
  const [loading, setLoading] = useState(canUseChromeStorage);
  const [droppedAssignments, setDroppedAssignments] = useState<AssignmentFlags>({});
  const [categoryOverrides, setCategoryOverrides] = useState<CategoryOverrides>({});
  const [scoreOverrides, setScoreOverrides] = useState<ScoreOverrides>({});
  const [weightOverrides, setWeightOverrides] = useState<WeightOverrides>({});
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [customAssignments, setCustomAssignments] = useState<Assignment[]>([]);
  const [manualPolicyUrl, setManualPolicyUrl] = useState('');
  const [policyResult, setPolicyResult] = useState<CoursePolicyResult | null>(null);
  const [policyLoading, setPolicyLoading] = useState(false);

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

  useEffect(() => {
    document.body.classList.toggle('full-dashboard-body', isFullDashboard);

    return () => {
      document.body.classList.remove('full-dashboard-body');
    };
  }, [isFullDashboard]);

  // Helper to render the currently selected course
  const renderSelectedCourse = () => {
    if (!selectedCourse || !courses[selectedCourse]) return null;

    const assignments = courses[selectedCourse];
    const knownScheme = getKnownCourseScheme(selectedCourse);
    const detectedScheme = policyResult?.scheme
      ? mergePolicySchemeWithKnownScheme(policyResult.scheme, knownScheme)
      : undefined;
    const scheme = detectedScheme ?? knownScheme;
    const simulatedAssignments = [...assignments, ...customAssignments].map((assignment) => ({
      ...assignment,
      score: scoreOverrides[assignment.id]?.score ?? assignment.score,
      maxScore: scoreOverrides[assignment.id]?.maxScore ?? assignment.maxScore,
      dropped: droppedAssignments[assignment.id] ?? assignment.dropped,
    }));
    const detectedCategories = groupAssignmentsByCategory(simulatedAssignments, scheme);
    const categories = applyCategoryOverrides(detectedCategories, categoryOverrides);
    const gradingScheme = buildSimulationScheme(
      scheme ?? buildEqualWeightScheme(Object.keys(categories)),
      getAllCategoryNames(Object.keys(categories), customCategories),
      weightOverrides,
    );
    const grade = calculateGrade(categories, gradingScheme);
    const categoryNames = getVisibleCategoryNames(
      [...grade.categories.map((cat) => cat.name), ...customCategories],
      categories,
    );
    const gradeByCategory = Object.fromEntries(
      grade.categories.map((category) => [category.name, category]),
    );
    const hasSimulationChanges = Object.keys(droppedAssignments).length > 0
      || Object.keys(categoryOverrides).length > 0
      || Object.keys(scoreOverrides).length > 0
      || Object.keys(weightOverrides).length > 0
      || customCategories.length > 0
      || customAssignments.length > 0;

    return (
      <div className="course-card">
        <div className="course-header">
          <div className="header-text">
            <h2>Current Grade</h2>
            <span className="total-assignments">{assignments.length} assignments</span>
          </div>
          <span className="course-grade">{grade.percent.toFixed(1)}%</span>
        </div>
        
        {!isFullDashboard && (
          <div className="category-list">
            {grade.categories.map((cat) => (
              <div key={cat.name} className="category-row">
                <div className="cat-info">
                  <span className="cat-name">
                    {cat.name}
                    <span className="cat-weight">{formatWeight(cat.weight)}</span>
                  </span>
                  <span className="cat-count">
                    {cat.count} items
                    {cat.droppedCount > 0 && `, ${cat.droppedCount} dropped`}
                  </span>
                </div>
                <div className="cat-stats">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(cat.percent, 100)}%`,
                        backgroundColor: getGradeColor(cat.percent),
                      }}
                    ></div>
                  </div>
                  <span className="cat-percent">{cat.percent.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="dashboard-actions">
          {isFullDashboard ? (
            <span className="full-dashboard-label">Category board</span>
          ) : (
            <button type="button" className="open-full-button" onClick={openFullDashboard}>
              Open category board
            </button>
          )}
          {hasSimulationChanges && (
            <button
              type="button"
              className="reset-button"
              onClick={() => {
                setDroppedAssignments({});
                setCategoryOverrides({});
                setScoreOverrides({});
                setWeightOverrides({});
                setCustomCategories([]);
                setCustomAssignments([]);
                setPolicyResult(null);
              }}
            >
              Reset simulation
            </button>
          )}
        </div>
        {isFullDashboard && (
          <>
          <form
            className="policy-form"
            onSubmit={(event) => {
              event.preventDefault();
              void detectPolicy(selectedCourse, manualPolicyUrl, setPolicyLoading, setPolicyResult);
            }}
          >
            <input
              value={manualPolicyUrl}
              onChange={(event) => setManualPolicyUrl(event.target.value)}
              placeholder="Optional syllabus URL"
            />
            <button type="submit" disabled={policyLoading}>
              {policyLoading ? 'Detecting...' : 'Detect policy'}
            </button>
          </form>
          {policyResult && (
            <div className="policy-status">
              <strong>
                {policyResult.scheme ? 'Detected policy' : 'Policy not detected'}
              </strong>
              <span>
                {policyResult.url ?? 'No matching policy URL'} | confidence {(policyResult.confidence * 100).toFixed(0)}%
              </span>
              {policyResult.warnings.slice(0, 3).map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          )}
          <form
            className="add-category-form"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const categoryName = String(formData.get('categoryName') ?? '').trim();
              const categoryWeight = parsePercentInput(formData.get('categoryWeight'));

              if (!categoryName) {
                return;
              }

              setCustomCategories((current) => (
                current.includes(categoryName) ? current : [...current, categoryName]
              ));
              setWeightOverrides((current) => ({
                ...current,
                [categoryName]: categoryWeight,
              }));
              event.currentTarget.reset();
            }}
          >
            <input name="categoryName" placeholder="Category name" />
            <input name="categoryWeight" type="number" min="0" max="100" step="0.1" placeholder="Weight %" />
            <button type="submit">Add category</button>
          </form>
          <div className="detail-panel detail-board">
            {categoryNames.map((categoryName) => (
              <div
                key={categoryName}
                className="detail-category"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  const assignmentId = event.dataTransfer.getData('text/plain');
                  if (assignmentId) {
                    setCategoryOverrides((current) => ({
                      ...current,
                      [assignmentId]: categoryName,
                    }));
                  }
                }}
              >
                <div className="detail-category-header">
                  <div>
                    <strong>{categoryName}</strong>
                    <p>{formatCategorySummary(gradeByCategory[categoryName])}</p>
                  </div>
                  <label className="weight-editor">
                    <span>Weight</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formatPercentInput(formatCategoryWeightValue(categoryName, gradingScheme))}
                      onChange={(event) => {
                        setWeightOverrides((current) => ({
                          ...current,
                          [categoryName]: parsePercentInput(event.target.value),
                        }));
                      }}
                    />
                  </label>
                </div>
                {gradeByCategory[categoryName] && (
                  <div className="column-grade">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(gradeByCategory[categoryName].percent, 100)}%`,
                          backgroundColor: getGradeColor(gradeByCategory[categoryName].percent),
                        }}
                      ></div>
                    </div>
                    <strong>{gradeByCategory[categoryName].percent.toFixed(1)}%</strong>
                  </div>
                )}
                {(categories[categoryName] ?? []).length === 0 ? (
                  <p className="empty-category">No items</p>
                ) : (
                  <div className="assignment-list">
                    {(categories[categoryName] ?? []).map((assignment) => (
                      <div
                        key={assignment.id}
                        className={`assignment-item${assignment.dropped ? ' assignment-item-dropped' : ''}`}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData('text/plain', assignment.id);
                        }}
                      >
                        <div className="assignment-main">
                          <span className="assignment-name">{assignment.name}</span>
                          <div className="score-editor">
                            <input
                              aria-label={`${assignment.name} score`}
                              type="number"
                              step="0.1"
                              value={formatNumberInput(assignment.score)}
                              onChange={(event) => updateAssignmentScore(
                                assignment.id,
                                event.target.value,
                                assignment.maxScore,
                                setScoreOverrides,
                              )}
                            />
                            <span>/</span>
                            <input
                              aria-label={`${assignment.name} max score`}
                              type="number"
                              step="0.1"
                              value={formatNumberInput(assignment.maxScore)}
                              onChange={(event) => updateAssignmentMaxScore(
                                assignment.id,
                                assignment.score,
                                event.target.value,
                                setScoreOverrides,
                              )}
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          className="drop-button"
                          onClick={() => {
                            setDroppedAssignments((current) => ({
                              ...current,
                              [assignment.id]: !assignment.dropped,
                            }));
                          }}
                        >
                          {assignment.dropped ? 'Restore' : 'Drop'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <form
                  className="add-item-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    const itemName = String(formData.get('itemName') ?? '').trim();
                    const score = parseNumberInput(formData.get('score'));
                    const maxScore = parseNumberInput(formData.get('maxScore'));

                    if (!itemName || maxScore <= 0) {
                      return;
                    }

                    const id = `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`;
                    setCustomAssignments((current) => [
                      ...current,
                      { id, name: itemName, score, maxScore },
                    ]);
                    setCategoryOverrides((current) => ({
                      ...current,
                      [id]: categoryName,
                    }));
                    event.currentTarget.reset();
                  }}
                >
                  <input name="itemName" placeholder="New item" />
                  <input name="score" type="number" step="0.1" placeholder="Score" />
                  <input name="maxScore" type="number" step="0.1" placeholder="Max" />
                  <button type="submit">Add</button>
                </form>
              </div>
            ))}
          </div>
          </>
        )}
        {grade.warnings.length > 0 && (
          <div className="warning-list">
            {grade.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={isFullDashboard ? 'container full-dashboard' : 'container'}>
      {/* HEADER: DROPDOWN MENU */}
      <div className="top-bar">
        <h1>Grade Dashboard</h1>
        {Object.keys(courses).length > 0 && (
          <select 
            className="course-selector"
            value={selectedCourse}
            onChange={(e) => {
              setSelectedCourse(e.target.value);
              setDroppedAssignments({});
              setCategoryOverrides({});
              setScoreOverrides({});
              setWeightOverrides({});
              setCustomCategories([]);
              setCustomAssignments([]);
              setPolicyResult(null);
            }}
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

function openFullDashboard(): void {
  const fullDashboardPath = 'index.html?view=full';
  const fullDashboardUrl = typeof chrome !== 'undefined' && chrome.runtime
    ? chrome.runtime.getURL(fullDashboardPath)
    : fullDashboardPath;

  window.open(fullDashboardUrl, '_blank');
}

async function detectPolicy(
  selectedCourse: string,
  manualPolicyUrl: string,
  setPolicyLoading: Dispatch<SetStateAction<boolean>>,
  setPolicyResult: Dispatch<SetStateAction<CoursePolicyResult | null>>,
): Promise<void> {
  setPolicyLoading(true);

  try {
    const result = await discoverCoursePolicy(selectedCourse, manualPolicyUrl.trim() || undefined);
    setPolicyResult(result);
  } finally {
    setPolicyLoading(false);
  }
}

function mergePolicySchemeWithKnownScheme(
  policyScheme: GradingScheme,
  knownScheme?: GradingScheme,
): GradingScheme {
  if (policyScheme.type !== 'WEIGHTED' || knownScheme?.type !== 'WEIGHTED') {
    return policyScheme;
  }

  const rules = Object.fromEntries(
    Object.entries(policyScheme.rules).map(([categoryName, policyRule]) => [
      categoryName,
      {
        ...knownScheme.rules[categoryName],
        ...policyRule,
        assignmentMatchers: knownScheme.rules[categoryName]?.assignmentMatchers
          ?? policyRule.assignmentMatchers,
      },
    ]),
  ) as WeightedStrategy['rules'];

  return {
    ...policyScheme,
    rules,
    redemptions: policyScheme.redemptions ?? knownScheme.redemptions,
  };
}

function buildSimulationScheme(
  baseScheme: GradingScheme,
  categoryNames: string[],
  weightOverrides: WeightOverrides,
): GradingScheme {
  if (baseScheme.type !== 'WEIGHTED') {
    return baseScheme;
  }

  const baseRules = baseScheme.rules;
  const rules = Object.fromEntries(
    categoryNames.map((categoryName) => {
      const baseRule = baseRules[categoryName] ?? { weight: 0 };
      return [
        categoryName,
        {
          ...baseRule,
          weight: weightOverrides[categoryName] ?? baseRule.weight,
        },
      ];
    }),
  ) as WeightedStrategy['rules'];

  return {
    ...baseScheme,
    rules,
  };
}

function applyCategoryOverrides(
  categories: AssignmentGroups,
  categoryOverrides: CategoryOverrides,
): AssignmentGroups {
  return Object.entries(categories).reduce<AssignmentGroups>((nextCategories, [categoryName, assignments]) => {
    assignments.forEach((assignment) => {
      const nextCategoryName = categoryOverrides[assignment.id] ?? categoryName;
      nextCategories[nextCategoryName] ??= [];
      nextCategories[nextCategoryName].push(assignment);
    });

    return nextCategories;
  }, {});
}

function getVisibleCategoryNames(categoryNames: string[], categories: AssignmentGroups): string[] {
  return Array.from(new Set([...categoryNames, ...Object.keys(categories)]));
}

function getAllCategoryNames(categoryNames: string[], customCategories: string[]): string[] {
  return Array.from(new Set([...categoryNames, ...customCategories]));
}

function formatCategoryWeightValue(categoryName: string, scheme: GradingScheme): number {
  if (scheme.type === 'WEIGHTED') {
    return scheme.rules[categoryName]?.weight ?? 0;
  }

  return 0;
}

function formatCategorySummary(category?: { count: number; droppedCount: number; totalScore: number; totalMax: number }): string {
  if (!category) {
    return '0 items';
  }

  const droppedText = category.droppedCount > 0 ? `, ${category.droppedCount} dropped` : '';
  return `${category.count} items${droppedText} | ${formatScore(category.totalScore)} / ${formatScore(category.totalMax)}`;
}

function formatWeight(weight: number): string {
  const percent = weight * 100;
  return `${percent.toFixed(Number.isInteger(percent) ? 0 : 1)}%`;
}

function formatPercentInput(weight: number): string {
  const percent = weight * 100;
  return Number.isInteger(percent) ? percent.toString() : percent.toFixed(1);
}

function getGradeColor(percent: number): string {
  if (percent >= 90) return '#22c55e';
  if (percent >= 80) return '#3b82f6';
  return '#f59e0b';
}

function formatScore(score: number): string {
  return Number.isInteger(score) ? score.toString() : score.toFixed(1);
}

function formatNumberInput(value: number): string {
  return Number.isFinite(value) ? value.toString() : '0';
}

function parsePercentInput(value: FormDataEntryValue | string | null): number {
  return parseNumberInput(value) / 100;
}

function parseNumberInput(value: FormDataEntryValue | string | null): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function updateAssignmentScore(
  assignmentId: string,
  scoreValue: string,
  currentMaxScore: number,
  setScoreOverrides: Dispatch<SetStateAction<ScoreOverrides>>,
): void {
  setScoreOverrides((current) => ({
    ...current,
    [assignmentId]: {
      score: parseNumberInput(scoreValue),
      maxScore: current[assignmentId]?.maxScore ?? currentMaxScore,
    },
  }));
}

function updateAssignmentMaxScore(
  assignmentId: string,
  currentScore: number,
  maxScoreValue: string,
  setScoreOverrides: Dispatch<SetStateAction<ScoreOverrides>>,
): void {
  setScoreOverrides((current) => ({
    ...current,
    [assignmentId]: {
      score: current[assignmentId]?.score ?? currentScore,
      maxScore: parseNumberInput(maxScoreValue),
    },
  }));
}

export default App;

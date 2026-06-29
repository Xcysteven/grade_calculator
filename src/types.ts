// src/types.ts

// ==========================================
// 1. The Atom: A Single Assignment
// ==========================================
export interface Assignment {
  id: string;
  name: string;        // e.g. "Homework 1"
  score: number;       // e.g. 95 (User's score)
  maxScore: number;    // e.g. 100 (Total possible points)
  dropped?: boolean;   // Flag: true if this was dropped by "Drop Lowest" logic
}

// ==========================================
// 2. Rules & Logic Components
// ==========================================

// Rule for a specific category (e.g., "Homework is 30% and drop lowest 1")
export interface CategoryRule {
  weight: number;      // 0.30 for 30%
  dropLowest?: number; // Optional: Number of lowest scores to drop (e.g., 1)
  assignmentMatchers?: string[]; // Course-specific names that map assignments into this category
}

// Rule for Redemption (e.g., "Final Exam replaces Midterm if higher")
export type RedemptionType = "REPLACE_IF_HIGHER" | "AVERAGE_WITH_HIGHER";

export interface RedemptionRule {
  id: string;
  name: string;           // "Final replaces Midterm 1"
  sourceCategory: string; // The "Savior" (e.g. "Final Exam")
  targetCategory: string; // The "Low Score" to fix (e.g. "Midterm 1")
  conditionType: RedemptionType;
}

// ==========================================
// 3. The Grading Strategies (The "Brains")
// ==========================================

// Strategy A: Standard Weighted (DSC 10, 20, 30, 80)
export interface WeightedStrategy {
  type: "WEIGHTED";
  rules: { [categoryName: string]: CategoryRule }; // Map: "Labs" -> { weight: 0.2, dropLowest: 2 }
  redemptions?: RedemptionRule[];                  // Optional list of redemption rules
}

// Strategy B: The "Credit System" (DSC 140B Style)
export interface CreditSource {
  name: string;         // e.g. "Quizzes"
  valuePerItem: number; // e.g. 1.5 credits per quiz
  maxItems: number;     // e.g. 8 quizzes max
  isPassFail?: boolean; // true if score must be > 70% to count
}

export interface CreditStrategy {
  type: "CREDIT_SYSTEM";
  baseExamWeight: number; // 0.90 (90%)
  projectWeight: number;  // 0.10 (10%)
  maxCredits: number;     // 40
  creditSources: CreditSource[];
}

// Strategy C: Total Points (Rare, but good to have)
export interface TotalPointsStrategy {
  type: "TOTAL_POINTS";
}

// The Union Type: A Course can use ANY of these strategies
export type GradingScheme = WeightedStrategy | CreditStrategy | TotalPointsStrategy;

// ==========================================
// 4. The Course Object (The "Database Record")
// ==========================================
export interface Course {
  id: string;
  name: string;             // e.g. "DSC 10"
  courseCode: string;       // e.g. "DSC10_WI24"
  originalSite: string;     // "gradescope.com" or "canvas"
  
  // The Data: All assignments grouped by category
  categories: {
    [categoryName: string]: Assignment[]; 
  };

  // The Logic: How to calculate the grade
  gradingScheme: GradingScheme;
}

// ==========================================
// 5. Helper for the Calculator Logic
// ==========================================
// This is what we pass to our calculator function later
export interface UserScores {
  [categoryName: string]: {
    score: number;
    maxScore: number;
  }[];
}

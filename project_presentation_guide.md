# Project Presentation: Campus Exam Portal

## 1. Project Overview
**Campus Exam Portal** is a secure, end-to-end online examination platform designed for academic institutions to conduct assessments efficiently and securely.

- **Problem it Solves**: Traditional manual exams are hard to manage, prone to errors, and lack immediate feedback. Most simple online forms (Google Forms) are easily cheated on.
- **Key Objectives**:
  - To automate the entire evaluation process.
  - To provide a **cheating-proof** environment for students.
  - To enable admins to manage large student databases using a **CSV-based authorization** system.
  - To offer a seamless, resumes-capable experience for students in case of connectivity issues.

---

## 2. Features Implemented

### 🛡️ Authorization & Authentication
- **CSV-Based Authorization**: Admins upload a central CSV of "Valid Students" (Email + Roll Number). Only those on this list can register.
- **Verification Flow**: During registration, the system verifies the provided roll number matches the allowed email.
- **Secure Login**: JWT-based authentication with bcrypt-hashed passwords for data integrity.

### 📝 Advanced Exam System
- **Structured Sections**: Exams are divided into 4 mandatory sections: Reasoning, Verbal Ability, Numerical Ability, and Core Questions.
- **Dynamic Questions**: Supports standard MCQs and **Graph-Based Technical Questions** (using Chart.js).
- **Randomization**: Questions and their options are shuffled for every student to prevent peer-cheating.
- **Auto-Evaluation**: Instant scoring upon submission based on pre-defined correct keys.

### ⏱️ Student Experience (UX)
- **Resume Exam System**: Real-time state saving allows students to resume exactly where they left off if they refresh or lose connection.
- **Countdown Timer**: A fixed-time window with **Auto-Submit** functionality when time runs out.
- **Question Palette**: A color-coded grid for quick navigation:
  - `Green`: Answered
  - `Red`: Not Answered
  - `Indigo`: Currently active

### 🔐 Security & Proctoring
- **Tab-Switch Detection**: Locks the exam if a student switches tabs or opens other applications.
- **Fullscreen Enforcement**: Forces students to re-enter fullscreen or face warnings/locks.
- **Anti-Copy/Paste**: Blocks standard keyboard shortcuts (Ctrl+C, Ctrl+V, Alt, F12) and right-clicks.
- **Instant Lockdown**: After repeated violations, the student's attempt is locked, requiring admin intervention.

### 📊 Admin Control Center
- **Student Lifecycle**: Soft-delete students with an **Undo** option and a 24-hour permanent cleanup job.
- **Security Alerts**: Real-time view of locked students with a one-click **Unlock** feature.
- **Bulk Imports**: Upload hundreds of questions or students via CSV.
- **Result Analysis**: View and filter results for any exam.

### 📄 Professional Reporting
- **PDF Result Download**: Students can download a detailed, branded PDF report of their performance, including section-wise marks and All-India ranking.

---

## 3. Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React, Vite, Tailwind CSS (Vanilla styling) |
| **Backend** | Node.js, Express.js |
| **Database** | PostgreSQL, Prisma ORM |
| **Auth** | JSON Web Tokens (JWT), bcryptjs |
| **Visualization** | Chart.js, React-Chartjs-2 |
| **Reporting** | jsPDF, jspdf-autotable |

---

## 4. System Architecture
The portal follows a standard **Client-Server-Database** architecture:
1. **Frontend**: A React SPA that handles UI and security listeners.
2. **Backend API**: A RESTful Express server handling Business Logic and Middleware security checks.
3. **Database**: A relational PostgreSQL database for structured storage of sessions, questions, and results.

**Data Flow**: 
- Student Login -> Request JWT -> JWT stored in LocalStorage.
- Exam Start -> Fetch Questions -> State saved via `PATCH /save-state` periodically.
- Submission -> Service calculates score -> Result committed to DB.

---

## 5. Database Design (Main Tables)
- **`ValidStudent`**: Pre-authorized email/roll pairs.
- **`Student`**: Registered student accounts.
- **`Exam`**: Core exam configuration (title, dates, duration).
- **`Question`**: Content and graph data for each item.
- **`StudentAttempt`**: Ongoing state (timer, current index, answers).
- **`Result`**: Finalized scores, rank, and percentage.

---

## 6. Security Design
The security architecture is built on **Event Listeners** and **State Management**:
- `visibilitychange`: Detects tab switching.
- `blur`: Detects window loss of focus.
- `fullscreenchange`: Monitors escape from proctored mode.
- **Backend Guard**: All critical endpoints (Save state/Submit) verify the JWT and check if the student's attempt is currently marked as `isLocked`.

---

## 7. Unique Features / Innovation
- **Resume Capability**: Rare in simpler portal designs, it ensures no student loses their hard work due to a 5-second power cut.
- **Rank Tie-Breaking**: Ranks are calculated primarily by Score, then by **Time Taken** (Faster = Higher Rank).
- **Graph Questions**: Moves beyond text to test visual analysis skills.

---

## 8. Challenges Faced
- **CSV Parsing**: Handling different delimiters and encoding formats for large bulk imports.
- **Dependency Conflicts**: Managing Vite's strict peer-dependency requirements for PDF generation.
- **State Synchronization**: Ensuring the server's version of the timer and question index stayed perfectly synced with the frontend.

---

## 9. Future Enhancements
- **AI Proctoring**: Using Webcams for gaze tracking and face detection.
- **Live Monitoring**: A real-time dashboard for admins to see student progress as it happens.
- **Adaptive Testing**: Difficulty of questions adjusts based on the student's previous answers.

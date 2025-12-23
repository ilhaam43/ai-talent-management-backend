# All Application Routes - AI Talent Management Frontend

## Public Routes (Landing/Marketing)

### Home & Main Pages
- `/` - Landing page (Home)
  - File: `src/pages/home.tsx`
  - Sections: Hero, CV Upload, Why Us, Hiring Program, Application Flow

- `/#home` - Home section anchor
- `/#cv-section` - CV Upload section anchor
- `/#hiring-program` - Hiring Program section anchor
- `/#application-flow` - Application Flow section anchor
- `/#why-us-section` - Why Us section anchor

### Life at Lintasarta
- `/life-at-lintasarta` - Life at Lintasarta page
  - File: `src/app/life-at-lintasarta/page.tsx`
  - File: `src/pages/Life@Lintasarta.tsx`
  - Shows company culture, events, and employee experiences

- `/events/:slug` - Event detail page (dynamic route)
  - File: `src/pages/EventDetailPage.tsx`
  - Displays individual event details

---

## Authentication Routes

### Candidate Authentication
- `/login` - Candidate login page
  - File: `src/app/(auth)/login/page.tsx`
  - File: `src/pages/Login.tsx`

- `/signup` - Candidate signup/registration page
  - File: `src/app/(auth)/signup/page.tsx`
  - File: `src/pages/SignUp.tsx`

### HR Authentication
- `/hr/login` - HR login page
  - File: `src/app/hr/(auth)/login/page.tsx`

---

## Career/Job Application Routes

### Main Career Pages
- `/career` - Career main page / Job recommendations
  - File: `src/app/career/page.tsx`
  - File: `src/pages/Career.tsx`
  - Shows job listings and recommendations

- `/career/applications` - My Applications page
  - Shows candidate's job applications

- `/career/saved` - Saved Jobs page
  - Shows bookmarked/saved job listings

### Job Browsing
- `/career/job-rec` - Job recommendations
  - File: `src/app/career/job-rec/page.tsx`

- `/career/job-type` - Browse jobs by type
  - File: `src/app/career/job-type/page.tsx`

### CV Upload
- `/career/upload-cv` - CV upload page
  - File: `src/app/career/upload-cv/page.tsx`
  - AI CV Analyzer functionality

---

## Profile Form Routes (Multi-step Application)

### Main Profile Form
- `/career/profile-form` - Profile form main/overview
  - File: `src/app/career/profile-form/page.tsx`
  - File: `src/pages/CareerForm.tsx`
  - File: `src/pages/CareerFormFlow.tsx`

### Profile Form Steps
- `/career/profile-form/address` - Address information step
  - File: `src/app/career/profile-form/address/page.tsx`

- `/career/profile-form/documents` - Document upload step
  - File: `src/app/career/profile-form/documents/page.tsx`

- `/career/profile-form/education` - Education history step
  - File: `src/app/career/profile-form/education/page.tsx`

- `/career/profile-form/family` - Family information step
  - File: `src/app/career/profile-form/family/page.tsx`

- `/career/profile-form/organization` - Organization experience step
  - File: `src/app/career/profile-form/organization/page.tsx`

- `/career/profile-form/skills` - Skills and certifications step
  - File: `src/app/career/profile-form/skills/page.tsx`

- `/career/profile-form/work-experience` - Work experience step
  - File: `src/app/career/profile-form/work-experience/page.tsx`

---

## User Profile Routes

### Profile Management
- `/profile` - User profile page
  - File: `src/app/profile/page.tsx`
  - Shows user information and profile overview

- `/profile/settings` - Profile settings
  - File: `src/app/profile/settings/page.tsx`
  - General account settings

- `/profile/settings/change-password` - Change password page
  - File: `src/app/profile/settings/change-password/page.tsx`

---

## HR Dashboard Routes

### HR Main Pages
- `/hr` - HR dashboard home
  - File: `src/app/hr/page.tsx`
  - Component: `src/components/hr/home/HomePage.tsx`

- `/hr/candidates` - Candidates management
  - Component: `src/components/hr/candidates/CandidatesPage.tsx`

- `/hr/job-roles` - Job roles management
  - Component: `src/components/hr/jobroles/JobRolesPage.tsx`

- `/hr/calendar` - Calendar/scheduling
  - Component: `src/components/hr/calender/CalendarPage.tsx`

- `/hr/action-center` - Action center
  - Component: `src/components/hr/action-center/ActionCenterPage.tsx`

- `/hr/ai-assistant` - AI Assistant
  - Component: `src/components/hr/ai-assistant/AIAssistantPage.tsx`

---

## Additional Pages

### Q&A and Support
- `/qna` - Questions and Answers page
  - File: `src/pages/QnA.tsx`

### Job AI
- `/job-ai` - AI Job matching/recommendations
  - File: `src/pages/JobAI.tsx`

---

## External Links

### Assessment Platform
- `https://lintasarta.assessment.com` - External assessment platform

### Social Media Links
- LinkedIn: `https://www.linkedin.com/company/lintasarta/`
- Instagram: `https://www.instagram.com/lintasarta.official/`
- Facebook: `https://www.facebook.com/Lintasarta_official/`
- Twitter/X: `https://www.x.com/lintasarta`
- YouTube: `https://www.youtube.com/@Lintasarta_official`
- TikTok: (URL in code)

### Legal Pages
- Privacy Policy: `#` (placeholder)
- Terms of Service: `#` (placeholder)

---

## Route Structure Summary

### Public Routes (8)
- Landing page and sections
- Life at Lintasarta
- Event details

### Authentication (3)
- Candidate login/signup
- HR login

### Career & Jobs (5)
- Job browsing
- Applications
- Saved jobs
- CV upload

### Profile Form (8)
- Multi-step application form
- Personal, education, work, skills, documents

### User Profile (3)
- Profile view
- Settings
- Change password

### HR Dashboard (6)
- Dashboard home
- Candidates management
- Job roles
- Calendar
- Action center
- AI Assistant

### Other (2)
- Q&A
- Job AI

---

## Navigation Components

### Main Navigation (Navbar)
- File: `src/components/Navbar.tsx`
- File: `src/flow/components/Navbar.tsx`

### Sidebar Navigation
- File: `src/components/LeftSidebar.tsx`
- File: `src/flow/components/LeftSidebar.tsx`

### Footer
- File: `src/flow/components/Footer.tsx`
- Included in various page files

---

## Notes

1. **Next.js App Router**: The application uses Next.js App Router with the `src/app` directory structure
2. **Parallel Pages**: Some routes have duplicate implementations in `src/pages` (legacy) and `src/app` (new)
3. **Dynamic Routes**: Event details use dynamic routing with slug parameter
4. **Protected Routes**: Profile and HR routes likely require authentication
5. **Multi-step Forms**: Profile form is a wizard-style multi-step process
6. **Anchor Links**: Several hash-based anchor links for same-page navigation

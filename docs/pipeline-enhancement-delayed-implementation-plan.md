# Interview Pipeline Enhancement - Implementation Plan

This plan focuses on enhancing the interview pipeline stages (Online Assessment, User Interview 1/2/3) with stage-specific data collection, scoring, and email notifications. The implementation normalizes interview data into a dedicated table and adds comprehensive UI actions for HR.

## Scope

**In Scope** ✅:
- Online Assessment stage (link, dates, qualified/not qualified)
- User Interview 1/2/3 stages (scheduling, scoring, location, interviewer)
  - **Note**: HR accompanies user interviews, so there's no separate "HR Interview" stage
  - All interview stages use the same data structure and workflow
- Normalized `candidate_interview_data` table
- Calendar endpoints for interview schedules
- Action center enhancements
- Email notifications with interview details

**Out of Scope** ⛔:
- Offering, MCU, Onboarding stages (future phases)
- Document upload for contracts (future)

---

## Architecture Changes

### New Database Table: `candidate_interview_data`

Create normalized table to store interview-specific information, separating it from the general-purpose `CandidateApplicationPipeline` table.

**Schema Definition**:
```prisma
enum InterviewMethod {
  ONLINE
  ONSITE
}

model CandidateInterviewData {
  id                            String          @id @default(uuid())
  candidateApplicationPipelineId String          @unique @map("candidate_application_pipeline_id")
  scheduledDate                 DateTime?       @map("scheduled_date") @db.Date
  scheduledStartTime            DateTime?       @map("scheduled_start_time") @db.Timestamptz
  scheduledEndTime              DateTime?       @map("scheduled_end_time") @db.Timestamptz
  interviewLink                 String?         @db.Text @map("interview_link")
  hrInterviewScore              Decimal?        @map("hr_interview_score") @db.Decimal(5, 2)
  userInterviewScore            Decimal?        @map("user_interview_score") @db.Decimal(5, 2)
  interviewMethod               InterviewMethod @map("interview_method")
  interviewLocation             String?         @db.Text @map("interview_location")
  createdAt                     DateTime        @default(now()) @map("created_at")
  updatedAt                     DateTime        @updatedAt @map("updated_at")

  // Relations
  candidateApplicationPipeline  CandidateApplicationPipeline @relation(fields: [candidateApplicationPipelineId], references: [id], onDelete: Cascade)

  @@map("candidate_interview_data")
}
```

**Field Purpose**:
- **scheduledDate/Start/End**: When interview is scheduled
- **interviewLink**: Zoom/Teams/Google Meet link (if ONLINE)
- **hrInterviewScore**: Score given by HR who accompanies the interview (0-100)
- **userInterviewScore**: Score given by User/Technical interviewer (0-100)
  - **Note**: Both scores can be recorded since HR accompanies user interviews
- **interviewMethod**: ENUM - ONLINE or ONSITE
- **interviewLocation**: Physical location (if ONSITE) or platform name (if ONLINE)

**Relationship**: One-to-one with `CandidateApplicationPipeline`. Each pipeline stage can have at most one interview data record.

---

## Proposed Changes

### Backend

#### [MODIFY] [schema.prisma](file:///c:/Users/MZE/Documents/GitHub/ai-talent-management/ai-talent-management-backend/prisma/schema.prisma#L618-L646)

1. **Add `InterviewMethod` enum** (place near other enums around line 710):
```prisma
enum InterviewMethod {
  ONLINE
  ONSITE
}
```

2. **Add `CandidateInterviewData` model** (place after `CandidateApplicationPipeline` model):
```prisma
model CandidateInterviewData {
  id                             String          @id @default(uuid())
  candidateApplicationPipelineId String          @unique @map("candidate_application_pipeline_id")
  scheduledDate                  DateTime?       @map("scheduled_date") @db.Date
  scheduledStartTime             DateTime?       @map("scheduled_start_time") @db.Timestamptz
  scheduledEndTime               DateTime?       @map("scheduled_end_time") @db.Timestamptz
  interviewLink                  String?         @db.Text @map("interview_link")
  hrInterviewScore               Decimal?        @map("hr_interview_score") @db.Decimal(5, 2)
  userInterviewScore             Decimal?        @map("user_interview_score") @db.Decimal(5, 2)
  interviewMethod                InterviewMethod @map("interview_method")
  interviewLocation              String?         @db.Text @map("interview_location")
  createdAt                      DateTime        @default(now()) @map("created_at")
  updatedAt                      DateTime        @updatedAt @map("updated_at")

  // Relations
  candidateApplicationPipeline CandidateApplicationPipeline @relation(fields: [candidateApplicationPipelineId], references: [id], onDelete: Cascade)

  @@map("candidate_interview_data")
}
```

3. **Add relation to `CandidateApplicationPipeline`**:
Add this field inside the `CandidateApplicationPipeline` model:
```prisma
interviewData CandidateInterviewData?
```

4. **Run migration**:
```bash
npx prisma migrate dev --name add_candidate_interview_data
```

---

#### [NEW] [interview-data.dto.ts](file:///c:/Users/MZE/Documents/GitHub/ai-talent-management/ai-talent-management-backend/src/candidate-applications/dto/interview-data.dto.ts)

Create DTOs for interview data operations:

```typescript
// Create Interview Data DTO
export class CreateInterviewDataDto {
  @IsUUID()
  @IsNotEmpty()
  candidateApplicationPipelineId!: string;

  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @IsDateString()
  @IsOptional()
  scheduledStartTime?: string;

  @IsDateString()
  @IsOptional()
  scheduledEndTime?: string;

  @IsString()
  @IsOptional()
  interviewLink?: string;

  @IsEnum(['ONLINE', 'ONSITE'])
  @IsNotEmpty()
  interviewMethod!: 'ONLINE' | 'ONSITE';

  @IsString()
  @IsOptional()
  interviewLocation?: string;
}

// Update Interview Data DTO
export class UpdateInterviewDataDto extends PartialType(CreateInterviewDataDto) {
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  hrInterviewScore?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  userInterviewScore?: number;
}
```

---

#### [MODIFY] [convert-candidate.dto.ts](file:///c:/Users/MZE/Documents/GitHub/ai-talent-management/ai-talent-management-backend/src/talent-pool/dto/convert-candidate.dto.ts)

Extend DTO to accept interview data when converting from talent pool:

```typescript
export class ConvertCandidateDto {
  @ApiProperty({ 
    enum: ['Online Assessment', 'User Interview 1', 'User Interview 2', 'User Interview 3'],
    description: 'Target pipeline stage for the converted candidate',
    example: 'User Interview 1'
  })
  @IsEnum(['Online Assessment', 'User Interview 1', 'User Interview 2', 'User Interview 3'])
  targetPipelineStage!: 'Online Assessment' | 'User Interview 1' | 'User Interview 2' | 'User Interview 3';

  @ApiPropertyOptional({
    description: 'List of specific application IDs to promote',
    example: ['uuid1', 'uuid2'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetApplicationIds?: string[];

  // Interview Scheduling Fields
  @ApiPropertyOptional({ description: 'Interview date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional({ description: 'Interview start time (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  scheduledStartTime?: string;

  @ApiPropertyOptional({ description: 'Interview end time (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  scheduledEndTime?: string;

  @ApiPropertyOptional({ description: 'Interview link (Zoom, Teams, etc.)' })
  @IsOptional()
  @IsString()
  interviewLink?: string;

  @ApiPropertyOptional({ 
    enum: ['ONLINE', 'ONSITE'],
    description: 'Interview method'
  })
  @IsOptional()
  @IsEnum(['ONLINE', 'ONSITE'])
  interviewMethod?: 'ONLINE' | 'ONSITE';

  @ApiPropertyOptional({ description: 'Interview location' })
  @IsOptional()
  @IsString()
  interviewLocation?: string;

  @ApiPropertyOptional({ description: 'Notes for this conversion' })
  @IsOptional()
  @IsString()
  notes?: string;
}
```

---

#### [NEW] [interview.controller.ts](file:///c:/Users/MZE/Documents/GitHub/ai-talent-management/ai-talent-management-backend/src/interview/interview.controller.ts)

Create dedicated controller for interview operations and calendar endpoints:

```typescript
@Controller('interview')
@ApiTags('Interview Management')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  // Create interview data
  @Post('data')
  @Roles(UserRole.HR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create interview scheduling data' })
  async createInterviewData(@Body() dto: CreateInterviewDataDto) {
    return this.interviewService.createInterviewData(dto);
  }

  // Update interview data (reschedule, change location, add scores)
  @Patch('data/:id')
  @Roles(UserRole.HR, UserRole.ADMIN, UserRole.INTERVIEWER)
  @ApiOperation({ summary: 'Update interview data (reschedule, scores)' })
  async updateInterviewData(
    @Param('id') id: string,
    @Body() dto: UpdateInterviewDataDto,
  ) {
    return this.interviewService.updateInterviewData(id, dto);
  }

  // Get all interview schedules (Calendar view)
  @Get('calendar')
  @Roles(UserRole.HR, UserRole.ADMIN, UserRole.INTERVIEWER)
  @ApiOperation({ summary: 'Get all interview schedules for calendar view' })
  async getCalendar(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('interviewerId') interviewerId?: string,
  ) {
    return this.interviewService.getCalendar({ startDate, endDate, interviewerId });
  }

  // Get specific interview data by ID
  @Get('calendar/:id')
  @Roles(UserRole.HR, UserRole.ADMIN, UserRole.INTERVIEWER)
  @ApiOperation({ summary: 'Get specific interview data' })
  async getInterviewById(@Param('id') id: string) {
    return this.interviewService.getInterviewById(id);
  }

  // Mark as qualified
  @Post(':applicationId/qualified')
  @Roles(UserRole.HR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Mark candidate as qualified in current stage' })
  async markAsQualified(
    @Param('applicationId') applicationId: string,
    @Body() dto: { notes?: string; proceedToNextStage?: boolean },
  ) {
    return this.interviewService.markAsQualified(applicationId, dto);
  }

  // Mark as not qualified
  @Post(':applicationId/not-qualified')
  @Roles(UserRole.HR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Mark candidate as not qualified (reject)' })
  async markAsNotQualified(
    @Param('applicationId') applicationId: string,
    @Body() dto: { feedback?: string },
  ) {
    return this.interviewService.markAsNotQualified(applicationId, dto);
  }
}
```

---

#### [NEW] [interview.service.ts](file:///c:/Users/MZE/Documents/GitHub/ai-talent-management/ai-talent-management-backend/src/interview/interview.service.ts)

Implement interview business logic:

**Key Methods**:

1. **`createInterviewData(dto: CreateInterviewDataDto)`**:
   - Validate `candidateApplicationPipelineId` exists
   - Create `CandidateInterviewData` record
   - Send email notification with interview details

2. **`updateInterviewData(id: string, dto: UpdateInterviewDataDto)`**:
   - Update interview schedule, location, or scores
   - Optionally resend email if schedule changed
   - Log changes to audit trail

3. **`getCalendar(filters)`**:
   - Query all interviews within date range
   - Include candidate name, job title, interviewer, status
   - Format for calendar UI display

4. **`getInterviewById(id: string)`**:
   - Fetch specific interview details
   - Include full candidate and job information
   - Return scores if available

5. **`markAsQualified(applicationId: string, options)`**:
   - Update `ApplicationPipelineStatus` to "Qualified"
   - Optionally proceed to next pipeline stage
   - Send congratulations email

6. **`markAsNotQualified(applicationId: string, feedback)`**:
   - Update status to "Not Qualified"
   - Send rejection email with feedback
   - Close application

---

#### [MODIFY] [talent-pool.service.ts](file:///c:/Users/MZE/Documents/GitHub/ai-talent-management/ai-talent-management-backend/src/talent-pool/talent-pool.service.ts)

Update `convertToActivePipeline` to accept and create interview data:

```typescript
async convertToActivePipeline(
  candidateId: string,
  dto: ConvertCandidateDto,
): Promise<{ success: boolean; message: string }> {
  // ... existing conversion logic ...

  // After creating CandidateApplicationPipeline record:
  if (dto.interviewMethod && (dto.scheduledDate || dto.interviewLink)) {
    await this.prisma.candidateInterviewData.create({
      data: {
        candidateApplicationPipelineId: pipelineRecord.id,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
        scheduledStartTime: dto.scheduledStartTime ? new Date(dto.scheduledStartTime) : null,
        scheduledEndTime: dto.scheduledEndTime ? new Date(dto.scheduledEndTime) : null,
        interviewLink: dto.interviewLink,
        interviewMethod: dto.interviewMethod,
        interviewLocation: dto.interviewLocation,
      },
    });
  }

  // Send enhanced email with interview details
  await this.emailService.sendInterviewInvitationEmail({
    candidateEmail,
    candidateName,
    jobTitle,
    stageName: dto.targetPipelineStage,
    scheduledDate: dto.scheduledDate,
    scheduledStartTime: dto.scheduledStartTime,
    scheduledEndTime: dto.scheduledEndTime,
    interviewLink: dto.interviewLink,
    interviewMethod: dto.interviewMethod,
    interviewLocation: dto.interviewLocation,
  });
}
```

---

#### [MODIFY] [email.service.ts](file:///c:/Users/MZE/Documents/GitHub/ai-talent-management/ai-talent-management-backend/src/email/email.service.ts)

Create stage-specific email templates:

**1. Online Assessment Email**:
```typescript
async sendOnlineAssessmentEmail(data: {
  candidateEmail: string;
  candidateName: string;
  jobTitle: string;
  assessmentLink: string;
  startDate: string;
  endDate: string;
  notes?: string;
}): Promise<void> {
  const template = `
    <h2>Online Assessment Invitation - ${data.jobTitle}</h2>
    <p>Dear ${data.candidateName},</p>
    <p>Congratulations! You have been selected to proceed to the Online Assessment stage.</p>
    
    <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <h3>Assessment Details:</h3>
      <p><strong>Assessment Link:</strong> <a href="${data.assessmentLink}">${data.assessmentLink}</a></p>
      <p><strong>Start Date:</strong> ${format(new Date(data.startDate), 'PPP')}</p>
      <p><strong>End Date:</strong> ${format(new Date(data.endDate), 'PPP')}</p>
    </div>

    ${data.notes ? `<p><strong>Additional Notes:</strong><br>${data.notes}</p>` : ''}
    
    <p>Please complete the assessment within the given timeframe. Good luck!</p>
  `;

  await this.sendEmail({
    to: data.candidateEmail,
    subject: `Online Assessment - ${data.jobTitle}`,
    html: template,
  });
}
```

**2. Interview Invitation Email**:
```typescript
async sendInterviewInvitationEmail(data: {
  candidateEmail: string;
  candidateName: string;
  jobTitle: string;
  stageName: string;
  scheduledDate?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  interviewLink?: string;
  interviewMethod?: 'ONLINE' | 'ONSITE';
  interviewLocation?: string;
}): Promise<void> {
  const startTime = data.scheduledStartTime ? format(new Date(data.scheduledStartTime), 'PPP p') : '';
  const endTime = data.scheduledEndTime ? format(new Date(data.scheduledEndTime), 'p') : '';

  const template = `
    <h2>Interview Invitation - ${data.jobTitle}</h2>
    <p>Dear ${data.candidateName},</p>
    <p>We are pleased to invite you to the <strong>${data.stageName}</strong> for the position of ${data.jobTitle}.</p>
    
    <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <h3>Interview Details:</h3>
      <p><strong>Date & Time:</strong> ${startTime} - ${endTime}</p>
      <p><strong>Method:</strong> ${data.interviewMethod === 'ONLINE' ? 'Online' : 'On-site'}</p>
      ${data.interviewMethod === 'ONLINE' && data.interviewLink ? 
        `<p><strong>Meeting Link:</strong> <a href="${data.interviewLink}">${data.interviewLink}</a></p>` : ''}
      ${data.interviewMethod === 'ONSITE' && data.interviewLocation ? 
        `<p><strong>Location:</strong> ${data.interviewLocation}</p>` : ''}
    </div>

    <p>Please confirm your availability and prepare accordingly. We look forward to speaking with you!</p>
  `;

  await this.sendEmail({
    to: data.candidateEmail,
    subject: `Interview Invitation - ${data.stageName} - ${data.jobTitle}`,
    html: template,
  });
}
```

---

### Frontend

#### [MODIFY] [TalentPoolDetail.tsx](file:///c:/Users/MZE/Documents/GitHub/ai-talent-management/ai-talent-management-frontend/src/components/hr/candidates/TalentPoolDetail.tsx)

Update the conversion modal to include interview-specific fields:

**Changes**:
1. Change "Online Test" to "Online Assessment"
2. Add dynamic form fields based on selected stage:
   - **Online Assessment**: Start Date, End Date, Assessment Link
   - **User Interview 1/2/3**: Date/Time, Method (Online/Onsite), Link (if Online), Location (if Onsite)
     - Note: Same form for all User Interview stages

**Dynamic Form Example**:
```tsx
{selectedStage === 'Online Assessment' && (
  <>
    <div>
      <label>Assessment Link*</label>
      <input
        type="url"
        value={assessmentLink}
        onChange={(e) => setAssessmentLink(e.target.value)}
        required
      />
    </div>
    <div>
      <label>Start Date*</label>
      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        required
      />
    </div>
    <div>
      <label>End Date*</label>
      <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
    </div>
  </>
)}

{(selectedStage === 'User Interview 1' || selectedStage === 'User Interview 2' || selectedStage === 'User Interview 3') && (
  <>
    <div>
      <label>Interview Method*</label>
      <select value={interviewMethod} onChange={(e) => setInterviewMethod(e.target.value)} required>
        <option value="">Select method</option>
        <option value="ONLINE">Online</option>
        <option value="ONSITE">On-site</option>
      </select>
    </div>

    {interviewMethod === 'ONLINE' && (
      <div>
        <label>Meeting Link*</label>
        <input type="url" value={interviewLink} onChange={(e) => setInterviewLink(e.target.value)} required />
      </div>
    )}

    {interviewMethod === 'ONSITE' && (
      <div>
        <label>Location*</label>
        <input type="text" value={interviewLocation} onChange={(e) => setInterviewLocation(e.target.value)} required />
      </div>
    )}

    <div>
      <label>Interview Date*</label>
      <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} required />
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label>Start Time*</label>
        <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
      </div>
      <div>
        <label>End Time*</label>
        <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
      </div>
    </div>
  </>
)}
```

---

#### [MODIFY] [CandidateDetail.tsx](file:///c:/Users/MZE/Documents/GitHub/ai-talent-management/ai-talent-management-frontend/src/components/hr/candidates/CandidateDetail.tsx)

Add action icon button for each pipeline stage (as shown in uploaded image):

**UI Layout** (based on uploaded image):
```tsx
<table>
  <thead>
    <tr>
      <th>Stage</th>
      <th>Score</th>
      <th>PIC/Interviewer</th>
      <th>Schedule</th>
      <th>Notes</th>
      <th>Action</th>
    </tr>
  </thead>
  <tbody>
    {pipelineHistory.map((stage) => (
      <tr key={stage.id}>
        <td>{stage.stageName}</td>
        <td>{stage.score || '-'}</td>
        <td>{stage.interviewer || 'System'}</td>
        <td>{stage.scheduledDate ? format(new Date(stage.scheduledDate), 'P') : '-'}</td>
        <td>{stage.notes || '-'}</td>
        <td>
          <button
            onClick={() => openActionModal(stage)}
            className="action-icon-button"
            title="Actions"
          >
            📋 {/* Or use an icon component */}
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

---

#### [NEW] [InterviewActionModal.tsx](file:///c:/Users/MZE/Documents/GitHub/ai-talent-management/ai-talent-management-frontend/src/components/hr/candidates/InterviewActionModal.tsx)

Create modal for interview stage actions:

**Actions Available**:

**For Online Assessment**:
- ✅ Mark as Qualified
- ❌ Mark as Not Qualified

**For Interview Stages** (User Interview 1/2/3):
- 📝 Edit/Reschedule
- 📊 Input Score (HR or User score)
- ✅ Mark as Qualified (+ proceed to next stage option)
- ❌ Mark as Not Qualified

**Modal UI**:
```tsx
<Modal isOpen={isOpen} onClose={onClose}>
  <h3>{stage.stageName} - Actions</h3>
  
  {stage.stageName !== 'Online Assessment' && (
    <>
      <button onClick={() => setAction('edit')}>📝 Edit/Reschedule</button>
      <button onClick={() => setAction('score')}>📊 Input Score</button>
    </>
  )}
  
  <button onClick={() => setAction('qualified')}>✅ Mark as Qualified</button>
  <button onClick={() => setAction('not-qualified')}>❌ Mark as Not Qualified</button>

  {/* Dynamic form based on selected action */}
  {action === 'edit' && <RescheduleForm stage={stage} onSave={handleReschedule} />}
  {action === 'score' && <ScoreInputForm stage={stage} onSave={handleScoreUpdate} />}
  {action === 'qualified' && <QualifiedForm stage={stage} onSave={handleQualified} />}
  {action === 'not-qualified' && <NotQualifiedForm stage={stage} onSave={handleNotQualified} />}
</Modal>
```

---

#### [NEW] [interviewService.ts](file:///c:/Users/MZE/Documents/GitHub/ai-talent-management/ai-talent-management-frontend/src/services/interviewService.ts)

Create frontend service for interview API calls:

```typescript
export const interviewService = {
  // Get calendar data
  getCalendar: async (filters?: { startDate?: string; endDate?: string }) => {
    const params = new URLSearchParams(filters);
    return api.get(`/interview/calendar?${params}`);
  },

  // Get specific interview
  getInterviewById: async (id: string) => {
    return api.get(`/interview/calendar/${id}`);
  },

  // Create interview data
  createInterviewData: async (data: CreateInterviewDataDto) => {
    return api.post('/interview/data', data);
  },

  // Update interview (reschedule, scores)
  updateInterviewData: async (id: string, data: UpdateInterviewDataDto) => {
    return api.patch(`/interview/data/${id}`, data);
  },

  // Mark as qualified
  markAsQualified: async (applicationId: string, notes?: string, proceedToNext?: boolean) => {
    return api.post(`/interview/${applicationId}/qualified`, {
      notes,
      proceedToNextStage: proceedToNext,
    });
  },

  // Mark as not qualified
  markAsNotQualified: async (applicationId: string, feedback?: string) => {
    return api.post(`/interview/${applicationId}/not-qualified`, { feedback });
  },
};
```

---

#### [MODIFY] [Action Center](file:///c:/Users/MZE/Documents/GitHub/ai-talent-management/ai-talent-management-frontend/src/components/hr/ActionCenter.tsx)

Update action center to show interview actions per pipeline stage:

**Changes**:
- Add action icon for each candidate row
- Group by pipeline stage (Online Assessment, Interview, etc.)
- Show quick actions: Qualified / Not Qualified / View Details

---

## Verification Plan

### Database Verification

After running migration, verify schema:
```bash
# Run migration
npx prisma migrate dev --name add_candidate_interview_data

# Verify in database
psql -d ai_talent_management
\d candidate_interview_data
SELECT * FROM candidate_interview_data;
```

**Expected**: Table created with all columns, enum type `InterviewMethod` exists, foreign key to `candidate_application_pipelines` exists.

---

### Backend API Testing

#### Test 1: Create Interview Data
```bash
POST /interview/data
{
  "candidateApplicationPipelineId": "uuid-here",
  "scheduledDate": "2026-02-05",
  "scheduledStartTime": "2026-02-05T10:00:00+07:00",
  "scheduledEndTime": "2026-02-05T11:00:00+07:00",
  "interviewMethod": "ONLINE",
  "interviewLink": "https://zoom.us/j/123456789"
}
```
**Expected**: Interview data created, email sent to candidate with Zoom link and time.

#### Test 2: Get Calendar
```bash
GET /interview/calendar?startDate=2026-02-01&endDate=2026-02-28
```
**Expected**: Returns all interviews scheduled in February 2026 with candidate name, job title, status.

#### Test 3: Update Interview Score
```bash
PATCH /interview/data/{id}
{
  "hrInterviewScore": 85.5
}
```
**Expected**: Score updated successfully.

#### Test 4: Mark as Qualified
```bash
POST /interview/{applicationId}/qualified
{
  "notes": "Excellent technical skills",
  "proceedToNextStage": true
}
```
**Expected**: Status updated to "Qualified", candidate proceeds to next stage (e.g., HR Interview → User Interview), email sent.

---

### Frontend Testing

#### Test 1: Talent Pool Conversion with Interview Data

1. Navigate to **Talent Pool** tab
2. Click on a candidate
3. Click **"Convert to Candidate"**
4. Select **"User Interview 1"**
5. Fill in:
   - Interview Method: **Online**
   - Interview Link: `https://meet.google.com/abc-defg-hij`
   - Date: **2026-02-10**
   - Start Time: **14:00**
   - End Time: **15:00**
6. Click **"Convert"**

**Expected**:
- Candidate moved to "All Candidates" tab
- Pipeline stage: "User Interview 1"
- Interview data saved in database
- Email sent to candidate with Google Meet link and time

---

#### Test 2: Edit Interview Schedule from Candidate Details

1. Open candidate details page
2. Find **"User Interview 1"** row in pipeline table
3. Click **action icon** (📋)
4. Select **"Edit/Reschedule"**
5. Change time to **15:00 - 16:00**
6. Check **"Resend Email"**
7. Click **"Save"**

**Expected**:
- Interview time updated in database
- Updated email sent to candidate with new time
- UI refreshes to show new schedule

---

#### Test 3: Input Interview Score

1. In candidate details, click action icon for **"User Interview 1"**
2. Select **"Input Score"**
3. Enter **HR Score: 88** and **User Interview Score: 92**
4. Click **"Save"**

**Expected**:
- Scores saved in `candidate_interview_data.hrInterviewScore` and `userInterviewScore`
- Scores displayed in candidate details table

---

#### Test 4: Mark as Qualified and Proceed

1. Click action icon for **"User Interview 1"**
2. Select **"Mark as Qualified"**
3. Check ☑️ **"Proceed to User Interview 2"**
4. Add notes: "Strong communication skills"
5. Click **"Confirm"**

**Expected**:
- User Interview 1 status → "Qualified"
- New pipeline stage created: "User Interview 2" (status: "Pending")
- Email sent congratulating candidate and explaining next steps

---

#### Test 5: Mark as Not Qualified

1. Click action icon for "Online Assessment"
2. Select **"Mark as Not Qualified"**
3. Add feedback: "Did not meet minimum score requirement"
4. Click **"Confirm"**

**Expected**:
- Status → "Not Qualified"
- Application closed
- Rejection email sent with feedback

---

### Email Verification

Check email inbox (or MailHog/Mailtrap) for:

- [ ] **Online Assessment Email**: Contains assessment link, start date, end date
- [ ] **Interview Invitation Email**: Contains date/time, Zoom/Teams link (if online), location (if onsite)
- [ ] **Interview Reschedule Email**: Contains updated time
- [ ] **Qualified Email**: Congrats message, next steps
- [ ] **Rejection Email**: Professional feedback

**All emails should be**:
- Mobile-friendly
- Professionally formatted
- Include company branding
- Have clear CTAs (links to assessment, calendar invite, etc.)

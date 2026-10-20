import request from 'supertest';
import app from '../index';
import { prisma } from '../utils/db';
import { evaluateSchemeEligibility, evaluateGroup } from '../services/EligibilityEngine';
import { ReminderProcessor } from '../services/ReminderProcessor';
import { RuleGroup } from '../../../shared/types';

interface TestReportItem {
  id: number;
  name: string;
  endpoint: string;
  input: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL';
}

const testResults: TestReportItem[] = [];

function recordTest(
  id: number,
  name: string,
  endpoint: string,
  input: any,
  expected: string,
  actual: string,
  passed: boolean
) {
  const status = passed ? 'PASS' : 'FAIL';
  testResults.push({
    id,
    name,
    endpoint,
    input: typeof input === 'string' ? input : JSON.stringify(input),
    expected,
    actual,
    status
  });
  console.log(`[TEST ${id}] ${status}: ${name} (${endpoint})`);
  if (!passed) {
    console.error(`   Expected: ${expected}`);
    console.error(`   Actual:   ${actual}`);
  }
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('STARTING GOVAI COMPREHENSIVE INTEGRATION TEST SUITE');
  console.log('====================================================\n');

  // --- DATABASE RECORD COUNT VERIFICATION ---
  console.log('--- Database Record Count Verification ---');
  const counts = {
    User: await prisma.user.count(),
    StudentProfile: await prisma.studentProfile.count(),
    Scheme: await prisma.scheme.count(),
    SchemeBenefit: await prisma.schemeBenefit.count(),
    SchemeDocument: await prisma.schemeDocument.count(),
    SchemeEligibility: await prisma.schemeEligibility.count(),
    Tag: await prisma.tag.count(),
    Bookmark: await prisma.bookmark.count(),
    Application: await prisma.application.count(),
    Reminder: await prisma.reminder.count(),
    ChatSession: await prisma.chatSession.count(),
    ChatMessage: await prisma.chatMessage.count(),
    GeneratedReport: await prisma.generatedReport.count(),
  };
  console.table(counts);

  // --- TEST 1: Health Check ---
  try {
    const res = await request(app).get('/api/v1/health');
    const passed = res.status === 200 && res.body.success === true && res.body.data?.status === 'UP';
    recordTest(
      1,
      'Health Check',
      'GET /api/v1/health',
      'None',
      'HTTP 200 with status UP and database CONNECTED',
      `HTTP ${res.status}, status=${res.body.data?.status}, db=${res.body.data?.database}`,
      passed
    );
  } catch (err: any) {
    recordTest(1, 'Health Check', 'GET /api/v1/health', 'None', 'HTTP 200', err.message, false);
  }

  // --- TEST 2: Mock Authentication ---
  let userAToken = '';
  let userBToken = '';
  let userAId = '';
  let userBId = '';

  try {
    const resA = await request(app).post('/api/v1/auth/mock').send({ username: 'mock_student_alpha' });
    userAToken = resA.body.data?.token;
    userAId = resA.body.data?.user?.id;

    const resB = await request(app).post('/api/v1/auth/mock').send({ username: 'mock_student_beta' });
    userBToken = resB.body.data?.token;
    userBId = resB.body.data?.user?.id;

    const passed = resA.status === 200 && !!userAToken && resB.status === 200 && !!userBToken;
    recordTest(
      2,
      'Mock Authentication',
      'POST /api/v1/auth/mock',
      { username: 'mock_student_alpha' },
      'HTTP 200 with JWT token and user info',
      `HTTP ${resA.status}, UserA email=${resA.body.data?.user?.email}, token length=${userAToken?.length || 0}`,
      passed
    );
  } catch (err: any) {
    recordTest(2, 'Mock Authentication', 'POST /api/v1/auth/mock', { username: 'mock_student_alpha' }, 'HTTP 200', err.message, false);
  }

  // --- TEST 3: Profile GET / POST / PUT ---
  try {
    const profilePayload = {
      name: 'Alpha Student',
      phone: '9876543210',
      state: 'Maharashtra',
      district: 'Pune',
      educationLevel: 'UG',
      institution: 'College of Engineering Pune',
      course: 'B.Tech Computer Science',
      yearOfStudy: 3,
      academicPercentage: 88.5,
      familyIncome: 200000,
      category: 'SC',
      gender: 'Female',
      dob: '2003-04-12',
      disabilityStatus: false,
      minorityStatus: false
    };

    const postRes = await request(app)
      .post('/api/v1/profile')
      .set('Authorization', `Bearer ${userAToken}`)
      .send(profilePayload);

    const getRes = await request(app)
      .get('/api/v1/profile')
      .set('Authorization', `Bearer ${userAToken}`);

    const passed = postRes.status === 200 && getRes.status === 200 && getRes.body.data?.profile?.state === 'Maharashtra';
    recordTest(
      3,
      'Profile GET/POST/PUT',
      'POST & GET /api/v1/profile',
      profilePayload,
      'HTTP 200 with updated student profile',
      `HTTP ${getRes.status}, profile state=${getRes.body.data?.profile?.state}, category=${getRes.body.data?.profile?.category}`,
      passed
    );
  } catch (err: any) {
    recordTest(3, 'Profile GET/POST/PUT', '/api/v1/profile', 'Profile Payload', 'HTTP 200', err.message, false);
  }

  // --- TEST 4: Scheme Search, Filtering, Pagination and Details ---
  try {
    const searchRes = await request(app).get('/api/v1/schemes?search=Post%20Matric&page=1&limit=5');
    const detailRes = await request(app).get('/api/v1/schemes/central-post-matric-sc');

    const passed = searchRes.status === 200 && 
                   searchRes.body.data?.schemes?.length > 0 && 
                   searchRes.body.data?.pagination?.total > 0 && 
                   detailRes.status === 200 && 
                   detailRes.body.data?.id === 'central-post-matric-sc';

    recordTest(
      4,
      'Scheme Search, Filtering, Pagination & Details',
      'GET /api/v1/schemes & GET /api/v1/schemes/:id',
      { search: 'Post Matric', page: 1, limit: 5 },
      'HTTP 200 with paginated schemes list and scheme details',
      `HTTP ${searchRes.status}, found ${searchRes.body.data?.schemes?.length} schemes (total ${searchRes.body.data?.pagination?.total}). Detail ID=${detailRes.body.data?.id}`,
      passed
    );
  } catch (err: any) {
    recordTest(4, 'Scheme Search & Details', '/api/v1/schemes', 'search=Post Matric', 'HTTP 200', err.message, false);
  }

  // --- TEST 5: Recommendations ---
  try {
    const recRes = await request(app)
      .get('/api/v1/recommendations?explain=true')
      .set('Authorization', `Bearer ${userAToken}`);

    const passed = recRes.status === 200 && 
                   recRes.body.data?.hasProfile === true && 
                   Array.isArray(recRes.body.data?.recommendations) && 
                   recRes.body.data?.recommendations.length > 0;

    recordTest(
      5,
      'Recommendations',
      'GET /api/v1/recommendations?explain=true',
      'explain=true with Auth',
      'HTTP 200 with personalized recommendations list & AI explanations',
      `HTTP ${recRes.status}, recommendations count=${recRes.body.data?.recommendations?.length}, top scheme=${recRes.body.data?.recommendations?.[0]?.scheme?.name}`,
      passed
    );
  } catch (err: any) {
    recordTest(5, 'Recommendations', '/api/v1/recommendations', 'explain=true', 'HTTP 200', err.message, false);
  }

  // --- TEST 6: Eligibility Engine with Multiple Mock Profiles ---
  try {
    const schemeSC = await prisma.scheme.findUnique({
      where: { id: 'central-post-matric-sc' },
      include: { eligibility: true }
    });

    const mockProfileA: any = {
      state: 'Maharashtra',
      educationLevel: 'UG',
      familyIncome: 180000,
      category: 'SC',
      gender: 'Female',
      dob: new Date('2003-01-01')
    };

    const mockProfileB: any = {
      state: 'Delhi',
      educationLevel: 'UG',
      familyIncome: 900000,
      category: 'General',
      gender: 'Male',
      dob: new Date('2002-01-01')
    };

    const evalA = evaluateSchemeEligibility(mockProfileA, schemeSC as any);
    const evalB = evaluateSchemeEligibility(mockProfileB, schemeSC as any);

    const passed = evalA.eligibilityStatus === 'ELIGIBLE' && evalB.eligibilityStatus === 'NOT_ELIGIBLE';

    recordTest(
      6,
      'Eligibility Engine Multi-Profile Check',
      'Internal Engine evaluateSchemeEligibility()',
      { ProfileA: 'SC, Low Income', ProfileB: 'General, High Income' },
      'Profile A ELIGIBLE, Profile B NOT_ELIGIBLE',
      `Profile A Status=${evalA.eligibilityStatus} (score=${evalA.matchScore}), Profile B Status=${evalB.eligibilityStatus} (score=${evalB.matchScore})`,
      passed
    );
  } catch (err: any) {
    recordTest(6, 'Eligibility Engine Multi-Profile', 'Engine Function', 'Multiple Profiles', 'ELIGIBLE & NOT_ELIGIBLE', err.message, false);
  }

  // --- TEST 7: Hard-Failure Eligibility Cases & Score Ranking Guarantee ---
  try {
    const schemeSC = await prisma.scheme.findUnique({
      where: { id: 'central-post-matric-sc' },
      include: { eligibility: true }
    });

    // Profile C: General category student, Income 200k, UG. Passes income and education, but FAILS category (SC != General).
    const mockProfileC: any = {
      userId: userBId,
      state: 'Maharashtra',
      educationLevel: 'UG',
      familyIncome: 200000,
      category: 'General',
      gender: 'Male',
      dob: new Date('2003-01-01')
    };

    // Save profile to DB for userB
    await request(app)
      .post('/api/v1/profile')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        name: 'Beta Student',
        state: 'Maharashtra',
        district: 'Mumbai',
        educationLevel: 'UG',
        institution: 'Mumbai Univ',
        course: 'B.Com',
        yearOfStudy: 2,
        academicPercentage: 80,
        familyIncome: 200000,
        category: 'General',
        gender: 'Male',
        dob: '2003-01-01',
        disabilityStatus: false,
        minorityStatus: false
      });

    const evalC = evaluateSchemeEligibility(mockProfileC, schemeSC as any);

    // Call recommendations endpoint for User B
    const recResB = await request(app)
      .get('/api/v1/recommendations')
      .set('Authorization', `Bearer ${userBToken}`);

    const recommendations = recResB.body.data?.recommendations || [];
    
    // Check that NO scheme with NOT_ELIGIBLE status appears above any ELIGIBLE scheme
    let orderValid = true;
    let foundNotEligible = false;
    for (const r of recommendations) {
      if (r.eligibilityStatus === 'NOT_ELIGIBLE') {
        foundNotEligible = true;
      } else if (foundNotEligible && (r.eligibilityStatus === 'ELIGIBLE' || r.eligibilityStatus === 'NEEDS_VERIFICATION')) {
        orderValid = false; // ELIGIBLE item came AFTER a NOT_ELIGIBLE item!
        break;
      }
    }

    const passed = evalC.eligibilityStatus === 'NOT_ELIGIBLE' && 
                   evalC.matchScore <= 49 && 
                   orderValid;

    recordTest(
      7,
      'Hard-Failure Eligibility Guarantee',
      'GET /api/v1/recommendations & EligibilityEngine',
      { categoryMismatchProfile: 'General for SC Scheme' },
      'Status NOT_ELIGIBLE, matchScore <= 49, and sorted BELOW all ELIGIBLE schemes',
      `Eval Status=${evalC.eligibilityStatus}, matchScore=${evalC.matchScore}, Recommendation Sorting Tier Valid=${orderValid}`,
      passed
    );
  } catch (err: any) {
    recordTest(7, 'Hard-Failure Eligibility Case', 'Recommendations', 'General profile on SC scheme', 'NOT_ELIGIBLE capped score', err.message, false);
  }

  // --- TEST 8: AND/OR Nested Eligibility Rules ---
  try {
    const nestedRuleGroup: RuleGroup = {
      operator: 'AND',
      conditions: [
        { field: 'educationLevel', operator: 'IN', value: ['UG', 'PG'] }
      ],
      groups: [
        {
          operator: 'OR',
          conditions: [
            { field: 'category', operator: 'EQ', value: 'SC' },
            { field: 'category', operator: 'EQ', value: 'ST' }
          ]
        }
      ]
    };

    const profileMatching: any = { educationLevel: 'UG', category: 'SC', dob: new Date('2003-01-01') };
    const profileFailingInnerOr: any = { educationLevel: 'UG', category: 'General', dob: new Date('2003-01-01') };

    const resMatching = evaluateGroup(profileMatching, nestedRuleGroup);
    const resFailing = evaluateGroup(profileFailingInnerOr, nestedRuleGroup);

    const passed = resMatching.passed === true && resFailing.passed === false;

    recordTest(
      8,
      'AND/OR Nested Eligibility Rules',
      'Internal evaluateGroup()',
      nestedRuleGroup,
      'Nested AND(OR(SC, ST)) evaluates TRUE for SC, FALSE for General',
      `Matching Profile Passed=${resMatching.passed}, Failing Profile Passed=${resFailing.passed}`,
      passed
    );
  } catch (err: any) {
    recordTest(8, 'AND/OR Nested Rules', 'evaluateGroup()', 'Nested JSON rule tree', 'Matching=true, Failing=false', err.message, false);
  }

  // --- TEST 9: Chat Session Creation and Messages ---
  let sessionId = '';
  try {
    const createSessionRes = await request(app)
      .post('/api/v1/chat/sessions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ title: 'Integration Test Session' });

    sessionId = createSessionRes.body.data?.id;

    const sendMsgRes = await request(app)
      .post(`/api/v1/chat/sessions/${sessionId}/messages`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ message: 'What documents do I need for post matric scholarship?' });

    const getMsgsRes = await request(app)
      .get(`/api/v1/chat/sessions/${sessionId}/messages`)
      .set('Authorization', `Bearer ${userAToken}`);

    const passed = createSessionRes.status === 201 && 
                   sendMsgRes.status === 200 && 
                   getMsgsRes.status === 200 && 
                   getMsgsRes.body.data?.length >= 2;

    recordTest(
      9,
      'Chat Session Creation & Messaging',
      'POST & GET /api/v1/chat/sessions',
      { title: 'Integration Test Session', message: 'What documents do I need?' },
      'HTTP 201 session creation, HTTP 200 AI reply and message retrieval',
      `Session ID=${sessionId}, Messages count=${getMsgsRes.body.data?.length}, AI reply snippet="${sendMsgRes.body.data?.content?.slice(0, 40)}..."`,
      passed
    );
  } catch (err: any) {
    recordTest(9, 'Chat Session Creation & Messages', '/api/v1/chat/sessions', 'Message payload', 'HTTP 201 & 200', err.message, false);
  }

  // --- TEST 10: Comparison with 2–4 Schemes ---
  try {
    const compareRes = await request(app)
      .post('/api/v1/comparison')
      .send({ schemeIds: ['central-post-matric-sc', 'central-post-matric-obc'] });

    const passed = compareRes.status === 200 && 
                   Array.isArray(compareRes.body.data) && 
                   compareRes.body.data.length === 2;

    recordTest(
      10,
      'Comparison with 2-4 Schemes',
      'POST /api/v1/comparison',
      { schemeIds: ['central-post-matric-sc', 'central-post-matric-obc'] },
      'HTTP 200 with side-by-side array of 2 schemes',
      `HTTP ${compareRes.status}, returned ${compareRes.body.data?.length} schemes (${compareRes.body.data?.map((s: any) => s.id).join(', ')})`,
      passed
    );
  } catch (err: any) {
    recordTest(10, 'Comparison with 2-4 Schemes', '/api/v1/comparison', '2 Scheme IDs', 'HTTP 200', err.message, false);
  }

  // --- TEST 11: Bookmark Create/List/Delete ---
  try {
    const addRes = await request(app)
      .post('/api/v1/bookmarks')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ schemeId: 'central-post-matric-sc' });

    const listRes = await request(app)
      .get('/api/v1/bookmarks')
      .set('Authorization', `Bearer ${userAToken}`);

    const delRes = await request(app)
      .delete('/api/v1/bookmarks/central-post-matric-sc')
      .set('Authorization', `Bearer ${userAToken}`);

    const listAfterDelRes = await request(app)
      .get('/api/v1/bookmarks')
      .set('Authorization', `Bearer ${userAToken}`);

    const passed = addRes.status === 201 && 
                   listRes.body.data?.some((s: any) => s.id === 'central-post-matric-sc') && 
                   delRes.status === 200 && 
                   !listAfterDelRes.body.data?.some((s: any) => s.id === 'central-post-matric-sc');

    recordTest(
      11,
      'Bookmark Create/List/Delete',
      'POST/GET/DELETE /api/v1/bookmarks',
      { schemeId: 'central-post-matric-sc' },
      'HTTP 201 on add, HTTP 200 on list & delete',
      `Add HTTP ${addRes.status}, List count before del=${listRes.body.data?.length}, after del=${listAfterDelRes.body.data?.length}`,
      passed
    );
  } catch (err: any) {
    recordTest(11, 'Bookmark Create/List/Delete', '/api/v1/bookmarks', 'central-post-matric-sc', 'HTTP 201 & 200', err.message, false);
  }

  // --- TEST 12: Application Tracking and Status Updates ---
  try {
    const upsertRes = await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        schemeId: 'central-post-matric-sc',
        status: 'APPLIED',
        notes: 'Submitted via National Scholarship Portal',
        appliedAt: '2026-08-15'
      });

    const getRes = await request(app)
      .get('/api/v1/applications')
      .set('Authorization', `Bearer ${userAToken}`);

    const passed = upsertRes.status === 200 && 
                   getRes.status === 200 && 
                   getRes.body.data?.some((a: any) => a.schemeId === 'central-post-matric-sc' && a.status === 'APPLIED');

    recordTest(
      12,
      'Application Tracking & Status Updates',
      'POST & GET /api/v1/applications',
      { schemeId: 'central-post-matric-sc', status: 'APPLIED' },
      'HTTP 200 with application status updated to APPLIED',
      `HTTP ${upsertRes.status}, Tracked Apps count=${getRes.body.data?.length}, Status=${getRes.body.data?.[0]?.status}`,
      passed
    );
  } catch (err: any) {
    recordTest(12, 'Application Tracking', '/api/v1/applications', 'schemeId & status', 'HTTP 200', err.message, false);
  }

  // --- TEST 13: Reminder Creation/List/Delete ---
  let reminderId = '';
  try {
    const createRes = await request(app)
      .post('/api/v1/reminders')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ schemeId: 'central-post-matric-sc', daysBefore: 7 });

    reminderId = createRes.body.data?.id;

    const listRes = await request(app)
      .get('/api/v1/reminders')
      .set('Authorization', `Bearer ${userAToken}`);

    const delRes = await request(app)
      .delete(`/api/v1/reminders/${reminderId}`)
      .set('Authorization', `Bearer ${userAToken}`);

    const passed = createRes.status === 201 && 
                   listRes.body.data?.some((r: any) => r.id === reminderId) && 
                   delRes.status === 200;

    recordTest(
      13,
      'Reminder Creation/List/Delete',
      'POST/GET/DELETE /api/v1/reminders',
      { schemeId: 'central-post-matric-sc', daysBefore: 7 },
      'HTTP 201 on create, HTTP 200 on list & delete',
      `Create HTTP ${createRes.status}, Reminder ID=${reminderId}, Delete HTTP ${delRes.status}`,
      passed
    );
  } catch (err: any) {
    recordTest(13, 'Reminder Create/List/Delete', '/api/v1/reminders', 'daysBefore 7', 'HTTP 201 & 200', err.message, false);
  }

  // --- TEST 14: ReminderProcessor Execution ---
  try {
    // Insert a test reminder with triggerDate in past for User A
    await prisma.reminder.upsert({
      where: {
        userId_schemeId_daysBefore: {
          userId: userAId,
          schemeId: 'central-post-matric-sc',
          daysBefore: 30
        }
      },
      update: {
        triggerDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
        isSent: false
      },
      create: {
        userId: userAId,
        schemeId: 'central-post-matric-sc',
        daysBefore: 30,
        triggerDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        isSent: false
      }
    });

    const processRes = await request(app)
      .post('/api/v1/reminders/process')
      .set('Authorization', `Bearer ${userAToken}`);

    const updatedReminder = await prisma.reminder.findFirst({
      where: { userId: userAId, schemeId: 'central-post-matric-sc', daysBefore: 30 }
    });

    const passed = processRes.status === 200 && 
                   processRes.body.data?.summary?.processed >= 1 && 
                   updatedReminder?.isSent === true;

    recordTest(
      14,
      'ReminderProcessor Execution',
      'POST /api/v1/reminders/process',
      'Trigger pending reminder processor',
      'HTTP 200 with processed count > 0 and reminder updated to isSent=true',
      `HTTP ${processRes.status}, Processed=${processRes.body.data?.summary?.processed}, Sent=${processRes.body.data?.summary?.sent}, isSent in DB=${updatedReminder?.isSent}`,
      passed
    );
  } catch (err: any) {
    recordTest(14, 'ReminderProcessor Execution', '/api/v1/reminders/process', 'Process pending', 'HTTP 200', err.message, false);
  }

  // --- TEST 15: Term Explanation ---
  try {
    const termRes = await request(app)
      .post('/api/v1/explanations/term')
      .send({ term: 'Domicile Certificate', context: 'State Scholarship application requirement' });

    const passed = termRes.status === 200 && 
                   termRes.body.data?.term === 'Domicile Certificate' && 
                   typeof termRes.body.data?.explanation === 'string';

    recordTest(
      15,
      'Term Explanation',
      'POST /api/v1/explanations/term',
      { term: 'Domicile Certificate' },
      'HTTP 200 with structured administrative term explanation',
      `HTTP ${termRes.status}, term=${termRes.body.data?.term}, explanation length=${termRes.body.data?.explanation?.length}`,
      passed
    );
  } catch (err: any) {
    recordTest(15, 'Term Explanation', '/api/v1/explanations/term', 'Domicile Certificate', 'HTTP 200', err.message, false);
  }

  // --- TEST 16: Scheme Explanation ---
  try {
    const schemeExpRes = await request(app)
      .get('/api/v1/explanations/scheme/central-post-matric-sc');

    const passed = schemeExpRes.status === 200 && 
                   schemeExpRes.body.data?.schemeId === 'central-post-matric-sc' && 
                   typeof schemeExpRes.body.data?.summary === 'string';

    recordTest(
      16,
      'Scheme Summary / Explanation',
      'GET /api/v1/explanations/scheme/:id',
      'central-post-matric-sc',
      'HTTP 200 with formatted markdown scheme summary',
      `HTTP ${schemeExpRes.status}, SchemeName=${schemeExpRes.body.data?.schemeName}, summary length=${schemeExpRes.body.data?.summary?.length}`,
      passed
    );
  } catch (err: any) {
    recordTest(16, 'Scheme Explanation', '/api/v1/explanations/scheme/central-post-matric-sc', 'central-post-matric-sc', 'HTTP 200', err.message, false);
  }

  // --- TEST 17: PDF Report Generation ---
  try {
    const reportRes = await request(app)
      .post('/api/v1/reports/generate')
      .set('Authorization', `Bearer ${userAToken}`);

    const isPdf = reportRes.status === 200 && 
                  reportRes.headers['content-type'] === 'application/pdf' && 
                  reportRes.body.length > 0;

    recordTest(
      17,
      'PDF Report Generation',
      'POST /api/v1/reports/generate',
      'User A Auth Token',
      'HTTP 200 with Content-Type application/pdf and binary PDF buffer',
      `HTTP ${reportRes.status}, Content-Type=${reportRes.headers['content-type']}, PDF byte length=${reportRes.body?.length || 0}`,
      isPdf
    );
  } catch (err: any) {
    recordTest(17, 'PDF Report Generation', '/api/v1/reports/generate', 'User A Auth', 'HTTP 200 PDF buffer', err.message, false);
  }

  // --- TEST 18: Authentication & User Isolation ---
  try {
    // User A creates a bookmark and an application
    await request(app)
      .post('/api/v1/bookmarks')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ schemeId: 'central-post-matric-sc' });

    await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ schemeId: 'central-post-matric-sc', status: 'PLANNING_TO_APPLY' });

    // User B fetches bookmarks and applications
    const userBBookmarksRes = await request(app)
      .get('/api/v1/bookmarks')
      .set('Authorization', `Bearer ${userBToken}`);

    const userBAppsRes = await request(app)
      .get('/api/v1/applications')
      .set('Authorization', `Bearer ${userBToken}`);

    const userBChatRes = await request(app)
      .get('/api/v1/chat/sessions')
      .set('Authorization', `Bearer ${userBToken}`);

    const passed = userBBookmarksRes.status === 200 && userBBookmarksRes.body.data?.length === 0 &&
                   userBAppsRes.status === 200 && userBAppsRes.body.data?.length === 0 &&
                   userBChatRes.status === 200 && userBChatRes.body.data?.length === 0;

    recordTest(
      18,
      'Authentication & User Isolation',
      'GET /bookmarks, /applications, /chat/sessions for User B',
      'User B Token when User A has active items',
      'User B gets 0 bookmarks, 0 applications, 0 chat sessions (Strict Data Isolation)',
      `User B Bookmarks count=${userBBookmarksRes.body.data?.length}, Apps count=${userBAppsRes.body.data?.length}, Chat sessions count=${userBChatRes.body.data?.length}`,
      passed
    );
  } catch (err: any) {
    recordTest(18, 'Authentication & User Isolation', 'Cross-user queries', 'User B Querying User A data', '0 records returned', err.message, false);
  }

  // --- TEST 19: Chat Session Rename & Persistence ---
  try {
    const createRes = await request(app)
      .post('/api/v1/chat/sessions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ title: 'Initial Title' });

    const sessionId = createRes.body.data?.id;

    const renameRes = await request(app)
      .patch(`/api/v1/chat/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ title: '  Renamed Scholarship Discussion  ' });

    const getRes = await request(app)
      .get('/api/v1/chat/sessions')
      .set('Authorization', `Bearer ${userAToken}`);

    const dbSession = await prisma.chatSession.findUnique({ where: { id: sessionId } });

    const passed = renameRes.status === 200 &&
                   renameRes.body.data?.title === 'Renamed Scholarship Discussion' &&
                   getRes.body.data?.some((s: any) => s.id === sessionId && s.title === 'Renamed Scholarship Discussion') &&
                   dbSession?.title === 'Renamed Scholarship Discussion';

    recordTest(
      19,
      'Chat Session Rename',
      'PATCH /api/v1/chat/sessions/:sessionId',
      '{ title: "  Renamed Scholarship Discussion  " }',
      'HTTP 200, trimmed title updated in response, GET sessions, and direct DB read',
      `HTTP ${renameRes.status}, title="${renameRes.body.data?.title}", DB title="${dbSession?.title}"`,
      passed
    );
  } catch (err: any) {
    recordTest(19, 'Chat Session Rename', 'PATCH /api/v1/chat/sessions/:sessionId', 'Rename session', 'HTTP 200 with new title', err.message, false);
  }

  // --- TEST 20: Chat Session Delete & Message Cascade ---
  try {
    const createRes = await request(app)
      .post('/api/v1/chat/sessions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ title: 'Session To Delete' });

    const sessionId = createRes.body.data?.id;

    // Add a chat message
    await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'USER',
        content: 'Test message for cascade deletion'
      }
    });

    const deleteRes = await request(app)
      .delete(`/api/v1/chat/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${userAToken}`);

    const dbSession = await prisma.chatSession.findUnique({ where: { id: sessionId } });
    const msgCount = await prisma.chatMessage.count({ where: { sessionId } });

    const passed = deleteRes.status === 200 && dbSession === null && msgCount === 0;

    recordTest(
      20,
      'Chat Session Delete',
      'DELETE /api/v1/chat/sessions/:sessionId',
      `Session ID ${sessionId}`,
      'HTTP 200, session removed from DB, 0 messages remaining (Cascade delete)',
      `HTTP ${deleteRes.status}, DB session exists=${!!dbSession}, remaining msg count=${msgCount}`,
      passed
    );
  } catch (err: any) {
    recordTest(20, 'Chat Session Delete', 'DELETE /api/v1/chat/sessions/:sessionId', 'Delete session', 'HTTP 200 & cascade deletion', err.message, false);
  }

  // --- TEST 21: Cross-User Chat Protection ---
  try {
    const createRes = await request(app)
      .post('/api/v1/chat/sessions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ title: "User A's Protected Session" });

    const sessionId = createRes.body.data?.id;

    // User B attempts to rename User A's session
    const patchRes = await request(app)
      .patch(`/api/v1/chat/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ title: "Hacked Title" });

    // User B attempts to delete User A's session
    const deleteRes = await request(app)
      .delete(`/api/v1/chat/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${userBToken}`);

    const dbSession = await prisma.chatSession.findUnique({ where: { id: sessionId } });

    const passed = patchRes.status === 404 &&
                   deleteRes.status === 404 &&
                   dbSession?.title === "User A's Protected Session";

    recordTest(
      21,
      'Cross-User Chat Protection',
      'PATCH & DELETE /api/v1/chat/sessions/:sessionId',
      'User B attempting modifications on User A session',
      'HTTP 404 for both operations and User A session unchanged in DB',
      `PATCH HTTP ${patchRes.status}, DELETE HTTP ${deleteRes.status}, DB title="${dbSession?.title}"`,
      passed
    );
  } catch (err: any) {
    recordTest(21, 'Cross-User Chat Protection', 'PATCH/DELETE by non-owner', 'User B modifying User A chat', 'HTTP 404 forbidden', err.message, false);
  }

  // --- TEST 22: Profile Persistence & User Isolation ---
  try {
    const profileUpdateRes = await request(app)
      .put('/api/v1/profile')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'Rahul Sharma Updated',
        phone: '9876543210',
        state: 'Maharashtra',
        district: 'Pune'
      });

    const getProfileRes = await request(app)
      .get('/api/v1/profile')
      .set('Authorization', `Bearer ${userAToken}`);

    const passed = profileUpdateRes.status === 200 &&
                   getProfileRes.status === 200 &&
                   getProfileRes.body.data?.name === 'Rahul Sharma Updated' &&
                   getProfileRes.body.data?.profile?.phone === '9876543210' &&
                   getProfileRes.body.data?.profile?.state === 'Maharashtra';

    recordTest(
      22,
      'Profile Persistence',
      'PUT /api/v1/profile -> GET /api/v1/profile',
      '{ name: "Rahul Sharma Updated", phone: "9876543210", state: "Maharashtra" }',
      'HTTP 200, profile updated, GET /profile returns updated name and phone',
      `PUT status=${profileUpdateRes.status}, GET name="${getProfileRes.body.data?.name}", phone="${getProfileRes.body.data?.profile?.phone}"`,
      passed
    );
  } catch (err: any) {
    recordTest(22, 'Profile Persistence', 'PUT /api/v1/profile', 'Update profile', 'HTTP 200 with persistent data', err.message, false);
  }

  // --- TEST 23: Partial Profile Support & Eligibility Engine Safeguards ---
  try {
    // Create partial profile with missing income and dob
    const partialProfile: any = {
      id: 'partial-profile-1',
      userId: userAId,
      phone: null,
      state: 'Maharashtra',
      district: null,
      educationLevel: null,
      institution: null,
      course: null,
      yearOfStudy: null,
      academicPercentage: null,
      familyIncome: null, // missing income
      category: 'OBC',
      gender: null,
      dob: null, // missing dob
      disabilityStatus: false,
      disabilityPercentage: null,
      minorityStatus: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Income-dependent scheme
    const incomeScheme: any = {
      id: 'income-test-scheme',
      centralOrState: 'CENTRAL',
      verificationStatus: 'VERIFIED',
      eligibility: {
        rulesJson: JSON.stringify({
          operator: 'AND',
          conditions: [{ field: 'familyIncome', operator: 'LTE', value: 250000 }]
        })
      }
    };

    // State-mismatched scheme
    const stateMismatchScheme: any = {
      id: 'delhi-state-scheme',
      centralOrState: 'STATE',
      state: 'Delhi',
      verificationStatus: 'VERIFIED'
    };

    const evalNeedsVerif = evaluateSchemeEligibility(partialProfile, incomeScheme);
    const evalNotEligible = evaluateSchemeEligibility(partialProfile, stateMismatchScheme);

    const passed = evalNeedsVerif.eligibilityStatus === 'NEEDS_VERIFICATION' &&
                   evalNotEligible.eligibilityStatus === 'NOT_ELIGIBLE' &&
                   evalNotEligible.matchScore <= 49;

    recordTest(
      23,
      'Partial Profile Safeguards',
      'evaluateSchemeEligibility()',
      'Partial profile missing income and dob',
      'Missing required info produces NEEDS_VERIFICATION; hard state mismatch produces NOT_ELIGIBLE',
      `Income scheme status=${evalNeedsVerif.eligibilityStatus}, State mismatch status=${evalNotEligible.eligibilityStatus} (score=${evalNotEligible.matchScore})`,
      passed
    );
  } catch (err: any) {
    recordTest(23, 'Partial Profile Safeguards', 'EligibilityEngine', 'Partial profile', 'NEEDS_VERIFICATION & NOT_ELIGIBLE appropriately', err.message, false);
  }

  // --- TEST 24: PM YASASVI Category Restriction Regression Test ---
  try {
    const yasasviScheme = await prisma.scheme.findUnique({
      where: { id: 'central-post-matric-obc' },
      include: { eligibility: true }
    });

    if (!yasasviScheme || !yasasviScheme.eligibility) {
      throw new Error('central-post-matric-obc scheme or its eligibility not found in DB');
    }

    // Profile A: General Category student (The exact user bug report profile)
    const generalStudent: any = {
      state: 'Maharashtra',
      district: 'Thane',
      educationLevel: 'UG',
      familyIncome: 150000,
      category: 'General',
      dob: '2004-05-15',
      disabilityStatus: false,
      minorityStatus: false
    };

    const evalGeneral = evaluateSchemeEligibility(generalStudent, yasasviScheme as any);
    const generalCategoryRule = evalGeneral.rulesEvaluated.find(r => r.field === 'category');
    const generalPassed = evalGeneral.eligibilityStatus === 'NOT_ELIGIBLE' &&
                          evalGeneral.matchScore <= 49 &&
                          generalCategoryRule !== undefined &&
                          generalCategoryRule.passed === false;

    // Profile B: OBC Category student (Legitimate candidate)
    const obcStudent: any = {
      state: 'Maharashtra',
      district: 'Thane',
      educationLevel: 'UG',
      familyIncome: 150000,
      category: 'OBC',
      dob: '2004-05-15',
      disabilityStatus: false,
      minorityStatus: false
    };

    const evalObc = evaluateSchemeEligibility(obcStudent, yasasviScheme as any);
    const obcCategoryRule = evalObc.rulesEvaluated.find(r => r.field === 'category');
    const obcPassed = evalObc.eligibilityStatus === 'ELIGIBLE' &&
                      evalObc.matchScore === 100 &&
                      obcCategoryRule !== undefined &&
                      obcCategoryRule.passed === true;

    // Profile C: EWS Category student
    const ewsStudent: any = {
      ...generalStudent,
      category: 'EWS'
    };
    const evalEws = evaluateSchemeEligibility(ewsStudent, yasasviScheme as any);
    const ewsPassed = evalEws.eligibilityStatus === 'NOT_ELIGIBLE';

    const test24Passed = generalPassed && obcPassed && ewsPassed;
    recordTest(
      24,
      'PM YASASVI Category Restriction Regression',
      'evaluateSchemeEligibility(central-post-matric-obc)',
      'General & EWS vs OBC students',
      'General/EWS => NOT_ELIGIBLE (score <= 49, category passed: false); OBC => ELIGIBLE (100% match)',
      `General: status=${evalGeneral.eligibilityStatus}, score=${evalGeneral.matchScore}, catPassed=${generalCategoryRule?.passed}; OBC: status=${evalObc.eligibilityStatus}, score=${evalObc.matchScore}; EWS: status=${evalEws.eligibilityStatus}`,
      test24Passed
    );
  } catch (err: any) {
    recordTest(24, 'PM YASASVI Category Restriction Regression', 'evaluateSchemeEligibility', 'General/OBC', 'Category enforcement', err.message, false);
  }

  // --- TEST 25: Legitimate General-Inclusive Schemes Regression Test ---
  try {
    const generalStudent: any = {
      state: 'Maharashtra',
      district: 'Thane',
      educationLevel: 'UG',
      familyIncome: 150000,
      academicPercentage: 85,
      category: 'General',
      dob: '2004-05-15',
      disabilityStatus: false,
      minorityStatus: false
    };

    // Schemes open to General:
    // 1. Central Sector Scholarship (merit >= 80, income <= 450k, UG/PG)
    const centralSectorScheme = await prisma.scheme.findUnique({
      where: { id: 'central-sector-scholarship' },
      include: { eligibility: true }
    });
    // 2. Maharashtra Rajarshi Chhatrapati Shahu Maharaj EBC (income <= 800k, academic >= 50, UG, state Maharashtra)
    const maharashtraEbcScheme = await prisma.scheme.findUnique({
      where: { id: 'maharashtra-ebc' },
      include: { eligibility: true }
    });
    // 3. Central CSIS Interest Subsidy (income <= 450k, UG)
    const csisScheme = await prisma.scheme.findUnique({
      where: { id: 'central-csis-interest-subsidy' },
      include: { eligibility: true }
    });

    const evalCentralSector = centralSectorScheme ? evaluateSchemeEligibility(generalStudent, centralSectorScheme as any) : null;
    const evalMahaEbc = maharashtraEbcScheme ? evaluateSchemeEligibility(generalStudent, maharashtraEbcScheme as any) : null;
    const evalCsis = csisScheme ? evaluateSchemeEligibility(generalStudent, csisScheme as any) : null;

    const test25Passed = evalCentralSector?.eligibilityStatus === 'ELIGIBLE' &&
                         evalMahaEbc?.eligibilityStatus === 'ELIGIBLE' &&
                         evalCsis?.eligibilityStatus === 'ELIGIBLE';

    recordTest(
      25,
      'Legitimate General-Inclusive Schemes',
      'evaluateSchemeEligibility()',
      'General student with valid merit, income, state for general-inclusive schemes',
      'General student correctly marked ELIGIBLE for central-sector, maharashtra-ebc, and csis',
      `CentralSector=${evalCentralSector?.eligibilityStatus}, MahaEBC=${evalMahaEbc?.eligibilityStatus}, CSIS=${evalCsis?.eligibilityStatus}`,
      test25Passed
    );
  } catch (err: any) {
    recordTest(25, 'Legitimate General-Inclusive Schemes', 'evaluateSchemeEligibility', 'General student', 'All 3 schemes ELIGIBLE', err.message, false);
  }

  // --- TEST 26: Income Boundary Verification ---
  try {
    const yasasviScheme = await prisma.scheme.findUnique({
      where: { id: 'central-post-matric-obc' },
      include: { eligibility: true }
    });

    if (!yasasviScheme) throw new Error('Scheme not found');

    // Exactly at boundary: 250,000 (<= 250000 should pass)
    const obcBoundaryPass: any = {
      state: 'Maharashtra',
      educationLevel: 'UG',
      category: 'OBC',
      familyIncome: 250000,
      dob: '2004-05-15'
    };
    const evalPass = evaluateSchemeEligibility(obcBoundaryPass, yasasviScheme as any);

    // Just above boundary: 250,001 (<= 250000 should fail)
    const obcBoundaryFail: any = {
      state: 'Maharashtra',
      educationLevel: 'UG',
      category: 'OBC',
      familyIncome: 250001,
      dob: '2004-05-15'
    };
    const evalFail = evaluateSchemeEligibility(obcBoundaryFail, yasasviScheme as any);

    const test26Passed = evalPass.eligibilityStatus === 'ELIGIBLE' &&
                         evalFail.eligibilityStatus === 'NOT_ELIGIBLE' &&
                         evalFail.matchScore <= 49;

    recordTest(
      26,
      'Income Boundary Verification',
      'evaluateSchemeEligibility(central-post-matric-obc)',
      'Income 250000 vs 250001',
      '250,000 => ELIGIBLE; 250,001 => NOT_ELIGIBLE',
      `At 250k: ${evalPass.eligibilityStatus} (score=${evalPass.matchScore}); At 250,001: ${evalFail.eligibilityStatus} (score=${evalFail.matchScore})`,
      test26Passed
    );
  } catch (err: any) {
    recordTest(26, 'Income Boundary Verification', 'evaluateSchemeEligibility', 'Income boundary', 'Pass at 250k, fail at 250001', err.message, false);
  }

  // --- TEST 27: Missing Profile Information Safeguards ---
  try {
    const yasasviScheme = await prisma.scheme.findUnique({
      where: { id: 'central-post-matric-obc' },
      include: { eligibility: true }
    });
    if (!yasasviScheme) throw new Error('Scheme not found');

    // Case 1: Category unselected (empty string or null) in partial profile -> NEEDS_VERIFICATION (not ELIGIBLE)
    const profileMissingCategory: any = {
      state: 'Maharashtra',
      educationLevel: 'UG',
      familyIncome: 150000,
      category: '',
      dob: '2004-05-15'
    };
    const evalMissingCat = evaluateSchemeEligibility(profileMissingCategory, yasasviScheme as any);
    const catResult = evalMissingCat.rulesEvaluated.find(r => r.field === 'category');

    const case1Ok = evalMissingCat.eligibilityStatus === 'NEEDS_VERIFICATION' &&
                    (catResult as any)?.isMissingInfo === true &&
                    catResult?.passed === false;

    // Case 2: Hard failure on income (500k > 250k) AND missing educationLevel -> NOT_ELIGIBLE (hard failure takes precedence)
    const profileHardFailAndMissing: any = {
      state: 'Maharashtra',
      educationLevel: null,
      familyIncome: 500000,
      category: 'OBC',
      dob: '2004-05-15'
    };
    const evalHardAndMissing = evaluateSchemeEligibility(profileHardFailAndMissing, yasasviScheme as any);
    const case2Ok = evalHardAndMissing.eligibilityStatus === 'NOT_ELIGIBLE';

    const test27Passed = case1Ok && case2Ok;
    recordTest(
      27,
      'Missing Profile Info & Mandatory Safeguards',
      'evaluateSchemeEligibility(central-post-matric-obc)',
      'Missing category & mixed hard failure/missing info',
      'Missing category => NEEDS_VERIFICATION; Hard income failure with missing education => NOT_ELIGIBLE',
      `Missing category: status=${evalMissingCat.eligibilityStatus}, isMissing=${(catResult as any)?.isMissingInfo}; Hard fail+missing: status=${evalHardAndMissing.eligibilityStatus}`,
      test27Passed
    );
  } catch (err: any) {
    recordTest(27, 'Missing Profile Info & Mandatory Safeguards', 'EligibilityEngine', 'Missing info', 'Correct status assignment', err.message, false);
  }

  // --- FINAL SUMMARY REPORT ---
  console.log('\n====================================================');
  console.log('FINAL TEST RESULTS SUMMARY');
  console.log('====================================================');
  const passedCount = testResults.filter(r => r.status === 'PASS').length;
  const failedCount = testResults.filter(r => r.status === 'FAIL').length;

  console.table(testResults.map(r => ({
    '#': r.id,
    Name: r.name,
    Endpoint: r.endpoint,
    Result: r.status
  })));

  console.log(`\nTOTAL: ${testResults.length} | PASSED: ${passedCount} | FAILED: ${failedCount}\n`);

  if (failedCount > 0) {
    console.error('TEST SUITE FAILED! Some tests did not pass.');
    process.exit(1);
  } else {
    console.log('ALL INTEGRATION TESTS PASSED SUCCESSFULLY! BACKEND VERIFIED.');
    process.exit(0);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal error running integration test suite:', err);
  process.exit(1);
});

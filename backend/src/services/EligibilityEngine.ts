import { 
  StudentProfile, 
  Scheme, 
  EligibilityEvaluationResult, 
  RuleGroup, 
  RuleCondition, 
  RuleEvaluationResult, 
  EligibilityStatus 
} from '../../../shared/types';

export interface ExtendedRuleEvaluationResult extends RuleEvaluationResult {
  isMissingInfo?: boolean;
}

/**
 * Calculates age from DOB date string or object
 */
export function calculateAge(dobInput: string | Date): number {
  const dob = new Date(dobInput);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/**
 * Evaluates a single rule condition against the student's profile
 */
export function evaluateCondition(profile: StudentProfile, condition: RuleCondition): ExtendedRuleEvaluationResult {
  const { field, operator, value } = condition;
  
  // Resolve profile value
  let profileValue: any = (profile as any)[field];
  let isMissingInfo = false;

  if (field === 'age') {
    if (!profile.dob) {
      isMissingInfo = true;
      profileValue = undefined;
    } else {
      profileValue = calculateAge(profile.dob);
    }
  } else if (profileValue === null || profileValue === undefined) {
    isMissingInfo = true;
  }

  if (isMissingInfo) {
    return {
      field,
      passed: false,
      isMissingInfo: true,
      message: `${field} is required to evaluate eligibility (currently missing in profile).`
    };
  }

  let passed = false;
  let message = '';

  const formatVal = (v: any) => typeof v === 'number' ? v.toLocaleString() : JSON.stringify(v);

  switch (operator) {
    case 'EQ':
      if (typeof profileValue === 'string' && typeof value === 'string') {
        passed = profileValue.trim().toLowerCase() === value.trim().toLowerCase();
      } else {
        passed = profileValue === value;
      }
      message = `${field} should be equal to ${formatVal(value)} (got ${formatVal(profileValue)})`;
      break;
    case 'NEQ':
      if (typeof profileValue === 'string' && typeof value === 'string') {
        passed = profileValue.trim().toLowerCase() !== value.trim().toLowerCase();
      } else {
        passed = profileValue !== value;
      }
      message = `${field} should not be equal to ${formatVal(value)} (got ${formatVal(profileValue)})`;
      break;
    case 'GT':
      passed = typeof profileValue === 'number' && profileValue > value;
      message = `${field} should be greater than ${formatVal(value)} (got ${formatVal(profileValue)})`;
      break;
    case 'GTE':
      passed = typeof profileValue === 'number' && profileValue >= value;
      message = `${field} should be at least ${formatVal(value)} (got ${formatVal(profileValue)})`;
      break;
    case 'LT':
      passed = typeof profileValue === 'number' && profileValue < value;
      message = `${field} should be less than ${formatVal(value)} (got ${formatVal(profileValue)})`;
      break;
    case 'LTE':
      passed = typeof profileValue === 'number' && profileValue <= value;
      message = `${field} should be at most ${formatVal(value)} (got ${formatVal(profileValue)})`;
      break;
    case 'IN':
      passed = Array.isArray(value) && value.map(v => String(v).toLowerCase()).includes(String(profileValue).toLowerCase());
      message = `${field} should be one of [${value.join(', ')}] (got ${formatVal(profileValue)})`;
      break;
    case 'NIN':
      passed = Array.isArray(value) && !value.map(v => String(v).toLowerCase()).includes(String(profileValue).toLowerCase());
      message = `${field} should not be one of [${value.join(', ')}] (got ${formatVal(profileValue)})`;
      break;
    default:
      passed = false;
      message = `Invalid condition operator: ${operator}`;
  }

  return { field, passed, isMissingInfo: false, message };
}

/**
 * Evaluates a rule group recursively
 */
export function evaluateGroup(
  profile: StudentProfile, 
  group: RuleGroup
): { passed: boolean; evaluations: ExtendedRuleEvaluationResult[]; isHardFailure: boolean } {
  const operator = group.operator || 'AND';
  const conditions = group.conditions || [];
  const groups = group.groups || [];

  const evaluations: ExtendedRuleEvaluationResult[] = [];

  // Evaluate flat conditions
  const condResults: { passed: boolean; isHardFailure: boolean; isMissingInfo: boolean }[] = [];
  for (const cond of conditions) {
    const evalRes = evaluateCondition(profile, cond);
    evaluations.push(evalRes);
    condResults.push({
      passed: evalRes.passed,
      isHardFailure: !evalRes.passed && !evalRes.isMissingInfo,
      isMissingInfo: !!evalRes.isMissingInfo
    });
  }

  // Evaluate nested groups
  const childGroupResults: { passed: boolean; isHardFailure: boolean }[] = [];
  for (const childGroup of groups) {
    const res = evaluateGroup(profile, childGroup);
    evaluations.push(...res.evaluations);
    childGroupResults.push({
      passed: res.passed,
      isHardFailure: res.isHardFailure
    });
  }

  const flatPassed = condResults.map(c => c.passed);
  const groupsPassed = childGroupResults.map(g => g.passed);

  let groupPassed = false;
  let isHardFailure = false;

  if (operator === 'AND') {
    const flatAllPassed = flatPassed.every(p => p);
    const groupsAllPassed = groupsPassed.every(g => g);
    groupPassed = flatAllPassed && groupsAllPassed;

    // In AND: if any condition or child group is a hard failure, the whole AND branch is a hard failure
    const hasAnyHardFailure = condResults.some(c => c.isHardFailure) || childGroupResults.some(g => g.isHardFailure);
    isHardFailure = hasAnyHardFailure;
  } else { // OR
    const flatAnyPassed = flatPassed.some(p => p);
    const groupsAnyPassed = groupsPassed.some(g => g);
    groupPassed = flatAnyPassed || groupsAnyPassed || (conditions.length === 0 && groups.length === 0);

    if (groupPassed) {
      isHardFailure = false;
    } else {
      // In OR: it is only a hard failure if all branches hard failed (no branch had missing info)
      const allCondsHardFailed = condResults.length === 0 || condResults.every(c => c.isHardFailure);
      const allGroupsHardFailed = childGroupResults.length === 0 || childGroupResults.every(g => g.isHardFailure);
      isHardFailure = allCondsHardFailed && allGroupsHardFailed;
    }
  }

  return { passed: groupPassed, evaluations, isHardFailure };
}

/**
 * Evaluate Scheme Eligibility against Student Profile
 */
export function evaluateSchemeEligibility(profile: StudentProfile, scheme: Scheme & { eligibility?: any }): EligibilityEvaluationResult {
  const evaluations: ExtendedRuleEvaluationResult[] = [];
  let isStateMatched = true;
  let isStateMissing = false;
  let isDeadlineMatched = true;

  // 1. Hard State Check (if state-specific scheme)
  if (scheme.centralOrState === 'STATE' && scheme.state) {
    if (!profile.state) {
      isStateMatched = false;
      isStateMissing = true;
      evaluations.push({
        field: 'state',
        passed: false,
        isMissingInfo: true,
        message: `Scheme is state-specific to ${scheme.state}. Student state is missing in profile.`
      });
    } else {
      isStateMatched = profile.state.toLowerCase() === scheme.state.toLowerCase();
      evaluations.push({
        field: 'state',
        passed: isStateMatched,
        isMissingInfo: false,
        message: `Scheme is state-specific to ${scheme.state}. Student state is ${profile.state}.`
      });
    }
  }

  // 2. Hard Deadline Check (if FIXED and deadline is passed)
  if (scheme.deadline && scheme.deadlineType === 'FIXED') {
    const deadlineDate = new Date(scheme.deadline);
    isDeadlineMatched = new Date() <= deadlineDate;
    evaluations.push({
      field: 'deadline',
      passed: isDeadlineMatched,
      isMissingInfo: false,
      message: `Scheme application deadline was ${deadlineDate.toLocaleDateString()}. Status is ${isDeadlineMatched ? 'Open' : 'Closed'}.`
    });
  }

  // 3. Evaluate Rule JSON Tree
  let ruleTreePassed = true;
  let ruleTreeHardFailure = false;
  let ruleTreeEvaluations: ExtendedRuleEvaluationResult[] = [];
  
  if (scheme.eligibility && scheme.eligibility.rulesJson) {
    try {
      const group: RuleGroup = JSON.parse(scheme.eligibility.rulesJson);
      const res = evaluateGroup(profile, group);
      ruleTreePassed = res.passed;
      ruleTreeHardFailure = res.isHardFailure;
      ruleTreeEvaluations = res.evaluations;
      evaluations.push(...ruleTreeEvaluations);
    } catch (e) {
      ruleTreePassed = false;
      ruleTreeHardFailure = true;
      evaluations.push({
        field: 'rulesJson',
        passed: false,
        isMissingInfo: false,
        message: 'Could not parse eligibility conditions JSON.'
      });
    }
  }

  // Compute Match Score (Percentage of positive evaluations in the rule tree)
  const totalConditions = ruleTreeEvaluations.length;
  const passedConditions = ruleTreeEvaluations.filter(e => e.passed).length;
  let rawMatchScore = totalConditions > 0 ? Math.round((passedConditions / totalConditions) * 100) : 100;
  if (ruleTreePassed && rawMatchScore < 100) {
    rawMatchScore = Math.max(rawMatchScore, 75);
  }

  // Deduce final eligibility status
  let eligibilityStatus: EligibilityStatus = 'ELIGIBLE';

  const hasExplicitStateFailure = !isStateMatched && !isStateMissing;
  const hasExplicitDeadlineFailure = !isDeadlineMatched;
  const hasExplicitRuleFailure = ruleTreeHardFailure;
  const hasMissingInfo = evaluations.some(e => e.isMissingInfo);

  const hasHardFailures = hasExplicitStateFailure || hasExplicitDeadlineFailure || hasExplicitRuleFailure;

  if (hasHardFailures) {
    eligibilityStatus = 'NOT_ELIGIBLE';
  } else if (!ruleTreePassed || hasMissingInfo) {
    eligibilityStatus = 'NEEDS_VERIFICATION';
  } else {
    if (scheme.verificationStatus === 'STALE' || scheme.verificationStatus === 'UNVERIFIED') {
      eligibilityStatus = 'NEEDS_VERIFICATION';
    } else {
      eligibilityStatus = 'ELIGIBLE';
    }
  }

  // Enforce lower matchScore if there's a hard failure
  const matchScore = eligibilityStatus === 'NOT_ELIGIBLE' ? Math.min(rawMatchScore, 49) : rawMatchScore;

  return {
    schemeId: scheme.id,
    matchScore,
    eligibilityStatus,
    rulesEvaluated: evaluations
  };
}

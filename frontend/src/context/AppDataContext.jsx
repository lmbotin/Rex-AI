/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from 'react';
import { loadAppData, saveAppData, createId } from '../lib/storage';
import { postCallRequest } from '../lib/api';

const AppDataContext = createContext(null);

function parseCurrency(value, fallback = 0) {
  if (typeof value === 'number') return value;
  const parsed = Number(String(value || '').replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildPolicyRecord(userId, answers) {
  const monthlyBudget = parseCurrency(answers.monthlyBudget, 120);
  const coverageLimit = parseCurrency(answers.coverageLimit, 50000);
  const deductible = parseCurrency(answers.deductible, 1000);

  return {
    id: createId('policy'),
    userId,
    status: 'Active',
    policyNumber: `REX-${Math.floor(10000 + Math.random() * 90000)}`,
    useCase: answers.useCase || 'General Protection',
    coverageType: answers.coverageType || 'Comprehensive',
    protectedAsset: answers.protectedAsset || 'Primary insured asset',
    operationState: answers.operationState || 'N/A',
    coverageLimit,
    deductible,
    monthlyPremium: monthlyBudget,
    effectiveDate: answers.startDate || new Date().toISOString().slice(0, 10),
    notes: answers.additionalNotes || '',
    proofOfInsuranceId: createId('proof').slice(-12).toUpperCase(),
    createdAt: new Date().toISOString(),
    answers,
  };
}

function buildClaimRecord(userId, answers) {
  const damageEstimate = parseCurrency(answers.damageEstimate, 1500);
  const estimatedPayout = Math.max(0, Math.round(damageEstimate * 0.85));
  const createdAt = new Date().toISOString();
  const incidentDate = answers.incidentDate || new Date().toISOString().slice(0, 10);
  const evidenceFiles = Array.isArray(answers.evidenceFiles)
    ? answers.evidenceFiles.filter(Boolean)
    : [];

  return {
    id: createId('claim'),
    userId,
    status: 'In review',
    claimNumber: `CLM-${Math.floor(10000 + Math.random() * 90000)}`,
    policyId: answers.policyId || '',
    workflowName: answers.workflowName || '',
    incidentType: answers.incidentType || 'General incident',
    severity: answers.severity || 'Medium',
    incidentDate,
    incidentTime: answers.incidentTime || '',
    incidentLocation: answers.incidentLocation || 'Not specified',
    summary: answers.description || '',
    impactDetails: answers.impactDetails || '',
    damageEstimate,
    estimatedPayout,
    approvedPayout: 0,
    evidenceFiles,
    createdAt,
    updatedAt: createdAt,
    answers,
  };
}

function deriveMetrics(userClaims) {
  const openStatuses = new Set(['Open', 'In review', 'In Review', 'Needs info', 'Approved']);
  const closedStatuses = new Set(['Closed', 'Paid']);

  const openClaimsExposure = userClaims
    .filter((claim) => openStatuses.has(claim.status))
    .reduce((total, claim) => total + (claim.estimatedPayout || 0), 0);

  const closedClaimsRecovered = userClaims
    .filter((claim) => closedStatuses.has(claim.status))
    .reduce((total, claim) => total + (claim.approvedPayout || 0), 0);

  return {
    workflowAccuracy: 99,
    openClaimsExposure,
    closedClaimsRecovered,
  };
}

export function AppDataProvider({ children }) {
  const [data, setData] = useState(() => loadAppData());

  const setAndPersist = (updater) => {
    setData((previous) => {
      const next = typeof updater === 'function' ? updater(previous) : updater;
      saveAppData(next);
      return next;
    });
  };

  const currentUser = useMemo(
    () => data.users.find((user) => user.id === data.session.currentUserId) || null,
    [data.users, data.session.currentUserId]
  );

  const userPolicies = useMemo(() => {
    if (!currentUser) return [];
    return data.policies.filter((policy) => policy.userId === currentUser.id);
  }, [data.policies, currentUser]);

  const userClaims = useMemo(() => {
    if (!currentUser) return [];
    return data.claims.filter((claim) => claim.userId === currentUser.id);
  }, [data.claims, currentUser]);

  const metrics = useMemo(() => deriveMetrics(userClaims), [userClaims]);

  const signUp = ({ fullName, email, password }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const alreadyExists = data.users.some((user) => user.email === normalizedEmail);
    if (alreadyExists) {
      throw new Error('An account with that email already exists.');
    }

    const newUser = {
      id: createId('user'),
      fullName: fullName.trim(),
      email: normalizedEmail,
      password,
      createdAt: new Date().toISOString(),
    };

    setAndPersist((previous) => ({
      ...previous,
      users: [...previous.users, newUser],
      session: { currentUserId: newUser.id },
    }));

    return newUser;
  };

  const login = ({ email, password }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const user = data.users.find((item) => item.email === normalizedEmail);
    if (!user || user.password !== password) {
      throw new Error('Invalid credentials.');
    }

    setAndPersist((previous) => ({
      ...previous,
      session: { currentUserId: user.id },
    }));

    return user;
  };

  const logout = () => {
    setAndPersist((previous) => ({
      ...previous,
      session: { currentUserId: null },
    }));
  };

  const createPolicy = (answers) => {
    if (!currentUser) throw new Error('Please sign in to create a policy.');
    const newPolicy = buildPolicyRecord(currentUser.id, answers);
    setAndPersist((previous) => ({
      ...previous,
      policies: [newPolicy, ...previous.policies],
    }));
    return newPolicy;
  };

  const createClaim = (answers) => {
    if (!currentUser) throw new Error('Please sign in to file a claim.');
    const newClaim = buildClaimRecord(currentUser.id, answers);
    setAndPersist((previous) => ({
      ...previous,
      claims: [newClaim, ...previous.claims],
    }));
    return newClaim;
  };

  const closeClaim = (claimId, approvedPayout) => {
    if (!currentUser) return;
    setAndPersist((previous) => ({
      ...previous,
      claims: previous.claims.map((claim) => {
        if (claim.id !== claimId) return claim;
        return {
          ...claim,
          status: 'Closed',
          approvedPayout: parseCurrency(approvedPayout, claim.estimatedPayout),
          updatedAt: new Date().toISOString(),
          closedAt: new Date().toISOString(),
        };
      }),
    }));
  };

  const updateClaimStatus = (claimId, status, approvedPayout) => {
    if (!currentUser) return;
    setAndPersist((previous) => ({
      ...previous,
      claims: previous.claims.map((claim) => {
        if (claim.id !== claimId) return claim;

        const next = { ...claim, status, updatedAt: new Date().toISOString() };
        if (status === 'Approved' || status === 'Paid' || status === 'Closed') {
          next.approvedPayout = parseCurrency(approvedPayout, claim.estimatedPayout);
        }
        if (status === 'Closed' || status === 'Paid') {
          next.closedAt = new Date().toISOString();
        }
        return next;
      }),
    }));
  };

  const createCallRequest = async ({ phone, topic }) => {
    if (!currentUser) throw new Error('Please sign in before requesting a call.');

    const localRequest = {
      id: createId('call'),
      userId: currentUser.id,
      phone,
      topic,
      status: 'Queued',
      endpoint: '/api/rexy/calls',
      createdAt: new Date().toISOString(),
      source: 'local',
    };

    setAndPersist((previous) => ({
      ...previous,
      callRequests: [localRequest, ...previous.callRequests],
    }));

    try {
      const response = await postCallRequest({
        userId: currentUser.id,
        phone,
        topic,
      });

      setAndPersist((previous) => ({
        ...previous,
        callRequests: previous.callRequests.map((item) =>
          item.id === localRequest.id
            ? {
                ...item,
                status: 'Submitted',
                source: 'remote',
                remoteRequestId: response?.requestId || null,
              }
            : item
        ),
      }));

      return {
        ...localRequest,
        status: 'Submitted',
        source: 'remote',
        remoteRequestId: response?.requestId || null,
      };
    } catch {
      return localRequest;
    }
  };

  const value = {
    currentUser,
    userPolicies,
    userClaims,
    metrics,
    signUp,
    login,
    logout,
    createPolicy,
    createClaim,
    closeClaim,
    updateClaimStatus,
    createCallRequest,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within AppDataProvider.');
  }
  return context;
}

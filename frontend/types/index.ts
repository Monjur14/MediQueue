// ── User / Auth ─────────────────────────────────────────────────────
export type UserRole = 'patient' | 'doctor' | 'tenant_admin' | 'super_admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string | null;
  phone?: string;
  /** Patient alert channel, when /auth/me includes it. */
  preferred_channel?: 'whatsapp' | 'sms' | 'both';
  createdAt: string;
  // Tenant admin extras (from /auth/me)
  plan_name?: PlanName;
  clinic_name?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// ── Tenant / Subscription ───────────────────────────────────────────
export type PlanName = 'solo' | 'clinic' | 'hospital';
export type SubscriptionStatus =
  | 'trial'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'expired';

export interface SubscriptionPlan {
  id: string;
  name: PlanName;
  displayName: string;
  maxDoctors: number | null;
  maxDepartments: number | null;
  maxDailyPatients: number | null;
  monthlyPrice: number;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  address?: string;
  createdAt: string;
}

// ── Queue / Token ───────────────────────────────────────────────────
export type TokenStatus =
  | 'waiting'
  | 'called'
  | 'checked_in'
  | 'completed'
  | 'skipped'
  | 'no_show';

export interface QueueToken {
  id: string;
  tokenNumber: number;
  status: TokenStatus;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  sessionId: string;
  doctorId?: string;
  departmentId?: string;
  feePaid: boolean;
  notes?: string;
  notesVersion?: number;
  estimatedWaitMinutes?: number;
  calledAt?: string;
  checkedInAt?: string;
  completedAt?: string;
  createdAt: string;
}

export type SessionStatus = 'open' | 'closed' | 'break';

export interface QueueSession {
  id: string;
  date: string;
  status: SessionStatus;
  doctorId: string;
  doctorName: string;
  departmentId?: string;
  departmentName?: string;
  tenantId: string;
  currentTokenNumber?: number;
  totalTokens: number;
  waitingCount: number;
  createdAt: string;
}

export interface Break {
  id: string;
  sessionId: string;
  startedAt: string;
  endedAt?: string;
  reason?: string;
}

// ── Doctor ──────────────────────────────────────────────────────────
export interface Doctor {
  id: string;
  userId: string;
  name: string;
  email: string;
  specialization?: string;
  tenantId: string;
  departmentId?: string;
  avgConsultationMinutes?: number;
  createdAt: string;
}

// ── Department ──────────────────────────────────────────────────────
export interface Department {
  id: string;
  name: string;
  tenantId: string;
  description?: string;
  createdAt: string;
}

// ── Patient / My token ──────────────────────────────────────────────
export interface MyTokenInfo {
  token: QueueToken;
  position: number;           // current position in queue
  estimatedWaitMinutes: number;
  totalAhead: number;
}

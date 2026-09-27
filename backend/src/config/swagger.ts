import swaggerUi from 'swagger-ui-express';
import type { Express } from 'express';

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'MediQueue API',
    version: '1.0.0',
    description:
      'Smart Hospital Queue & Appointment Management System — multi-tenant SaaS for Bangladesh clinics.',
    contact: { name: 'MediQueue', email: 'support@mediqueue.app' },
  },
  servers: [
    { url: 'http://localhost:5001', description: 'Local dev' },
    { url: 'https://api.mediqueue.app', description: 'Production' },
  ],

  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token obtained from POST /api/auth/login',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { message: { type: 'string', example: 'Unauthorized' } },
      },
      RegisterInput: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name:     { type: 'string', example: 'Dr. Rahim' },
          email:    { type: 'string', format: 'email', example: 'rahim@clinic.bd' },
          password: { type: 'string', minLength: 8, example: 'S3cur3Pass!' },
        },
      },
      RegisterTenantInput: {
        type: 'object',
        required: ['name', 'email', 'password', 'tenantName', 'subdomain'],
        properties: {
          name:       { type: 'string', example: 'Admin User' },
          email:      { type: 'string', format: 'email', example: 'admin@clinic.bd' },
          password:   { type: 'string', minLength: 8, example: 'S3cur3Pass!' },
          tenantName: { type: 'string', example: 'City Clinic' },
          subdomain:  { type: 'string', pattern: '^[a-z0-9-]+$', example: 'city-clinic' },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email:    { type: 'string', format: 'email', example: 'admin@clinic.bd' },
          password: { type: 'string', example: 'S3cur3Pass!' },
        },
      },
      AuthTokens: {
        type: 'object',
        properties: {
          accessToken:  { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
          refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
          user: {
            type: 'object',
            properties: {
              id:    { type: 'string', format: 'uuid' },
              name:  { type: 'string' },
              email: { type: 'string', format: 'email' },
              role:  { type: 'string', enum: ['super_admin', 'tenant_admin', 'doctor', 'patient'] },
            },
          },
        },
      },
      UserProfile: {
        type: 'object',
        properties: {
          id:       { type: 'string', format: 'uuid' },
          name:     { type: 'string' },
          email:    { type: 'string', format: 'email' },
          role:     { type: 'string', enum: ['super_admin', 'tenant_admin', 'doctor', 'patient'] },
          tenantId: { type: 'string', format: 'uuid', nullable: true },
        },
      },
      Tenant: {
        type: 'object',
        properties: {
          id:        { type: 'string', format: 'uuid' },
          name:      { type: 'string', example: 'City Clinic' },
          subdomain: { type: 'string', example: 'city-clinic' },
          plan:      { type: 'string', example: 'pro' },
        },
      },
      Doctor: {
        type: 'object',
        properties: {
          id:             { type: 'string', format: 'uuid' },
          name:           { type: 'string' },
          email:          { type: 'string', format: 'email' },
          specialization: { type: 'string', nullable: true },
          departmentId:   { type: 'string', format: 'uuid', nullable: true },
        },
      },
      Department: {
        type: 'object',
        properties: {
          id:   { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Cardiology' },
        },
      },
      QueueSession: {
        type: 'object',
        properties: {
          id:           { type: 'string', format: 'uuid' },
          doctorId:     { type: 'string', format: 'uuid' },
          date:         { type: 'string', format: 'date', example: '2026-09-28' },
          status:       { type: 'string', enum: ['open', 'closed'] },
          currentToken: { type: 'integer', example: 3, nullable: true },
          totalTokens:  { type: 'integer', example: 15 },
        },
      },
      QueueToken: {
        type: 'object',
        properties: {
          id:          { type: 'string', format: 'uuid' },
          sessionId:   { type: 'string', format: 'uuid' },
          patientId:   { type: 'string', format: 'uuid' },
          tokenNumber: { type: 'integer', example: 7 },
          status: {
            type: 'string',
            enum: ['waiting', 'called', 'serving', 'completed', 'skipped', 'cancelled', 'removed'],
          },
          feePaid:   { type: 'boolean', example: false },
          notes:     { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      GiveTokenInput: {
        type: 'object',
        required: ['sessionId', 'patientId'],
        properties: {
          sessionId: { type: 'string', format: 'uuid' },
          patientId: { type: 'string', format: 'uuid' },
        },
      },
      Plan: {
        type: 'object',
        properties: {
          id:       { type: 'string', example: 'plan_basic' },
          name:     { type: 'string', example: 'Basic' },
          price:    { type: 'number', example: 999 },
          currency: { type: 'string', example: 'BDT' },
          features: { type: 'object', additionalProperties: true },
        },
      },
      Subscription: {
        type: 'object',
        properties: {
          id:        { type: 'string', format: 'uuid' },
          planId:    { type: 'string', example: 'plan_pro' },
          status:    { type: 'string', enum: ['active', 'cancelled', 'expired', 'trial'] },
          expiresAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },

  tags: [
    { name: 'Health',        description: 'Liveness & readiness probes' },
    { name: 'Auth',          description: 'Registration, login, token refresh' },
    { name: 'Tenants',       description: 'Clinic (tenant) profile & doctor management — tenant_admin only' },
    { name: 'Departments',   description: 'Department CRUD and doctor assignments' },
    { name: 'Clinics',       description: 'Public clinic & doctor discovery' },
    { name: 'Queue',         description: 'Session & token management' },
    { name: 'Doctors',       description: 'Doctor self-service' },
    { name: 'Patients',      description: 'Patient self-service' },
    { name: 'Analytics',     description: 'Tenant dashboard stats' },
    { name: 'Billing',       description: 'Plans, subscriptions, Stripe checkout' },
    { name: 'Push',          description: 'Web-push notification subscriptions' },
    { name: 'Tracking',      description: 'Anonymous event tracking' },
    { name: 'Support',       description: 'Support messages & contact inquiries' },
    { name: 'Super Admin',   description: 'Platform-wide overview — super_admin only' },
  ],

  paths: {

    // ══════════════════════════════════════════════════════════════════
    // HEALTH
    // ══════════════════════════════════════════════════════════════════
    '/health/live': {
      get: {
        tags: ['Health'],
        summary: 'Liveness probe',
        description: 'Returns 200 as long as the Node process is running. No external checks.',
        responses: {
          200: {
            description: 'Process alive',
            content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } } } },
          },
        },
      },
    },
    '/health/ready': {
      get: {
        tags: ['Health'],
        summary: 'Readiness probe',
        description: 'Checks PostgreSQL, Redis, and BullMQ. Returns 503 if any dependency is degraded.',
        responses: {
          200: {
            description: 'All systems ready',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ready' },
                    checks: {
                      type: 'object',
                      properties: {
                        postgres: { type: 'string', enum: ['ok', 'error'] },
                        redis:    { type: 'string', enum: ['ok', 'error'] },
                        bullmq:   { type: 'string', enum: ['ok', 'error'] },
                      },
                    },
                  },
                },
              },
            },
          },
          503: { description: 'One or more dependencies degraded' },
        },
      },
    },

    // ══════════════════════════════════════════════════════════════════
    // AUTH
    // ══════════════════════════════════════════════════════════════════
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a patient account',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterInput' } } } },
        responses: {
          201: { description: 'Account created', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthTokens' } } } },
          400: { description: 'Validation error' },
          409: { description: 'Email already registered' },
        },
      },
    },
    '/api/auth/register/tenant': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new clinic (tenant) with admin account',
        description: 'Creates the tenant record, subdomain, and the first `tenant_admin` user in one step.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterTenantInput' } } } },
        responses: {
          201: { description: 'Tenant + admin created', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthTokens' } } } },
          400: { description: 'Validation error' },
          409: { description: 'Subdomain or email already taken' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginInput' } } } },
        responses: {
          200: { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthTokens' } } } },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } } } },
        },
        responses: {
          200: { description: 'New tokens issued', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthTokens' } } } },
          401: { description: 'Invalid or expired refresh token' },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout (invalidate refresh token)',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Logged out' },
          401: { description: 'Not authenticated' },
        },
      },
    },
    '/api/auth/setup-password': {
      post: {
        tags: ['Auth'],
        summary: 'Set password via invite token',
        description: 'Used by invited doctors — they receive an email with a one-time token and use it to create their password.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'password'],
                properties: {
                  token:    { type: 'string', description: 'One-time invite token from email' },
                  password: { type: 'string', minLength: 8, example: 'NewPass123!' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Password set, tokens returned', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthTokens' } } } },
          400: { description: 'Invalid or expired token' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user profile',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'User profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserProfile' } } } },
          401: { description: 'Unauthorized' },
        },
      },
    },

    // ══════════════════════════════════════════════════════════════════
    // TENANTS
    // ══════════════════════════════════════════════════════════════════
    '/api/tenants/me': {
      get: {
        tags: ['Tenants'],
        summary: "Get own clinic's profile",
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Tenant profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/Tenant' } } } },
          403: { description: 'Insufficient role' },
        },
      },
      put: {
        tags: ['Tenants'],
        summary: "Update own clinic's profile",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, address: { type: 'string' }, phone: { type: 'string' } } } } },
        },
        responses: {
          200: { description: 'Tenant updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Tenant' } } } },
        },
      },
    },
    '/api/tenants/doctors': {
      get: {
        tags: ['Tenants'],
        summary: 'List all doctors in tenant',
        description: 'Requires `tenant_admin`.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Doctor list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Doctor' } } } } },
        },
      },
    },
    '/api/tenants/doctors/invite': {
      post: {
        tags: ['Tenants'],
        summary: 'Invite a doctor by email',
        description: 'Creates a user record with a one-time invite token and sends an invitation email. Requires `tenant_admin`.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email'],
                properties: {
                  name:           { type: 'string', example: 'Dr. Kamal' },
                  email:          { type: 'string', format: 'email', example: 'kamal@clinic.bd' },
                  specialization: { type: 'string', example: 'Cardiology' },
                  departmentId:   { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Invitation sent' },
          409: { description: 'Doctor email already registered' },
        },
      },
    },
    '/api/tenants/doctors/{id}': {
      put: {
        tags: ['Tenants'],
        summary: "Update a doctor's profile (admin)",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', properties: { name: { type: 'string' }, specialization: { type: 'string' }, departmentId: { type: 'string', format: 'uuid' } } },
            },
          },
        },
        responses: {
          200: { description: 'Doctor updated' },
          404: { description: 'Doctor not found in this tenant' },
        },
      },
      delete: {
        tags: ['Tenants'],
        summary: 'Remove a doctor from the tenant',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Doctor removed' },
          404: { description: 'Doctor not found' },
        },
      },
    },

    // ══════════════════════════════════════════════════════════════════
    // DEPARTMENTS
    // ══════════════════════════════════════════════════════════════════
    '/api/clinics/{slug}/departments': {
      get: {
        tags: ['Departments'],
        summary: 'List departments for a clinic (public)',
        description: 'No auth required — used on patient-facing pages.',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' }, example: 'city-clinic' }],
        responses: {
          200: { description: 'Departments', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Department' } } } } },
        },
      },
    },
    '/api/clinics/{slug}/departments/{departmentId}/doctors': {
      get: {
        tags: ['Departments'],
        summary: 'List doctors in a department (public)',
        parameters: [
          { name: 'slug',         in: 'path', required: true, schema: { type: 'string' } },
          { name: 'departmentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Doctors in department', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Doctor' } } } } },
        },
      },
    },
    '/api/departments': {
      get: {
        tags: ['Departments'],
        summary: 'List all departments in tenant',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Departments', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Department' } } } } },
        },
      },
      post: {
        tags: ['Departments'],
        summary: 'Create a department',
        description: 'Requires `tenant_admin`.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string', example: 'Cardiology' } } } } },
        },
        responses: {
          201: { description: 'Department created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Department' } } } },
        },
      },
    },
    '/api/departments/overview': {
      get: {
        tags: ['Departments'],
        summary: 'Get department overview (counts, active sessions)',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Overview stats' },
        },
      },
    },
    '/api/departments/{id}': {
      get: {
        tags: ['Departments'],
        summary: 'Get a single department',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Department', content: { 'application/json': { schema: { $ref: '#/components/schemas/Department' } } } },
          404: { description: 'Not found' },
        },
      },
      put: {
        tags: ['Departments'],
        summary: 'Update a department',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' } } } } } },
        responses: {
          200: { description: 'Department updated' },
        },
      },
      delete: {
        tags: ['Departments'],
        summary: 'Delete a department',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Department deleted' },
        },
      },
    },
    '/api/departments/{id}/doctors': {
      get: {
        tags: ['Departments'],
        summary: 'List doctors in a department (admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Doctors', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Doctor' } } } } },
        },
      },
      post: {
        tags: ['Departments'],
        summary: 'Assign a doctor to a department',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['doctorId'], properties: { doctorId: { type: 'string', format: 'uuid' } } } } },
        },
        responses: {
          201: { description: 'Doctor assigned' },
        },
      },
    },
    '/api/departments/{id}/doctors/{doctorId}': {
      delete: {
        tags: ['Departments'],
        summary: 'Remove a doctor from a department',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id',       in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'doctorId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Doctor removed from department' },
        },
      },
    },

    // ══════════════════════════════════════════════════════════════════
    // CLINICS  (public discovery)
    // ══════════════════════════════════════════════════════════════════
    '/api/clinics': {
      get: {
        tags: ['Clinics'],
        summary: 'Search clinics',
        description: 'Public — no auth required. Returns paginated list of clinics.',
        parameters: [
          { name: 'q',    in: 'query', schema: { type: 'string' }, description: 'Name / location search' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        ],
        responses: {
          200: { description: 'Clinic list' },
        },
      },
    },
    '/api/clinics/doctors/search': {
      get: {
        tags: ['Clinics'],
        summary: 'Search doctors across all clinics',
        description: 'Public — no auth required.',
        parameters: [
          { name: 'q',    in: 'query', schema: { type: 'string' }, description: 'Doctor name or specialization' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        ],
        responses: {
          200: { description: 'Doctor list' },
        },
      },
    },
    '/api/clinics/{slug}/queue': {
      get: {
        tags: ['Clinics'],
        summary: "Get a clinic's live queue status",
        description: 'Public — shows all open sessions for a clinic by subdomain slug.',
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' }, example: 'city-clinic' },
        ],
        responses: {
          200: { description: 'Open sessions', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/QueueSession' } } } } },
          404: { description: 'Clinic not found' },
        },
      },
    },

    // ══════════════════════════════════════════════════════════════════
    // QUEUE — SESSIONS
    // ══════════════════════════════════════════════════════════════════
    '/api/queue/sessions': {
      post: {
        tags: ['Queue'],
        summary: 'Open a queue session for today',
        description: 'Requires `tenant_admin`.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['doctorId'],
                properties: {
                  doctorId:     { type: 'string', format: 'uuid' },
                  clinicId:     { type: 'string', format: 'uuid' },
                  departmentId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Session opened', content: { 'application/json': { schema: { $ref: '#/components/schemas/QueueSession' } } } },
          403: { description: 'Insufficient role' },
        },
      },
    },
    '/api/queue/sessions/today': {
      get: {
        tags: ['Queue'],
        summary: "List today's sessions",
        description: 'Accessible by `tenant_admin` and `doctor`.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Sessions', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/QueueSession' } } } } },
        },
      },
    },
    '/api/queue/sessions/{id}/status': {
      get: {
        tags: ['Queue'],
        summary: 'Get live session status (public)',
        description: 'No auth required — used by the patient-facing waiting screen.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Current status', content: { 'application/json': { schema: { $ref: '#/components/schemas/QueueSession' } } } },
          404: { description: 'Session not found' },
        },
      },
    },
    '/api/queue/sessions/{id}/my-token': {
      get: {
        tags: ['Queue'],
        summary: "Patient gets their own token in a session",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Queue session ID' }],
        responses: {
          200: { description: 'Token', content: { 'application/json': { schema: { $ref: '#/components/schemas/QueueToken' } } } },
          404: { description: 'No token for this patient in this session' },
        },
      },
    },
    '/api/queue/sessions/{id}/tokens': {
      get: {
        tags: ['Queue'],
        summary: 'List all tokens in a session (doctor/admin view)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Token list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/QueueToken' } } } } },
        },
      },
    },
    '/api/queue/sessions/{id}/next': {
      put: {
        tags: ['Queue'],
        summary: 'Call next patient in queue',
        description: 'Doctor / tenant_admin advances the queue. Broadcasts via WebSocket.',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Next token called', content: { 'application/json': { schema: { $ref: '#/components/schemas/QueueToken' } } } },
          404: { description: 'No waiting tokens' },
        },
      },
    },
    '/api/queue/sessions/{id}/close': {
      put: {
        tags: ['Queue'],
        summary: 'Close a queue session',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Session closed' } },
      },
    },
    '/api/queue/sessions/{id}/reopen': {
      put: {
        tags: ['Queue'],
        summary: 'Reopen a closed session',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Session reopened' } },
      },
    },
    '/api/queue/sessions/{id}/break': {
      post: {
        tags: ['Queue'],
        summary: 'Start a break during a session',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 201: { description: 'Break started' } },
      },
    },
    '/api/queue/sessions/{id}/break/{breakId}/end': {
      put: {
        tags: ['Queue'],
        summary: 'End an active break',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id',      in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'breakId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { 200: { description: 'Break ended' } },
      },
    },

    // ══════════════════════════════════════════════════════════════════
    // QUEUE — TOKENS
    // ══════════════════════════════════════════════════════════════════
    '/api/queue/tokens/give': {
      post: {
        tags: ['Queue'],
        summary: 'Give a queue token to a patient',
        description: 'Requires `tenant_admin`. Enforces daily patient feature gate and writes an audit log entry.',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/GiveTokenInput' } } } },
        responses: {
          201: { description: 'Token issued', content: { 'application/json': { schema: { $ref: '#/components/schemas/QueueToken' } } } },
          402: { description: 'Daily patient limit reached — upgrade plan' },
          403: { description: 'Insufficient role' },
        },
      },
    },
    '/api/queue/tokens/{id}/cancel': {
      put: {
        tags: ['Queue'],
        summary: 'Patient cancels their own waiting token',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Token cancelled' },
          404: { description: 'Token not found or not yours' },
        },
      },
    },
    '/api/queue/tokens/{id}/complete': {
      put: {
        tags: ['Queue'],
        summary: 'Mark consultation as completed',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Token completed' } },
      },
    },
    '/api/queue/tokens/{id}/skip': {
      put: {
        tags: ['Queue'],
        summary: 'Skip a patient (no-show)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Token skipped' } },
      },
    },
    '/api/queue/tokens/{id}/readmit': {
      put: {
        tags: ['Queue'],
        summary: 'Readmit a skipped / removed patient back to waiting',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Token readmitted' } },
      },
    },
    '/api/queue/tokens/{id}/remove': {
      put: {
        tags: ['Queue'],
        summary: 'Receptionist removes a patient from the queue',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Token removed' } },
      },
    },
    '/api/queue/tokens/{id}/fee': {
      put: {
        tags: ['Queue'],
        summary: 'Mark consultation fee as paid',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Fee marked paid' } },
      },
    },
    '/api/queue/tokens/{id}/notes': {
      put: {
        tags: ['Queue'],
        summary: "Update doctor's notes on a token",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { notes: { type: 'string' } } } } } },
        responses: { 200: { description: 'Notes updated' } },
      },
    },
    '/api/queue/tokens/{id}/checkin': {
      put: {
        tags: ['Queue'],
        summary: 'Check-in a patient (confirm arrival)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Patient checked in' } },
      },
    },
    '/api/queue/my-active-token': {
      get: {
        tags: ['Queue'],
        summary: 'Patient — get my active token (auto-detect session)',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Active token', content: { 'application/json': { schema: { $ref: '#/components/schemas/QueueToken' } } } },
          404: { description: 'No active token' },
        },
      },
    },

    // ══════════════════════════════════════════════════════════════════
    // DOCTORS
    // ══════════════════════════════════════════════════════════════════
    '/api/doctors': {
      get: {
        tags: ['Doctors'],
        summary: 'List all doctors in tenant (admin)',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Doctors', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Doctor' } } } } },
        },
      },
      post: {
        tags: ['Doctors'],
        summary: 'Create a doctor account',
        description: 'Requires `tenant_admin`.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email'],
                properties: {
                  name:           { type: 'string' },
                  email:          { type: 'string', format: 'email' },
                  specialization: { type: 'string' },
                  departmentId:   { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Doctor created' },
          403: { description: 'Insufficient role' },
        },
      },
    },
    '/api/doctors/me': {
      put: {
        tags: ['Doctors'],
        summary: 'Doctor updates their own profile',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, specialization: { type: 'string' } } } } },
        },
        responses: { 200: { description: 'Profile updated' } },
      },
    },
    '/api/doctors/my-departments': {
      get: {
        tags: ['Doctors'],
        summary: 'Doctor gets their own department assignments',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Departments', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Department' } } } } },
        },
      },
    },

    // ══════════════════════════════════════════════════════════════════
    // PATIENTS
    // ══════════════════════════════════════════════════════════════════
    '/api/patients/my-visits': {
      get: {
        tags: ['Patients'],
        summary: 'Patient visit history',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Past visits', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/QueueToken' } } } } },
        },
      },
    },
    '/api/patients/me': {
      put: {
        tags: ['Patients'],
        summary: 'Patient updates own profile',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, phone: { type: 'string' } } } } },
        },
        responses: { 200: { description: 'Profile updated' } },
      },
    },

    // ══════════════════════════════════════════════════════════════════
    // ANALYTICS
    // ══════════════════════════════════════════════════════════════════
    '/api/analytics/summary': {
      get: {
        tags: ['Analytics'],
        summary: 'Tenant dashboard summary',
        description: "Returns today's patient count, queue stats, revenue and doctor activity. Requires tenant_admin.",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Dashboard stats',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    totalPatientsToday: { type: 'integer', example: 42 },
                    activeSessions:     { type: 'integer', example: 3 },
                    waitingTokens:      { type: 'integer', example: 12 },
                    completedToday:     { type: 'integer', example: 27 },
                  },
                },
              },
            },
          },
          403: { description: 'Insufficient role' },
        },
      },
    },

    // ══════════════════════════════════════════════════════════════════
    // BILLING
    // ══════════════════════════════════════════════════════════════════
    '/api/billing/plans': {
      get: {
        tags: ['Billing'],
        summary: 'List available subscription plans',
        description: 'Public — no auth required.',
        responses: {
          200: { description: 'All plans', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Plan' } } } } },
        },
      },
    },
    '/api/billing/subscription': {
      get: {
        tags: ['Billing'],
        summary: "Get tenant's current subscription",
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Subscription', content: { 'application/json': { schema: { $ref: '#/components/schemas/Subscription' } } } },
        },
      },
    },
    '/api/billing/checkout': {
      post: {
        tags: ['Billing'],
        summary: 'Create a Stripe Checkout session',
        description: 'Returns a Stripe-hosted `url` to redirect the browser to.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['planId'], properties: { planId: { type: 'string', example: 'plan_pro' } } } } },
        },
        responses: {
          200: { description: 'Checkout URL', content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string', format: 'uri' } } } } } },
        },
      },
    },
    '/api/billing/portal': {
      post: {
        tags: ['Billing'],
        summary: 'Create a Stripe Customer Portal session',
        description: 'Returns a Stripe-hosted `url` to manage subscription and payment methods.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Portal URL', content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string', format: 'uri' } } } } } },
        },
      },
    },
    '/api/billing/webhook': {
      post: {
        tags: ['Billing'],
        summary: 'Stripe webhook receiver',
        description: '⚠️ Called by Stripe only — not for direct use. Requires raw body and `Stripe-Signature` header.',
        parameters: [
          { name: 'Stripe-Signature', in: 'header', required: true, schema: { type: 'string' } },
        ],
        requestBody: { required: true, content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } } },
        responses: {
          200: { description: 'Webhook processed' },
          400: { description: 'Signature verification failed' },
        },
      },
    },

    // ══════════════════════════════════════════════════════════════════
    // PUSH NOTIFICATIONS
    // ══════════════════════════════════════════════════════════════════
    '/api/push/public-key': {
      get: {
        tags: ['Push'],
        summary: 'Get VAPID public key',
        description: 'Public — browser needs this before creating a push subscription.',
        responses: {
          200: {
            description: 'VAPID public key',
            content: { 'application/json': { schema: { type: 'object', properties: { publicKey: { type: 'string' } } } } },
          },
        },
      },
    },
    '/api/push/subscriptions': {
      post: {
        tags: ['Push'],
        summary: 'Register browser for push notifications',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'Standard PushSubscription object from the browser Push API',
                properties: {
                  endpoint: { type: 'string', format: 'uri' },
                  keys:     { type: 'object', properties: { p256dh: { type: 'string' }, auth: { type: 'string' } } },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Subscription saved' },
        },
      },
      delete: {
        tags: ['Push'],
        summary: 'Unregister browser push subscription',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { endpoint: { type: 'string', format: 'uri' } } } } },
        },
        responses: {
          200: { description: 'Subscription removed' },
        },
      },
    },

    // ══════════════════════════════════════════════════════════════════
    // TRACKING
    // ══════════════════════════════════════════════════════════════════
    '/api/track': {
      post: {
        tags: ['Tracking'],
        summary: 'Record an anonymous event',
        description: 'Public — rate-limited at 100 req/min per IP. Used for patient-facing page analytics.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['event'],
                properties: {
                  event:      { type: 'string', example: 'page.view' },
                  properties: { type: 'object', additionalProperties: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Event recorded' },
          429: { description: 'Rate limit exceeded' },
        },
      },
    },

    // ══════════════════════════════════════════════════════════════════
    // SUPPORT
    // ══════════════════════════════════════════════════════════════════
    '/api/support/contact': {
      post: {
        tags: ['Support'],
        summary: 'Submit a homepage contact inquiry',
        description: 'Public — used by the landing-page "Contact us" form.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'message'],
                properties: {
                  name:    { type: 'string', example: 'Rahim Uddin' },
                  email:   { type: 'string', format: 'email' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Inquiry submitted' },
        },
      },
      get: {
        tags: ['Support'],
        summary: 'List all contact inquiries',
        description: 'Requires `super_admin`.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Inquiry list' },
          403: { description: 'Insufficient role' },
        },
      },
    },
    '/api/support/contact/{id}/resolve': {
      put: {
        tags: ['Support'],
        summary: 'Resolve a contact inquiry',
        description: 'Requires `super_admin`.',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Inquiry resolved' } },
      },
    },
    '/api/support/messages': {
      post: {
        tags: ['Support'],
        summary: 'Send a support message from the Billing page',
        description: 'Requires `tenant_admin`.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['message'], properties: { message: { type: 'string' }, subject: { type: 'string' } } } } },
        },
        responses: { 201: { description: 'Message sent' } },
      },
      get: {
        tags: ['Support'],
        summary: 'List all support messages',
        description: 'Requires `super_admin`.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Message list' },
          403: { description: 'Insufficient role' },
        },
      },
    },
    '/api/support/messages/{id}/resolve': {
      put: {
        tags: ['Support'],
        summary: 'Resolve a support message',
        description: 'Requires `super_admin`.',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Message resolved' } },
      },
    },

    // ══════════════════════════════════════════════════════════════════
    // SUPER ADMIN
    // ══════════════════════════════════════════════════════════════════
    '/api/super/overview': {
      get: {
        tags: ['Super Admin'],
        summary: 'Platform-wide overview',
        description: 'Requires `super_admin`. Returns total tenant, doctor, patient and revenue counts.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Platform overview',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    totalTenants:  { type: 'integer', example: 58 },
                    totalDoctors:  { type: 'integer', example: 212 },
                    totalPatients: { type: 'integer', example: 14830 },
                    mrr:           { type: 'number',  example: 128000, description: 'Monthly recurring revenue (BDT)' },
                  },
                },
              },
            },
          },
          403: { description: 'Insufficient role' },
        },
      },
    },
    '/api/super/tenants': {
      get: {
        tags: ['Super Admin'],
        summary: 'List all tenants',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'All tenants', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Tenant' } } } } },
        },
      },
    },
    '/api/super/subscriptions': {
      get: {
        tags: ['Super Admin'],
        summary: 'List all subscriptions across tenants',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'All subscriptions', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Subscription' } } } } },
        },
      },
    },
    '/api/super/doctors': {
      get: {
        tags: ['Super Admin'],
        summary: 'List all doctors across all tenants',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'All doctors', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Doctor' } } } } },
        },
      },
    },
    '/api/super/patients': {
      get: {
        tags: ['Super Admin'],
        summary: 'List all patients across all tenants',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'All patients' },
        },
      },
    },
    '/api/super/revenue': {
      get: {
        tags: ['Super Admin'],
        summary: 'Platform revenue breakdown',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Revenue data by plan / month' },
        },
      },
    },
    '/api/super/logs': {
      get: {
        tags: ['Super Admin'],
        summary: 'Audit log viewer',
        description: 'Returns paginated platform-wide audit log.',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page',     in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'tenantId', in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Filter by tenant' },
          { name: 'action',   in: 'query', schema: { type: 'string' }, description: 'Filter by event type, e.g. user.login' },
        ],
        responses: {
          200: { description: 'Paginated audit logs' },
        },
      },
    },
  },
} as const;

export function setupSwagger(app: Express): void {
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(spec, {
      customSiteTitle: 'MediQueue API Docs',
      swaggerOptions: {
        persistAuthorization: true,    // keeps the JWT across page reloads
        filter: true,                  // search/filter bar
        displayRequestDuration: true,  // shows response time on each request
        defaultModelsExpandDepth: -1,  // collapse the schemas section by default
      },
    })
  );

  // Raw JSON spec — useful for importing into Postman / Insomnia
  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(spec);
  });
}

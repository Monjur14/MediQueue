import { authRepository } from "./auth.repository.js";
import { passwordUtil } from "../../utils/password.js";
import { jwtUtil } from "../../utils/jwt.js";
import type {
  RegisterInput,
  RegisterTenantInput,
  LoginInput,
  RefreshInput,
} from "./auth.schema.js";

export const authService = {
  async register(input: RegisterInput) {
    const existing = await authRepository.findByEmail(input.email);
    if (existing) throw new Error("EMAIL_TAKEN");

    const password_hash = await passwordUtil.hash(input.password);
    try {
      const user = await authRepository.createPatient({
        full_name: input.full_name,
        email: input.email,
        ...(input.phone !== undefined && { phone: input.phone }),
        password_hash,
      });
      return user;
    } catch (err: any) {
      if (err.code === "23505") {
        // unique constraint violation — figure out which field
        const detail: string = err.detail ?? "";
        if (detail.includes("phone")) throw new Error("PHONE_TAKEN");
        if (detail.includes("email")) throw new Error("EMAIL_TAKEN");
      }
      throw err;
    }
  },

  async registerTenant(input: RegisterTenantInput) {
    // check duplicate email
    const existing = await authRepository.findByEmail(input.email);
    if (existing) throw new Error("EMAIL_TAKEN");

    // find plan
    const plan = await authRepository.findPlanByName(input.plan_name);
    if (!plan) throw new Error("PLAN_NOT_FOUND");

    const password_hash = await passwordUtil.hash(input.password);

    try {
      const { tenant, user } = await authRepository.createTenantWithAdmin({
        clinic_name: input.clinic_name,
        clinic_phone: input.clinic_phone,
        plan_id: plan.id,
        full_name: input.full_name,
        email: input.email,
        ...(input.phone !== undefined && { phone: input.phone }),
        password_hash,
      });
      return { tenant, user };
    } catch (err: any) {
      if (err.code === "23505") {
        const detail: string = err.detail ?? "";
        if (detail.includes("phone")) throw new Error("PHONE_TAKEN");
        if (detail.includes("email")) throw new Error("EMAIL_TAKEN");
        if (detail.includes("slug"))  throw new Error("CLINIC_NAME_TAKEN");
      }
      throw err;
    }
  },

  async getMe(userId: string) {
  const user = await authRepository.getMe(userId);
  if (!user) throw new Error('USER_NOT_FOUND');

  // return different shape based on role
  if (user.role === 'patient') {
    return {
      id:                user.id,
      full_name:         user.full_name,
      email:             user.email,
      phone:             user.phone,
      role:              user.role,
      preferred_channel: user.preferred_channel,
      created_at:        user.created_at,
    };
  }

  if (user.role === 'doctor') {
    return {
      id:          user.id,
      full_name:   user.full_name,
      email:       user.email,
      phone:       user.phone,
      role:        user.role,
      tenant_id:   user.tenant_id,
      clinic_name: user.clinic_name,
      clinic_slug: user.clinic_slug,
      created_at:  user.created_at,
    };
  }

  if (user.role === 'tenant_admin') {
    return {
      id:          user.id,
      full_name:   user.full_name,
      email:       user.email,
      phone:       user.phone,
      role:        user.role,
      status:      user.status,
      clinic_name: user.clinic_name,
      clinic_slug: user.clinic_slug,
      plan_name:   user.plan_name,
      created_at:  user.created_at,
    };
  }

  // super_admin
  return {
    id:        user.id,
    full_name: user.full_name,
    email:     user.email,
    role:      user.role,
    created_at: user.created_at,
  };
},

  async login(input: LoginInput) {
    const user = await authRepository.findByEmail(input.email);
    if (!user) throw new Error("INVALID_CREDENTIALS");

    const valid = await passwordUtil.compare(
      input.password,
      user.password_hash,
    );
    if (!valid) throw new Error("INVALID_CREDENTIALS");

    if (!user.is_active) throw new Error("ACCOUNT_DISABLED");

    const accessToken = jwtUtil.generateAccessToken({
      userId: user.id,
      role: user.role,
      tenantId: user.tenant_id ?? null,
    });
    const refreshToken = jwtUtil.generateRefreshToken({ userId: user.id });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await authRepository.saveRefreshToken(user.id, refreshToken, expiresAt);

    return {
      accessToken,
      refreshToken,
      needs_payment: user.status === 'pending_payment',
      user: {
        id:                user.id,
        full_name:         user.full_name,
        email:             user.email,
        phone:             user.phone,
        role:              user.role,
        tenant_id:         user.tenant_id,
        status:            user.status,
        preferred_channel: user.preferred_channel,
      },
    };
  },

  async setupPassword(token: string, password: string) {
    const user = await authRepository.findBySetupToken(token);
    if (!user) throw new Error("INVALID_SETUP_TOKEN");

    const password_hash = await passwordUtil.hash(password);
    await authRepository.activateDoctor(user.id, password_hash);
  },

  async refresh(input: RefreshInput) {
    // 1. Look up the user by the incoming refresh token.
    //    findByRefreshToken also checks expiry (refresh_token_expires_at > NOW()).
    const user = await authRepository.findByRefreshToken(input.refresh_token);

    if (!user) {
      // ── STOLEN TOKEN DETECTION ──────────────────────────────────────────
      // The token is not in the database. Three possibilities:
      //   a) it never existed / was tampered with  → signature will fail
      //   b) it expired or the user logged out     → signature valid, but so is this
      //   c) it was ALREADY ROTATED and is now being replayed → THEFT
      //
      // We can tell (a) apart from (b)/(c) by verifying the signature: if WE
      // minted this token, the signature holds even though the row is gone.
      // A validly-signed token that is absent from the DB means someone is
      // replaying a token that has already been used once — the classic
      // signature of a stolen refresh token.
      //
      // Response: revoke every session for that user. The attacker is locked
      // out, and the legitimate user is forced to re-authenticate — which is
      // exactly what you want when a token has leaked.
      try {
        const payload = jwtUtil.verifyRefreshToken(input.refresh_token);

        // Signature is valid but the token is not in the DB → replay detected.
        await authRepository.clearAllRefreshTokens(payload.userId);

        console.warn(
          `[SECURITY] Refresh token reuse detected for user ${payload.userId}. ` +
          `All sessions revoked.`,
        );

        throw new Error("TOKEN_REUSE_DETECTED");
      } catch (err: any) {
        // Re-throw our own signal; anything else means the signature itself
        // was invalid (forged or corrupted token) → plain rejection.
        if (err.message === "TOKEN_REUSE_DETECTED") throw err;
        throw new Error("INVALID_REFRESH_TOKEN");
      }
      // ────────────────────────────────────────────────────────────────────
    }

    // 2. Issue a new short-lived access token
    const accessToken = jwtUtil.generateAccessToken({
      userId:   user.id,
      role:     user.role,
      tenantId: user.tenant_id ?? null,
    });

    // 3. Rotate — generate a new refresh token and atomically replace the old one.
    //    After this point the incoming token is dead; any replay gets INVALID_REFRESH_TOKEN.
    const newRefreshToken = jwtUtil.generateRefreshToken({ userId: user.id });
    const newExpiresAt    = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await authRepository.rotateRefreshToken(user.id, newRefreshToken, newExpiresAt);

    return { accessToken, refreshToken: newRefreshToken };
  },

  async logout(userId: string) {
    await authRepository.clearRefreshToken(userId);
  },
};

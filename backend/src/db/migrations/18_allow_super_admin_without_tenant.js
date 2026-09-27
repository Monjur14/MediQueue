/**
 * Migration 18 — super_admin accounts have no tenant
 *
 * Migration 4 required tenant_id for every non-patient, which made a platform
 * owner impossible to create without inventing a fake clinic (and that fake
 * clinic would then show up in every platform count). Patients and super admins
 * live outside tenants; tenant admins and doctors must belong to one.
 */
export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE users DROP CONSTRAINT check_user_tenant;

    ALTER TABLE users ADD CONSTRAINT check_user_tenant CHECK (
      (role IN ('patient', 'super_admin') AND tenant_id IS NULL)
      OR
      (role IN ('tenant_admin', 'doctor') AND tenant_id IS NOT NULL)
    );
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE users DROP CONSTRAINT check_user_tenant;

    ALTER TABLE users ADD CONSTRAINT check_user_tenant CHECK (
      (role = 'patient' AND tenant_id IS NULL)
      OR
      (role <> 'patient' AND tenant_id IS NOT NULL)
    );
  `);
};

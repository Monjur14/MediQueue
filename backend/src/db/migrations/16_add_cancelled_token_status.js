export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE queue_tokens
      DROP CONSTRAINT queue_tokens_status_check;

    ALTER TABLE queue_tokens
      ADD CONSTRAINT queue_tokens_status_check
        CHECK (status IN (
          'waiting',
          'called',
          'in_consultation',
          'completed',
          'skipped',
          'cancelled'
        ));
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE queue_tokens
      DROP CONSTRAINT queue_tokens_status_check;

    ALTER TABLE queue_tokens
      ADD CONSTRAINT queue_tokens_status_check
        CHECK (status IN (
          'waiting',
          'called',
          'in_consultation',
          'completed',
          'skipped'
        ));
  `);
};

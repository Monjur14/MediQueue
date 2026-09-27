import { analyticsRepository } from './analytics.repository.js';

export const analyticsService = {
  async getSummary(tenantId: string, days: number) {
    const [summary, daily_volumes, peak_hours, doctors] = await Promise.all([
      analyticsRepository.getSummary(tenantId, days),
      analyticsRepository.getDailyVolumes(tenantId, days),
      analyticsRepository.getPeakHours(tenantId, days),
      analyticsRepository.getDoctorBreakdown(tenantId, days),
    ]);

    const total_issued  = parseInt(String(summary.total_issued  ?? '0'), 10);
    const total_no_show = parseInt(String(summary.total_no_show ?? '0'), 10);
    const no_show_rate  = total_issued > 0 ? Math.round((total_no_show / total_issued) * 100) : 0;

    type RawDoctor = {
      doctor_name: string;
      session_days: string;
      patients_seen: string;
      no_shows: string;
      avg_consultation_minutes: string | null;
    };

    type RawVolume = { date: string; completed: string; no_show: string };
    type RawHour   = { hour: string; count: string };

    return {
      summary: {
        total_patients:           parseInt(String(summary.total_completed ?? '0'), 10),
        avg_wait_minutes:         summary.avg_wait_minutes         != null ? Number(summary.avg_wait_minutes)         : null,
        avg_consultation_minutes: summary.avg_consultation_minutes != null ? Number(summary.avg_consultation_minutes) : null,
        no_show_rate,
      },
      daily_volumes: (daily_volumes as RawVolume[]).map((r) => ({
        date:      r.date,
        completed: parseInt(String(r.completed ?? '0'), 10),
        no_show:   parseInt(String(r.no_show   ?? '0'), 10),
      })),
      peak_hours: (peak_hours as RawHour[]).map((r) => ({
        hour:  parseInt(String(r.hour),  10),
        count: parseInt(String(r.count), 10),
      })),
      doctors: (doctors as RawDoctor[]).map((r) => {
        const seen         = parseInt(String(r.patients_seen ?? '0'), 10);
        const session_days = parseInt(String(r.session_days  ?? '0'), 10);
        const avg_per_day  = session_days > 0 ? Math.round((seen / session_days) * 10) / 10 : 0;
        return {
          doctor_name:              r.doctor_name,
          patients_seen:            seen,
          session_days,
          avg_per_day,
          no_shows:                 parseInt(String(r.no_shows ?? '0'), 10),
          avg_consultation_minutes: r.avg_consultation_minutes != null ? Number(r.avg_consultation_minutes) : null,
        };
      }),
    };
  },
};

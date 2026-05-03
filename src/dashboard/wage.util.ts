/**
 * Weekdays (Mon–Fri) in an inclusive YYYY-MM-DD range (local calendar interpretation).
 *
 * Implied hourly rate for a period = monthlyWage / (dailyWorkingHours × weekdays in period).
 * Months with more Mon–Fri days have a larger denominator → a slightly lower rate than
 * shorter months for the same nominal monthly salary. Accumulated pay = productiveHours × rate
 * (productive time comes from the same worker stats as the dashboard, including approved offline).
 */
export function countWeekdaysInclusive(startYmd: string, endYmd: string): number {
  const [ys, ms, ds] = startYmd.split('-').map(Number);
  const [ye, me, de] = endYmd.split('-').map(Number);
  const start = new Date(ys, ms - 1, ds);
  const end = new Date(ye, me - 1, de);
  let n = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) n++;
  }
  return n;
}

export function computeWageSnapshot(params: {
  productiveTimeMs: number;
  dailyWorkingHours: number;
  monthlyWage: number;
  workdaysInPeriod: number;
}): {
  productiveHours: number;
  hourlyRate: number;
  accumulatedWage: number;
  progressTowardMonthlyPct: number;
} {
  const { productiveTimeMs, dailyWorkingHours, monthlyWage, workdaysInPeriod } =
    params;

  const productiveHours = productiveTimeMs / 3_600_000;
  const expectedMonthlyHours = dailyWorkingHours * workdaysInPeriod;

  let hourlyRate = 0;
  let accumulatedWage = 0;
  let progressTowardMonthlyPct = 0;

  if (expectedMonthlyHours > 0 && monthlyWage > 0) {
    hourlyRate = monthlyWage / expectedMonthlyHours;
    accumulatedWage = productiveHours * hourlyRate;
    progressTowardMonthlyPct = Math.min(
      100,
      (accumulatedWage / monthlyWage) * 100,
    );
  }

  return {
    productiveHours: Math.round(productiveHours * 100) / 100,
    hourlyRate: Math.round(hourlyRate * 10000) / 10000,
    accumulatedWage: Math.round(accumulatedWage * 100) / 100,
    progressTowardMonthlyPct: Math.round(progressTowardMonthlyPct * 10) / 10,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function todayString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseLocal(dateString: string): Date {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 사귄 날을 1일로 세는 한국식 D+N */
export function daysTogether(startDate: string, today = new Date()): number {
  const start = parseLocal(startDate);
  const now = parseLocal(todayString(today));
  return Math.round((now.getTime() - start.getTime()) / DAY_MS) + 1;
}

/** 다음 100일 단위 기념일과 남은 날짜 */
export function nextMilestone(startDate: string, today = new Date()) {
  const current = daysTogether(startDate, today);
  const target = Math.floor(current / 100) * 100 + 100;
  const date = new Date(parseLocal(startDate).getTime() + (target - 1) * DAY_MS);
  return { day: target, date: todayString(date), remaining: target - current };
}

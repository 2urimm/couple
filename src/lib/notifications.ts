/**
 * 알림 정책. 실제 푸시 발송은 백엔드가 담당하지만, 규칙은 여기 한 곳에 둡니다.
 * 비밀연애 모드에서는 채팅 알림을 보내지 않습니다 (잠금화면 노출 방지).
 */
export type NotificationKind = 'chat' | 'letter' | 'question' | 'calendar';

export function shouldNotify(kind: NotificationKind, secretMode: boolean): boolean {
  if (secretMode && kind === 'chat') return false;
  return true;
}

import { formatMsg } from '../../i18n/LanguageContext';
import type { NotificationType } from '../../lib/api';

export function notificationMessage(
  type: NotificationType,
  name: string,
  templates: {
    follow: string;
    like: string;
    comment: string;
  },
): string {
  const tpl =
    type === 'FOLLOW'
      ? templates.follow
      : type === 'LIKE'
        ? templates.like
        : templates.comment;
  return formatMsg(tpl, { name });
}

import UserLink from '../common/UserLink';
import { useLanguage } from '../../i18n/LanguageContext';
import type { TaggedUserSummary } from '../../lib/api';
import './PostTaggedUsers.css';

export default function PostTaggedUsers({
  taggedUsers,
}: {
  taggedUsers?: TaggedUserSummary[];
}) {
  const { t } = useLanguage();
  if (!taggedUsers?.length) return null;

  return (
    <p className="post-tagged-users">
      <span className="post-tagged-users-label">{t.feed.with} </span>
      {taggedUsers.map((user, index) => (
        <span key={user.id} className="post-tagged-users-item">
          {index > 0 ? ', ' : null}
          <UserLink
            userId={user.id}
            displayName={user.displayName}
            variant="inline"
          />
        </span>
      ))}
    </p>
  );
}

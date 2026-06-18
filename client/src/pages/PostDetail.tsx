import { useNavigate, useParams } from 'react-router-dom';
import AppSidebar from '../components/app-shell/AppSidebar';
import PostCommentModal from '../components/post/PostCommentModal';
import '../theme/feed-theme.css';
import './NewsFeed.css';

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    navigate('/feed', { replace: true });
    return null;
  }

  return (
    <div className="app-shell-page newsfeed-page">
      <AppSidebar />
      <main className="main-content" aria-hidden />
      <PostCommentModal
        postId={id}
        open
        onClose={() => navigate('/feed')}
      />
    </div>
  );
}

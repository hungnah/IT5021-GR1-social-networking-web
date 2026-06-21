import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AppSidebar from '../components/app-shell/AppSidebar';
import PostCommentModal from '../components/post/PostCommentModal';
import '../theme/feed-theme.css';
import './NewsFeed.css';

type PostDetailLocationState = {
  returnTo?: string;
};

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as PostDetailLocationState | null)?.returnTo;

  if (!id) {
    navigate('/feed', { replace: true });
    return null;
  }

  const handleClose = () => {
    if (returnTo) {
      navigate(returnTo);
      return;
    }
    navigate('/feed');
  };

  return (
    <div className="app-shell-page newsfeed-page">
      <AppSidebar />
      <main className="main-content" aria-hidden />
      <PostCommentModal
        postId={id}
        open
        onClose={handleClose}
      />
    </div>
  );
}

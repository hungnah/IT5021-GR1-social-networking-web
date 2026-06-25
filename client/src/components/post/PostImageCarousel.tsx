import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './PostImageCarousel.css';

export function getPostImageUrls(post: {
  imageUrl: string | null;
  imageUrls?: string[];
}): string[] {
  if (post.imageUrls?.length) return post.imageUrls;
  if (post.imageUrl) return [post.imageUrl];
  return [];
}

type PostImageCarouselProps = {
  imageUrls: string[];
  className?: string;
  showArrows?: boolean;
};

export default function PostImageCarousel({
  imageUrls,
  className = '',
  showArrows = true,
}: PostImageCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const syncIndexFromScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track || imageUrls.length <= 1) return;
    const slideWidth = track.clientWidth;
    if (slideWidth <= 0) return;
    const index = Math.round(track.scrollLeft / slideWidth);
    setActiveIndex(Math.min(Math.max(0, index), imageUrls.length - 1));
  }, [imageUrls.length]);

  useEffect(() => {
    setActiveIndex(0);
    trackRef.current?.scrollTo({ left: 0 });
  }, [imageUrls]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.addEventListener('scroll', syncIndexFromScroll, { passive: true });
    return () => track.removeEventListener('scroll', syncIndexFromScroll);
  }, [syncIndexFromScroll]);

  const scrollToIndex = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const next = Math.min(Math.max(0, index), imageUrls.length - 1);
    track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' });
    setActiveIndex(next);
  };

  if (imageUrls.length === 0) return null;

  const multi = imageUrls.length > 1;

  return (
    <div className={`post-image-carousel ${className}`.trim()}>
      <div className="post-image-carousel-viewport">
        {multi && showArrows && activeIndex > 0 && (
          <button
            type="button"
            className="post-image-carousel-arrow prev"
            aria-label="Previous image"
            onClick={() => scrollToIndex(activeIndex - 1)}
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
        )}
        <div
          ref={trackRef}
          className="post-image-carousel-track"
          role={multi ? 'group' : undefined}
          aria-label={multi ? 'Post images' : undefined}
        >
          {imageUrls.map((url, i) => (
            <div key={`${url}-${i}`} className="post-image-carousel-slide">
              <img src={url} alt="" draggable={false} />
            </div>
          ))}
        </div>
        {multi && showArrows && activeIndex < imageUrls.length - 1 && (
          <button
            type="button"
            className="post-image-carousel-arrow next"
            aria-label="Next image"
            onClick={() => scrollToIndex(activeIndex + 1)}
          >
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
        )}
      </div>
      {multi && (
        <div className="post-image-carousel-dots" aria-hidden={!multi}>
          {imageUrls.map((_, i) => (
            <span
              key={i}
              className={`post-image-carousel-dot${i === activeIndex ? ' active' : ''}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

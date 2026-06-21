export function scrollChatToBottom(
  container: HTMLElement | null,
  smooth = false,
): void {
  const run = () => {
    if (!container) return;
    if (smooth) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    } else {
      container.scrollTop = container.scrollHeight;
    }
  };
  requestAnimationFrame(() => requestAnimationFrame(run));
}

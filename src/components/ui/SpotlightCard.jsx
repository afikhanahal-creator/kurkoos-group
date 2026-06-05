import { useRef } from 'react';
import './SpotlightCard.css';

const SpotlightCard = ({ children, className = '', spotlightColor = 'rgba(255, 255, 255, 0.25)' }) => {
  const divRef = useRef(null);

  const move = (clientX, clientY) => {
    const el = divRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mouse-x', `${clientX - rect.left}px`);
    el.style.setProperty('--mouse-y', `${clientY - rect.top}px`);
    el.style.setProperty('--spotlight-color', spotlightColor);
  };

  const handleMouseMove = (e) => move(e.clientX, e.clientY);

  // תמיכה במגע — הספוטלייט עוקב אחרי האצבע גם במובייל
  const handleTouchStart = (e) => {
    divRef.current?.classList.add('is-active');
    if (e.touches[0]) move(e.touches[0].clientX, e.touches[0].clientY);
  };
  const handleTouchMove = (e) => {
    if (e.touches[0]) move(e.touches[0].clientX, e.touches[0].clientY);
  };
  const handleTouchEnd = () => divRef.current?.classList.remove('is-active');

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`card-spotlight ${className}`}
    >
      {children}
    </div>
  );
};

export default SpotlightCard;

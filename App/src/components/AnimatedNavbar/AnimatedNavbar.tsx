import Lottie from 'lottie-react';
import { useEffect, useState, useRef } from 'react';
import rabbitAnim from '../../animations/Baby Rabbit.json';
import dogAnim from '../../animations/Dog walking.json';
import fishAnim from '../../animations/School of Fish.json';

/* ── Moving animals (dog + fish only) ── */
interface Animal {
  id: number;
  anim: object;
  size: number;
  top: number;
  duration: number;
  direction: 'ltr' | 'rtl';
  delay: number;
}

const MOVING_ANIMALS = [dogAnim, fishAnim];
const MOVING_SIZES   = [60, 85];

function makeAnimal(id: number): Animal {
  const idx = id % MOVING_ANIMALS.length;
  return {
    id,
    anim: MOVING_ANIMALS[idx],
    size: MOVING_SIZES[idx],
    top: idx === 0 ? 20 + Math.floor(Math.random() * 8) : -8 + Math.floor(Math.random() * 6),
    duration: 12 + Math.random() * 10,
    direction: idx === 1 ? 'rtl' : (id % 2 === 0 ? 'ltr' : 'rtl'),
    delay: 0,
  };
}

/* ── Main component ── */
const AnimatedNavbar = () => {
  const [animals, setAnimals] = useState<Animal[]>(() =>
    [0, 1].map(makeAnimal)
  );
  const counterRef = useRef(2);

  useEffect(() => {
    const interval = setInterval(() => {
      const id = counterRef.current++;
      setAnimals(prev => [...prev.slice(-4), makeAnimal(id)]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden pointer-events-none">

      {/* Static rabbit */}
      <div className="absolute" style={{ bottom: -20, left: '40%', transform: 'translateX(-50%)', width: 120, height: 110 }}>
        <Lottie animationData={rabbitAnim} loop autoplay style={{ width: 120, height: 110 }} />
      </div>

      {/* Dog + Fish moving */}
      {animals.map((animal) => (
        <div
          key={animal.id}
          className="absolute"
          style={{
            top: animal.top,
            width: animal.size,
            height: animal.size,
            transform: animal.anim === fishAnim ? 'scaleX(1)' : animal.direction === 'rtl' ? 'scaleX(-1)' : 'scaleX(1)',
            animation: `${animal.direction === 'ltr' ? 'animalLTR' : 'animalRTL'} ${animal.duration}s ${animal.delay}s linear forwards`,
          }}
        >
          <Lottie animationData={animal.anim} loop autoplay style={{ width: animal.size, height: animal.size }} />
        </div>
      ))}

      <style>{`
        @keyframes animalLTR {
          from { left: -300px; }
          to   { left: calc(100% + 300px); }
        }
        @keyframes animalRTL {
          from { left: calc(100% + 300px); }
          to   { left: -300px; }
        }
      `}</style>
    </div>
  );
};

export default AnimatedNavbar;

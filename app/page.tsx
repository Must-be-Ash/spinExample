'use client';

import { useState, useEffect } from 'react';
import SpinningWheel from '../components/SpinningWheel';

const mockEntries = [
  'John Doe', 'Jane Smith', 'Alice Johnson', 'Bob Williams',
  'Charlie Brown', 'Diana Davis', 'Edward Evans', 'Fiona Foster'
];

export default function Home() {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSpinTime, setLastSpinTime] = useState<number | null>(null);

  // Poll for updates
  useEffect(() => {
    const pollState = async () => {
      try {
        const response = await fetch('/api/wheel');
        const data = await response.json();
        
        // If this is a new spin or we're currently spinning
        if (data.spinStartTime !== lastSpinTime || data.isSpinning) {
          console.log('[Poll] State update:', data);
          setRotation(data.rotation);
          setIsSpinning(data.isSpinning);
          setWinner(data.winner);
          setLastSpinTime(data.spinStartTime);
        }
      } catch (err) {
        console.error('[Poll] Error:', err);
      }
    };

    // Poll every 100ms
    const pollInterval = setInterval(pollState, 100);

    return () => {
      clearInterval(pollInterval);
    };
  }, [lastSpinTime]);

  const handleSpin = async () => {
    if (!isSpinning) {
      try {
        setError(null);
        const response = await fetch('/api/wheel', { 
          method: 'POST',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.message || 'Error spinning the wheel');
        } else {
          const data = await response.json();
          setLastSpinTime(data.spinStartTime);
        }
      } catch (err) {
        console.error('[Spin] Error:', err);
        setError('Error spinning the wheel. Please try again.');
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold mb-8">Giveaway Wheel</h1>
      <div className="mb-8">
        <SpinningWheel 
          entries={mockEntries} 
          rotation={rotation} 
          onSpinComplete={() => {}}
        />
      </div>
      <button
        className="px-6 py-2 bg-blue-500 text-white rounded-full font-semibold text-lg disabled:opacity-50"
        onClick={handleSpin}
        disabled={isSpinning}
      >
        {isSpinning ? 'Spinning...' : 'Spin the Wheel'}
      </button>
      {winner && (
        <div className="mt-8 text-2xl font-semibold">
          Winner: <span className="text-green-600">{winner}</span>
        </div>
      )}
      {error && (
        <div className="mt-4 text-red-600 font-semibold">
          {error}
        </div>
      )}
    </div>
  );
}


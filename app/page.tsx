'use client';

import { useState, useEffect } from 'react';
import SpinningWheel from '../components/SpinningWheel';

const mockEntries = [
  'John Doe',
  'Jane Smith',
  'Alice Johnson',
  'Bob Williams',
  'Charlie Brown',
  'Diana Davis',
  'Edward Evans',
  'Fiona Foster'
];
// cm
export default function Home() {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    
    const connectSSE = () => {
      if (eventSource) {
        eventSource.close();
      }

      eventSource = new EventSource('/api/wheel');
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setRotation(data.rotation);
          setIsSpinning(data.isSpinning);
          setError(null);
        } catch (err) {
          console.error('Error parsing SSE data:', err);
          setError('Error receiving updates. Please refresh the page.');
        }
      };

      eventSource.onerror = () => {
        console.error('SSE connection error');
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        
        // Clear any existing reconnect timeout
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
        }
        
        // Try to reconnect after a delay
        reconnectTimeout = setTimeout(connectSSE, 1000);
      };
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  const handleSpin = async () => {
    if (!isSpinning) {
      try {
        const response = await fetch('/api/wheel', { 
          method: 'POST',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (response.ok) {
          setWinner(null);
          setError(null);
        } else {
          const errorData = await response.json();
          setError(errorData.message || 'Error spinning the wheel');
        }
      } catch (err) {
        console.error('Error spinning the wheel:', err);
        setError('Error spinning the wheel. Please try again.');
      }
    }
  };

  const handleSpinComplete = () => {
    const winnerIndex = Math.floor(((360 - (rotation % 360)) / 360) * mockEntries.length);
    setWinner(mockEntries[winnerIndex]);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold mb-8">Giveaway Wheel</h1>
      <div className="mb-8">
        <SpinningWheel entries={mockEntries} rotation={rotation} onSpinComplete={handleSpinComplete} />
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


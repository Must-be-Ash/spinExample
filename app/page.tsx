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
      console.log('[SSE] Connecting to event source');
      if (eventSource) {
        console.log('[SSE] Closing existing connection');
        eventSource.close();
      }

      eventSource = new EventSource('/api/wheel');
      
      eventSource.onopen = () => {
        console.log('[SSE] Connection opened');
      };
      
      eventSource.onmessage = (event) => {
        console.log('[SSE] Received message:', event.data);
        try {
          const data = JSON.parse(event.data);
          console.log('[SSE] Parsed data:', data);
          setRotation(data.rotation);
          setIsSpinning(data.isSpinning);
          setWinner(data.winner);
          setError(null);
        } catch (err) {
          console.error('[SSE] Error parsing data:', err);
          setError('Error receiving updates. Please refresh the page.');
        }
      };

      eventSource.onerror = (error) => {
        console.error('[SSE] Connection error:', error);
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
        }
        
        console.log('[SSE] Scheduling reconnect');
        reconnectTimeout = setTimeout(connectSSE, 1000);
      };
    };

    connectSSE();

    return () => {
      console.log('[SSE] Cleaning up connection');
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
      console.log('[Spin] Initiating spin');
      try {
        const response = await fetch('/api/wheel', { 
          method: 'POST',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        console.log('[Spin] Response status:', response.status);
        if (!response.ok) {
          const errorData = await response.json();
          console.error('[Spin] Error response:', errorData);
          setError(errorData.message || 'Error spinning the wheel');
        }
      } catch (err) {
        console.error('[Spin] Request error:', err);
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


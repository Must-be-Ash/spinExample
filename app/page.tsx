'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [isConnected, setIsConnected] = useState(false);

  const connectSSE = useCallback(() => {
    console.log('[SSE] Connecting to event source');
    const eventSource = new EventSource('/api/wheel');
    
    eventSource.onopen = () => {
      console.log('[SSE] Connection opened');
      setIsConnected(true);
      setError(null);
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
      setIsConnected(false);
      eventSource.close();
      
      // Try to reconnect after a delay
      setTimeout(connectSSE, 1000);
    };

    return eventSource;
  }, []);

  useEffect(() => {
    const eventSource = connectSSE();
    return () => {
      console.log('[SSE] Cleaning up connection');
      eventSource.close();
    };
  }, [connectSSE]);

  const handleSpin = async () => {
    if (!isSpinning && isConnected) {
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
          
          // If we get a connection error, try to reconnect
          if (response.status === 503) {
            connectSSE();
          }
        }
      } catch (err) {
        console.error('[Spin] Request error:', err);
        setError('Error spinning the wheel. Please try again.');
        // On error, try to reconnect
        connectSSE();
      }
    } else if (!isConnected) {
      console.log('[Spin] Attempting to reconnect before spinning');
      connectSSE();
      setError('Connecting to server... Please try again in a moment.');
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
        disabled={isSpinning || !isConnected}
      >
        {!isConnected ? 'Connecting...' : isSpinning ? 'Spinning...' : 'Spin the Wheel'}
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


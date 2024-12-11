import { NextResponse } from 'next/server';

let currentRotation = 0;
let isSpinning = false;
let spinStartTime: number | null = null;
let spinEndTime: number | null = null;
let currentWinner: string | null = null;

const mockEntries = [
  'John Doe', 'Jane Smith', 'Alice Johnson', 'Bob Williams',
  'Charlie Brown', 'Diana Davis', 'Edward Evans', 'Fiona Foster'
];

interface SpinState {
  rotation: number;
  isSpinning: boolean;
  winner: string | null;
  timestamp: number;
  spinStartTime: number | null;
}

function createStateMessage(): SpinState {
  // Check if spin should be complete
  if (spinEndTime && Date.now() >= spinEndTime) {
    isSpinning = false;
    if (!currentWinner) {
      const winnerIndex = Math.floor(((360 - (currentRotation % 360)) / 360) * mockEntries.length);
      currentWinner = mockEntries[winnerIndex];
      console.log('[State] Winner selected:', currentWinner);
    }
  }

  return {
    rotation: currentRotation,
    isSpinning,
    winner: currentWinner,
    timestamp: Date.now(),
    spinStartTime
  };
}

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

// New endpoint to get current state
export async function GET() {
  return NextResponse.json(createStateMessage());
}

export async function POST() {
  console.log('[POST] Received spin request');

  if (!isSpinning) {
    try {
      isSpinning = true;
      currentWinner = null;
      currentRotation += 360 * 10 + Math.floor(Math.random() * 720);
      spinStartTime = Date.now();
      spinEndTime = Date.now() + 5000;
      
      console.log('[POST] New spin:', {
        rotation: currentRotation,
        startTime: spinStartTime,
        endTime: spinEndTime
      });

      return NextResponse.json({ 
        ...createStateMessage(),
        message: 'Wheel is spinning'
      });
    } catch (error) {
      console.error('[POST] Error during spin:', error);
      isSpinning = false;
      currentWinner = null;
      spinStartTime = null;
      spinEndTime = null;
      return NextResponse.json({ message: 'Error spinning wheel' }, { status: 500 });
    }
  }

  return NextResponse.json({ message: 'Wheel is already spinning' }, { status: 400 });
} 
import { NextResponse } from 'next/server';

const clients = new Set<ReadableStreamDefaultController>();
let currentRotation = 0;
let isSpinning = false;
let spinTimeout: NodeJS.Timeout | null = null;
let currentWinner: string | null = null;

interface SpinState {
  rotation: number;
  isSpinning: boolean;
  winner: string | null;
}

function cleanupClients() {
  const activeClients = Array.from(clients).filter(client => client.desiredSize !== null);
  clients.clear();
  activeClients.forEach(client => clients.add(client));
  return activeClients;
}

function broadcastToClients(state: SpinState) {
  const message = `data: ${JSON.stringify(state)}\n\n`;
  const activeClients = cleanupClients();
  activeClients.forEach(client => {
    try {
      client.enqueue(message);
    } catch (error) {
      console.error('Failed to broadcast to client:', error);
      clients.delete(client);
    }
  });
}

function createStateMessage(): SpinState {
  return {
    rotation: currentRotation,
    isSpinning,
    winner: currentWinner
  };
}

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      clients.add(controller);
      // Immediately send current state to new client
      controller.enqueue(`data: ${JSON.stringify(createStateMessage())}\n\n`);
    },
    cancel() {
      cleanupClients();
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

export async function POST() {
  if (spinTimeout) {
    clearTimeout(spinTimeout);
    spinTimeout = null;
  }

  if (!isSpinning) {
    try {
      isSpinning = true;
      currentWinner = null;
      currentRotation += 360 * 10 + Math.floor(Math.random() * 720);
      
      // Broadcast initial spin state
      broadcastToClients(createStateMessage());

      // Set timeout for spin completion
      spinTimeout = setTimeout(() => {
        isSpinning = false;
        // Calculate winner on the server
        const mockEntries = [
          'John Doe', 'Jane Smith', 'Alice Johnson', 'Bob Williams',
          'Charlie Brown', 'Diana Davis', 'Edward Evans', 'Fiona Foster'
        ];
        const winnerIndex = Math.floor(((360 - (currentRotation % 360)) / 360) * mockEntries.length);
        currentWinner = mockEntries[winnerIndex];
        
        // Broadcast final state with winner
        broadcastToClients(createStateMessage());
        spinTimeout = null;
      }, 5000);

      return NextResponse.json({ message: 'Wheel is spinning' });
    } catch (error) {
      console.error('Error during spin:', error);
      isSpinning = false;
      currentWinner = null;
      if (spinTimeout) {
        clearTimeout(spinTimeout);
        spinTimeout = null;
      }
      return NextResponse.json({ message: 'Error spinning wheel' }, { status: 500 });
    }
  }

  return NextResponse.json({ message: 'Wheel is already spinning' }, { status: 400 });
} 
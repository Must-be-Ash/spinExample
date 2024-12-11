import { NextResponse } from 'next/server';

const clients = new Set<ReadableStreamDefaultController>();
let currentRotation = 0;
let isSpinning = false;
let spinTimeout: NodeJS.Timeout | null = null;
let currentWinner: string | null = null;
let lastUpdateTime = Date.now();

interface SpinState {
  rotation: number;
  isSpinning: boolean;
  winner: string | null;
  timestamp: number;
}

function cleanupClients() {
  console.log(`[Cleanup] Before cleanup: ${clients.size} clients`);
  const activeClients = Array.from(clients).filter(client => {
    const isActive = client.desiredSize !== null;
    if (!isActive) {
      console.log('[Cleanup] Removing inactive client');
    }
    return isActive;
  });
  clients.clear();
  activeClients.forEach(client => clients.add(client));
  console.log(`[Cleanup] After cleanup: ${clients.size} clients`);
  return activeClients;
}

function broadcastToClients(state: SpinState) {
  console.log('[Broadcast] Sending state:', state);
  const message = `data: ${JSON.stringify(state)}\n\n`;
  const activeClients = cleanupClients();
  console.log(`[Broadcast] Broadcasting to ${activeClients.length} clients`);
  
  activeClients.forEach(client => {
    try {
      client.enqueue(new TextEncoder().encode(message));
      console.log('[Broadcast] Successfully sent to client');
    } catch (error) {
      console.error('[Broadcast] Failed to send to client:', error);
      clients.delete(client);
    }
  });
}

function createStateMessage(): SpinState {
  const state = {
    rotation: currentRotation,
    isSpinning,
    winner: currentWinner,
    timestamp: Date.now()
  };
  console.log('[State] Current state:', state);
  return state;
}

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET() {
  console.log('[GET] New connection request');
  
  if (Date.now() - lastUpdateTime > 10000) {
    console.log('[GET] Resetting stale state');
    isSpinning = false;
    currentWinner = null;
    if (spinTimeout) {
      clearTimeout(spinTimeout);
      spinTimeout = null;
    }
  }

  const stream = new ReadableStream({
    start(controller) {
      console.log('[Stream] Starting new stream');
      clients.add(controller);
      
      // Send initial state
      const initialState = createStateMessage();
      const initialMessage = `data: ${JSON.stringify(initialState)}\n\n`;
      controller.enqueue(new TextEncoder().encode(initialMessage));
      console.log('[Stream] Sent initial state');

      // Keepalive
      const keepaliveInterval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': keepalive\n\n'));
          console.log('[Stream] Sent keepalive');
        } catch (error) {
          console.error('[Stream] Keepalive failed:', error);
          clearInterval(keepaliveInterval);
        }
      }, 15000);
    },
    cancel() {
      console.log('[Stream] Stream cancelled');
      cleanupClients();
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

export async function POST() {
  console.log('[POST] Received spin request');
  console.log('[POST] Current state:', { isSpinning, currentRotation });

  if (spinTimeout) {
    console.log('[POST] Clearing existing timeout');
    clearTimeout(spinTimeout);
    spinTimeout = null;
  }

  if (!isSpinning) {
    try {
      console.log('[POST] Starting new spin');
      isSpinning = true;
      currentWinner = null;
      currentRotation += 360 * 10 + Math.floor(Math.random() * 720);
      lastUpdateTime = Date.now();
      
      console.log('[POST] New rotation:', currentRotation);
      broadcastToClients(createStateMessage());

      spinTimeout = setTimeout(() => {
        console.log('[Timeout] Spin complete');
        isSpinning = false;
        const mockEntries = [
          'John Doe', 'Jane Smith', 'Alice Johnson', 'Bob Williams',
          'Charlie Brown', 'Diana Davis', 'Edward Evans', 'Fiona Foster'
        ];
        const winnerIndex = Math.floor(((360 - (currentRotation % 360)) / 360) * mockEntries.length);
        currentWinner = mockEntries[winnerIndex];
        lastUpdateTime = Date.now();
        
        console.log('[Timeout] Winner selected:', currentWinner);
        broadcastToClients(createStateMessage());
        spinTimeout = null;
      }, 5000);

      return NextResponse.json({ message: 'Wheel is spinning', rotation: currentRotation });
    } catch (error) {
      console.error('[POST] Error during spin:', error);
      isSpinning = false;
      currentWinner = null;
      if (spinTimeout) {
        clearTimeout(spinTimeout);
        spinTimeout = null;
      }
      return NextResponse.json({ message: 'Error spinning wheel' }, { status: 500 });
    }
  }

  console.log('[POST] Wheel already spinning');
  return NextResponse.json({ message: 'Wheel is already spinning' }, { status: 400 });
} 
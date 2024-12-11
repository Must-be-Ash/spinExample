import { NextResponse } from 'next/server';

const clients = new Set<ReadableStreamDefaultController>();
let currentRotation = 0;
let isSpinning = false;
let spinTimeout: NodeJS.Timeout | null = null;

function cleanupClients() {
  const activeClients = Array.from(clients).filter(client => client.desiredSize !== null);
  clients.clear();
  activeClients.forEach(client => clients.add(client));
  return activeClients;
}

function broadcastToClients(message: string) {
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

function createStateMessage() {
  return `data: ${JSON.stringify({ rotation: currentRotation, isSpinning })}\n\n`;
}

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      clients.add(controller);
      // Immediately send current state to new client
      controller.enqueue(createStateMessage());
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
  // Clear any existing timeout
  if (spinTimeout) {
    clearTimeout(spinTimeout);
    spinTimeout = null;
  }

  if (!isSpinning) {
    try {
      isSpinning = true;
      currentRotation += 360 * 10 + Math.floor(Math.random() * 720);
      
      // Broadcast initial spin state
      broadcastToClients(createStateMessage());

      // Set timeout for spin completion
      spinTimeout = setTimeout(() => {
        isSpinning = false;
        broadcastToClients(createStateMessage());
        spinTimeout = null;
      }, 5000);

      return NextResponse.json({ 
        message: 'Wheel is spinning',
        rotation: currentRotation,
        isSpinning: true 
      });
    } catch (error) {
      console.error('Error during spin:', error);
      isSpinning = false;
      if (spinTimeout) {
        clearTimeout(spinTimeout);
        spinTimeout = null;
      }
      return NextResponse.json({ message: 'Error spinning wheel' }, { status: 500 });
    }
  }

  return NextResponse.json({ message: 'Wheel is already spinning' }, { status: 400 });
} 
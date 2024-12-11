import { NextResponse } from 'next/server';

const clients = new Set<ReadableStreamDefaultController>();
let currentRotation = 0;
let isSpinning = false;

function cleanupClients() {
  // Convert Set to Array for iteration and filtering
  const activeClients = Array.from(clients).filter(client => client.desiredSize !== null);
  clients.clear();
  activeClients.forEach(client => clients.add(client));
  return activeClients;
}

function broadcastToClients(message: string) {
  const activeClients = cleanupClients();
  activeClients.forEach(client => {
    client.enqueue(message);
  });
}

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      clients.add(controller);
      controller.enqueue(`data: ${JSON.stringify({ rotation: currentRotation, isSpinning })}\n\n`);
    },
    cancel() {
      cleanupClients();
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export async function POST() {
  if (!isSpinning) {
    isSpinning = true;
    currentRotation += 360 * 10 + Math.floor(Math.random() * 720);
    
    broadcastToClients(`data: ${JSON.stringify({ rotation: currentRotation, isSpinning })}\n\n`);

    setTimeout(() => {
      isSpinning = false;
      broadcastToClients(`data: ${JSON.stringify({ rotation: currentRotation, isSpinning })}\n\n`);
    }, 5000);

    return NextResponse.json({ message: 'Wheel is spinning' });
  }

  return NextResponse.json({ message: 'Wheel is already spinning' }, { status: 400 });
} 
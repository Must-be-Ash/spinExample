import { NextResponse } from 'next/server';

let clients = new Set<ReadableStreamDefaultController>();
let currentRotation = 0;
let isSpinning = false;

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      clients.add(controller);
      controller.enqueue(`data: ${JSON.stringify({ rotation: currentRotation, isSpinning })}\n\n`);
    },
    cancel() {
      clients.delete(controller);
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
    
    clients.forEach(client => {
      client.enqueue(`data: ${JSON.stringify({ rotation: currentRotation, isSpinning })}\n\n`);
    });

    setTimeout(() => {
      isSpinning = false;
      clients.forEach(client => {
        client.enqueue(`data: ${JSON.stringify({ rotation: currentRotation, isSpinning })}\n\n`);
      });
    }, 5000);

    return NextResponse.json({ message: 'Wheel is spinning' });
  }

  return NextResponse.json({ message: 'Wheel is already spinning' }, { status: 400 });
} 
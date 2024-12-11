import { NextApiRequest, NextApiResponse } from 'next';

let clients: NextApiResponse[] = [];
let currentRotation = 0;
let isSpinning = false;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    clients.push(res);

    req.on('close', () => {
      clients = clients.filter(client => client !== res);
    });

    res.write(`data: ${JSON.stringify({ rotation: currentRotation, isSpinning })}\n\n`);
  } else if (req.method === 'POST') {
    if (!isSpinning) {
      isSpinning = true;
      currentRotation += 360 * 10 + Math.floor(Math.random() * 720);
      clients.forEach(client => {
        client.write(`data: ${JSON.stringify({ rotation: currentRotation, isSpinning })}\n\n`);
      });
      res.status(200).json({ message: 'Wheel is spinning' });

      setTimeout(() => {
        isSpinning = false;
        clients.forEach(client => {
          client.write(`data: ${JSON.stringify({ rotation: currentRotation, isSpinning })}\n\n`);
        });
      }, 5000);
    } else {
      res.status(400).json({ message: 'Wheel is already spinning' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}


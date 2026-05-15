import { POST } from '../app/api/compose+api';

export const config = { runtime: 'edge' };

export default function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return Promise.resolve(new Response('Method Not Allowed', { status: 405 }));
  return POST(request);
}

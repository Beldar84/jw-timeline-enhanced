const METERED_API_URL = 'https://jwtimeline.metered.live/api/v1/turn/credentials';

type JsonResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => {
    json: (body: unknown) => void;
    end?: () => void;
  };
};

export default async function handler(
  req: { method?: string },
  res: JsonResponse
) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.METERED_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'TURN credentials are not configured' });
    return;
  }

  try {
    const response = await fetch(`${METERED_API_URL}?apiKey=${encodeURIComponent(apiKey)}`);
    if (!response.ok) {
      res.status(502).json({ error: 'Could not fetch TURN credentials' });
      return;
    }

    const iceServers = await response.json();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=300');
    res.status(200).json(iceServers);
  } catch (error) {
    res.status(502).json({ error: 'Could not fetch TURN credentials' });
  }
}

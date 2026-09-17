module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const { url } = req.body || {};
  if (!url) {
    res.status(400).json({ error: 'url is required' });
    return;
  }

  let target;
  try {
    target = new URL(url);
  } catch {
    res.status(400).json({ error: 'invalid url' });
    return;
  }

  try {
    const endpoint =
      'https://api.microlink.io/?url=' +
      encodeURIComponent(target.toString()) +
      '&screenshot=true&meta=true&waitUntil=networkidle0&waitFor=4000';

    const response = await fetch(endpoint);
    const data = await response.json();

    if (data.status !== 'success') {
      res.status(502).json({ error: 'could not fetch preview for that url' });
      return;
    }

    const { title } = data.data || {};
    const imageUrl = data.data?.screenshot?.url || '';

    res.status(200).json({
      name: title || '',
      imageUrl,
    });
  } catch (err) {
    res.status(502).json({ error: 'could not fetch preview for that url' });
  }
};

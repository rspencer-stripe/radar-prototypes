const { getSettings, updateSettings } = require('../lib/db');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    res.status(200).json(await getSettings());
    return;
  }

  if (req.method === 'PUT') {
    const { authors, tags } = req.body || {};
    if (!authors && !tags) {
      res.status(400).json({ error: 'authors or tags is required' });
      return;
    }
    res.status(200).json(await updateSettings({ authors, tags }));
    return;
  }

  res.status(405).json({ error: 'method not allowed' });
};

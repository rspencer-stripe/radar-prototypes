const { reorderPrototypes } = require('../../lib/store');

module.exports = async (req, res) => {
  if (req.method !== 'PUT') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const { ids } = req.body || {};
  if (!Array.isArray(ids) || !ids.length) {
    res.status(400).json({ error: 'ids is required' });
    return;
  }

  res.status(200).json(await reorderPrototypes(ids));
};

const { renameTag, reassignTag } = require('../lib/store');

module.exports = async (req, res) => {
  if (req.method === 'PUT') {
    const { oldTag, newTag } = req.body || {};
    if (!oldTag || !newTag) {
      res.status(400).json({ error: 'oldTag and newTag are required' });
      return;
    }
    await renameTag(oldTag, newTag);
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method === 'DELETE') {
    const { tag, fallback } = req.body || {};
    if (!tag) {
      res.status(400).json({ error: 'tag is required' });
      return;
    }
    await reassignTag(tag, fallback);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'method not allowed' });
};

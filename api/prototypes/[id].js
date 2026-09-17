const { getPrototype, updatePrototype, deletePrototype } = require('../../lib/store');

module.exports = async (req, res) => {
  const { id } = req.query;

  const existing = await getPrototype(id);
  if (!existing) {
    res.status(404).json({ error: 'not found' });
    return;
  }

  if (req.method === 'PUT') {
    const { name, author, imageUrl, link, description, pinned, type } = req.body || {};
    const updated = await updatePrototype(id, { name, author, imageUrl, link, description, pinned, type });
    res.status(200).json(updated);
    return;
  }

  if (req.method === 'DELETE') {
    await deletePrototype(id);
    res.status(204).end();
    return;
  }

  res.status(405).json({ error: 'method not allowed' });
};

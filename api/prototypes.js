const { listPrototypes, createPrototype } = require('../lib/store');
const { withErrorHandling } = require('../lib/handler');

module.exports = withErrorHandling(async (req, res) => {
  if (req.method === 'GET') {
    res.status(200).json(await listPrototypes());
    return;
  }

  if (req.method === 'POST') {
    const { name, author, imageUrl, link, description, type } = req.body || {};
    if (!name || !author) {
      res.status(400).json({ error: 'name and author are required' });
      return;
    }
    res.status(201).json(await createPrototype({ name, author, imageUrl, link, description, type }));
    return;
  }

  res.status(405).json({ error: 'method not allowed' });
});

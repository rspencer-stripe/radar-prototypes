const { sql, ensureTable, toClient } = require('../lib/db');

module.exports = async (req, res) => {
  await ensureTable();

  if (req.method === 'GET') {
    const { rows } = await sql`SELECT * FROM prototypes ORDER BY pinned DESC, sort_order ASC`;
    res.status(200).json(rows.map(toClient));
    return;
  }

  if (req.method === 'POST') {
    const { name, author, imageUrl, link, description, type } = req.body || {};
    if (!name || !author) {
      res.status(400).json({ error: 'name and author are required' });
      return;
    }
    const { rows } = await sql`
      INSERT INTO prototypes (name, author, image_url, link, description, type, sort_order)
      VALUES (${name}, ${author}, ${imageUrl || ''}, ${link || ''}, ${description || ''}, ${type || 'Prototype'}, -extract(epoch from now()))
      RETURNING *
    `;
    res.status(201).json(toClient(rows[0]));
    return;
  }

  res.status(405).json({ error: 'method not allowed' });
};

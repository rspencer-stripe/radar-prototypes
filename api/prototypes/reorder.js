const { sql, ensureTable, toClient } = require('../../lib/db');

module.exports = async (req, res) => {
  await ensureTable();

  if (req.method !== 'PUT') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const { ids } = req.body || {};
  if (!Array.isArray(ids) || !ids.length) {
    res.status(400).json({ error: 'ids is required' });
    return;
  }

  for (let i = 0; i < ids.length; i++) {
    await sql`UPDATE prototypes SET sort_order = ${i} WHERE id = ${ids[i]}`;
  }

  const { rows } = await sql`SELECT * FROM prototypes ORDER BY pinned DESC, sort_order ASC`;
  res.status(200).json(rows.map(toClient));
};

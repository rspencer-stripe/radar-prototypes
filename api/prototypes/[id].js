const { sql, ensureTable, toClient } = require('../../lib/db');

module.exports = async (req, res) => {
  await ensureTable();
  const { id } = req.query;

  const { rows: existingRows } = await sql`SELECT * FROM prototypes WHERE id = ${id}`;
  const existing = existingRows[0];
  if (!existing) {
    res.status(404).json({ error: 'not found' });
    return;
  }

  if (req.method === 'PUT') {
    const { name, author, imageUrl, link, description, pinned, type } = req.body || {};
    const { rows } = await sql`
      UPDATE prototypes SET
        name = ${name ?? existing.name},
        author = ${author ?? existing.author},
        image_url = ${imageUrl ?? existing.image_url},
        link = ${link ?? existing.link},
        description = ${description ?? existing.description},
        pinned = ${pinned ?? existing.pinned},
        type = ${type ?? existing.type}
      WHERE id = ${id}
      RETURNING *
    `;
    res.status(200).json(toClient(rows[0]));
    return;
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM prototypes WHERE id = ${id}`;
    res.status(204).end();
    return;
  }

  res.status(405).json({ error: 'method not allowed' });
};

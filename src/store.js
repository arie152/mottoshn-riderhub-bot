import fs from 'node:fs';

export function createStore(filePath = './db/reservations.json') {
  fs.mkdirSync('./db', { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({ nextId: 1, reservations: [] }, null, 2));
  }

  const read = () => JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const write = (data) => fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  return {
    getAll() {
      return read().reservations;
    },
    reserve(payload) {
      const data = read();
      const taken = data.reservations.find(
        (r) => r.riderNumber === payload.riderNumber && ['pending', 'confirmed'].includes(r.status)
      );
      if (taken) return null;

      const item = {
        id: data.nextId,
        ...payload,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      data.nextId += 1;
      data.reservations.push(item);
      write(data);
      return item;
    },
    confirmById(id) {
      const data = read();
      const item = data.reservations.find((r) => r.id === id);
      if (!item) return false;
      item.status = 'confirmed';
      item.updatedAt = new Date().toISOString();
      write(data);
      return true;
    },
  };
}

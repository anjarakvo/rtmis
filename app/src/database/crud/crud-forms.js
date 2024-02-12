import { conn, query } from '../';
import crudUsers from './crud-users';

const db = conn.init;

const formsQuery = () => {
  return {
    selectLatestFormVersion: async ({ user }) => {
      const latest = 1;
      const selectJoin = `SELECT
          f.id,
          f.userId,
          f.formId,
          f.version,
          f.name,
          f.json,
          COUNT(
            DISTINCT CASE WHEN dp.submitted = 1
            THEN dp.id END
          ) AS submitted,
          COUNT(
            DISTINCT CASE WHEN dp.submitted = 0
            AND dp.syncedAt IS NULL THEN dp.id END
          ) AS draft,
          COUNT(
            DISTINCT CASE WHEN dp.submitted = 1
            AND dp.syncedAt IS NOT NULL THEN dp.id END
          ) AS synced
        FROM forms f
        LEFT JOIN datapoints dp ON f.id = dp.form AND dp.user = ?
        WHERE f.latest = ?
        GROUP BY f.id, f.formId, f.version, f.name, f.json;`;
      const { rows } = await conn.tx(db, selectJoin, [user, latest]);
      if (!rows.length) {
        return [];
      }
      return rows._array;
    },
    selectFormById: async ({ id }) => {
      const { rows } = await conn.tx(db, query.read('forms', { id }), [id]);
      if (!rows.length) {
        return {};
      }
      return rows._array[0];
    },
    selectFormByIdAndVersion: async ({ id: formId, version }) => {
      const { rows } = await conn.tx(db, query.read('forms', { formId, version }), [
        formId,
        version,
      ]);
      if (!rows.length) {
        return false;
      }
      return rows._array[0];
    },
    addForm: async ({ userId, id: formId, version, formJSON }) => {
      const insertQuery = query.insert('forms', {
        userId: userId || 0,
        formId: formId,
        version: version,
        latest: 1,
        name: formJSON?.name || null,
        json: formJSON ? JSON.stringify(formJSON).replace(/'/g, "''") : null,
        createdAt: new Date().toISOString(),
      });
      return await conn.tx(db, insertQuery, []);
    },
    updateForm: async ({ userId, formId, version, formJSON, latest = 1 }) => {
      const fieldsToUpdate = {};
      if (userId !== undefined) fieldsToUpdate.userId = userId;
      if (version !== undefined) fieldsToUpdate.version = version;
      if (formJSON !== undefined)
        fieldsToUpdate.json = JSON.stringify(formJSON).replace(/'/g, "''");
      if (latest !== undefined) fieldsToUpdate.latest = latest;
      if (formJSON?.name) fieldsToUpdate.name = formJSON.name;

      if (Object.keys(fieldsToUpdate).length === 0) {
        throw new Error('No fields provided for update');
      }

      const setSQL = Object.entries(fieldsToUpdate)
        .map(([key, value]) => `${key} = '${value}'`)
        .join(', ');

      const updateQuery = `UPDATE forms SET ${setSQL} WHERE formId = '${formId}'`;

      return await conn.tx(db, updateQuery, []);
    },
    getMyForms: async () => {
      const session = await crudUsers.getActiveUser();
      const sqlQuery = 'SELECT id, name, formId FROM forms WHERE userId = ?';
      const { rows } = await conn.tx(db, sqlQuery, [session.id]);

      if (!rows.length) {
        return {};
      }
      return rows._array;
    },
  };
};

const crudForms = formsQuery();

export default crudForms;

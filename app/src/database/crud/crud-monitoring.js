import { conn, query } from '../';

const db = conn.init;

const monitoringQuery = () => {
  return {
    addForm: async ({ formId, formJSON }) => {
      const insertQuery = query.insert('monitoring', {
        formId: formId,
        uuid: formJSON.uuid,
        administration: formJSON?.administration,
        name: formJSON?.datapoint_name || null,
        json: formJSON ? JSON.stringify(formJSON.answers).replace(/'/g, "''") : null,
        syncedAt: new Date().toISOString(),
      });
      return await conn.tx(db, insertQuery, []);
    },
    getAllForms: async () => {
      const sqlQuery = 'SELECT formId FROM monitoring';
      const { rows } = await conn.tx(db, sqlQuery);

      if (!rows.length) {
        return {};
      }
      return rows._array;
    },
    getFormsPaginated: async ({ formId, search = '', limit = 10, offset = 0 }) => {
      let sqlQuery = 'SELECT name FROM monitoring WHERE formId = $1';
      const queryParams = [formId];

      if (search.trim() !== '') {
        sqlQuery += ' AND LOWER(name) LIKE LOWER($2)';
        queryParams.push(`%${search}%`);
      }

      sqlQuery += ' ORDER BY syncedAt DESC LIMIT $3 OFFSET $4';
      queryParams.push(limit, offset);

      const { rows } = await conn.tx(db, sqlQuery, queryParams);

      if (!rows.length) {
        return [];
      }
      return rows._array;
    },
  };
};

const crudMonitoring = monitoringQuery();

export default crudMonitoring;

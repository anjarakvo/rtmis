import { conn, query } from '..';
import { SUBMISSION_TYPES } from '../../lib/constants';

const db = conn.init;
const TABLE_NAME = 'certifications';

const certificationQuery = () => ({
  syncForm: async ({ formId, administrationdId, formJSON }) => {
    const findQuery = query.read(TABLE_NAME, { uuid: formJSON.uuid });
    const { rows } = await conn.tx(db, findQuery, [formJSON.uuid]);

    const isCertified = parseInt(formJSON?.submission_type, 10) === SUBMISSION_TYPES.certification;

    let params = [];
    let queryText = query.insert(TABLE_NAME, {
      formId,
      administrationdId,
      uuid: formJSON.uuid,
      name: formJSON?.datapoint_name || null,
      json: formJSON?.answers ? JSON.stringify(formJSON.answers).replace(/'/g, "''") : null,
      syncedAt: new Date().toISOString(),
      isCertified,
    });

    if (rows.length) {
      queryText = query.update(
        TABLE_NAME,
        { id: rows._array[0].id },
        {
          json: formJSON?.answers
            ? JSON.stringify(formJSON.answers).replace(/'/g, "''")
            : rows._array[0].json,
          isCertified,
        },
      );
      params = [rows._array[0].id];
    }
    const res = await conn.tx(db, queryText, params);
    return res;
  },
  getTotal: async (formId, search) => {
    const querySQL = search.length
      ? `SELECT COUNT(*) AS count FROM ${TABLE_NAME} where formId = ? AND name LIKE ? COLLATE NOCASE`
      : `SELECT COUNT(*) AS count FROM ${TABLE_NAME} where formId = ? `;
    const params = search.length ? [formId, `%${search}%`] : [formId];
    const { rows } = await conn.tx(db, querySQL, params);
    return rows._array?.[0]?.count;
  },
  getPagination: async ({ formId, search = '', limit = 10, offset = 0 }) => {
    let sqlQuery = `SELECT * FROM ${TABLE_NAME} WHERE formId = $1`;
    const queryParams = [formId];

    if (search.trim() !== '') {
      sqlQuery += ' AND name LIKE $2 COLLATE NOCASE';
      queryParams.push(`%${search}%`);
    }

    sqlQuery += ' ORDER BY syncedAt DESC LIMIT $3 OFFSET $4';
    queryParams.push(limit, offset * limit);
    const { rows } = await conn.tx(db, sqlQuery, queryParams);

    if (!rows.length) {
      return [];
    }
    return rows._array;
  },
  updateIsCertified: async (formId, uuid) => {
    try {
      const updateQuery = query.update(TABLE_NAME, { formId, uuid }, { isCertified: 1 });
      return await conn.tx(db, updateQuery, [formId, uuid]);
    } catch {
      return null;
    }
  },
});

const crudCertification = certificationQuery();

export default crudCertification;

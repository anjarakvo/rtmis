import { crudMonitoring } from '../database/crud';
import { DatapointSyncState } from '../store';
import api from './api';

export const fetchDatapoints = async (pageNumber = 1) => {
  try {
    const { data: apiData } = await api.get(`/datapoint-list?page=${pageNumber}`);
    const { data, total_page: totalPage, current: page } = apiData;
    DatapointSyncState.update((s) => {
      s.progress = (page / totalPage) * 100;
    });
    if (page < totalPage) {
      return data.concat(await fetchDatapoints(page + 1));
    }
    return data;
  } catch (error) {
    return Promise.reject(error);
  }
};

export const downloadDatapointsJson = async ({ formId, url, lastUpdated }) => {
  try {
    const response = await api.get(url);
    if (response.status === 200) {
      const jsonData = response.data;
      const res = await crudMonitoring.syncForm({
        formId,
        lastUpdated,
        formJSON: jsonData,
      });
      // eslint-disable-next-line no-console
      console.info('[SYNCED MONITORING]', res);
    }
  } catch (error) {
    Promise.reject(error);
  }
};

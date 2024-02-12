import React, { useEffect, useState } from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ToastAndroid, View } from 'react-native';
import { Button, ListItem } from '@rneui/themed';
import { BaseLayout } from '../components';
import { UIState, FormState, UserState } from '../store';
import { i18n, api } from '../lib';
import { getCurrentTimestamp } from '../form/lib';
import { crudForms } from '../database/crud';
import crudJobs, { SYNC_DATAPOINT_JOB_NAME, jobStatus } from '../database/crud/crud-jobs';
import * as Network from 'expo-network';

const ManageForm = ({ navigation, route }) => {
  const draftCount = FormState.useState((s) => s.form?.draft);
  const submittedCount = FormState.useState((s) => s.form?.submitted);
  const activeLang = UIState.useState((s) => s.lang);
  const trans = i18n.text(activeLang);
  const userId = UserState.useState((s) => s.id);
  const [syncLoading, setSyncLoading] = useState(false);
  const [networkState, setNetworkState] = useState(null);

  const goToNewForm = () => {
    FormState.update((s) => {
      s.surveyStart = getCurrentTimestamp();
      s.prefilled = false;
    });
    navigation.navigate('FormPage', { ...route?.params, newSubmission: true });
  };

  const goToUpdateForm = () => {
    FormState.update((s) => {
      s.surveyStart = getCurrentTimestamp();
      s.prefilled = false;
    });
    navigation.navigate('UpdateForm', { ...route?.params, monitoring: true, newSubmission: true });
  };

  const items = [
    {
      id: 1,
      text: trans.manageNewBlank,
      icon: 'clipboard-outline',
      goTo: goToNewForm,
    },
    // /* TODO: Enable this when we have a way to update a form
    {
      id: 2,
      text: trans.manageUpdate,
      icon: 'clipboard-edit-outline',
      goTo: goToUpdateForm,
    },
    // */
    {
      id: 3,
      text: `${trans.manageEditSavedForm} (${draftCount})`,
      icon: 'folder-open',
      goTo: () => navigation.navigate('FormData', { ...route?.params, showSubmitted: false }),
    },
    {
      id: 4,
      text: `${trans.manageViewSubmitted} (${submittedCount})`,
      icon: 'eye',
      goTo: () => navigation.navigate('FormData', { ...route?.params, showSubmitted: true }),
    },
  ];

  const handleGetForm = async (userID) => {
    try {
      const formRes = await api.get(`/form/${route.params.formId}`);
      const apiData = formRes.data;

      if (apiData.cascades) {
        apiData.cascades.forEach((cascadeFile) => {
          const downloadUrl = api.getConfig().baseURL + cascadeFile;
          cascades.download(downloadUrl, cascadeFile);
        });
      }

      const savedForm = await crudForms.updateForm({
        formId: route.params.formId,
        version: apiData.version,
        userId: userID,
        formJSON: apiData,
        latest: 1,
      });
      console.info('Saved Form...', savedForm);
    } catch (error) {
      console.error('Error handling form:', error);
    }
  };

  const handleOnSyncClick = async () => {
    if (!networkState?.isConnected) {
      return;
    }
    try {
      await handleGetForm(userId);
      await crudJobs.addJob({
        form: route.params.formId,
        user: userId,
        type: SYNC_DATAPOINT_JOB_NAME,
        status: jobStatus.PENDING,
      });
    } catch (error) {
      ToastAndroid.show(`[ERROR SYNC DATAPOINT]: ${error}`, ToastAndroid.LONG);
    }
  };

  useEffect(() => {
    const unsubscribeDataSyncActiveForms = UserState.subscribe(
      (s) => s.dataSyncActiveForms,
      (activeForms) => {
        if (!syncLoading && activeForms?.[route.params.formId]) {
          setSyncLoading(true);
        }
        if (syncLoading && !activeForms?.[route.params.formId]) {
          setSyncLoading(false);
        }
      },
    );

    return () => {
      unsubscribeDataSyncActiveForms();
    };
  }, [route.params.formId, syncLoading]);

  useEffect(() => {
    const fetchNetworkState = async () => {
      const state = await Network.getNetworkStateAsync();
      setNetworkState(state);
    };

    fetchNetworkState();
  }, []);

  return (
    <BaseLayout title={route?.params?.name} rightComponent={false}>
      <BaseLayout.Content>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 16,
          }}
        >
          {items.map((i, ix) => (
            <ListItem key={ix} onPress={() => i.goTo()} testID={`goto-item-${ix}`}>
              <Icon name={i.icon} color="grey" size={18} />
              <ListItem.Content>
                <ListItem.Title>{i.text}</ListItem.Title>
              </ListItem.Content>
              <ListItem.Chevron />
            </ListItem>
          ))}
        </View>
      </BaseLayout.Content>
      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <Button
          title={
            syncLoading
              ? trans.loadingText
              : networkState?.isConnected
              ? trans.syncDataPointBtn
              : trans.connectToInternet
          }
          disabled={syncLoading || !networkState?.isConnected}
          type="outline"
          onPress={handleOnSyncClick}
        />
      </View>
    </BaseLayout>
  );
};

export default ManageForm;

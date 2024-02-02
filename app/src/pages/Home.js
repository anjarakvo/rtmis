import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@rneui/themed';
import Icon from 'react-native-vector-icons/Ionicons';
import { Platform, ToastAndroid } from 'react-native';
import { BaseLayout } from '../components';
import { FormState, UserState, UIState, BuildParamsState } from '../store';
import { crudForms } from '../database/crud';
import { i18n } from '../lib';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';

const Home = ({ navigation, route }) => {
  const params = route?.params || null;
  const [search, setSearch] = useState(null);
  const [data, setData] = useState([]);
  const [appLang, setAppLang] = useState('en');
  const [loading, setloading] = useState(true);

  const locationIsGranted = UserState.useState((s) => s.locationIsGranted);
  const gpsThreshold = BuildParamsState.useState((s) => s.gpsThreshold);
  const gpsInterval = BuildParamsState.useState((s) => s.gpsInterval);
  const isManualSynced = UIState.useState((s) => s.isManualSynced);
  const activeLang = UIState.useState((s) => s.lang);
  const trans = i18n.text(activeLang);

  const { id: currentUserId, name: currentUserName } = UserState.useState((s) => s);
  const subTitleText = currentUserName ? `${trans.userLabel} ${currentUserName}` : null;

  const goToManageForm = (id) => {
    const findForm = data.find((d) => d?.id === id);
    FormState.update((s) => {
      s.form = findForm;
    });
    navigation.navigate('ManageForm', { id: id, name: findForm.name });
  };

  const goToUsers = () => {
    navigation.navigate('Users');
  };

  const getUserForms = useCallback(async () => {
    /**
     * The Form List will be refreshed when:
     * - parameter change
     * - current user id exists
     * - active language change
     * - manual synced change as True
     */
    if (params || currentUserId || activeLang !== appLang || isManualSynced) {
      if (activeLang !== appLang) {
        setAppLang(activeLang);
      }

      if (isManualSynced) {
        UIState.update((s) => {
          s.isManualSynced = false;
        });
      }
      try {
        const results = await crudForms.selectLatestFormVersion({ user: currentUserId });
        const forms = results
          .map((r) => ({
            ...r,
            subtitles: [
              `${trans.versionLabel}${r.version}`,
              `${trans.submittedLabel}${r.submitted}`,
              `${trans.draftLabel}${r.draft}`,
              `${trans.syncLabel}${r.synced}`,
            ],
          }))
          .filter((r) => r?.userId === currentUserId);
        setData(forms);
        setloading(false);
      } catch (error) {
        if (Platform.OS === 'android') {
          ToastAndroid.show(`SQL: ${error}`, ToastAndroid.SHORT);
        }
      }
    }
  }, [currentUserId, params, appLang, activeLang, isManualSynced]);

  useEffect(() => {
    getUserForms();
  }, [getUserForms]);

  useEffect(() => {
    if (loading) {
      if (Platform.OS === 'android') {
        ToastAndroid.show(trans.downloadingData, ToastAndroid.SHORT);
      }
    }
  }, [loading]);

  const filteredData = useMemo(() => {
    return data.filter(
      (d) => (search && d?.name?.toLowerCase().includes(search.toLowerCase())) || !search,
    );
  }, [data, search]);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      getUserForms();
    });

    return () => subscription.remove();
  }, []);

  const watchCurrentPosition = useCallback(async () => {
    if (!locationIsGranted) {
      return;
    }
    const timeInterval = gpsInterval * 1000; // miliseconds
    const watch = await Location.watchPositionAsync(
      {
        accuracy: gpsThreshold,
        timeInterval,
      },
      (res) => {
        UserState.update((s) => {
          s.currentLocation = res;
        });
      },
    );
    return watch;
  }, [gpsThreshold, gpsInterval, locationIsGranted]);

  useEffect(() => {
    /**
     * Subscribe to the user's current location
     * @tutorial https://docs.expo.dev/versions/latest/sdk/location/#locationwatchpositionasyncoptions-callback
     */
    const watch = watchCurrentPosition();
    return () => watch.remove();
  }, [watchCurrentPosition]);

  return (
    <BaseLayout
      title={trans.homePageTitle}
      subTitle={subTitleText}
      search={{
        show: true,
        placeholder: trans.homeSearch,
        value: search,
        action: setSearch,
      }}
      leftComponent={
        <Button type="clear" testID="button-users" onPress={goToUsers}>
          <Icon name="person" size={18} />
        </Button>
      }
    >
      <BaseLayout.Content data={filteredData} action={goToManageForm} columns={2} />
    </BaseLayout>
  );
};

export default Home;

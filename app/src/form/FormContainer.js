import React, { useState, useMemo } from 'react';
import { BaseLayout } from '../components';
import { View } from 'react-native';
import { FormNavigation, QuestionGroupList } from './support';
import QuestionGroup from './components/QuestionGroup';
import { transformForm, generateDataPointName } from './lib';
import { FormState } from '../store';
import { Dialog } from '@rneui/themed';
import { i18n } from '../lib';

// TODO:: Allow other not supported yet
// TODO:: Repeat group not supported yet

const checkValuesBeforeCallback = (values) =>
  Object.keys(values)
    .map((key) => {
      let value = values[key];
      if (typeof value === 'string') {
        value = value.trim();
      }
      // check array
      if (value && Array.isArray(value)) {
        const check = value.filter((y) => typeof y !== 'undefined' && (y || isNaN(y)));
        value = check.length ? check : null;
      }
      // check empty
      if (!value && value !== 0) {
        return false;
      }
      return { [key]: value };
    })
    .filter((v) => v)
    .reduce((res, current) => ({ ...res, ...current }), {});

const style = {
  flex: 1,
};

const FormContainer = ({ forms, onSubmit, setShowDialogMenu }) => {
  const [activeGroup, setActiveGroup] = useState(0);
  const [showQuestionGroupList, setShowQuestionGroupList] = useState(false);
  const currentValues = FormState.useState((s) => s.currentValues);
  const cascades = FormState.useState((s) => s.cascades);
  const activeLang = FormState.useState((s) => s.lang);
  const trans = i18n.text(activeLang);
  const formLoading = FormState.useState((s) => s.loading);

  const formDefinition = transformForm(forms, activeLang);

  const currentGroup = useMemo(() => {
    return formDefinition.question_group.find((qg) => qg.id === activeGroup);
  }, [formDefinition, activeGroup]);

  const handleOnSubmitForm = (values) => {
    const results = checkValuesBeforeCallback(values);
    if (onSubmit) {
      const { dpName, dpGeo } = generateDataPointName(forms, currentValues, cascades);
      onSubmit({ name: dpName, geo: dpGeo, answers: results });
    }
  };

  const setFieldValue = (id, value) => {
    const _values = { ...currentValues, [id]: value };
    FormState.update((s) => {
      s.currentValues = _values;
    });
  };

  return (
    <>
      <BaseLayout.Content>
        <View style={style}>
          {!showQuestionGroupList ? (
            <QuestionGroup index={activeGroup} group={currentGroup} setFieldValue={setFieldValue} />
          ) : (
            <QuestionGroupList
              form={formDefinition}
              activeQuestionGroup={activeGroup}
              setActiveQuestionGroup={setActiveGroup}
              setShowQuestionGroupList={setShowQuestionGroupList}
            />
          )}
        </View>
      </BaseLayout.Content>
      <View>
        <FormNavigation
          currentGroup={currentGroup}
          // formRef={formRef}
          onSubmit={handleOnSubmitForm}
          activeGroup={activeGroup}
          setActiveGroup={setActiveGroup}
          totalGroup={formDefinition?.question_group?.length || 0}
          showQuestionGroupList={showQuestionGroupList}
          setShowQuestionGroupList={setShowQuestionGroupList}
          setShowDialogMenu={setShowDialogMenu}
        />
      </View>
    </>
  );
};

export default FormContainer;

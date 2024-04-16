import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { Dialog } from '@rneui/themed';
import PropTypes from 'prop-types';
import { useRoute } from '@react-navigation/native';
import { BaseLayout } from '../components';
import { FormNavigation, QuestionGroupList } from './support';
import QuestionGroup from './components/QuestionGroup';
import { transformForm, generateDataPointName } from './lib';
import { FormState } from '../store';
import { helpers, i18n } from '../lib';
import { SUBMISSION_TYPES } from '../lib/constants';

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
        const check = value.filter(
          (y) => typeof y !== 'undefined' && (y || Number.isNaN(Number(y))),
        );
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

const LoadingOverlay = ({ trans }) => (
  <View
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    }}
  >
    <Dialog isVisible>
      <Dialog.Title title={`${trans.loadingPrefilledAnswer}...`} />
      <Dialog.Loading />
    </Dialog>
  </View>
);

LoadingOverlay.propTypes = {
  trans: PropTypes.shape({ loadingPrefilledAnswer: PropTypes.string }).isRequired,
};

const FormContainer = ({ forms, onSubmit, setShowDialogMenu }) => {
  const [activeGroup, setActiveGroup] = useState(0);
  const [showQuestionGroupList, setShowQuestionGroupList] = useState(false);
  const [isDefaultFilled, setIsDefaultFilled] = useState(false);
  const currentValues = FormState.useState((s) => s.currentValues);
  const cascades = FormState.useState((s) => s.cascades);
  const entityOptions = FormState.useState((s) => s.entityOptions);
  const activeLang = FormState.useState((s) => s.lang);
  const trans = i18n.text(activeLang);
  const formLoading = FormState.useState((s) => s.loading);
  const route = useRoute();

  const dependantQuestions =
    forms?.question_group
      ?.flatMap((qg) => qg.question)
      .filter((q) => q?.dependency && q?.dependency?.length)
      ?.map((q) => ({ id: q.id, dependency: q.dependency })) || [];

  const formDefinition = transformForm(
    forms,
    currentValues,
    activeLang,
    route.params.submission_type,
  );
  const activeQuestions = formDefinition?.question_group?.flatMap((qg) => qg?.question);

  const currentGroup = useMemo(
    () => formDefinition?.question_group?.[activeGroup] || {},
    [formDefinition, activeGroup],
  );

  const handleOnSubmitForm = () => {
    const metaQIDs = forms?.question_group
      ?.flatMap((qg) => qg?.question)
      ?.filter((q) => ['cascade', 'geo'].includes(q?.type) || q?.meta)
      ?.map((q) => `${q?.id}`);
    const activeQIDs = activeQuestions.map((q) => `${q?.id}`);
    const validValues = Object.keys(currentValues)
      .filter((qkey) => activeQIDs.includes(qkey) || metaQIDs.includes(qkey))
      .reduce((prev, current) => {
        if (entityOptions?.[current] && currentValues[current]?.[0]) {
          const entityName = currentValues[current][0];
          const findEntity = entityOptions[current].find((e) => e?.name === entityName);
          return { [current]: findEntity?.id, ...prev };
        }
        return { [current]: currentValues[current], ...prev };
      }, {});
    const results = checkValuesBeforeCallback(validValues);
    if (onSubmit) {
      const { dpName, dpGeo } = generateDataPointName(forms, validValues, cascades);
      onSubmit({ name: dpName, geo: dpGeo, answers: results });
    }
  };

  const handleOnActiveGroup = (page) => {
    const group = formDefinition?.question_group?.[page];
    const currentPrefilled = group.question
      ?.filter((q) => q?.pre && q?.id)
      ?.filter(
        (q) => currentValues?.[q.id] === null || typeof currentValues?.[q.id] === 'undefined',
      )
      ?.map((q) => {
        const questionName = Object.keys(q.pre)?.[0];
        const findQuestion = activeQuestions.find((aq) => aq?.name === questionName);
        const prefillValue = q.pre?.[questionName]?.[currentValues?.[findQuestion?.id]];
        return { [q.id]: prefillValue };
      })
      ?.reduce((prev, current) => ({ ...prev, ...current }), {});
    if (Object.keys(currentPrefilled).length) {
      FormState.update((s) => {
        s.loading = true;
        s.currentValues = {
          ...s.currentValues,
          ...currentPrefilled,
        };
      });
      const interval = group?.question?.length || 0;
      setTimeout(() => {
        setActiveGroup(page);
        FormState.update((s) => {
          s.loading = false;
        });
      }, interval);
    } else {
      setActiveGroup(page);
    }
  };

  const handleOnDefaultValue = useCallback(() => {
    if (!isDefaultFilled) {
      setIsDefaultFilled(true);
      const defaultValues = activeQuestions
        .filter((aq) => aq?.default_value)
        .map((aq) => {
          const submissionType = route.params?.submission_type || SUBMISSION_TYPES.registration;
          const subTypeName = helpers.flipObject(SUBMISSION_TYPES)[submissionType];
          const defaultValue = aq?.default_value?.submission_type?.[subTypeName] || '';
          return {
            [aq.id]: ['option', 'multiple_option'].includes(aq.type)
              ? [defaultValue]
              : defaultValue,
          };
        })
        .reduce((prev, current) => ({ ...prev, ...current }), {});
      if (Object.keys(defaultValues).length) {
        FormState.update((s) => {
          s.currentValues = { ...s.currentValues, ...defaultValues };
        });
      }
    }
  }, [activeQuestions, route.params, isDefaultFilled]);

  useEffect(() => {
    handleOnDefaultValue();
  }, [handleOnDefaultValue]);

  return (
    <>
      {formLoading && <LoadingOverlay trans={trans} />}
      <BaseLayout.Content>
        <View style={style}>
          {!showQuestionGroupList ? (
            <QuestionGroup
              index={activeGroup}
              group={currentGroup}
              activeQuestions={activeQuestions}
              dependantQuestions={dependantQuestions}
            />
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
          onSubmit={handleOnSubmitForm}
          activeGroup={activeGroup}
          setActiveGroup={handleOnActiveGroup}
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

FormContainer.propTypes = {
  forms: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  setShowDialogMenu: PropTypes.func.isRequired,
};

FormContainer.defaultProps = {
  forms: {},
};

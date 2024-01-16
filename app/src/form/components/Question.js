import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import QuestionField from './QuestionField';
import { styles } from '../styles';
import { onFilterDependency } from '../lib';
import { FormState } from '../../store';

const Question = memo(({ group }) => {
  /**
   * Optimizing flatlist with memo
   * https://reactnative.dev/docs/optimizing-flatlist-configuration#use-memo
   */
  const [preload, setPreload] = useState(true);
  const values = FormState.useState((s) => s.currentValues);

  const questions = useMemo(() => {
    try {
      if (group?.question?.length) {
        return group.question.filter((q) => onFilterDependency(group, values, q));
      }
      return [];
    } catch {
      return [];
    }
  }, [group, values]);

  const handleOnGenerateUUID = useCallback(() => {
    if (preload) {
      setPreload(false);
    }
    if (!preload) {
      return;
    }
    group?.question
      ?.filter((q) => q?.meta_uuid)
      ?.forEach((q) => {
        if (!values?.[q.id]) {
          const UUID = Crypto.randomUUID();
          FormState.update((s) => {
            s.currentValues = { ...s.currentValues, [q.id]: UUID };
          });
        }
      });
  }, [preload, group, values]);

  const handleOnChange = (id, value, field) => {
    const fieldValues = { ...values, [id]: value };
    const isEmpty = Array.isArray(value) ? value.length === 0 : String(value)?.trim()?.length === 0;

    if (!isEmpty) {
      FormState.update((s) => {
        s.feedback = { ...s.feedback, [id]: true };
      });
    }

    const preFilled = field?.pre;
    if (preFilled?.answer) {
      const isMatchAnswer =
        JSON.stringify(preFilled?.answer) === JSON.stringify(value) ||
        String(preFilled?.answer) === String(value);
      if (isMatchAnswer) {
        FormState.update((s) => {
          s.loading = true;
        });
        preFilled?.fill?.forEach((f) => {
          fieldValues[f?.id] = f?.answer;
        });
      }
    }
    FormState.update((s) => {
      s.currentValues = fieldValues;
    });
  };

  useEffect(() => {
    handleOnGenerateUUID();
  }, [handleOnGenerateUUID]);

  return (
    <FlatList
      scrollEnabled={true}
      data={questions}
      keyExtractor={(item) => `question-${item.id}`}
      renderItem={({ item: field, index }) => {
        return (
          <View key={`question-${field.id}`} style={styles.questionContainer}>
            <QuestionField
              keyform={index}
              field={field}
              onChange={handleOnChange}
              value={values?.[field.id]}
            />
          </View>
        );
      }}
      extraData={group}
      removeClippedSubviews={false}
    />
  );
});

export default Question;

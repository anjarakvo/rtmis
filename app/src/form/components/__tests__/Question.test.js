import React from 'react';
import { act, fireEvent, render, renderHook, waitFor } from '@testing-library/react-native';
import * as Formik from 'formik';
import { View } from 'react-native';
import Question from '../Question';
import { FormState } from '../../../store';

jest.mock('formik', () => ({
  ...jest.requireActual('formik'),
  useField: jest.fn().mockReturnValue([{}, {}, { setTouched: jest.fn() }]),
}));
const uuidv4 = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';
jest.mock('expo-crypto', () => ({ randomUUID: () => uuidv4 }));

const isValidUUIDv4 = (str) => {
  // UUIDv4 pattern
  const uuidv4Pattern =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
  // Test the input string against the pattern
  return uuidv4Pattern.test(str);
};

describe('Question component', () => {
  beforeEach(() => {
    FormState.update((s) => {
      s.currentValues = {};
    });
  });

  it('should render question list correctly', () => {
    const mockGroupQuestions = {
      name: 'Register',
      question: [
        {
          id: 1,
          name: 'Your Email',
          order: 1,
          type: 'input',
          required: true,
          meta: true,
          translations: [],
        },
        {
          id: 2,
          name: 'Your Name',
          order: 2,
          type: 'input',
          required: true,
          meta: false,
          translations: [],
        },
      ],
    };

    const setFieldValue = jest.fn();
    const { result } = renderHook(() => FormState.useState((s) => s.currentValues));

    const { getAllByTestId, queryByText } = render(
      <Question group={mockGroupQuestions} setFieldValue={setFieldValue} values={result.current} />,
    );

    const questionView = getAllByTestId('question-view');
    expect(questionView).toBeDefined();
    expect(questionView.length).toEqual(2);
    const q1 = queryByText('1. Your Email');
    expect(q1).not.toBeNull();
  });

  it('should execute generate UUID when the meta_uuid is exists', async () => {
    const mockGroupQuestions = {
      name: 'Register',
      question: [
        {
          id: 1,
          name: 'UUID',
          order: 1,
          type: 'input',
          required: true,
          meta: false,
          translations: [],
          meta_uuid: true,
        },
      ],
    };

    const setFieldValue = jest.fn();
    const { result } = renderHook(() => FormState.useState((s) => s.currentValues));

    const { getAllByTestId, queryByText, getByTestId, rerender } = render(
      <Question group={mockGroupQuestions} setFieldValue={setFieldValue} values={result.current} />,
    );

    act(() => {
      FormState.update((s) => {
        s.currentValues = { 1: uuidv4 };
      });
    });

    rerender(
      <Question group={mockGroupQuestions} setFieldValue={setFieldValue} values={result.current} />,
    );

    await waitFor(() => {
      const questionView = getAllByTestId('question-view');
      expect(questionView).toBeDefined();
      expect(questionView.length).toEqual(1);
      const q1 = queryByText('1. UUID');
      expect(q1).not.toBeNull();
      expect(setFieldValue).toHaveBeenCalledTimes(1);
      const inputElement = getByTestId('type-input');
      expect(inputElement.props.value).toEqual(uuidv4);
    });
  });

  it("should not execute generate UUID when the meta_uuid doesn't exists", () => {
    const mockGroupQuestions = {
      name: 'Register',
      question: [
        {
          id: 1,
          name: 'Your Email',
          order: 1,
          type: 'input',
          required: true,
          meta: true,
          translations: [],
        },
      ],
    };

    const setFieldValue = jest.fn();
    const { result } = renderHook(() => FormState.useState((s) => s.currentValues));

    const { getAllByTestId, queryByText, getByTestId } = render(
      <Question group={mockGroupQuestions} setFieldValue={setFieldValue} values={result.current} />,
    );
    const questionView = getAllByTestId('question-view');
    expect(questionView).toBeDefined();
    expect(questionView.length).toEqual(1);
    const q1 = queryByText('1. Your Email');
    expect(q1).not.toBeNull();

    expect(setFieldValue).toHaveBeenCalledTimes(0);
    const inputElement = getByTestId('type-input');
    expect(inputElement.props.value).not.toBeDefined();
  });

  it('should store valid uuidv4', async () => {
    const mockGroupQuestions = {
      name: 'Register',
      question: [
        {
          id: 1,
          name: 'UUID',
          order: 1,
          type: 'input',
          required: true,
          meta: false,
          translations: [],
          meta_uuid: true,
        },
      ],
    };

    const setFieldValue = jest.fn();
    const { result } = renderHook(() => FormState.useState((s) => s.currentValues));

    const { getByTestId, rerender } = render(
      <Question group={mockGroupQuestions} setFieldValue={setFieldValue} values={result.current} />,
    );

    act(() => {
      FormState.update((s) => {
        s.currentValues = { 1: uuidv4 };
      });
    });

    rerender(
      <Question group={mockGroupQuestions} setFieldValue={setFieldValue} values={result.current} />,
    );

    await waitFor(() => {
      const inputElement = getByTestId('type-input');
      expect(inputElement.props.value).toEqual(uuidv4);

      const inputVal = inputElement.props.value;
      const isValid = isValidUUIDv4(inputVal);
      expect(isValid).toBeTruthy();
    });
  });
});
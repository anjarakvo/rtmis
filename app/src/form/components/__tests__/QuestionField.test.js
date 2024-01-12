import React from 'react';
import { fireEvent, render, renderHook, waitFor } from '@testing-library/react-native';
import * as Formik from 'formik';
import { View } from 'react-native';
import QuestionField from '../QuestionField';
import { FormState } from '../../../store';
import { act } from 'react-test-renderer';

jest.spyOn(View.prototype, 'measureInWindow').mockImplementation((cb) => {
  cb(18, 113, 357, 50);
});
jest.mock('formik', () => ({
  ...jest.requireActual('formik'),
  useField: jest.fn().mockReturnValue([{}, {}, { setTouched: jest.fn() }]),
}));

const fakeData = [
  { id: 41, name: 'Akvo', parent: 0 },
  { id: 42, name: 'Nuffic', parent: 0 },
];

jest.mock('expo-sqlite');
jest.mock('../../../lib', () => ({
  cascades: {
    loadDataSource: jest.fn(async (source, id) => {
      return id
        ? { rows: { length: 1, _array: [{ id: 42, name: 'Akvo', parent: 0 }] } }
        : {
            rows: {
              length: fakeData.length,
              _array: fakeData,
            },
          };
    }),
  },
  i18n: {
    text: jest.fn(() => ({
      searchPlaceholder: 'Search...',
    })),
  },
}));

describe('QuestionField component', () => {
  beforeEach(() => {
    FormState.update((s) => {
      s.currentValues = {};
    });
  });

  test('render question correctly', () => {
    const setFieldValue = jest.fn();
    const fakeValidate = jest.fn();
    const values = { 1: '' };
    const keyform = 1;
    const field = {
      id: 1,
      name: 'Your Name',
      order: 1,
      type: 'input',
      required: true,
      meta: true,
      translations: [
        {
          name: 'Nama Anda',
          language: 'id',
        },
      ],
      addonBefore: 'Name',
    };
    const { getByText, queryByText } = render(
      <QuestionField
        keyform={keyform}
        field={field}
        setFieldValue={setFieldValue}
        values={values}
        validate={fakeValidate}
      />,
    );
    const questionText = queryByText('Your Name');
    expect(questionText).toBeDefined();
    const addOnText = getByText('Name');
    expect(addOnText).toBeDefined();
  });

  test('question not showing when hidden is true but it only styling', () => {
    const setFieldValue = jest.fn();
    const fakeValidate = jest.fn();
    const keyform = 1;
    const field = {
      id: 1,
      name: 'Sanitation',
      order: 1,
      type: 'input',
      required: true,
      meta: true,
      translations: [
        {
          name: 'Sanitasi',
          language: 'id',
        },
      ],
      pre: {
        answer: 'Basic',
        fill: [
          {
            id: 1,
            answer: 'Basic',
          },
        ],
      },
      hidden: true,
    };
    const { result } = renderHook(() => FormState.useState((s) => s.currentValues));
    const values = result.current;

    const { queryByTestId, queryByText, debug, getByA11yHint } = render(
      <QuestionField
        keyform={keyform}
        field={field}
        setFieldValue={setFieldValue}
        values={values}
        validate={fakeValidate}
      />,
    );

    const questionText = queryByText('Sanitation', { exact: false });
    const inputElement = queryByTestId('type-input');
    const questionElement = queryByTestId('question-view', { includeHiddenElements: true });
    expect(questionText).toBeNull();
    expect(inputElement).toBeNull();
    expect(questionElement.props.style.display).toEqual('none');
  });

  test('question should be able pass the validation when hidden is true and doesnt have prefilled', () => {
    const setFieldValue = jest.fn();
    const fakeValidate = jest.fn();
    const keyform = 1;
    const field = {
      id: 1,
      name: 'Your Name',
      order: 1,
      type: 'input',
      required: true,
      meta: true,
      translations: [
        {
          name: 'Nama Anda',
          language: 'id',
        },
      ],
      pre: {},
      hidden: true,
    };
    const { result } = renderHook(() => FormState.useState((s) => s.currentValues));
    const values = result.current;

    const { queryByTestId } = render(
      <QuestionField
        keyform={keyform}
        field={field}
        setFieldValue={setFieldValue}
        values={values}
        validate={fakeValidate}
      />,
    );

    jest
      .spyOn(Formik, 'useField')
      .mockReturnValue([
        {},
        { touched: true, error: 'Name is required' },
        { setTouched: jest.fn() },
      ]);

    const errorValidationEl = queryByTestId('err-validation-text');
    expect(errorValidationEl).toBeNull();
  });

  test('question should showing when hidden is false', () => {
    const setFieldValue = jest.fn();
    const fakeValidate = jest.fn();
    const keyform = 1;
    const field = {
      id: 1,
      name: 'Your Name',
      order: 1,
      type: 'input',
      required: true,
      meta: true,
      translations: [
        {
          name: 'Nama Anda',
          language: 'id',
        },
      ],
      pre: {},
      hidden: false,
    };

    const { result } = renderHook(() => FormState.useState((s) => s.currentValues));
    const values = result.current;

    const { queryByTestId, queryByText } = render(
      <QuestionField
        keyform={keyform}
        field={field}
        setFieldValue={setFieldValue}
        values={values}
        validate={fakeValidate}
      />,
    );

    const questionText = queryByText('Your Name', { exact: false });
    const inputElement = queryByTestId('type-input');
    const questionElement = queryByTestId('question-view');
    expect(questionText).not.toBeNull();
    expect(inputElement).not.toBeNull();
    expect(questionElement.props.style.display).toEqual('flex');
  });

  test('questions should be able to be validated when hidden is false', () => {
    const setFieldValue = jest.fn();
    const fakeValidate = jest.fn();
    const keyform = 1;
    const field = {
      id: 1,
      name: 'Your Name',
      order: 1,
      type: 'input',
      required: true,
      meta: true,
      translations: [
        {
          name: 'Nama Anda',
          language: 'id',
        },
      ],
      pre: {},
      hidden: false,
    };

    jest
      .spyOn(Formik, 'useField')
      .mockReturnValue([
        {},
        { touched: true, error: 'Name is required' },
        { setTouched: jest.fn() },
      ]);

    const { result } = renderHook(() => FormState.useState((s) => s.currentValues));
    const values = result.current;

    const { queryByTestId, queryByText } = render(
      <QuestionField
        keyform={keyform}
        field={field}
        setFieldValue={setFieldValue}
        values={values}
        validate={fakeValidate}
      />,
    );

    const questionText = queryByText('Your Name', { exact: false });
    const inputElement = queryByTestId('type-input');
    const errorValidation = queryByText('Name is required');
    expect(questionText).not.toBeNull();
    expect(inputElement).not.toBeNull();
    expect(errorValidation).not.toBeNull();
  });

  test('questions should be displayed but not part of the payload when displayOnly is true', async () => {
    const setFieldValue = jest.fn();
    const fakeValidate = jest.fn();
    const keyform = 1;
    const field = {
      id: 7,
      name: 'Total Payment',
      order: 7,
      type: 'autofield',
      required: false,
      meta: false,
      translations: [
        {
          name: 'Total pembayaran',
          language: 'id',
        },
      ],
      displayOnly: true,
      fn: {
        fnString: '() => #5 * #6',
      },
    };

    const { result } = renderHook(() => FormState.useState((s) => s.currentValues));
    const values = result.current;

    const { queryByTestId, queryByText, rerender } = render(
      <QuestionField
        keyform={keyform}
        field={field}
        setFieldValue={setFieldValue}
        values={values}
        validate={fakeValidate}
      />,
    );

    act(() => {
      FormState.update((s) => {
        s.currentValues = {
          5: 10000,
          6: 3,
        };
      });
    });

    rerender(
      <QuestionField
        keyform={keyform}
        field={field}
        setFieldValue={setFieldValue}
        values={result.current}
        validate={fakeValidate}
      />,
    );

    const questionText = queryByText('Total Payment', { exact: false });
    const inputElement = queryByTestId('type-autofield');
    expect(questionText).not.toBeNull();
    expect(inputElement).not.toBeNull();
    expect(inputElement.props.value).toBe('30000');

    act(() => {
      fireEvent(inputElement, 'onChange');
    });

    await waitFor(() => {
      const payload = result.current;
      expect(payload).toEqual({ 5: 10000, 6: 3 });
    });
  });
});

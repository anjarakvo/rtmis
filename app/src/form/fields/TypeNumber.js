/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { View } from 'react-native';
import { Input } from '@rneui/themed';
import PropTypes from 'prop-types';
import { FieldLabel } from '../support';
import styles from '../styles';
import { addPreffix, addSuffix } from './TypeInput';

const TypeNumber = ({
  onChange,
  value,
  keyform,
  id,
  label,
  addonAfter,
  addonBefore,
  tooltip,
  required,
  requiredSign,
  disabled,
}) => {
  const requiredValue = required ? requiredSign : null;
  return (
    <View>
      <FieldLabel keyform={keyform} name={label} tooltip={tooltip} requiredSign={requiredValue} />
      <Input
        inputContainerStyle={styles.inputFieldContainer}
        keyboardType="numeric"
        onChangeText={(val) => {
          if (onChange) {
            onChange(id, val);
          }
        }}
        value={value}
        testID="type-number"
        {...addPreffix(addonBefore)}
        {...addSuffix(addonAfter)}
        disabled={disabled}
      />
    </View>
  );
};

export default TypeNumber;

TypeNumber.propTypes = {
  onChange: PropTypes.func.isRequired,
  value: PropTypes.arrayOf().isRequired,
  keyform: PropTypes.number.isRequired,
  id: PropTypes.number.isRequired,
  label: PropTypes.string.isRequired,
  tooltip: PropTypes.string.isRequired,
  required: PropTypes.bool.isRequired,
  requiredSign: PropTypes.string,
  disabled: PropTypes.bool,
  addonAfter: PropTypes.node,
  addonBefore: PropTypes.node,
};

TypeNumber.defaultProps = {
  disabled: false,
  requiredSign: null,
  addonAfter: null,
  addonBefore: null,
};
